'use server'

import { getClient } from '@/lib/payload'
import { getCurrentMember } from '@/actions/auth'
import { valueFieldFor, type AttributeType } from '@/lib/attributes'
import { MEMBER_CATEGORIES } from '@/collections/Members'

export type ActionResult = { ok: boolean; error?: string; message?: string }

const VALID_CATEGORIES = MEMBER_CATEGORIES.map((c) => c.value) as readonly string[]

/** A logged-in member cancels one of their own registrations. */
export const cancelRegistrationAction = async (registrationId: number): Promise<ActionResult> => {
  const member = await getCurrentMember()
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
 * A member updates their own profile: basic fields plus any custom attribute
 * flagged editableByMember. Protected fields (cuota, equipación) are never touched.
 */
export const updateProfileAction = async (
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> => {
  const member = await getCurrentMember()
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
      if (raw === null) continue
      const type = def.type as AttributeType
      const field = valueFieldFor(type)
      const value =
        type === 'boolean'
          ? raw === 'on' || raw === 'true'
          : type === 'number'
            ? Number(raw)
            : String(raw)

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
