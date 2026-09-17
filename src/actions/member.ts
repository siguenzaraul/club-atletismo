'use server'

import { getClient } from '@/lib/payload'
import { currentMember } from '@/lib/session'
import { valueFieldFor, type AttributeType } from '@/lib/attributes'
import { MEMBER_CATEGORIES } from '@/collections/Members'
import { parseDistanceToMeters } from '@/lib/distances'
import { parseMarkToSeconds } from '@/lib/marks'
import { reportMembershipPayment } from '@/lib/payment-report'

export type ActionResult = { ok: boolean; error?: string; message?: string }

/** Máximo de filas de marcas manuales que acepta el formulario, como tope de seguridad. */
const MAX_PERSONAL_BESTS = 20

const VALID_CATEGORIES = MEMBER_CATEGORIES.map((c) => c.value) as readonly string[]

/** Un checkbox marcado llega como 'on', 'yes' o 'true' según cómo se declare en el HTML. */
const isChecked = (raw: FormDataEntryValue | null): boolean =>
  raw === 'on' || raw === 'yes' || raw === 'true'

/** Campo numérico vacío = sin dato. `Number('')` es 0, y eso escribía un cero inventado. */
const numberOrNull = (raw: FormDataEntryValue | null): number | null => {
  const s = String(raw ?? '').trim()
  if (!s) return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

/** A logged-in member cancels one of their own registrations. */
export const cancelRegistrationAction = async (registrationId: number): Promise<ActionResult> => {
  const member = await currentMember()
  if (!member) return { ok: false, error: 'Debes iniciar sesión.' }
  const payload = await getClient()

  const reg = await payload
    .findByID({ collection: 'event-registrations', id: registrationId, depth: 0, overrideAccess: true })
    .catch(() => null)
  if (!reg) return { ok: false, error: 'Inscripción no encontrada.' }

  const ownerId = typeof reg.member === 'object' ? reg.member?.id : reg.member
  if (ownerId !== member.id) return { ok: false, error: 'No puedes cancelar esta inscripción.' }

  await payload.update({
    collection: 'event-registrations',
    id: registrationId,
    data: { status: 'cancelled' },
    overrideAccess: true,
  })
  return { ok: true, message: 'Inscripción cancelada.' }
}

/**
 * El socio avisa de que ya ha ingresado su cuota. No la marca como pagada: sólo deja la fecha
 * del aviso y escribe al club, que la confirma desde /gestion.
 */
export const reportPaymentAction = async (): Promise<ActionResult> => {
  const member = await currentMember()
  if (!member) return { ok: false, error: 'Debes iniciar sesión.' }
  const payload = await getClient()

  const res = await reportMembershipPayment(payload, { memberId: member.id })
  if (!res.ok) return { ok: false, error: res.error }
  if (res.state === 'already-paid') return { ok: true, message: 'Tu cuota ya está confirmada. ¡Gracias!' }
  if (res.state === 'already-reported') {
    return { ok: true, message: 'Ya nos habías avisado; el club lo está revisando.' }
  }
  return { ok: true, message: 'Avisado. El club confirmará tu cuota en cuanto compruebe el ingreso.' }
}

/**
 * A member updates their own profile: basic fields plus any custom attribute
 * flagged editableByMember. Protected fields (cuota, equipación) are never touched.
 */
export const updateProfileAction = async (
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> => {
  const member = await currentMember()
  if (!member) return { ok: false, error: 'Debes iniciar sesión.' }
  const payload = await getClient()

  const name = String(formData.get('name') ?? '').trim()
  const phone = String(formData.get('phone') ?? '').trim()
  const federationNumber = String(formData.get('federationNumber') ?? '').trim()
  const category = String(formData.get('category') ?? '').trim()

  if (!name) return { ok: false, error: 'El nombre no puede estar vacío.' }
  if (phone.replace(/\D/g, '').length < 9) {
    return { ok: false, error: 'El teléfono móvil es obligatorio.' }
  }

  try {
    await payload.update({
      collection: 'members',
      id: member.id,
      data: {
        name,
        phone,
        federationNumber: federationNumber || null,
        ...(VALID_CATEGORIES.includes(category) ? { category: category as (typeof MEMBER_CATEGORIES)[number]['value'] } : {}),
      },
      overrideAccess: true,
    })

    // Editable custom attributes come in as attr_<definitionId>.
    const defs = await payload.find({
      collection: 'attribute-definitions',
      where: { and: [{ active: { equals: true } }, { editableByMember: { equals: true } }] },
      limit: 200,
      overrideAccess: true,
    })
    for (const def of defs.docs) {
      const raw = formData.get(`attr_${def.id}`)
      const type = def.type as AttributeType
      // Un archivo no viaja en este formulario; si llegara sería basura para una relación.
      if (type === 'file') continue
      // Un checkbox desmarcado NO envía nada: tratar el hueco como `false` es lo único que
      // permite al socio quitar una marca que ya tenía. Antes salía por `continue` y el
      // valor se quedaba en `true` para siempre.
      if (raw === null && type !== 'boolean') continue
      const field = valueFieldFor(type)
      const value =
        type === 'boolean'
          ? isChecked(raw)
          : type === 'number'
            ? numberOrNull(raw)
            : String(raw ?? '')

      const existing = await payload.find({
        collection: 'member-attributes',
        where: { and: [{ member: { equals: member.id } }, { definition: { equals: def.id } }] },
        limit: 1,
        overrideAccess: true,
      })
      const data = { member: member.id, definition: def.id, [field]: value }
      if (existing.docs[0]) {
        await payload.update({ collection: 'member-attributes', id: existing.docs[0].id, data, overrideAccess: true })
      } else {
        await payload.create({ collection: 'member-attributes', data, overrideAccess: true })
      }
    }
  } catch (err) {
    payload.logger.error({ err }, 'updateProfileAction failed')
    return { ok: false, error: 'No se pudo guardar el perfil.' }
  }

  return { ok: true, message: 'Perfil actualizado.' }
}

/**
 * El socio publica (o despublica) su ficha y edita sus marcas manuales.
 *
 * Va en una acción SEPARADA de `updateProfileAction` a propósito: aquélla ya funciona en
 * producción y no merece la pena arriesgar una regresión por añadirle campos.
 */
export const updatePublicProfileAction = async (
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> => {
  const member = await currentMember()
  if (!member) return { ok: false, error: 'Debes iniciar sesión.' }
  const payload = await getClient()

  const publicProfile = formData.get('publicProfile') === 'yes'
  const publicBio = String(formData.get('publicBio') ?? '').trim()

  if (publicBio.length > 500) {
    return { ok: false, error: 'La biografía no puede pasar de 500 caracteres.' }
  }

  // Filas dinámicas: pb_<i>_distancia, pb_<i>_marca, pb_<i>_fecha, pb_<i>_carrera.
  const personalBests: {
    distanceMeters: number
    mark: string
    date?: string | null
    eventName?: string | null
  }[] = []

  for (let i = 0; i < MAX_PERSONAL_BESTS; i++) {
    const distanceRaw = String(formData.get(`pb_${i}_distancia`) ?? '').trim()
    const markRaw = String(formData.get(`pb_${i}_marca`) ?? '').trim()
    if (!distanceRaw && !markRaw) continue

    const distanceMeters = parseDistanceToMeters(distanceRaw)
    if (!distanceMeters) {
      return { ok: false, error: `No entiendo la distancia "${distanceRaw}". Prueba con 10K, 21097 o "media maratón".` }
    }
    if (parseMarkToSeconds(markRaw) === null) {
      return { ok: false, error: `No entiendo la marca "${markRaw}". Usa un formato como 42:15 o 1:23:45.` }
    }

    const date = String(formData.get(`pb_${i}_fecha`) ?? '').trim()
    const eventName = String(formData.get(`pb_${i}_carrera`) ?? '').trim()
    personalBests.push({
      distanceMeters,
      mark: markRaw,
      date: date ? new Date(date).toISOString() : null,
      eventName: eventName || null,
    })
  }

  try {
    // `markSeconds` y el slug los calcula el `beforeChange` de la colección.
    await payload.update({
      collection: 'members',
      id: member.id,
      data: { publicProfile, publicBio: publicBio || null, personalBests },
      overrideAccess: true,
    })
  } catch (err) {
    payload.logger.error({ err }, 'updatePublicProfileAction failed')
    return { ok: false, error: 'No se pudo guardar tu ficha pública.' }
  }

  return {
    ok: true,
    message: publicProfile ? 'Ficha pública actualizada.' : 'Tu ficha ya no es pública.',
  }
}
