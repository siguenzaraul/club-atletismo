import { existsSync, rmSync } from 'node:fs'
import { getPayload, type Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'

let payload: Payload
let eventWithDistance: number
let eventWithoutDistance: number

beforeAll(async () => {
  if (existsSync('./tests/.test.db')) rmSync('./tests/.test.db')
  payload = await getPayload({ config: await config })

  const a = await payload.create({
    collection: 'events',
    data: { title: 'Diez K de prueba', series: 'club', date: new Date().toISOString(), distanceMeters: 10000 },
  })
  eventWithDistance = a.id

  const b = await payload.create({
    collection: 'events',
    data: { title: 'Prueba sin distancia', series: 'club', date: new Date().toISOString() },
  })
  eventWithoutDistance = b.id
})

describe('normalización de resultados', () => {
  it('calcula markSeconds a partir de la marca en texto', async () => {
    const r = await payload.create({
      collection: 'results',
      data: { event: eventWithDistance, athleteName: 'Ana', mark: '38:20' },
    })
    expect(r.markSeconds).toBe(2300)
  })

  it('hereda la distancia principal del evento cuando la fila no la trae', async () => {
    const r = await payload.create({
      collection: 'results',
      data: { event: eventWithDistance, athleteName: 'Beto', mark: '42:15' },
    })
    expect(r.distanceMeters).toBe(10000)
  })

  it('respeta la distancia de la fila por encima de la del evento', async () => {
    const r = await payload.create({
      collection: 'results',
      data: { event: eventWithDistance, athleteName: 'Caro', mark: '19:30', distanceMeters: 5000 },
    })
    expect(r.distanceMeters).toBe(5000)
  })

  it('deja la distancia a null si ni la fila ni el evento la tienen', async () => {
    const r = await payload.create({
      collection: 'results',
      data: { event: eventWithoutDistance, athleteName: 'Dani', mark: '30:00' },
    })
    expect(r.distanceMeters).toBeFalsy()
    expect(r.markSeconds).toBe(1800)
  })

  it('no revienta con una marca ilegible: la deja sin normalizar', async () => {
    const r = await payload.create({
      collection: 'results',
      data: { event: eventWithDistance, athleteName: 'Eva', mark: 'DNF' },
    })
    expect(r.markSeconds).toBeFalsy()
    expect(r.mark).toBe('DNF')
  })

  it('recalcula markSeconds al corregir la marca', async () => {
    const created = await payload.create({
      collection: 'results',
      data: { event: eventWithDistance, athleteName: 'Fran', mark: '40:00' },
    })
    const updated = await payload.update({
      collection: 'results',
      id: created.id,
      data: { mark: '39:00' },
    })
    expect(updated.markSeconds).toBe(2340)
  })

  // Regresión: el hook necesita `originalDoc`. Sin él, tocar otro campo borraba markSeconds.
  it('un update parcial de otro campo NO borra markSeconds ni la distancia', async () => {
    const created = await payload.create({
      collection: 'results',
      data: { event: eventWithDistance, athleteName: 'Gema', mark: '41:10' },
    })
    const updated = await payload.update({
      collection: 'results',
      id: created.id,
      data: { position: 3 },
    })
    expect(updated.markSeconds).toBe(2470)
    expect(updated.distanceMeters).toBe(10000)
    expect(updated.position).toBe(3)
  })
})

describe('marcas personales derivadas', () => {
  it('la mejor marca por distancia es la menor en segundos', async () => {
    const member = await payload.create({
      collection: 'members',
      data: {
        name: 'Hugo Ruiz',
        email: `hugo-${Date.now()}@ejemplo.com`,
        password: 'changeme123',
        phone: '600000000',
        imageRightsAccepted: true,
      },
    })

    for (const mark of ['45:00', '41:30', '43:20']) {
      await payload.create({
        collection: 'results',
        data: { event: eventWithDistance, member: member.id, athleteName: 'Hugo Ruiz', mark },
      })
    }

    const best = await payload.find({
      collection: 'results',
      where: {
        and: [
          { member: { equals: member.id } },
          { distanceMeters: { exists: true } },
          { markSeconds: { exists: true } },
        ],
      },
      sort: 'markSeconds',
      limit: 1,
    })
    expect(best.docs[0].markSeconds).toBe(2490) // 41:30
  })
})
