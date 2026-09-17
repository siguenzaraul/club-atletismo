// @vitest-environment node
import { existsSync, rmSync } from 'fs'
import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { beforeAll, describe, expect, it } from 'vitest'

import { ensureStandardSizes } from '@/lib/equipment'
import { getMemberEquipmentState, updateMemberEquipment } from '@/lib/member-equipment'

let payload: Payload
let seasonId: number
let scaleId: number
let sizeM: number
let sizeL: number
let otherScaleSize: number
let arribaId: number
let abajoId: number
let tirantesId: number
let mangaCortaId: number
let mallaId: number

let nextEmail = 0
const makeMember = async () => {
  nextEmail++
  const m = await payload.create({
    collection: 'members',
    data: {
      name: `Socio ${nextEmail}`,
      email: `me${nextEmail}@test.run`,
      phone: '+34 600 900 000',
      password: 'changeme123',
      imageRightsAccepted: true,
    },
  })
  return m.id
}

const deliveriesOf = async (memberId: number) =>
  (
    await payload.find({
      collection: 'equipment-deliveries',
      where: { member: { equals: memberId } },
      depth: 0,
      limit: 50,
      overrideAccess: true,
    })
  ).docs

const idOf = (v: unknown): number | null =>
  v == null ? null : typeof v === 'object' ? ((v as { id?: number }).id ?? null) : (v as number)

describe('El socio cambia su equipación desde el perfil', () => {
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

    const otherScale = await payload.create({
      collection: 'size-scales',
      data: { name: 'Calzado', slug: 'calzado' },
      overrideAccess: true,
    })
    otherScaleSize = (
      await payload.create({
        collection: 'sizes',
        data: { label: '42', scale: otherScale.id },
        overrideAccess: true,
      })
    ).id

    arribaId = (
      await payload.create({
        collection: 'equipment-categories',
        data: { name: 'Parte de arriba', slug: 'parte-de-arriba' },
        overrideAccess: true,
      })
    ).id
    abajoId = (
      await payload.create({
        collection: 'equipment-categories',
        data: { name: 'Parte de abajo', slug: 'parte-de-abajo' },
        overrideAccess: true,
      })
    ).id

    const mk = async (name: string, category: number) =>
      (
        await payload.create({
          collection: 'equipment-items',
          data: { name, sizeScale: scaleId, category },
          overrideAccess: true,
        })
      ).id
    tirantesId = await mk('Camiseta de tirantes', arribaId)
    mangaCortaId = await mk('Camiseta de manga corta', arribaId)
    mallaId = await mk('Malla larga', abajoId)

    await payload.updateGlobal({
      slug: 'registration-form',
      data: {
        garments: [
          { category: arribaId, enabled: true, required: true, askSize: true },
          { category: abajoId, enabled: true, required: false, askSize: true },
        ],
        reserveStock: true,
        allowOverbooking: true,
      },
      overrideAccess: true,
    })
  })

  it('crea la elección cuando el socio no tenía nada', async () => {
    const memberId = await makeMember()
    const res = await updateMemberEquipment(payload, {
      memberId,
      choices: [{ key: 'parte-de-arriba', itemId: tirantesId, sizeId: sizeM }],
    })
    expect(res.ok).toBe(true)

    const docs = await deliveriesOf(memberId)
    expect(docs).toHaveLength(1)
    expect(idOf(docs[0].item)).toBe(tirantesId)
    expect(idOf(docs[0].size)).toBe(sizeM)
    expect(docs[0].status).toBe('reserved')
  })

  it('cambia la talla sin duplicar la entrega', async () => {
    const memberId = await makeMember()
    await updateMemberEquipment(payload, {
      memberId,
      choices: [{ key: 'parte-de-arriba', itemId: tirantesId, sizeId: sizeM }],
    })
    const before = (await deliveriesOf(memberId))[0]

    const res = await updateMemberEquipment(payload, {
      memberId,
      choices: [{ key: 'parte-de-arriba', itemId: tirantesId, sizeId: sizeL }],
    })
    expect(res).toMatchObject({ ok: true, changed: 1 })

    const docs = await deliveriesOf(memberId)
    expect(docs).toHaveLength(1)
    // La MISMA fila: si borrase y recreara, la clave de exclusividad chocaría consigo misma.
    expect(docs[0].id).toBe(before.id)
    expect(idOf(docs[0].size)).toBe(sizeL)
  })

  it('cambia de prenda dentro del mismo tipo y devuelve el stock de la anterior', async () => {
    // Otros socios de este mismo fichero también reservan estas combinaciones, así que se mide
    // la VARIACIÓN, no el valor absoluto: un total fijo dependería del orden de los tests.
    const reservedFor = async (item: number): Promise<number> =>
      (
        await payload.find({
          collection: 'equipment-stock',
          where: {
            and: [
              { item: { equals: item } },
              { size: { equals: sizeM } },
              { season: { equals: seasonId } },
            ],
          },
          limit: 1,
          depth: 0,
          overrideAccess: true,
        })
      ).docs[0]?.quantityReserved ?? 0

    const memberId = await makeMember()
    await updateMemberEquipment(payload, {
      memberId,
      choices: [{ key: 'parte-de-arriba', itemId: tirantesId, sizeId: sizeM }],
    })
    const tirantesAntes = await reservedFor(tirantesId)
    const mangaAntes = await reservedFor(mangaCortaId)

    await updateMemberEquipment(payload, {
      memberId,
      choices: [{ key: 'parte-de-arriba', itemId: mangaCortaId, sizeId: sizeM }],
    })

    const docs = await deliveriesOf(memberId)
    expect(docs).toHaveLength(1)
    expect(idOf(docs[0].item)).toBe(mangaCortaId)

    // La combinación abandonada no puede quedarse con la unidad reservada.
    expect(await reservedFor(tirantesId)).toBe(tirantesAntes - 1)
    expect(await reservedFor(mangaCortaId)).toBe(mangaAntes + 1)
  })

  it('no deja tocar una prenda ya entregada', async () => {
    const memberId = await makeMember()
    await updateMemberEquipment(payload, {
      memberId,
      choices: [{ key: 'parte-de-arriba', itemId: tirantesId, sizeId: sizeM }],
    })
    const delivery = (await deliveriesOf(memberId))[0]
    await payload.update({
      collection: 'equipment-deliveries',
      id: delivery.id,
      data: { status: 'delivered' },
      overrideAccess: true,
    })

    const res = await updateMemberEquipment(payload, {
      memberId,
      choices: [{ key: 'parte-de-arriba', itemId: mangaCortaId, sizeId: sizeL }],
    })
    expect(res).toMatchObject({ ok: true, changed: 0 })

    const docs = await deliveriesOf(memberId)
    expect(docs).toHaveLength(1)
    expect(idOf(docs[0].item)).toBe(tirantesId)
    expect(idOf(docs[0].size)).toBe(sizeM)
    expect(docs[0].status).toBe('delivered')

    const state = await getMemberEquipmentState(payload, memberId)
    const arriba = state.garments.find((g) => g.garment.key === 'parte-de-arriba')!
    expect(arriba.locked).toBe(true)
    expect(arriba.currentLabel).toBe('Camiseta de tirantes · talla M')
  })

  it('quita una prenda opcional, pero no deja quitar una obligatoria', async () => {
    const memberId = await makeMember()
    await updateMemberEquipment(payload, {
      memberId,
      choices: [
        { key: 'parte-de-arriba', itemId: tirantesId, sizeId: sizeM },
        { key: 'parte-de-abajo', itemId: mallaId, sizeId: sizeM },
      ],
    })
    expect(await deliveriesOf(memberId)).toHaveLength(2)

    const quitarOpcional = await updateMemberEquipment(payload, {
      memberId,
      choices: [{ key: 'parte-de-abajo', itemId: null, sizeId: null }],
    })
    expect(quitarOpcional.ok).toBe(true)
    expect(await deliveriesOf(memberId)).toHaveLength(1)

    const quitarObligatoria = await updateMemberEquipment(payload, {
      memberId,
      choices: [{ key: 'parte-de-arriba', itemId: null, sizeId: null }],
    })
    expect(quitarObligatoria.ok).toBe(false)
    if (!quitarObligatoria.ok) {
      expect(quitarObligatoria.fieldErrors?.['garment:parte-de-arriba']).toBeTruthy()
    }
    expect(await deliveriesOf(memberId)).toHaveLength(1)
  })

  it('rechaza un artículo de otro tipo de prenda y una talla de otra escala', async () => {
    const memberId = await makeMember()

    const otroTipo = await updateMemberEquipment(payload, {
      memberId,
      // La malla es de «parte de abajo»: colarla en el desplegable de arriba es un POST a mano.
      choices: [{ key: 'parte-de-arriba', itemId: mallaId, sizeId: sizeM }],
    })
    expect(otroTipo.ok).toBe(false)

    const otraEscala = await updateMemberEquipment(payload, {
      memberId,
      choices: [{ key: 'parte-de-arriba', itemId: tirantesId, sizeId: otherScaleSize }],
    })
    expect(otraEscala.ok).toBe(false)

    // Y no ha escrito nada: o entra el formulario entero o no entra.
    expect(await deliveriesOf(memberId)).toHaveLength(0)
  })

  it('no toca los tipos de prenda que el formulario no manda', async () => {
    const memberId = await makeMember()
    await updateMemberEquipment(payload, {
      memberId,
      choices: [
        { key: 'parte-de-arriba', itemId: tirantesId, sizeId: sizeM },
        { key: 'parte-de-abajo', itemId: mallaId, sizeId: sizeL },
      ],
    })

    const res = await updateMemberEquipment(payload, {
      memberId,
      choices: [{ key: 'parte-de-arriba', itemId: mangaCortaId, sizeId: sizeM }],
    })
    expect(res.ok).toBe(true)

    const docs = await deliveriesOf(memberId)
    expect(docs).toHaveLength(2)
    const abajo = docs.find((d) => idOf(d.category) === abajoId)!
    expect(idOf(abajo.item)).toBe(mallaId)
    expect(idOf(abajo.size)).toBe(sizeL)
  })

  it('el estado que ve el perfil trae la elección actual de cada tipo', async () => {
    const memberId = await makeMember()
    await updateMemberEquipment(payload, {
      memberId,
      choices: [{ key: 'parte-de-arriba', itemId: mangaCortaId, sizeId: sizeL }],
    })

    const state = await getMemberEquipmentState(payload, memberId)
    expect(state.available).toBe(true)
    expect(state.seasonName).toBe('2025/26')
    expect(state.garments.map((g) => g.garment.key)).toEqual(['parte-de-arriba', 'parte-de-abajo'])

    const arriba = state.garments[0]
    expect(arriba.itemId).toBe(mangaCortaId)
    expect(arriba.sizeId).toBe(sizeL)
    expect(arriba.locked).toBe(false)
    expect(arriba.status).toBe('reserved')

    const abajo = state.garments[1]
    expect(abajo.itemId).toBeNull()
    expect(abajo.currentLabel).toBeNull()
  })

  it('una prenda devuelta libera el hueco para elegir otra vez', async () => {
    const memberId = await makeMember()
    await updateMemberEquipment(payload, {
      memberId,
      choices: [{ key: 'parte-de-arriba', itemId: tirantesId, sizeId: sizeM }],
    })
    const first = (await deliveriesOf(memberId))[0]
    await payload.update({
      collection: 'equipment-deliveries',
      id: first.id,
      data: { status: 'returned' },
      overrideAccess: true,
    })

    const res = await updateMemberEquipment(payload, {
      memberId,
      choices: [{ key: 'parte-de-arriba', itemId: mangaCortaId, sizeId: sizeM }],
    })
    expect(res.ok).toBe(true)

    const docs = await deliveriesOf(memberId)
    // La devolución se queda en el histórico y la nueva elección nace aparte.
    expect(docs).toHaveLength(2)
    expect(docs.filter((d) => d.status === 'returned')).toHaveLength(1)
    expect(docs.filter((d) => d.status !== 'returned')[0]).toMatchObject({ status: 'reserved' })
  })
})
