'use server'

import { getClient } from '@/lib/payload'
import { currentStaff } from '@/lib/session'
import { getCurrentSeason, paymentToMemberStatus } from '@/lib/membership'
import { ensureStandardSizes, recalcStock } from '@/lib/equipment'
import { isDuplicateIn } from '@/lib/registration'
import { DELIVERY_PAYMENTS, DELIVERY_STATUSES } from '@/collections/EquipmentDeliveries'
import { valueFieldFor, type AttributeType } from '@/lib/attributes'
import { parseCsv } from '@/lib/csv'
import { parseDistanceToMeters } from '@/lib/distances'
import { parseMarkToSeconds } from '@/lib/marks'
import { MEMBER_CATEGORIES } from '@/collections/Members'
import type { Where } from 'payload'
import type { User } from '@/payload-types'

export type StaffResult = { ok: boolean; error?: string; message?: string }

const VALID_CATEGORIES = MEMBER_CATEGORIES.map((c) => c.value) as readonly string[]

/** Returns the logged-in staff user (users collection), or null. */
export const getCurrentStaff = async (): Promise<User | null> => currentStaff()

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
        source: 'staff',
      },
      overrideAccess: true,
    })
  } catch (err) {
    // El índice único de `slotKey` cierra la exclusividad por tipo de prenda a nivel de base de
    // datos. Sin este mensaje, el staff vería un error genérico sin entender por qué.
    if (isDuplicateIn(err, 'equipment-deliveries')) {
      return {
        ok: false,
        error:
          'Ya tiene una prenda de ese tipo esta temporada. Cámbiala o márcala como devuelta antes de entregar otra.',
      }
    }
    payload.logger.error({ err }, 'entregarEquipacionAction failed')
    return { ok: false, error: 'No se pudo registrar la entrega.' }
  }
  return { ok: true, message: 'Equipación entregada.' }
}

/**
 * Edita una entrega existente (talla, artículo, cantidad, estado o pago).
 *
 * Necesaria desde que el alta pública crea entregas en estado «Reservada»: sin esto, el staff
 * sólo podría borrarlas y recrearlas, perdiendo el origen y el histórico.
 */
export const actualizarEntregaAction = async (
  deliveryId: number,
  changes: {
    itemId?: number
    sizeId?: number | null
    quantity?: number
    status?: (typeof DELIVERY_STATUSES)[number]['value']
    payment?: (typeof DELIVERY_PAYMENTS)[number]['value']
  },
): Promise<StaffResult> => {
  let payload
  try {
    payload = await requireStaff()
  } catch {
    return { ok: false, error: 'No autorizado.' }
  }

  const data: Record<string, unknown> = {}
  if (changes.itemId) data.item = changes.itemId
  if (changes.sizeId !== undefined) data.size = changes.sizeId
  if (changes.quantity !== undefined) data.quantity = changes.quantity
  if (changes.status) data.status = changes.status
  if (changes.payment) data.payment = changes.payment
  if (Object.keys(data).length === 0) return { ok: false, error: 'No hay nada que cambiar.' }

  try {
    await payload.update({
      collection: 'equipment-deliveries',
      id: deliveryId,
      data,
      overrideAccess: true,
    })
  } catch (err) {
    if (isDuplicateIn(err, 'equipment-deliveries')) {
      return { ok: false, error: 'Ya tiene otra prenda de ese tipo esta temporada.' }
    }
    payload.logger.error({ err, deliveryId }, 'actualizarEntregaAction failed')
    return { ok: false, error: 'No se pudo actualizar la entrega.' }
  }
  return { ok: true, message: 'Entrega actualizada.' }
}

/** Siembra las tallas XS→4XL que falten. Idempotente: se puede pulsar las veces que haga falta. */
export const sembrarTallasAction = async (): Promise<StaffResult> => {
  let payload
  try {
    payload = await requireStaff()
  } catch {
    return { ok: false, error: 'No autorizado.' }
  }
  try {
    const res = await ensureStandardSizes(payload)
    return {
      ok: true,
      message: res.created.length
        ? `Tallas creadas: ${res.created.join(', ')}.`
        : 'Ya estaban todas las tallas estándar.',
    }
  } catch (err) {
    payload.logger.error({ err }, 'sembrarTallasAction failed')
    return { ok: false, error: 'No se pudieron crear las tallas.' }
  }
}

/** Reconcilia todas las filas de stock recontando desde las entregas reales. */
export const recalcularStockAction = async (): Promise<StaffResult> => {
  let payload
  try {
    payload = await requireStaff()
  } catch {
    return { ok: false, error: 'No autorizado.' }
  }
  try {
    const rows = await payload.find({
      collection: 'equipment-stock',
      depth: 0,
      pagination: false,
      overrideAccess: true,
    })
    for (const row of rows.docs) {
      await recalcStock(payload, row.item, row.size, row.season)
    }
    return { ok: true, message: `Stock recalculado (${rows.docs.length} combinaciones).` }
  } catch (err) {
    payload.logger.error({ err }, 'recalcularStockAction failed')
    return { ok: false, error: 'No se pudo recalcular el stock.' }
  }
}

/** Fija cuántas unidades ha comprado el club de una combinación artículo/talla. */
export const guardarStockAction = async (
  itemId: number,
  sizeId: number,
  quantityTotal: number,
): Promise<StaffResult> => {
  let payload
  try {
    payload = await requireStaff()
  } catch {
    return { ok: false, error: 'No autorizado.' }
  }
  if (!Number.isFinite(quantityTotal) || quantityTotal < 0) {
    return { ok: false, error: 'La cantidad debe ser 0 o más.' }
  }
  const season = await getCurrentSeason(payload)
  if (!season) return { ok: false, error: 'Marca una temporada como actual primero.' }

  try {
    const existing = await payload.find({
      collection: 'equipment-stock',
      where: {
        and: [
          { item: { equals: itemId } },
          { size: { equals: sizeId } },
          { season: { equals: season.id } },
        ],
      },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    if (existing.docs[0]) {
      await payload.update({
        collection: 'equipment-stock',
        id: existing.docs[0].id,
        data: { quantityTotal },
        overrideAccess: true,
      })
    } else {
      await payload.create({
        collection: 'equipment-stock',
        data: { item: itemId, size: sizeId, season: season.id, quantityTotal },
        overrideAccess: true,
      })
    }
    // El `beforeChange` de stock recalcula `quantityAvailable`, pero el recuento de entregas
    // sólo se refresca recontando desde la fuente.
    await recalcStock(payload, itemId, sizeId, season.id)
  } catch (err) {
    payload.logger.error({ err }, 'guardarStockAction failed')
    return { ok: false, error: 'No se pudo guardar el stock.' }
  }
  return { ok: true, message: 'Stock actualizado.' }
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
  distancia: string
  matchedMemberId: number | null
  matchedMemberName: string | null
  error: string | null
  /** Aviso que NO bloquea la fila (p. ej. una marca que no se puede interpretar). */
  warning: string | null
}
export type ImportResult = {
  ok: boolean
  error?: string
  dryRun: boolean
  rows: ImportRow[]
  summary: { total: number; enlazados: number; sinEnlazar: number; errores: number; creados: number; sinMarcaValida: number }
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
    return { ok: false, error: 'No autorizado.', dryRun, rows: [], summary: { total: 0, enlazados: 0, sinEnlazar: 0, errores: 0, creados: 0, sinMarcaValida: 0 } }
  }
  if (!eventId) return { ok: false, error: 'Elige un evento.', dryRun, rows: [], summary: { total: 0, enlazados: 0, sinEnlazar: 0, errores: 0, creados: 0, sinMarcaValida: 0 } }

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
      // Columna nueva y opcional: sin ella el CSV de siempre sigue funcionando igual
      // (la distancia se hereda del evento en el hook de `results`).
      distancia: (r['distancia'] ?? r['distance'] ?? r['km'] ?? r['metros'] ?? '').trim(),
      matchedMemberId: null,
      matchedMemberName: null,
      error: null,
      warning: null,
    }

    // Aviso, no error: una marca ilegible no debe impedir importar la fila.
    if (row.marca && parseMarkToSeconds(row.marca) === null) {
      row.warning = 'No se entiende la marca; se guardará sin normalizar.'
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
            distanceMeters: parseDistanceToMeters(row.distancia) ?? undefined,
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
    sinMarcaValida: rows.filter((r) => r.warning).length,
  }
  return { ok: true, dryRun, rows, summary }
}

export type BackfillResult = {
  ok: boolean
  error?: string
  dryRun: boolean
  procesados: number
  restantes: number
  sinMarcaValida: number
}

const BACKFILL_BATCH = 200
/** Tope por pasada, para no pasarse del límite de duración de una Server Action. */
const BACKFILL_MAX_PER_RUN = 1000

/**
 * Normaliza los resultados creados antes de que existieran `markSeconds` y `distanceMeters`.
 *
 * Idempotente: sólo mira las filas sin normalizar, así que reejecutarla no toca nada ya hecho.
 *
 * Avanza por CURSOR de id, no por «los primeros 200 que cumplan el filtro». La diferencia es
 * importante: una marca ilegible («DNF») o un evento sin distancia vuelven a quedar a `null`
 * tras el update y siguen cumpliendo el filtro, así que el lote se repetía eternamente y
 * «Continuar» no avanzaba nunca. Con el cursor el progreso está garantizado, y lo que no se
 * puede normalizar se cuenta aparte en vez de bloquear la cola.
 */
export const backfillResultsAction = async (dryRun: boolean): Promise<BackfillResult> => {
  let payload
  try {
    payload = await requireStaff()
  } catch {
    return { ok: false, error: 'No autorizado.', dryRun, procesados: 0, restantes: 0, sinMarcaValida: 0 }
  }

  const pending: Where = {
    or: [{ markSeconds: { exists: false } }, { distanceMeters: { exists: false } }],
  }

  try {
    if (dryRun) {
      const preview = await payload.find({
        collection: 'results',
        where: pending,
        limit: BACKFILL_BATCH,
        depth: 0,
        overrideAccess: true,
      })
      return {
        ok: true,
        dryRun,
        procesados: 0,
        restantes: preview.totalDocs,
        sinMarcaValida: preview.docs.filter((r) => r.mark && parseMarkToSeconds(r.mark) === null).length,
      }
    }

    let procesados = 0
    let sinMarcaValida = 0
    let lastId = 0
    let vistos = 0

    while (vistos < BACKFILL_MAX_PER_RUN) {
      const batch = await payload.find({
        collection: 'results',
        where: { and: [pending, { id: { greater_than: lastId } }] },
        sort: 'id',
        limit: BACKFILL_BATCH,
        depth: 0,
        overrideAccess: true,
      })
      if (batch.docs.length === 0) break

      for (const doc of batch.docs) {
        // El cursor avanza SIEMPRE, se haya podido normalizar la fila o no.
        lastId = Number(doc.id)
        vistos++
        if (doc.mark && parseMarkToSeconds(doc.mark) === null) sinMarcaValida++
        // El update dispara el `beforeChange` de `results`, que calcula ambas columnas.
        await payload
          .update({ collection: 'results', id: doc.id, data: {}, overrideAccess: true })
          .then(() => {
            procesados++
          })
          .catch((err) => payload.logger.error({ err, id: doc.id }, 'backfill row failed'))
      }
    }

    // Lo que sigue cumpliendo el filtro tras la pasada NO se puede normalizar solo: marcas que
    // no se entienden o eventos sin distancia. Se corrigen a mano en el panel.
    const left = await payload.count({ collection: 'results', where: pending, overrideAccess: true })
    return { ok: true, dryRun, procesados, restantes: left.totalDocs, sinMarcaValida }
  } catch (err) {
    payload.logger.error({ err }, 'backfillResultsAction failed')
    return { ok: false, error: 'No se pudo completar la normalización.', dryRun, procesados: 0, restantes: 0, sinMarcaValida: 0 }
  }
}

export type MembershipBackfillResult = {
  ok: boolean
  error?: string
  dryRun: boolean
  season: string | null
  creadas: number
  restantes: number
}

/**
 * Abre la cuota pendiente de la temporada actual a los socios que no la tienen.
 *
 * Red de seguridad del alta pública: la cuota se crea en `after()`, fuera de la respuesta, así
 * que un fallo transitorio de base de datos deja al socio dentro pero sin cuota. Esto lo repara
 * sin tener que buscar a nadie a mano. Idempotente: sólo mira quién no la tiene.
 */
export const backfillMembershipsAction = async (
  dryRun: boolean,
): Promise<MembershipBackfillResult> => {
  let payload
  try {
    payload = await requireStaff()
  } catch {
    return { ok: false, error: 'No autorizado.', dryRun, season: null, creadas: 0, restantes: 0 }
  }

  const season = await getCurrentSeason(payload)
  if (!season) {
    return {
      ok: false,
      error: 'Marca una temporada como actual primero.',
      dryRun,
      season: null,
      creadas: 0,
      restantes: 0,
    }
  }

  try {
    // Quién ya tiene cuota esta temporada. `depth: 0` y sin paginar: son ids, no fichas.
    const existing = await payload.find({
      collection: 'memberships',
      where: { season: { equals: season.id } },
      depth: 0,
      pagination: false,
      overrideAccess: true,
    })
    const withMembership = new Set(
      existing.docs.map((m) => (typeof m.member === 'object' && m.member ? m.member.id : m.member)),
    )

    const members = await payload.find({
      collection: 'members',
      depth: 0,
      pagination: false,
      select: { name: true },
      overrideAccess: true,
    })
    const missing = members.docs.filter((m) => !withMembership.has(m.id))

    if (dryRun) {
      return { ok: true, dryRun, season: season.name, creadas: 0, restantes: missing.length }
    }

    let creadas = 0
    for (const member of missing.slice(0, BACKFILL_BATCH)) {
      await payload
        .create({
          collection: 'memberships',
          data: { member: member.id, season: season.id, paymentStatus: 'pending' },
          overrideAccess: true,
        })
        .then(() => {
          creadas++
        })
        .catch((err) =>
          payload.logger.error({ err, memberId: member.id }, 'backfillMemberships row failed'),
        )
    }
    return {
      ok: true,
      dryRun,
      season: season.name,
      creadas,
      restantes: Math.max(0, missing.length - creadas),
    }
  } catch (err) {
    payload.logger.error({ err }, 'backfillMembershipsAction failed')
    return {
      ok: false,
      error: 'No se pudieron abrir las cuotas.',
      dryRun,
      season: season.name,
      creadas: 0,
      restantes: 0,
    }
  }
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
      // Un archivo no viaja en este formulario; si llegara sería basura para una relación.
      if (type === 'file') continue
      // Checkboxes send nothing when unchecked; treat missing boolean as false.
      if (raw === null && type !== 'boolean') continue
      const field = valueFieldFor(type)
      const value =
        type === 'boolean'
          ? raw === 'on' || raw === 'yes' || raw === 'true'
          : type === 'number'
            ? // `Number('')` es 0: vaciar el campo escribía un cero inventado.
              (String(raw ?? '').trim() === '' ? null : Number(raw))
            : String(raw ?? '')

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
