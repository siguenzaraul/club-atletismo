/**
 * El socio comunica que ya ha ingresado su cuota.
 *
 * Nada de esto marca la cuota como pagada: sólo deja la fecha del aviso en la cuota de la
 * temporada y escribe al club, que es quien comprueba el movimiento y la confirma. Cobrar por
 * lo que diga el formulario sería fiarse del interesado.
 *
 * Módulo **sin** `'use server'` para que los tests de integración puedan llamarlo con la Local
 * API sin montar una petición, igual que `registration.ts`.
 */

import type { Payload } from 'payload'

import {
  getEmailFooter,
  getStaffNotifyAddress,
  paymentReportedEmail,
  sendEmailAfterResponse,
} from '@/lib/email'
import { getCurrentSeason } from '@/lib/membership'
import { getClubPaymentInfo, paymentConcept } from '@/lib/payments'
import { isDuplicateIn } from '@/lib/registration'

/**
 * Ventana de silencio del aviso al club. El botón es pulsable cuantas veces quiera el socio y
 * cada pulsación escribiría al club: dentro de este plazo se actualiza la fecha pero no se
 * vuelve a enviar correo.
 */
export const NOTIFY_COOLDOWN_MS = 24 * 60 * 60 * 1000

export type ReportPaymentOutcome =
  | {
      ok: true
      /** `already-paid`: el club ya la confirmó. `already-reported`: aviso repetido, sin correo. */
      state: 'reported' | 'already-reported' | 'already-paid'
      reportedAt: string | null
    }
  | { ok: false; error: string }

const idOf = (v: unknown): number | null =>
  v == null ? null : typeof v === 'object' ? ((v as { id?: number }).id ?? null) : (v as number)

export const reportMembershipPayment = async (
  payload: Payload,
  args: { memberId: number },
): Promise<ReportPaymentOutcome> => {
  const member = await payload
    .findByID({ collection: 'members', id: args.memberId, depth: 0, overrideAccess: true })
    .catch(() => null)
  if (!member) return { ok: false, error: 'Socio no encontrado.' }

  const season = await getCurrentSeason(payload).catch(() => null)
  if (!season) {
    return {
      ok: false,
      error: 'Todavía no hay temporada abierta. Escríbenos desde el formulario de contacto.',
    }
  }

  const findMembership = async () =>
    (
      await payload.find({
        collection: 'memberships',
        where: { and: [{ member: { equals: args.memberId } }, { season: { equals: season.id } }] },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })
    ).docs[0] ?? null

  const existing = await findMembership()

  if (existing && (existing.paymentStatus === 'paid' || existing.paymentStatus === 'exempt')) {
    return { ok: true, state: 'already-paid', reportedAt: existing.paymentReportedAt ?? null }
  }

  const now = new Date()
  const previous = existing?.paymentReportedAt ? new Date(existing.paymentReportedAt) : null
  const repeated = previous ? now.getTime() - previous.getTime() < NOTIFY_COOLDOWN_MS : false
  const reportedAt = now.toISOString()

  let typeId = idOf(existing?.type) ?? idOf(member.currentMembershipType)
  try {
    if (existing) {
      await payload.update({
        collection: 'memberships',
        id: existing.id,
        data: { paymentReportedAt: reportedAt },
        overrideAccess: true,
        depth: 0,
      })
    } else {
      // El alta pudo quedarse sin cuota: crearla es un paso «best effort» de
      // `completeRegistration`. Abrirla aquí deja el aviso visible en la ficha del socio en vez
      // de perderlo. El índice único (member, season) cierra la carrera con el staff.
      try {
        await payload.create({
          collection: 'memberships',
          data: {
            member: args.memberId,
            season: season.id,
            type: typeId ?? undefined,
            paymentStatus: 'pending',
            paymentReportedAt: reportedAt,
          },
          overrideAccess: true,
          depth: 0,
        })
      } catch (err) {
        if (!isDuplicateIn(err, 'memberships')) throw err
        const raced = await findMembership()
        if (!raced) throw err
        if (raced.paymentStatus === 'paid' || raced.paymentStatus === 'exempt') {
          return { ok: true, state: 'already-paid', reportedAt: raced.paymentReportedAt ?? null }
        }
        typeId = idOf(raced.type) ?? typeId
        await payload.update({
          collection: 'memberships',
          id: raced.id,
          data: { paymentReportedAt: reportedAt },
          overrideAccess: true,
          depth: 0,
        })
      }
    }
  } catch (err) {
    payload.logger.error({ err, memberId: args.memberId }, 'reportMembershipPayment: guardar el aviso falló')
    return { ok: false, error: 'No hemos podido registrar el aviso. Inténtalo de nuevo en un minuto.' }
  }

  if (repeated) return { ok: true, state: 'already-reported', reportedAt }

  try {
    const [to, footer, membershipType] = await Promise.all([
      getStaffNotifyAddress(payload),
      getEmailFooter(payload),
      typeId
        ? payload
            .findByID({ collection: 'membership-types', id: typeId, depth: 0, overrideAccess: true })
            .catch(() => null)
        : Promise.resolve(null),
    ])
    if (to) {
      await sendEmailAfterResponse(payload, {
        to,
        replyTo: member.email ?? undefined,
        ...paymentReportedEmail({
          memberId: member.id,
          memberName: member.name ?? member.email ?? `Socio #${member.id}`,
          memberEmail: member.email ?? '',
          memberPhone: member.phone ?? null,
          seasonName: season.name ?? null,
          membershipTypeName: membershipType?.name ?? null,
          amount: membershipType?.amount ?? null,
          concept: paymentConcept(member.name ?? '', season.name),
          footer,
        }),
      })
    }
  } catch (err) {
    // El aviso ya está guardado en la cuota; el correo es el extra. Nunca falla la acción por esto.
    payload.logger.error({ err, memberId: args.memberId }, 'reportMembershipPayment: aviso al club falló')
  }

  return { ok: true, state: 'reported', reportedAt }
}

/** Datos de pago que necesita la zona de socio para pintar el apartado de la cuota. */
export const getMemberPaymentPanelData = async (
  payload: Payload,
  args: { memberName: string; seasonName?: string | null; membershipTypeId?: number | null },
): Promise<{
  iban: string
  formattedIban: string
  holder: string
  notes: string | null
  concept: string
  amount: number | null
}> => {
  const [info, membershipType] = await Promise.all([
    getClubPaymentInfo(payload),
    args.membershipTypeId
      ? payload
          .findByID({
            collection: 'membership-types',
            id: args.membershipTypeId,
            depth: 0,
            overrideAccess: true,
          })
          .catch(() => null)
      : Promise.resolve(null),
  ])

  return {
    ...info,
    concept: paymentConcept(args.memberName, args.seasonName),
    amount: membershipType?.requiresPayment === false ? null : (membershipType?.amount ?? null),
  }
}
