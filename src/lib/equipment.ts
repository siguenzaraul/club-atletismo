import type { BasePayload, Where } from 'payload'

const idOf = (v: unknown): number | null =>
  v == null ? null : typeof v === 'object' ? ((v as { id?: number }).id ?? null) : (v as number)

/** Sum of delivery quantities for an (item,size,season) filtered by status. */
const sumQuantities = async (payload: BasePayload, where: Where): Promise<number> => {
  const res = await payload.find({
    collection: 'equipment-deliveries',
    where,
    limit: 1000,
    depth: 0,
    overrideAccess: true,
  })
  return res.docs.reduce((acc, d) => acc + (d.quantity ?? 1), 0)
}

/**
 * Recount delivered/reserved units from the real deliveries and update the
 * matching stock row (creating it with total 0 if it doesn't exist yet).
 * Always recounts from source, so repeated runs are self-correcting.
 */
export const recalcStock = async (
  payload: BasePayload,
  itemRaw: unknown,
  sizeRaw: unknown,
  seasonRaw: unknown,
): Promise<void> => {
  const item = idOf(itemRaw)
  const size = idOf(sizeRaw)
  const season = idOf(seasonRaw)
  if (!item || !size || !season) return

  const base: Where = { item: { equals: item }, size: { equals: size }, season: { equals: season } }
  const delivered = await sumQuantities(payload, { and: [base, { status: { equals: 'delivered' } }] })
  const reserved = await sumQuantities(payload, { and: [base, { status: { equals: 'reserved' } }] })

  const existing = await payload.find({
    collection: 'equipment-stock',
    where: base,
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const row = existing.docs[0]
  const total = row?.quantityTotal ?? 0
  const data = {
    quantityDelivered: delivered,
    quantityReserved: reserved,
    quantityAvailable: total - delivered - reserved,
  }
  if (row) {
    await payload.update({ collection: 'equipment-stock', id: row.id, data, overrideAccess: true })
  } else {
    await payload.create({
      collection: 'equipment-stock',
      data: { item, size, season, quantityTotal: 0, ...data },
      overrideAccess: true,
    })
  }
}
