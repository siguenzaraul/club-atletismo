import type { BasePayload, PayloadRequest, Where } from 'payload'

import { STANDARD_CLOTHING_SCALE, STANDARD_SIZES, normalizeSizeLabel } from './sizes'

export const idOf = (v: unknown): number | null =>
  v == null ? null : typeof v === 'object' ? ((v as { id?: number }).id ?? null) : (v as number)

/**
 * Estados que ocupan plaza en su tipo de prenda. `returned` no: devolver libera el hueco para
 * que el socio pueda elegir otra prenda del mismo tipo. `requested` sí ocupa (es una elección
 * en firme, aunque no descuente stock).
 */
const OCCUPYING_STATUSES: readonly string[] = ['requested', 'reserved', 'delivered']

/**
 * Clave de ocupación de una entrega, o `null` si esa fila no debe bloquear el tipo de prenda.
 *
 * Un índice único sobre esta columna da la exclusividad "una sola prenda por socio, temporada
 * y tipo" sin necesitar un índice **parcial** (`WHERE status <> 'returned'`), que Payload no
 * sabe generar y que no se puede escribir a mano porque `src/migrations/` es autogenerado. El
 * truco es que Postgres y SQLite tratan los NULL como distintos entre sí en un índice único:
 * devolver una prenda, no tener tipo, o pertenecer a un tipo no excluyente ponen la clave a
 * NULL y la fila deja de competir.
 *
 * Deliberadamente NO depende de la talla: cambiar de talla es un update de la misma fila y no
 * debe chocar consigo mismo.
 */
export const slotKeyFor = (args: {
  memberId: number | null
  seasonId: number | null
  categoryId: number | null
  status: string | null | undefined
  exclusive: boolean
}): string | null => {
  const { memberId, seasonId, categoryId, status, exclusive } = args
  if (!exclusive || !memberId || !seasonId || !categoryId) return null
  if (!OCCUPYING_STATUSES.includes(status ?? 'requested')) return null
  return `${memberId}:${seasonId}:${categoryId}`
}

/** Sum of delivery quantities for an (item,size,season) filtered by status. */
const sumQuantities = async (
  payload: BasePayload,
  where: Where,
  req?: PayloadRequest,
): Promise<number> => {
  const res = await payload.find({
    collection: 'equipment-deliveries',
    where,
    limit: 1000,
    depth: 0,
    overrideAccess: true,
    req,
  })
  return res.docs.reduce((acc, d) => acc + (d.quantity ?? 1), 0)
}

/**
 * Recount delivered/reserved units from the real deliveries and update the
 * matching stock row (creating it with total 0 if it doesn't exist yet).
 * Always recounts from source, so repeated runs are self-correcting.
 *
 * `req` NO es opcional por comodidad: en Postgres los `afterChange` corren dentro de la
 * transacción del `create`, y sin `req` estas consultas salen de ella. Resultado: no ven la
 * entrega que las acaba de disparar (el contador se queda una unidad corto) y el update del
 * stock se commitea aunque la entrega revierta. Pásalo siempre desde un hook.
 */
export const recalcStock = async (
  payload: BasePayload,
  itemRaw: unknown,
  sizeRaw: unknown,
  seasonRaw: unknown,
  req?: PayloadRequest,
): Promise<void> => {
  const item = idOf(itemRaw)
  const size = idOf(sizeRaw)
  const season = idOf(seasonRaw)
  if (!item || !size || !season) return

  const base: Where = { item: { equals: item }, size: { equals: size }, season: { equals: season } }
  const delivered = await sumQuantities(
    payload,
    { and: [base, { status: { equals: 'delivered' } }] },
    req,
  )
  const reserved = await sumQuantities(
    payload,
    { and: [base, { status: { equals: 'reserved' } }] },
    req,
  )

  const existing = await payload.find({
    collection: 'equipment-stock',
    where: base,
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req,
  })
  const row = existing.docs[0]
  const total = row?.quantityTotal ?? 0
  const data = {
    quantityDelivered: delivered,
    quantityReserved: reserved,
    quantityAvailable: total - delivered - reserved,
  }
  if (row) {
    await payload.update({
      collection: 'equipment-stock',
      id: row.id,
      data,
      overrideAccess: true,
      req,
    })
  } else {
    await payload.create({
      collection: 'equipment-stock',
      data: { item, size, season, quantityTotal: 0, ...data },
      overrideAccess: true,
      req,
    })
  }
}

// ── Catálogo estándar de tallas ───────────────────────────────────────────────

export type EnsureSizesResult = {
  scaleId: number
  /** Tallas creadas en esta pasada. */
  created: string[]
  /** Tallas que ya existían (con cualquier grafía: 2XL cuenta como XXL). */
  kept: string[]
}

/**
 * Asegura que la escala de ropa tiene las tallas XS→4XL, sin duplicar lo que el club ya tecleó.
 *
 * Idempotente por construcción: **nunca borra, nunca desactiva y nunca renombra**. Sólo añade
 * lo que falta y corrige el orden. Por eso se puede llamar desde el seed y desde un botón de
 * mantenimiento en producción sin pensárselo dos veces.
 *
 * No va en el `up()` de una migración a propósito: `src/migrations/` es autogenerado y un
 * INSERT ahí no sería idempotente si se reejecuta el baseline sobre otra rama de Neon.
 */
export const ensureStandardSizes = async (
  payload: BasePayload,
  req?: PayloadRequest,
): Promise<EnsureSizesResult> => {
  const existingScale = await payload.find({
    collection: 'size-scales',
    where: { slug: { equals: STANDARD_CLOTHING_SCALE.slug } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req,
  })

  const scale =
    existingScale.docs[0] ??
    (await payload.create({
      collection: 'size-scales',
      data: { name: STANDARD_CLOTHING_SCALE.name, slug: STANDARD_CLOTHING_SCALE.slug },
      overrideAccess: true,
      req,
    }))

  const current = await payload.find({
    collection: 'sizes',
    where: { scale: { equals: scale.id } },
    limit: 500,
    depth: 0,
    overrideAccess: true,
    req,
  })

  const byNormalized = new Map(current.docs.map((s) => [normalizeSizeLabel(s.label), s]))
  const created: string[] = []
  const kept: string[] = []

  for (const [index, label] of STANDARD_SIZES.entries()) {
    const existing = byNormalized.get(label)
    if (existing) {
      kept.push(existing.label)
      // Sólo se corrige el orden; la etiqueta que escribió el club se respeta.
      if (existing.order !== index) {
        await payload.update({
          collection: 'sizes',
          id: existing.id,
          data: { order: index },
          overrideAccess: true,
          req,
        })
      }
      continue
    }
    await payload.create({
      collection: 'sizes',
      data: { label, scale: scale.id, order: index, active: true },
      overrideAccess: true,
      req,
    })
    created.push(label)
  }

  return { scaleId: scale.id, created, kept }
}

// ── Reserva de equipación desde el alta pública ───────────────────────────────

export type GarmentSelection = { categoryId: number; itemId: number; sizeId: number | null }

export type ReserveOutcome = {
  /** Entregas creadas en estado «Reservada» (descuentan stock). */
  reserved: number
  /** Creadas como «Solicitada» por falta de stock: lista de espera, no descuentan. */
  waitlisted: number
  /** Selecciones descartadas por incoherentes o ya cubiertas, con el motivo. */
  skipped: string[]
}

const EMPTY_OUTCOME: ReserveOutcome = { reserved: 0, waitlisted: 0, skipped: [] }

/**
 * Crea las entregas de equipación que el socio eligió al darse de alta.
 *
 * Revalida TODO contra la base de datos: que el artículo exista y esté activo, que pertenezca
 * al tipo declarado y que la talla sea de la escala de ese artículo. El formulario no es una
 * fuente de verdad — un POST a mano podría reservar stock de algo que el club no ofrece.
 *
 * Cada línea va con su propio try/catch: una talla agotada o un choque de exclusividad no
 * pueden tumbar un alta que ya está hecha.
 */
export const reserveEquipmentForMember = async (
  payload: BasePayload,
  args: {
    memberId: number
    seasonId: number | null
    selections: GarmentSelection[]
    reserveStock: boolean
    allowOverbooking: boolean
    req?: PayloadRequest
  },
): Promise<ReserveOutcome> => {
  const { memberId, seasonId, selections, reserveStock, allowOverbooking, req } = args
  if (!seasonId || selections.length === 0) return EMPTY_OUTCOME

  const outcome: ReserveOutcome = { reserved: 0, waitlisted: 0, skipped: [] }

  // Tipos de prenda que este socio ya tiene cubiertos esta temporada: evita el choque contra el
  // índice único en el caso normal y deja el índice como red de seguridad para las carreras.
  const existing = await payload.find({
    collection: 'equipment-deliveries',
    where: { and: [{ member: { equals: memberId } }, { season: { equals: seasonId } }] },
    limit: 100,
    depth: 0,
    overrideAccess: true,
    req,
  })
  const covered = new Set(
    existing.docs
      .filter((d) => OCCUPYING_STATUSES.includes(d.status ?? 'requested'))
      .map((d) => idOf(d.category))
      .filter(Boolean),
  )

  for (const selection of selections) {
    const { categoryId, itemId, sizeId } = selection
    if (!categoryId || !itemId) continue

    if (covered.has(categoryId)) {
      outcome.skipped.push(`categoría ${categoryId}: ya cubierta`)
      continue
    }

    const item = await payload
      .findByID({ collection: 'equipment-items', id: itemId, depth: 0, overrideAccess: true, req })
      .catch(() => null)
    if (!item || item.active === false) {
      outcome.skipped.push(`artículo ${itemId}: no existe o está inactivo`)
      continue
    }
    if (idOf(item.category) !== categoryId) {
      outcome.skipped.push(`artículo ${itemId}: no pertenece al tipo declarado`)
      continue
    }

    let size = null
    if (sizeId) {
      size = await payload
        .findByID({ collection: 'sizes', id: sizeId, depth: 0, overrideAccess: true, req })
        .catch(() => null)
      if (!size || size.active === false) {
        outcome.skipped.push(`talla ${sizeId}: no existe o está inactiva`)
        continue
      }
      if (idOf(size.scale) !== idOf(item.sizeScale)) {
        outcome.skipped.push(`talla ${sizeId}: no es de la escala del artículo`)
        continue
      }
    }

    // Estado: reservar descuenta stock; solicitar no. Si el club ha desactivado el overbooking
    // y no quedan unidades, la elección pasa a lista de espera en vez de dejar el stock en
    // negativo.
    let status: 'reserved' | 'requested' = reserveStock ? 'reserved' : 'requested'
    if (status === 'reserved' && !allowOverbooking && size) {
      const stock = await payload.find({
        collection: 'equipment-stock',
        where: {
          and: [
            { item: { equals: itemId } },
            { size: { equals: size.id } },
            { season: { equals: seasonId } },
          ],
        },
        limit: 1,
        depth: 0,
        overrideAccess: true,
        req,
      })
      if ((stock.docs[0]?.quantityAvailable ?? 0) <= 0) status = 'requested'
    }

    try {
      await payload.create({
        collection: 'equipment-deliveries',
        data: {
          member: memberId,
          season: seasonId,
          item: itemId,
          size: size?.id ?? undefined,
          quantity: 1,
          status,
          // El alta pública no sabe si la cuota cubre la prenda: lo decide el staff al entregar.
          payment: 'pending',
          source: 'registration',
        },
        // `create` de esta colección es isAdminOrEditor y quien se registra es un socio.
        overrideAccess: true,
        req,
      })
      if (status === 'reserved') outcome.reserved++
      else outcome.waitlisted++
      covered.add(categoryId)
    } catch (err) {
      payload.logger.error({ err, itemId, memberId }, 'reserveEquipmentForMember: línea fallida')
      outcome.skipped.push(`artículo ${itemId}: no se pudo reservar`)
    }
  }

  return outcome
}
