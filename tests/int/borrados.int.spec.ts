// @vitest-environment node
import { existsSync, rmSync } from 'fs'
import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { beforeAll, describe, expect, it } from 'vitest'

/**
 * Borrar desde el panel.
 *
 * Payload declara las claves ajenas como `ON DELETE SET NULL`, pero las columnas de los campos
 * `required` son `NOT NULL`: cualquier documento referenciado reventaba con un
 * «Failed query: delete from …» ilegible. Aquí se fija qué se arrastra y qué se corta con un
 * mensaje que explique el porqué.
 */

let payload: Payload
let seasonId: number
let scaleId: number
let sizeId: number

let n = 0
const makeMember = async () => {
  n++
  return (
    await payload.create({
      collection: 'members',
      data: {
        name: `Borrable ${n}`,
        email: `del${n}@test.run`,
        phone: '+34 600 000 000',
        password: 'changeme123',
        imageRightsAccepted: true,
      },
      overrideAccess: true,
    })
  ).id
}

const makeEvent = async (title: string) =>
  (
    await payload.create({
      collection: 'events',
      data: { title, series: 'club', date: new Date('2026-05-01').toISOString() },
      overrideAccess: true,
    })
  ).id

const count = async (collection: string, where: Record<string, unknown>) =>
  (await payload.count({ collection: collection as never, where: where as never, overrideAccess: true })).totalDocs

const borrar = (collection: string, id: number) =>
  payload.delete({ collection: collection as never, id, overrideAccess: true })

describe('Borrar documentos con cosas que dependen de ellos', () => {
  beforeAll(async () => {
    if (existsSync('./tests/.test.db')) rmSync('./tests/.test.db')
    payload = await getPayload({ config: await config })

    seasonId = (
      await payload.create({
        collection: 'seasons',
        data: { name: '2025/26', isCurrent: true },
        overrideAccess: true,
      })
    ).id
    scaleId = (
      await payload.create({
        collection: 'size-scales',
        data: { name: 'Ropa', slug: 'ropa' },
        overrideAccess: true,
      })
    ).id
    sizeId = (
      await payload.create({
        collection: 'sizes',
        data: { label: 'M', scale: scaleId },
        overrideAccess: true,
      })
    ).id
  })

  it('borra un socio y se lleva su cuota, campos, equipación e inscripciones', async () => {
    const memberId = await makeMember()
    const eventId = await makeEvent('Carrera del socio')
    const categoryId = (
      await payload.create({
        collection: 'equipment-categories',
        data: { name: `Tipo ${n}` },
        overrideAccess: true,
      })
    ).id
    const itemId = (
      await payload.create({
        collection: 'equipment-items',
        data: { name: `Prenda ${n}`, category: categoryId, sizeScale: scaleId },
        overrideAccess: true,
      })
    ).id
    const defId = (
      await payload.create({
        collection: 'attribute-definitions',
        data: { label: `Campo ${n}`, type: 'text' },
        overrideAccess: true,
      })
    ).id

    await payload.create({
      collection: 'memberships',
      data: { member: memberId, season: seasonId },
      overrideAccess: true,
    })
    await payload.create({
      collection: 'member-attributes',
      data: { member: memberId, definition: defId, valueText: 'x' },
      overrideAccess: true,
    })
    await payload.create({
      collection: 'equipment-deliveries',
      data: { member: memberId, season: seasonId, item: itemId, size: sizeId, status: 'reserved' },
      overrideAccess: true,
    })
    await payload.create({
      collection: 'event-registrations',
      data: { member: memberId, event: eventId },
      overrideAccess: true,
    })
    // Un resultado con el socio enlazado: es historia de la carrera y NO debe desaparecer.
    const resultId = (
      await payload.create({
        collection: 'results',
        data: { event: eventId, member: memberId, athleteName: 'Borrable', mark: '42:15' },
        overrideAccess: true,
      })
    ).id

    await borrar('members', memberId)

    expect(await count('memberships', { member: { equals: memberId } })).toBe(0)
    expect(await count('member-attributes', { member: { equals: memberId } })).toBe(0)
    expect(await count('equipment-deliveries', { member: { equals: memberId } })).toBe(0)
    expect(await count('event-registrations', { member: { equals: memberId } })).toBe(0)

    const result = await payload.findByID({ collection: 'results', id: resultId, depth: 0, overrideAccess: true })
    expect(result.member).toBeFalsy()
    expect(result.athleteName).toBe('Borrable')
  })

  it('borra un tipo de prenda y lo quita del formulario de alta', async () => {
    const categoryId = (
      await payload.create({
        collection: 'equipment-categories',
        data: { name: 'Gorra' },
        overrideAccess: true,
      })
    ).id
    const otra = (
      await payload.create({
        collection: 'equipment-categories',
        data: { name: 'Otra que se queda' },
        overrideAccess: true,
      })
    ).id
    await payload.updateGlobal({
      slug: 'registration-form',
      data: {
        garments: [
          { category: categoryId, enabled: true, required: false, askSize: false },
          { category: otra, enabled: true, required: false, askSize: false },
        ],
      },
      overrideAccess: true,
    })

    await borrar('equipment-categories', categoryId)

    const global = await payload.findGlobal({ slug: 'registration-form', depth: 0, overrideAccess: true })
    const rows = (global.garments ?? []) as { category?: unknown }[]
    expect(rows).toHaveLength(1)
    expect(rows[0].category).toBe(otra)
  })

  it('borra un campo personalizado y sus valores', async () => {
    const memberId = await makeMember()
    const defId = (
      await payload.create({
        collection: 'attribute-definitions',
        data: { label: 'Alergias', type: 'text' },
        overrideAccess: true,
      })
    ).id
    await payload.create({
      collection: 'member-attributes',
      data: { member: memberId, definition: defId, valueText: 'Polen' },
      overrideAccess: true,
    })

    await borrar('attribute-definitions', defId)
    expect(await count('member-attributes', { definition: { equals: defId } })).toBe(0)
  })

  it('borra una prueba sin resultados y se lleva sus inscripciones', async () => {
    const eventId = await makeEvent('Social run')
    const memberId = await makeMember()
    await payload.create({
      collection: 'event-registrations',
      data: { member: memberId, event: eventId },
      overrideAccess: true,
    })

    await borrar('events', eventId)
    expect(await count('event-registrations', { event: { equals: eventId } })).toBe(0)
  })

  it('no borra una prueba con resultados, y lo dice', async () => {
    const eventId = await makeEvent('Carrera con clasificación')
    await payload.create({
      collection: 'results',
      data: { event: eventId, athleteName: 'Alguien', mark: '40:00' },
      overrideAccess: true,
    })

    await expect(borrar('events', eventId)).rejects.toThrow(/resultado/i)
    // Y sigue ahí: el corte no puede dejar el borrado a medias.
    expect(await count('events', { id: { equals: eventId } })).toBe(1)
  })

  it('no borra una temporada con cuotas', async () => {
    const otraTemporada = (
      await payload.create({ collection: 'seasons', data: { name: '2019/20' }, overrideAccess: true })
    ).id
    const memberId = await makeMember()
    await payload.create({
      collection: 'memberships',
      data: { member: memberId, season: otraTemporada },
      overrideAccess: true,
    })

    await expect(borrar('seasons', otraTemporada)).rejects.toThrow(/cuota/i)
  })

  it('no borra una talla usada en una entrega, pero sí una talla libre', async () => {
    const categoryId = (
      await payload.create({ collection: 'equipment-categories', data: { name: 'Camiseta X' }, overrideAccess: true })
    ).id
    const itemId = (
      await payload.create({
        collection: 'equipment-items',
        data: { name: 'Camiseta X', category: categoryId, sizeScale: scaleId },
        overrideAccess: true,
      })
    ).id
    const usada = (
      await payload.create({ collection: 'sizes', data: { label: 'XL', scale: scaleId }, overrideAccess: true })
    ).id
    const libre = (
      await payload.create({ collection: 'sizes', data: { label: 'XXL', scale: scaleId }, overrideAccess: true })
    ).id
    const memberId = await makeMember()
    await payload.create({
      collection: 'equipment-deliveries',
      data: { member: memberId, season: seasonId, item: itemId, size: usada, status: 'delivered' },
      overrideAccess: true,
    })

    await expect(borrar('sizes', usada)).rejects.toThrow(/entrega/i)
    await borrar('sizes', libre)
    expect(await count('sizes', { id: { equals: libre } })).toBe(0)
  })

  it('no borra un artículo con entregas, pero sí uno sin usar (y se lleva su stock)', async () => {
    const categoryId = (
      await payload.create({ collection: 'equipment-categories', data: { name: 'Sudadera' }, overrideAccess: true })
    ).id
    const conEntrega = (
      await payload.create({
        collection: 'equipment-items',
        data: { name: 'Sudadera usada', category: categoryId, sizeScale: scaleId },
        overrideAccess: true,
      })
    ).id
    const sinUsar = (
      await payload.create({
        collection: 'equipment-items',
        data: { name: 'Sudadera nueva', category: categoryId, sizeScale: scaleId },
        overrideAccess: true,
      })
    ).id
    const memberId = await makeMember()
    await payload.create({
      collection: 'equipment-deliveries',
      data: { member: memberId, season: seasonId, item: conEntrega, size: sizeId, status: 'reserved' },
      overrideAccess: true,
    })
    await payload.create({
      collection: 'equipment-stock',
      data: { item: sinUsar, size: sizeId, season: seasonId, quantityTotal: 5 },
      overrideAccess: true,
    })

    await expect(borrar('equipment-items', conEntrega)).rejects.toThrow(/entrega/i)

    await borrar('equipment-items', sinUsar)
    expect(await count('equipment-stock', { item: { equals: sinUsar } })).toBe(0)
  })

  it('no borra una escala de tallas que se está usando', async () => {
    await expect(borrar('size-scales', scaleId)).rejects.toThrow(/No se puede borrar/i)
  })
})
