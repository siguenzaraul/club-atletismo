// @vitest-environment node
import { existsSync, rmSync } from 'fs'
import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { beforeAll, describe, expect, it } from 'vitest'

import { ensureStandardSizes, reserveEquipmentForMember } from '@/lib/equipment'
import { isDuplicateIn } from '@/lib/registration'

let payload: Payload
let seasonId: number
let scaleId: number
let sizeM: number
let sizeL: number
let otherScaleSize: number
let arribaId: number
let abajoId: number
let librePackId: number
let tirantesId: number
let mangaCortaId: number
let mallaId: number
let calcetinesAId: number
let calcetinesBId: number

let nextEmail = 0
const makeMember = async () => {
  nextEmail++
  const m = await payload.create({
    collection: 'members',
    data: {
      name: `Socio ${nextEmail}`,
      email: `eq${nextEmail}@test.run`,
      phone: '+34 600 900 000',
      password: 'changeme123',
      imageRightsAccepted: true,
    },
  })
  return m.id
}

const deliver = (data: Record<string, unknown>) =>
  payload.create({
    collection: 'equipment-deliveries',
    data: data as never,
    overrideAccess: true,
  })

describe('Equipación por tipo de prenda', () => {
  beforeAll(async () => {
    if (existsSync('./tests/.test.db')) rmSync('./tests/.test.db')
    payload = await getPayload({ config: await config })

    const season = await payload.create({
      collection: 'seasons',
      data: { name: '2025/26', isCurrent: true },
    })
    seasonId = season.id

    const seeded = await ensureStandardSizes(payload)
    scaleId = seeded.scaleId
    const sizes = await payload.find({
      collection: 'sizes',
      where: { scale: { equals: scaleId } },
      limit: 100,
      depth: 0,
      overrideAccess: true,
    })
    sizeM = sizes.docs.find((s) => s.label === 'M')!.id
    sizeL = sizes.docs.find((s) => s.label === 'L')!.id

    // Una escala aparte, para comprobar que no se puede colar una talla de otra escala.
    const otherScale = await payload.create({
      collection: 'size-scales',
      data: { name: 'Calzado', slug: 'calzado' },
      overrideAccess: true,
    })
    const other = await payload.create({
      collection: 'sizes',
      data: { label: '42', scale: otherScale.id },
      overrideAccess: true,
    })
    otherScaleSize = other.id

    const arriba = await payload.create({
      collection: 'equipment-categories',
      data: { name: 'Parte de arriba' },
      overrideAccess: true,
    })
    arribaId = arriba.id
    const abajo = await payload.create({
      collection: 'equipment-categories',
      data: { name: 'Parte de abajo' },
      overrideAccess: true,
    })
    abajoId = abajo.id
    const libre = await payload.create({
      collection: 'equipment-categories',
      data: { name: 'Complementos', exclusive: false },
      overrideAccess: true,
    })
    librePackId = libre.id

    const mk = async (name: string, category: number | null) => {
      const i = await payload.create({
        collection: 'equipment-items',
        data: { name, sizeScale: scaleId, ...(category ? { category } : {}) },
        overrideAccess: true,
      })
      return i.id
    }
    tirantesId = await mk('Camiseta de tirantes', arribaId)
    mangaCortaId = await mk('Camiseta de manga corta', arribaId)
    mallaId = await mk('Malla larga', abajoId)
    calcetinesAId = await mk('Calcetines blancos', librePackId)
    calcetinesBId = await mk('Calcetines negros', librePackId)
  })

  describe('tallas estándar', () => {
    it('siembra XS→4XL', async () => {
      const sizes = await payload.find({
        collection: 'sizes',
        where: { scale: { equals: scaleId } },
        limit: 100,
        depth: 0,
        overrideAccess: true,
      })
      expect(sizes.docs.map((s) => s.label).sort()).toEqual(
        ['3XL', '4XL', 'L', 'M', 'S', 'XL', 'XS', 'XXL'].sort(),
      )
    })

    it('es idempotente: no duplica al reejecutarse', async () => {
      const before = await payload.count({ collection: 'sizes', overrideAccess: true })
      const res = await ensureStandardSizes(payload)
      const after = await payload.count({ collection: 'sizes', overrideAccess: true })
      expect(res.created).toEqual([])
      expect(after.totalDocs).toBe(before.totalDocs)
    })

    it('reconoce una talla escrita de otra forma en vez de duplicarla', async () => {
      // El club tecleó "2XL" a mano; el catálogo estándar lo llama "XXL". Hay que sembrar
      // sobre LA MISMA escala que toca `ensureStandardSizes`, o no se prueba nada.
      const before = await payload.find({
        collection: 'sizes',
        where: { and: [{ scale: { equals: scaleId } }, { label: { equals: 'XXL' } }] },
        overrideAccess: true,
      })
      // Renombramos la XXL sembrada a "2XL" para simular la grafía del club.
      await payload.update({
        collection: 'sizes',
        id: before.docs[0]!.id,
        data: { label: '2XL' },
        overrideAccess: true,
      })

      const res = await ensureStandardSizes(payload)

      // No debe haber creado una XXL nueva: reconoce el 2XL existente como equivalente.
      expect(res.created).not.toContain('XXL')
      expect(res.kept).toContain('2XL')
      const xxl = await payload.find({
        collection: 'sizes',
        where: {
          and: [{ scale: { equals: scaleId } }, { or: [{ label: { equals: 'XXL' } }, { label: { equals: '2XL' } }] }],
        },
        overrideAccess: true,
      })
      expect(xxl.totalDocs).toBe(1)

      // Se deja como estaba para no arrastrar el renombrado a los demás tests.
      await payload.update({
        collection: 'sizes',
        id: before.docs[0]!.id,
        data: { label: 'XXL' },
        overrideAccess: true,
      })
    })
  })

  describe('exclusividad por tipo de prenda', () => {
    it('rechaza una segunda prenda del mismo tipo', async () => {
      const memberId = await makeMember()
      await deliver({ member: memberId, season: seasonId, item: tirantesId, size: sizeM, status: 'delivered' })

      const err = await deliver({
        member: memberId,
        season: seasonId,
        item: mangaCortaId,
        size: sizeM,
        status: 'delivered',
      })
        .then(() => null)
        .catch((e) => e)

      expect(err).toBeTruthy()
      expect(isDuplicateIn(err, 'equipment-deliveries')).toBe(true)
    })

    it('admite prendas de tipos distintos', async () => {
      const memberId = await makeMember()
      await deliver({ member: memberId, season: seasonId, item: tirantesId, size: sizeM, status: 'delivered' })
      await expect(
        deliver({ member: memberId, season: seasonId, item: mallaId, size: sizeM, status: 'delivered' }),
      ).resolves.toBeTruthy()
    })

    it('devolver la prenda libera la plaza', async () => {
      const memberId = await makeMember()
      const first = await deliver({
        member: memberId,
        season: seasonId,
        item: tirantesId,
        size: sizeM,
        status: 'delivered',
      })
      await payload.update({
        collection: 'equipment-deliveries',
        id: first.id,
        data: { status: 'returned' },
        overrideAccess: true,
      })
      await expect(
        deliver({ member: memberId, season: seasonId, item: mangaCortaId, size: sizeM, status: 'delivered' }),
      ).resolves.toBeTruthy()
    })

    it('cambiar la talla de una entrega no choca consigo misma', async () => {
      const memberId = await makeMember()
      const d = await deliver({
        member: memberId,
        season: seasonId,
        item: tirantesId,
        size: sizeM,
        status: 'delivered',
      })
      await expect(
        payload.update({
          collection: 'equipment-deliveries',
          id: d.id,
          data: { size: sizeL },
          overrideAccess: true,
        }),
      ).resolves.toBeTruthy()
    })

    it('un update parcial de sólo el estado no libera la plaza', async () => {
      // `originalDoc`: sin él, el hook recalcularía la clave sin artículo y la pondría a NULL.
      const memberId = await makeMember()
      const d = await deliver({
        member: memberId,
        season: seasonId,
        item: tirantesId,
        size: sizeM,
        status: 'reserved',
      })
      await payload.update({
        collection: 'equipment-deliveries',
        id: d.id,
        data: { status: 'delivered' },
        overrideAccess: true,
      })
      const err = await deliver({
        member: memberId,
        season: seasonId,
        item: mangaCortaId,
        size: sizeM,
        status: 'delivered',
      })
        .then(() => null)
        .catch((e) => e)
      expect(isDuplicateIn(err, 'equipment-deliveries')).toBe(true)
    })

    it('un tipo no excluyente admite varias prendas', async () => {
      const memberId = await makeMember()
      await deliver({ member: memberId, season: seasonId, item: calcetinesAId, size: sizeM, status: 'delivered' })
      await expect(
        deliver({ member: memberId, season: seasonId, item: calcetinesBId, size: sizeM, status: 'delivered' }),
      ).resolves.toBeTruthy()
    })

    it('los artículos sin tipo conviven — protege el histórico de producción', async () => {
      const sinTipo = await payload.create({
        collection: 'equipment-items',
        data: { name: 'Artículo antiguo', sizeScale: scaleId },
        overrideAccess: true,
      })
      const otro = await payload.create({
        collection: 'equipment-items',
        data: { name: 'Otro antiguo', sizeScale: scaleId },
        overrideAccess: true,
      })
      const memberId = await makeMember()
      await deliver({ member: memberId, season: seasonId, item: sinTipo.id, size: sizeM, status: 'delivered' })
      await expect(
        deliver({ member: memberId, season: seasonId, item: otro.id, size: sizeM, status: 'delivered' }),
      ).resolves.toBeTruthy()
    })
  })

  describe('stock', () => {
    const stockFor = async (item: number, size: number) => {
      const res = await payload.find({
        collection: 'equipment-stock',
        where: {
          and: [
            { item: { equals: item } },
            { size: { equals: size } },
            { season: { equals: seasonId } },
          ],
        },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })
      return res.docs[0]
    }

    it('una reserva se ve en el stock en la misma llamada', async () => {
      // OJO: este test corre sobre SQLite, así que NO puede detectar la regresión de
      // visibilidad dentro de la transacción de Postgres (quitar `req` de `recalcStock` lo
      // dejaría igual de verde). Lo que sí fija es que una reserva cuenta como reservada.
      const memberId = await makeMember()
      await deliver({ member: memberId, season: seasonId, item: mallaId, size: sizeL, status: 'reserved' })
      const stock = await stockFor(mallaId, sizeL)
      expect(stock?.quantityReserved).toBe(1)
    })

    it('«solicitada» no descuenta stock', async () => {
      const memberId = await makeMember()
      await deliver({ member: memberId, season: seasonId, item: mangaCortaId, size: sizeL, status: 'requested' })
      const stock = await stockFor(mangaCortaId, sizeL)
      expect(stock?.quantityReserved ?? 0).toBe(0)
      expect(stock?.quantityDelivered ?? 0).toBe(0)
    })

    /** Artículo recién creado: el recuento de stock es global por (artículo, talla), así que
     *  reutilizar uno de otro test arrastraría sus unidades. */
    const freshItem = async (name: string) => {
      const i = await payload.create({
        collection: 'equipment-items',
        data: { name, sizeScale: scaleId, category: librePackId },
        overrideAccess: true,
      })
      return i.id
    }

    it('la cantidad se suma, no se cuenta por filas', async () => {
      const itemId = await freshItem('Gorra')
      const memberId = await makeMember()
      await deliver({
        member: memberId,
        season: seasonId,
        item: itemId,
        size: sizeL,
        quantity: 3,
        status: 'delivered',
      })
      const stock = await stockFor(itemId, sizeL)
      expect(stock?.quantityDelivered).toBe(3)
    })

    it('las unidades compradas sobreviven al recálculo', async () => {
      // El `beforeChange` de colección recibe datos PARCIALES: corre antes de que Payload
      // fusione con el documento existente. `recalcStock` manda los tres contadores pero no
      // `quantityTotal`, así que sin el respaldo en `originalDoc` el `?? 0` machacaba las
      // unidades compradas y «Quedan» salía negativo en cuanto había una entrega.
      const itemId = await freshItem('Chaqueta')
      await payload.create({
        collection: 'equipment-stock',
        data: { item: itemId, size: sizeM, season: seasonId, quantityTotal: 20 },
        overrideAccess: true,
      })

      const memberId = await makeMember()
      await deliver({ member: memberId, season: seasonId, item: itemId, size: sizeM, status: 'delivered' })

      const stock = await stockFor(itemId, sizeM)
      expect(stock?.quantityTotal).toBe(20)
      expect(stock?.quantityDelivered).toBe(1)
      expect(stock?.quantityAvailable).toBe(19)
    })

    it('editar sólo las compradas no pone a cero entregadas y reservadas', async () => {
      // El mismo fallo en la dirección contraria: es lo que hace el staff desde /gestion/stock.
      const itemId = await freshItem('Cortavientos')
      const memberId = await makeMember()
      await deliver({ member: memberId, season: seasonId, item: itemId, size: sizeM, status: 'delivered' })

      const row = await stockFor(itemId, sizeM)
      await payload.update({
        collection: 'equipment-stock',
        id: row!.id,
        data: { quantityTotal: 10 },
        overrideAccess: true,
      })

      const after = await stockFor(itemId, sizeM)
      expect(after?.quantityDelivered).toBe(1)
      expect(after?.quantityAvailable).toBe(9)
    })

    it('con stock disponible se reserva, no se manda a lista de espera', async () => {
      // Contrapartida del test de lista de espera: sin este, el bug de «Quedan» era invisible
      // porque todo acababa en `requested` por un stock mal calculado y nadie lo notaba.
      const itemId = await freshItem('Camiseta térmica')
      await payload.create({
        collection: 'equipment-stock',
        data: { item: itemId, size: sizeL, season: seasonId, quantityTotal: 5 },
        overrideAccess: true,
      })

      const memberId = await makeMember()
      const outcome = await reserveEquipmentForMember(payload, {
        memberId,
        seasonId,
        selections: [{ categoryId: librePackId, itemId, sizeId: sizeL }],
        reserveStock: true,
        allowOverbooking: false,
      })

      expect(outcome).toMatchObject({ reserved: 1, waitlisted: 0 })
      expect((await stockFor(itemId, sizeL))?.quantityAvailable).toBe(4)
    })

    it('cambiar de temporada mueve el recuento y no deja fantasmas', async () => {
      // El stock se lleva por (artículo, talla, TEMPORADA): si el recálculo no mira la
      // temporada anterior, ésta se queda con una unidad de más para siempre.
      const otraTemporada = await payload.create({
        collection: 'seasons',
        data: { name: '2024/25' },
        overrideAccess: true,
      })
      const itemId = await freshItem('Sudadera')
      const memberId = await makeMember()
      const d = await deliver({
        member: memberId,
        season: seasonId,
        item: itemId,
        size: sizeM,
        status: 'delivered',
      })
      expect((await stockFor(itemId, sizeM))?.quantityDelivered).toBe(1)

      await payload.update({
        collection: 'equipment-deliveries',
        id: d.id,
        data: { season: otraTemporada.id },
        overrideAccess: true,
      })

      expect((await stockFor(itemId, sizeM))?.quantityDelivered).toBe(0)
    })

    it('cambiar de talla mueve el recuento y no lo duplica', async () => {
      const itemId = await freshItem('Braga de cuello')
      const memberId = await makeMember()
      const d = await deliver({
        member: memberId,
        season: seasonId,
        item: itemId,
        size: sizeM,
        status: 'delivered',
      })
      await payload.update({
        collection: 'equipment-deliveries',
        id: d.id,
        data: { size: sizeL },
        overrideAccess: true,
      })
      // Sin recalcular también la combinación anterior, la talla M se quedaría inflada.
      expect((await stockFor(itemId, sizeM))?.quantityDelivered).toBe(0)
      expect((await stockFor(itemId, sizeL))?.quantityDelivered).toBe(1)
    })
  })

  describe('reserveEquipmentForMember', () => {
    const args = {
      reserveStock: true,
      allowOverbooking: true,
    }

    it('crea la reserva con pago pendiente y origen «alta»', async () => {
      const memberId = await makeMember()
      const outcome = await reserveEquipmentForMember(payload, {
        memberId,
        seasonId,
        selections: [{ categoryId: arribaId, itemId: tirantesId, sizeId: sizeM }],
        ...args,
      })
      expect(outcome.reserved).toBe(1)

      const res = await payload.find({
        collection: 'equipment-deliveries',
        where: { member: { equals: memberId } },
        depth: 0,
        overrideAccess: true,
      })
      expect(res.docs[0]).toMatchObject({
        status: 'reserved',
        payment: 'pending',
        source: 'registration',
      })
    })

    it('rechaza un artículo que no es del tipo declarado', async () => {
      const memberId = await makeMember()
      const outcome = await reserveEquipmentForMember(payload, {
        memberId,
        // El POST dice «parte de arriba» pero manda una malla.
        selections: [{ categoryId: arribaId, itemId: mallaId, sizeId: sizeM }],
        seasonId,
        ...args,
      })
      expect(outcome.reserved).toBe(0)
      expect(outcome.skipped).toHaveLength(1)
    })

    it('rechaza una talla de otra escala', async () => {
      const memberId = await makeMember()
      const outcome = await reserveEquipmentForMember(payload, {
        memberId,
        selections: [{ categoryId: arribaId, itemId: tirantesId, sizeId: otherScaleSize }],
        seasonId,
        ...args,
      })
      expect(outcome.reserved).toBe(0)
      expect(outcome.skipped).toHaveLength(1)
    })

    it('rechaza una talla desactivada', async () => {
      const size = await payload.create({
        collection: 'sizes',
        data: { label: '5XL', scale: scaleId, active: false },
        overrideAccess: true,
      })
      const memberId = await makeMember()
      const outcome = await reserveEquipmentForMember(payload, {
        memberId,
        selections: [{ categoryId: arribaId, itemId: tirantesId, sizeId: size.id }],
        seasonId,
        ...args,
      })
      expect(outcome.reserved).toBe(0)
    })

    it('sin temporada no crea nada', async () => {
      const memberId = await makeMember()
      const outcome = await reserveEquipmentForMember(payload, {
        memberId,
        seasonId: null,
        selections: [{ categoryId: arribaId, itemId: tirantesId, sizeId: sizeM }],
        ...args,
      })
      expect(outcome).toEqual({ reserved: 0, waitlisted: 0, skipped: [] })
    })

    it('es idempotente: llamarla dos veces deja una sola entrega', async () => {
      const memberId = await makeMember()
      const selections = [{ categoryId: arribaId, itemId: tirantesId, sizeId: sizeM }]
      await reserveEquipmentForMember(payload, { memberId, seasonId, selections, ...args })
      const second = await reserveEquipmentForMember(payload, { memberId, seasonId, selections, ...args })

      expect(second.reserved).toBe(0)
      const count = await payload.count({
        collection: 'equipment-deliveries',
        where: { member: { equals: memberId } },
        overrideAccess: true,
      })
      expect(count.totalDocs).toBe(1)
    })

    it('sin overbooking y sin stock, pasa a lista de espera', async () => {
      const memberId = await makeMember()
      const outcome = await reserveEquipmentForMember(payload, {
        memberId,
        seasonId,
        selections: [{ categoryId: abajoId, itemId: mallaId, sizeId: sizeM }],
        reserveStock: true,
        allowOverbooking: false,
      })
      expect(outcome).toMatchObject({ reserved: 0, waitlisted: 1 })

      const res = await payload.find({
        collection: 'equipment-deliveries',
        where: { member: { equals: memberId } },
        depth: 0,
        overrideAccess: true,
      })
      expect(res.docs[0]?.status).toBe('requested')
    })
  })
})
