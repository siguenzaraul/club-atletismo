/**
 * Alta de socio: detección de duplicados, inscripción a eventos y los pasos secundarios.
 *
 * Módulo **sin** `'use server'` para que los tests de integración puedan llamarlo con la
 * Local API sin montar una petición. `registerAction` sólo orquesta.
 */

import { ValidationError } from 'payload'
import type { Payload } from 'payload'

import { getCurrentSeason } from '@/lib/membership'
import { getEmailFooter, sendEmailAfterResponse, welcomeEmail } from '@/lib/email'
import { reserveEquipmentForMember, type GarmentSelection } from '@/lib/equipment'
import { getClubPaymentInfo, paymentConcept } from '@/lib/payments'
import type { Member } from '@/payload-types'

/**
 * ¿Es el choque del índice único de `members.email`?
 *
 * NO se puede mirar el mensaje: Payload traduce los errores de unicidad a un `ValidationError`
 * cuyo texto es "El siguiente campo es inválido: email" — ni "unique" ni "duplicate" aparecen
 * por ninguna parte. Hay que mirar la colección y el `path`, que además es lo único que
 * distingue este índice de los de `memberships (member, season)` y
 * `event-registrations (event, member)`, que lanzan el mismo tipo de error.
 */
export const isDuplicateEmail = (err: unknown): boolean =>
  err instanceof ValidationError &&
  err.data?.collection === 'members' &&
  (err.data.errors ?? []).some((e) => e.path === 'email')

/** ¿Es un choque de unicidad en la colección indicada? Se usa para hacer idempotentes los reintentos. */
export const isDuplicateIn = (err: unknown, collection: string): boolean =>
  err instanceof ValidationError && err.data?.collection === collection

export type InscriptionFailure = 'not-found' | 'closed' | 'category' | 'full' | 'error'

export type InscriptionResult =
  | { ok: true; alreadyRegistered: boolean; eventTitle: string }
  | { ok: false; reason: InscriptionFailure; error: string }

type EventRef = { eventId: number } | { eventSlug: string }

/**
 * Único punto de inscripción de un socio en un evento, con TODAS las validaciones.
 *
 * Antes vivía sólo en `inscribeAction`, y el alta pública creaba la inscripción en línea sin
 * mirar aforo, categoría ni inscripciones cerradas: cualquiera podía saltarse el límite de
 * plazas registrándose con `?evento=`.
 */
export const registerMemberInEvent = async (
  payload: Payload,
  args: { memberId: number; category?: Member['category'] | null } & EventRef,
): Promise<InscriptionResult> => {
  const event =
    'eventId' in args
      ? await payload
          .findByID({ collection: 'events', id: args.eventId, depth: 0, overrideAccess: true })
          .catch(() => null)
      : (
          await payload.find({
            collection: 'events',
            where: { slug: { equals: args.eventSlug } },
            limit: 1,
            depth: 0,
            overrideAccess: true,
          })
        ).docs[0] ?? null

  if (!event) return { ok: false, reason: 'not-found', error: 'Evento no encontrado.' }
  if (!event.registrationOpen) {
    return { ok: false, reason: 'closed', error: 'Las inscripciones para este evento están cerradas.' }
  }

  if (event.categories && event.categories.length > 0 && args.category) {
    if (!event.categories.includes(args.category)) {
      return { ok: false, reason: 'category', error: 'Tu categoría no está admitida en este evento.' }
    }
  }

  if (typeof event.capacity === 'number' && event.capacity > 0) {
    const count = await payload.count({
      collection: 'event-registrations',
      where: { and: [{ event: { equals: event.id } }, { status: { not_equals: 'cancelled' } }] },
      overrideAccess: true,
    })
    if (count.totalDocs >= event.capacity) {
      return { ok: false, reason: 'full', error: 'No quedan plazas para este evento.' }
    }
  }

  try {
    await payload.create({
      collection: 'event-registrations',
      data: { event: event.id, member: args.memberId, category: args.category ?? undefined },
      overrideAccess: true,
    })
  } catch (err) {
    // El índice único (event, member) cierra la carrera: un duplicado significa ya inscrito.
    if (isDuplicateIn(err, 'event-registrations')) {
      return { ok: true, alreadyRegistered: true, eventTitle: event.title }
    }
    payload.logger.error({ err, eventId: event.id }, 'registerMemberInEvent failed')
    return { ok: false, reason: 'error', error: 'No se pudo completar la inscripción.' }
  }
  return { ok: true, alreadyRegistered: false, eventTitle: event.title }
}

export type CompleteRegistrationArgs = {
  memberId: number
  membershipTypeId: number | null
  eventSlug: string | null
  category?: Member['category'] | null
  /** `false` en el camino de recuperación: el correo de bienvenida ya salió en el primer intento. */
  sendWelcome: boolean
  /** Nombre para el saludo del correo. */
  name: string
  email: string
  /** Equipación elegida en el formulario. Ya validada contra la configuración del CMS. */
  equipment?: {
    selections: GarmentSelection[]
    reserveStock: boolean
    allowOverbooking: boolean
  }
}

/**
 * Pasos secundarios del alta: cuota pendiente, inscripción al evento y correo de bienvenida.
 *
 * Ninguno puede tumbar la cuenta — cada uno va con su try/catch. Se ejecuta en `after()`, ya
 * fuera de la respuesta, así que el socio navega aunque todo esto falle. Lo que quede a medias
 * se repara desde /gestion/mantenimiento.
 *
 * Es **idempotente**: los índices únicos de `memberships` y `event-registrations` cierran la
 * carrera y aquí se tragan, así que reejecutarla sobre un alta ya completa no duplica nada.
 */
export const completeRegistration = async (
  payload: Payload,
  args: CompleteRegistrationArgs,
): Promise<void> => {
  let eventTitle: string | null = null
  const season = await getCurrentSeason(payload).catch(() => null)

  try {
    if (season) {
      await payload.create({
        collection: 'memberships',
        data: {
          member: args.memberId,
          season: season.id,
          type: args.membershipTypeId ?? undefined,
          paymentStatus: 'pending',
        },
        overrideAccess: true,
      })
    }
  } catch (err) {
    // Un socio sin cuota es visible (`membershipStatus: 'pending'`) y reparable con el
    // backfill de /gestion/mantenimiento. Nunca justifica perder la cuenta.
    if (!isDuplicateIn(err, 'memberships')) {
      payload.logger.error({ err, memberId: args.memberId }, 'completeRegistration: membership failed')
    }
  }

  if (args.eventSlug) {
    try {
      const res = await registerMemberInEvent(payload, {
        memberId: args.memberId,
        category: args.category,
        eventSlug: args.eventSlug,
      })
      if (res.ok) eventTitle = res.eventTitle
      else payload.logger.warn({ reason: res.reason, slug: args.eventSlug }, 'alta: inscripción no aplicada')
    } catch (err) {
      payload.logger.error({ err, slug: args.eventSlug }, 'completeRegistration: inscription failed')
    }
  }

  if (args.equipment && args.equipment.selections.length > 0) {
    try {
      const outcome = await reserveEquipmentForMember(payload, {
        memberId: args.memberId,
        seasonId: season?.id ?? null,
        selections: args.equipment.selections,
        reserveStock: args.equipment.reserveStock,
        allowOverbooking: args.equipment.allowOverbooking,
      })
      if (outcome.skipped.length > 0) {
        payload.logger.warn({ skipped: outcome.skipped, memberId: args.memberId }, 'alta: equipación parcial')
      }
    } catch (err) {
      payload.logger.error({ err, memberId: args.memberId }, 'completeRegistration: equipment failed')
    }
  }

  if (!args.sendWelcome || !args.email) return

  try {
    const [footer, membershipType, paymentInfo] = await Promise.all([
      getEmailFooter(payload),
      args.membershipTypeId
        ? payload
            .findByID({ collection: 'membership-types', id: args.membershipTypeId, depth: 0 })
            .catch(() => null)
        : Promise.resolve(null),
      getClubPaymentInfo(payload),
    ])
    // Un tipo de socio exento (honorífico, por ejemplo) no debe recibir ninguna cuenta. Sin
    // tipo asignado sí se manda: la cuota queda pendiente y el club la cobrará igual.
    const requiresPayment = membershipType ? membershipType.requiresPayment !== false : true
    await sendEmailAfterResponse(payload, {
      to: args.email,
      replyTo: footer.email ?? undefined,
      ...welcomeEmail({
        name: args.name,
        membershipTypeName: membershipType?.name ?? null,
        eventTitle,
        payment: requiresPayment
          ? {
              formattedIban: paymentInfo.formattedIban,
              holder: paymentInfo.holder,
              concept: paymentConcept(args.name, season?.name),
              amount: membershipType?.amount ?? null,
              notes: paymentInfo.notes,
            }
          : null,
        footer,
      }),
    })
  } catch (err) {
    payload.logger.error({ err }, 'completeRegistration: welcome email failed')
  }
}
