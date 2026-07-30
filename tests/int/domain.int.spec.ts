import { existsSync, rmSync } from 'fs'
import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { describe, it, beforeAll, expect } from 'vitest'

let payload: Payload
let memberId: number
let seasonId: number
let typeId: number
let camisetaId: number
let tallaMId: number

describe('Club management domain', () => {
  beforeAll(async () => {
    if (existsSync('./tests/.test.db')) rmSync('./tests/.test.db')
    payload = await getPayload({ config: await config })

    await payload.create({
      collection: 'users',
      data: { name: 'Admin', email: 'admin@dom.run', password: 'changeme123', roles: ['admin'] },
    })
    const m = await payload.create({
      collection: 'members',
      data: {
        name: 'Socio',
        email: 'socio@dom.run',
        phone: '+34 600 100 100',
        password: 'changeme123',
        category: 'senior',
        imageRightsAccepted: true,
      },
    })
    memberId = m.id
    const s = await payload.create({ collection: 'seasons', data: { name: '2025/2026', isCurrent: true } })
    seasonId = s.id
    const t = await payload.create({
      collection: 'membership-types',
      data: { name: 'Adulto', requiresPayment: true, amount: 30 },
    })
    typeId = t.id
    const scale = await payload.create({ collection: 'size-scales', data: { name: 'Ropa' } })
    const talla = await payload.create({ collection: 'sizes', data: { label: 'M', scale: scale.id, order: 2 } })
    tallaMId = talla.id
    const item = await payload.create({
      collection: 'equipment-items',
      data: { name: 'Camiseta', sizeScale: scale.id },
    })
    camisetaId = item.id
    await payload.create({
      collection: 'equipment-stock',
      data: { item: camisetaId, size: tallaMId, season: seasonId, quantityTotal: 10 },
    })
  })

  it('mirrors a paid membership onto the member (status active + current type)', async () => {
    await payload.create({
      collection: 'memberships',
      data: { member: memberId, season: seasonId, type: typeId, paymentStatus: 'paid' },
    })
    const m = await payload.findByID({ collection: 'members', id: memberId })
    expect(m.membershipStatus).toBe('active')
    const currentType = typeof m.currentMembershipType === 'object' ? m.currentMembershipType?.id : m.currentMembershipType
    expect(currentType).toBe(typeId)
  })

  it('recalculates stock when a delivery is marked delivered', async () => {
    await payload.create({
      collection: 'equipment-deliveries',
      data: { member: memberId, season: seasonId, item: camisetaId, size: tallaMId, quantity: 2, status: 'delivered' },
    })
    const stock = await payload.find({
      collection: 'equipment-stock',
      where: { and: [{ item: { equals: camisetaId } }, { size: { equals: tallaMId } }, { season: { equals: seasonId } }] },
    })
    expect(stock.docs[0].quantityDelivered).toBe(2)
    expect(stock.docs[0].quantityAvailable).toBe(8)
  })

  it('cleans non-matching value columns and builds a label for custom attributes', async () => {
    const def = await payload.create({
      collection: 'attribute-definitions',
      data: { label: 'Talla de zapatilla', type: 'text' },
    })
    const attr = await payload.create({
      collection: 'member-attributes',
      // valueNumber should be wiped because the definition is text.
      data: { member: memberId, definition: def.id, valueText: '42', valueNumber: 99 },
    })
    expect(attr.valueText).toBe('42')
    expect(attr.valueNumber).toBeNull()
    expect(attr.label).toBe('Talla de zapatilla: 42')
  })

  it('prevents duplicate event registrations at the DB level', async () => {
    const ev = await payload.create({
      collection: 'events',
      data: { title: 'Carrera', series: 'club', date: new Date('2027-01-01').toISOString() },
    })
    await payload.create({ collection: 'event-registrations', data: { event: ev.id, member: memberId } })
    await expect(
      payload.create({ collection: 'event-registrations', data: { event: ev.id, member: memberId } }),
    ).rejects.toThrow()
  })
})
