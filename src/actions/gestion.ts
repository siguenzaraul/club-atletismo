'use server'

import { headers as nextHeaders } from 'next/headers'
import { getClient } from '@/lib/payload'
import { getCurrentSeason, paymentToMemberStatus } from '@/lib/membership'
import { valueFieldFor, type AttributeType } from '@/lib/attributes'
import { parseCsv } from '@/lib/csv'
import { MEMBER_CATEGORIES } from '@/collections/Members'
import type { User } from '@/payload-types'

export type StaffResult = { ok: boolean; error?: string; message?: string }

const VALID_CATEGORIES = MEMBER_CATEGORIES.map((c) => c.value) as readonly string[]

/** Returns the logged-in staff user (users collection), or null. */
export const getCurrentStaff = async (): Promise<User | null> => {
  const payload = await getClient()
  const { user } = await payload.auth({ headers: await nextHeaders() })
  if (user && user.collection === 'users') return user as User
  return null
}

/** Guard used by every mutation below. */
const requireStaff = async () => {
  const staff = await getCurrentStaff()
  if (!staff) throw new Error('No autorizado')
  return getClient()
}

/** Save a member's basic profile (staff can edit everything). */
export const saveDatosAction = async (_prev: StaffResult, formData: FormData): Promise<StaffResult> => {
  let payload
  try {
    payload = await requireStaff()
  } catch {
    return { ok: false, error: 'No autorizado.' }
  }
  const memberId = Number(formData.get('memberId'))
  const name = String(formData.get('name') ?? '').trim()
  const phone = String(formData.get('phone') ?? '').trim()
  const federationNumber = String(formData.get('federationNumber') ?? '').trim()
  const category = String(formData.get('category') ?? '').trim()
  if (!memberId || !name) return { ok: false, error: 'Falta el nombre.' }
  if (phone.replace(/\D/g, '').length < 9) {
    return { ok: false, error: 'El teléfono móvil es obligatorio.' }
  }

  try {
    await payload.update({
      collection: 'members',
      id: memberId,
      data: {
        name,
        phone,
        federationNumber: federationNumber || null,
        ...(VALID_CATEGORIES.includes(category) ? { category: category as (typeof MEMBER_CATEGORIES)[number]['value'] } : {}),
      },
      overrideAccess: true,
    })
  } catch (err) {
    payload.logger.error({ err }, 'saveDatosAction failed')
    return { ok: false, error: 'No se pudo guardar.' }
  }
  return { ok: true, message: 'Datos guardados.' }
}

/**
 * Set the member's fee for the current season: creates the membership if it
 * doesn't exist, updates status/type otherwise. The membership hook mirrors
 * the status onto the member.
 */
export const saveCuotaAction = async (
  memberId: number,
  paymentStatus: 'pending' | 'paid' | 'exempt',
  typeId?: number | null,
): Promise<StaffResult> => {
  let payload
  try {
    payload = await requireStaff()
  } catch {
    return { ok: false, error: 'No autorizado.' }
  }
  const season = await getCurrentSeason(payload)
  if (!season) return { ok: false, error: 'Marca una temporada como actual primero.' }

  try {
    const existing = await payload.find({
      collection: 'memberships',
      where: { and: [{ member: { equals: memberId } }, { season: { equals: season.id } }] },
      limit: 1,
      overrideAccess: true,
    })
    const data = {
      member: memberId,
      season: season.id,
      type: typeId ?? undefined,
      paymentStatus,
      ...(paymentStatus === 'paid' ? { paidAt: new Date().toISOString() } : {}),
    }
    if (existing.docs[0]) {
      await payload.update({ collection: 'memberships', id: existing.docs[0].id, data, overrideAccess: true })
    } else {
      await payload.create({ collection: 'memberships', data, overrideAccess: true })
    }
    // Safety: also mirror onto the member in case the season isn't flagged current.
    await payload.update({
      collection: 'members',
      id: memberId,
      data: { membershipStatus: paymentToMemberStatus(paymentStatus) },
      overrideAccess: true,
    })
  } catch (err) {
    payload.logger.error({ err }, 'saveCuotaAction failed')
    return { ok: false, error: 'No se pudo actualizar la cuota.' }
  }
  return { ok: true, message: 'Cuota actualizada.' }
}

/** Hand out a piece of equipment to the member (marked delivered, stock recalculates). */
export const entregarEquipacionAction = async (
  memberId: number,
  itemId: number,
  sizeId: number,
  quantity = 1,
): Promise<StaffResult> => {
  let payload
  try {
    payload = await requireStaff()
  } catch {
    return { ok: false, error: 'No autorizado.' }
  }
  if (!itemId || !sizeId) return { ok: false, error: 'Elige artículo y talla.' }
  const season = await getCurrentSeason(payload)
  if (!season) return { ok: false, error: 'Marca una temporada como actual primero.' }

  try {
    await payload.create({
      collection: 'equipment-deliveries',
      data: {
        member: memberId,
        season: season.id,
        item: itemId,
        size: sizeId,
        quantity,
        status: 'delivered',
        payment: 'included',
      },
      overrideAccess: true,
    })
  } catch (err) {
    payload.logger.error({ err }, 'entregarEquipacionAction failed')
    return { ok: false, error: 'No se pudo registrar la entrega.' }
  }
  return { ok: true, message: 'Equipación entregada.' }
}

/** Remove a delivery (e.g. a mistake); stock recalculates. */
export const borrarEntregaAction = async (deliveryId: number): Promise<StaffResult> => {
  let payload
  try {
    payload = await requireStaff()
  } catch {
    return { ok: false, error: 'No autorizado.' }
  }
  try {
    await payload.delete({ collection: 'equipment-deliveries', id: deliveryId, overrideAccess: true })
  } catch (err) {
    payload.logger.error({ err }, 'borrarEntregaAction failed')
    return { ok: false, error: 'No se pudo borrar la entrega.' }
  }
  return { ok: true, message: 'Entrega eliminada.' }
}

// ── Importador de resultados por CSV ──────────────────────────────────────────

export type ImportRow = {
  dorsal: string
  nombre: string
  email: string
  categoria: string
  marca: string
  posicion: string
  matchedMemberId: number | null
  matchedMemberName: string | null
  error: string | null
}
export type ImportResult = {
  ok: boolean
  error?: string
  dryRun: boolean
  rows: ImportRow[]
  summary: { total: number; enlazados: number; sinEnlazar: number; errores: number; creados: number }
}

const normalizeCategory = (raw: string): string | undefined => {
  const v = raw.trim().toLowerCase()
  if (!v) return undefined
  const match = MEMBER_CATEGORIES.find((c) => c.value === v || c.label.toLowerCase() === v)
  return match?.value
}

/**
 * Import (or preview with dryRun) race results from CSV for one event.
 * Columns: dorsal, posicion, nombre, email, categoria, marca. Rows with an email
 * matching an existing member are auto-linked; otherwise the result is free-text.
 */
export const importResultsAction = async (
  eventId: number,
  csvText: string,
  dryRun: boolean,
): Promise<ImportResult> => {
  let payload
  try {
    payload = await requireStaff()
  } catch {
    return { ok: false, error: 'No autorizado.', dryRun, rows: [], summary: { total: 0, enlazados: 0, sinEnlazar: 0, errores: 0, creados: 0 } }
  }
  if (!eventId) return { ok: false, error: 'Elige un evento.', dryRun, rows: [], summary: { total: 0, enlazados: 0, sinEnlazar: 0, errores: 0, creados: 0 } }

  const { rows: rawRows } = parseCsv(csvText)
  const rows: ImportRow[] = []
  let creados = 0

  for (const r of rawRows) {
    const nombre = (r['nombre'] ?? r['atleta'] ?? '').trim()
    const email = (r['email'] ?? r['correo'] ?? '').trim().toLowerCase()
    const row: ImportRow = {
      dorsal: (r['dorsal'] ?? '').trim(),
      nombre,
      email,
      categoria: (r['categoria'] ?? r['categoría'] ?? '').trim(),
      marca: (r['marca'] ?? r['tiempo'] ?? '').trim(),
      posicion: (r['posicion'] ?? r['posición'] ?? r['pos'] ?? '').trim(),
      matchedMemberId: null,
      matchedMemberName: null,
      error: null,
    }

    if (!nombre) {
      row.error = 'Falta el nombre.'
      rows.push(row)
      continue
    }

    if (email) {
      const found = await payload.find({
        collection: 'members',
        where: { email: { equals: email } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })
      if (found.docs[0]) {
        row.matchedMemberId = found.docs[0].id
        row.matchedMemberName = found.docs[0].name
      }
    }

    if (!dryRun) {
      try {
        await payload.create({
          collection: 'results',
          data: {
            event: eventId,
            member: row.matchedMemberId ?? undefined,
            athleteName: nombre,
            dorsal: row.dorsal ? Number(row.dorsal) : undefined,
            position: row.posicion ? Number(row.posicion) : undefined,
            mark: row.marca || undefined,
            category: normalizeCategory(row.categoria) as never,
          },
          overrideAccess: true,
        })
        creados++
      } catch (err) {
        payload.logger.error({ err }, 'importResultsAction row failed')
        row.error = 'No se pudo crear.'
      }
    }
    rows.push(row)
  }

  const summary = {
    total: rows.length,
    enlazados: rows.filter((r) => r.matchedMemberId).length,
    sinEnlazar: rows.filter((r) => !r.matchedMemberId && !r.error).length,
    errores: rows.filter((r) => r.error).length,
    creados,
  }
  return { ok: true, dryRun, rows, summary }
}

/** Save all custom-field values for a member in one go. */
export const saveCamposAction = async (_prev: StaffResult, formData: FormData): Promise<StaffResult> => {
  let payload
  try {
    payload = await requireStaff()
  } catch {
    return { ok: false, error: 'No autorizado.' }
  }
  const memberId = Number(formData.get('memberId'))
  if (!memberId) return { ok: false, error: 'Socio no válido.' }

  try {
    const defs = await payload.find({
      collection: 'attribute-definitions',
      where: { active: { equals: true } },
      limit: 200,
      overrideAccess: true,
    })
    for (const def of defs.docs) {
      const raw = formData.get(`attr_${def.id}`)
      const type = def.type as AttributeType
      // Checkboxes send nothing when unchecked; treat missing boolean as false.
      if (raw === null && type !== 'boolean') continue
      const field = valueFieldFor(type)
      const value =
        type === 'boolean' ? raw === 'on' || raw === 'true' : type === 'number' ? Number(raw) : String(raw ?? '')

      const existing = await payload.find({
        collection: 'member-attributes',
        where: { and: [{ member: { equals: memberId } }, { definition: { equals: def.id } }] },
        limit: 1,
        overrideAccess: true,
      })
      const data = { member: memberId, definition: def.id, [field]: value }
      if (existing.docs[0]) {
        await payload.update({ collection: 'member-attributes', id: existing.docs[0].id, data, overrideAccess: true })
      } else {
        await payload.create({ collection: 'member-attributes', data, overrideAccess: true })
      }
    }
  } catch (err) {
    payload.logger.error({ err }, 'saveCamposAction failed')
    return { ok: false, error: 'No se pudieron guardar los campos.' }
  }
  return { ok: true, message: 'Campos guardados.' }
}
