import { existsSync, rmSync } from 'node:fs'
import { getPayload, type Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'
import {
  PUBLIC_ATHLETE_SELECT,
  getPublicAthleteBySlug,
  listPublicAthletes,
} from '@/lib/public-athletes'

let payload: Payload

/** Campos que jamás pueden salir por la superficie pública. */
const SENSITIVE = ['phone', 'email', 'federationNumber', 'hash', 'salt', 'resetPasswordToken']

const newMember = async (over: Record<string, unknown>) =>
  payload.create({
    collection: 'members',
    data: {
      email: `m-${Math.round(performance.now() * 1000)}-${Object.keys(over).length}@ejemplo.com`,
      password: 'changeme123',
      phone: '600111222',
      federationNumber: 'FED-999',
      imageRightsAccepted: true,
      ...over,
    } as never,
  })

beforeAll(async () => {
  if (existsSync('./tests/.test.db')) rmSync('./tests/.test.db')
  payload = await getPayload({ config: await config })
})

describe('privacidad de members', () => {
  it('el anónimo sigue sin poder listar socios', async () => {
    await expect(
      payload.find({ collection: 'members', overrideAccess: false }),
    ).rejects.toThrow()
  })

  it('la lista blanca no incluye ningún campo sensible', () => {
    for (const field of SENSITIVE) {
      expect(Object.keys(PUBLIC_ATHLETE_SELECT)).not.toContain(field)
    }
  })
})

describe('perfiles públicos', () => {
  it('un socio privado no se resuelve por slug ni aparece en la lista', async () => {
    await newMember({ name: 'Privado Pérez', publicProfile: false })
    const list = await listPublicAthletes(payload)
    expect(list.some((a) => a.name === 'Privado Pérez')).toBe(false)
    expect(await getPublicAthleteBySlug(payload, 'privado-perez')).toBeNull()
  })

  it('publicar asigna slug y expone sólo los datos públicos', async () => {
    const member = await newMember({
      name: 'Publica Gómez',
      publicProfile: true,
      publicBio: 'Corro desde 2019.',
      personalBests: [{ distanceMeters: 10000, mark: '42:15' }],
    })

    expect(member.slug).toBe('publica-gomez')

    const athlete = await getPublicAthleteBySlug(payload, 'publica-gomez')
    expect(athlete).not.toBeNull()
    expect(athlete!.name).toBe('Publica Gómez')
    expect(athlete!.bio).toBe('Corro desde 2019.')
    expect(athlete!.bests).toHaveLength(1)
    expect(athlete!.bests[0].markSeconds).toBe(2535)

    // El objeto proyectado no puede llevar campos sensibles ni por descuido.
    for (const field of SENSITIVE) {
      expect(athlete as unknown as Record<string, unknown>).not.toHaveProperty(field)
    }
  })

  it('el documento crudo que devuelve el select tampoco trae datos sensibles', async () => {
    const res = await payload.find({
      collection: 'members',
      where: { publicProfile: { equals: true } },
      select: PUBLIC_ATHLETE_SELECT,
      limit: 1,
      overrideAccess: true,
    })
    const doc = res.docs[0] as unknown as Record<string, unknown>
    expect(doc).toBeDefined()
    for (const field of SENSITIVE) {
      expect(doc[field], `${field} no debería leerse siquiera de la base de datos`).toBeUndefined()
    }
  })

  it('desambigua los homónimos en vez de reventar el índice único', async () => {
    await newMember({ name: 'Juan Pérez', publicProfile: true })
    const second = await newMember({ name: 'Juan Pérez', publicProfile: true })
    expect(second.slug).toBe('juan-perez-2')

    expect(await getPublicAthleteBySlug(payload, 'juan-perez')).not.toBeNull()
    expect(await getPublicAthleteBySlug(payload, 'juan-perez-2')).not.toBeNull()
  })

  it('despublicar deja de resolver pero no recicla la URL', async () => {
    const member = await newMember({ name: 'Temporal Ruiz', publicProfile: true })
    expect(member.slug).toBe('temporal-ruiz')

    const off = await payload.update({
      collection: 'members',
      id: member.id,
      data: { publicProfile: false },
    })
    expect(off.slug).toBe('temporal-ruiz')
    expect(await getPublicAthleteBySlug(payload, 'temporal-ruiz')).toBeNull()
  })

  it('normaliza a segundos las marcas introducidas a mano', async () => {
    const member = await newMember({
      name: 'Marcas Manuales',
      publicProfile: true,
      personalBests: [
        { distanceMeters: 42195, mark: '3:29:59' },
        { distanceMeters: 5000, mark: '19:30' },
      ],
    })
    const doc = await payload.findByID({ collection: 'members', id: member.id, depth: 0 })
    expect(doc.personalBests?.map((b) => b.markSeconds)).toEqual([12599, 1170])
  })

  it('la mejor de results gana a una manual peor en la misma distancia', async () => {
    const event = await payload.create({
      collection: 'events',
      data: { title: 'Diez K club', series: 'club', date: new Date().toISOString(), distanceMeters: 10000 },
    })
    const member = await newMember({
      name: 'Mixta Soler',
      publicProfile: true,
      personalBests: [{ distanceMeters: 10000, mark: '45:00' }],
    })
    await payload.create({
      collection: 'results',
      data: { event: event.id, member: member.id, athleteName: 'Mixta Soler', mark: '41:00' },
    })

    const athlete = await getPublicAthleteBySlug(payload, 'mixta-soler')
    const tenK = athlete!.bests.find((b) => b.distanceMeters === 10000)
    expect(tenK?.markSeconds).toBe(2460)
    expect(tenK?.source).toBe('result')
  })
})
