import { existsSync, rmSync } from 'fs'
import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { beforeAll, describe, expect, it } from 'vitest'

import {
  completeRegistration,
  isDuplicateEmail,
  isDuplicateIn,
  registerMemberInEvent,
} from '@/lib/registration'

let payload: Payload
let seasonId: number
let typeId: number
let openEventId: number
let closedEventId: number
let fullEventId: number
let sub18OnlyEventId: number

const makeMember = async (email: string, name = 'Socio') => {
  const m = await payload.create({
    collection: 'members',
    data: {
      name,
      email,
      phone: '+34 600 100 100',
      password: 'changeme123',
      imageRightsAccepted: true,
    },
  })
  return m.id
}

describe('Alta de socio', () => {
  beforeAll(async () => {
    if (existsSync('./tests/.test.db')) rmSync('./tests/.test.db')
    payload = await getPayload({ config: await config })

    const season = await payload.create({
      collection: 'seasons',
      data: { name: '2025/26', isCurrent: true },
    })
    seasonId = season.id

    const type = await payload.create({
      collection: 'membership-types',
      data: { name: 'Adulto', requiresPayment: true, amount: 30 },
    })
    typeId = type.id

    // `series` es required: sin él TypeScript se va por la rama de draft con un error confuso.
    const open = await payload.create({
      collection: 'events',
      data: {
        title: 'Social Run',
        series: 'club',
        date: new Date('2026-11-01').toISOString(),
        registrationOpen: true,
      },
    })
    openEventId = open.id

    const closed = await payload.create({
      collection: 'events',
      data: {
        title: 'Carrera cerrada',
        series: 'club',
        date: new Date('2026-11-02').toISOString(),
        registrationOpen: false,
      },
    })
    closedEventId = closed.id

    const full = await payload.create({
      collection: 'events',
      data: {
        title: 'Carrera llena',
        series: 'club',
        date: new Date('2026-11-03').toISOString(),
        registrationOpen: true,
        capacity: 1,
      },
    })
    fullEventId = full.id

    const sub18 = await payload.create({
      collection: 'events',
      data: {
        title: 'Solo sub-18',
        series: 'club',
        date: new Date('2026-11-04').toISOString(),
        registrationOpen: true,
        categories: ['sub18'],
      },
    })
    sub18OnlyEventId = sub18.id
  })

  describe('isDuplicateEmail', () => {
    it('distingue el índice de members.email de los demás índices únicos', async () => {
      const memberId = await makeMember('dup@test.run')

      // 1) Email repetido en `members` → sí.
      const emailErr = await payload
        .create({
          collection: 'members',
          data: {
            name: 'Otro',
            email: 'dup@test.run',
            phone: '+34 600 100 101',
            password: 'changeme123',
            imageRightsAccepted: true,
          },
        })
        .then(() => null)
        .catch((e) => e)
      expect(emailErr).toBeTruthy()
      expect(isDuplicateEmail(emailErr)).toBe(true)

      // 2) El índice único (member, season) de `memberships` → NO.
      //    Antes, el regex /unique|duplicate/ del alta confundía este error con el del email y
      //    le decía al socio "ya existe una cuenta con ese email" sin dejarle entrar.
      await payload.create({
        collection: 'memberships',
        data: { member: memberId, season: seasonId, paymentStatus: 'pending' },
        overrideAccess: true,
      })
      const membershipErr = await payload
        .create({
          collection: 'memberships',
          data: { member: memberId, season: seasonId, paymentStatus: 'pending' },
          overrideAccess: true,
        })
        .then(() => null)
        .catch((e) => e)
      expect(membershipErr).toBeTruthy()
      expect(isDuplicateEmail(membershipErr)).toBe(false)
      expect(isDuplicateIn(membershipErr, 'memberships')).toBe(true)

      // 3) El índice único (event, member) de `event-registrations` → NO.
      await payload.create({
        collection: 'event-registrations',
        data: { event: openEventId, member: memberId },
        overrideAccess: true,
      })
      const registrationErr = await payload
        .create({
          collection: 'event-registrations',
          data: { event: openEventId, member: memberId },
          overrideAccess: true,
        })
        .then(() => null)
        .catch((e) => e)
      expect(registrationErr).toBeTruthy()
      expect(isDuplicateEmail(registrationErr)).toBe(false)
      expect(isDuplicateIn(registrationErr, 'event-registrations')).toBe(true)
    })

    it('el mensaje del error NO contiene "unique" ni "duplicate"', async () => {
      await makeMember('mensaje@test.run')
      const err = await payload
        .create({
          collection: 'members',
          data: {
            name: 'Otro',
            email: 'mensaje@test.run',
            phone: '+34 600 100 102',
            password: 'changeme123',
            imageRightsAccepted: true,
          },
        })
        .then(() => null)
        .catch((e: Error) => e)
      // Esto es lo que hacía que el `catch` del alta fuese código muerto: Payload traduce el
      // choque a "El siguiente campo es inválido: email".
      expect(err).toBeInstanceOf(Error)
      expect(/unique|duplicate/i.test((err as Error).message)).toBe(false)
    })
  })

  describe('registerMemberInEvent', () => {
    it('inscribe cuando todo está en orden', async () => {
      const memberId = await makeMember('ok@test.run')
      const res = await registerMemberInEvent(payload, { memberId, eventId: openEventId })
      expect(res).toMatchObject({ ok: true, alreadyRegistered: false, eventTitle: 'Social Run' })
    })

    it('es idempotente: la segunda vez dice que ya estaba inscrito', async () => {
      const memberId = await makeMember('idem@test.run')
      await registerMemberInEvent(payload, { memberId, eventId: openEventId })
      const res = await registerMemberInEvent(payload, { memberId, eventId: openEventId })
      expect(res).toMatchObject({ ok: true, alreadyRegistered: true })
    })

    it('rechaza si las inscripciones están cerradas', async () => {
      const memberId = await makeMember('cerrada@test.run')
      const res = await registerMemberInEvent(payload, { memberId, eventId: closedEventId })
      expect(res).toMatchObject({ ok: false, reason: 'closed' })
    })

    it('rechaza si la categoría no está admitida', async () => {
      const memberId = await makeMember('categoria@test.run')
      const res = await registerMemberInEvent(payload, {
        memberId,
        category: 'senior',
        eventId: sub18OnlyEventId,
      })
      expect(res).toMatchObject({ ok: false, reason: 'category' })
    })

    it('rechaza si no quedan plazas — el alta pública se saltaba este límite', async () => {
      const first = await makeMember('aforo1@test.run')
      const second = await makeMember('aforo2@test.run')
      const ok = await registerMemberInEvent(payload, { memberId: first, eventId: fullEventId })
      expect(ok.ok).toBe(true)
      const res = await registerMemberInEvent(payload, { memberId: second, eventId: fullEventId })
      expect(res).toMatchObject({ ok: false, reason: 'full' })
    })

    it('resuelve el evento por slug', async () => {
      const memberId = await makeMember('slug@test.run')
      const event = await payload.findByID({ collection: 'events', id: openEventId, depth: 0 })
      const res = await registerMemberInEvent(payload, { memberId, eventSlug: event.slug! })
      expect(res.ok).toBe(true)
    })

    it('devuelve not-found con un slug inexistente', async () => {
      const memberId = await makeMember('noexiste@test.run')
      const res = await registerMemberInEvent(payload, { memberId, eventSlug: 'no-existe-jamas' })
      expect(res).toMatchObject({ ok: false, reason: 'not-found' })
    })
  })

  describe('completeRegistration', () => {
    const countFor = async (memberId: number) => {
      const [memberships, registrations] = await Promise.all([
        payload.count({
          collection: 'memberships',
          where: { member: { equals: memberId } },
          overrideAccess: true,
        }),
        payload.count({
          collection: 'event-registrations',
          where: { member: { equals: memberId } },
          overrideAccess: true,
        }),
      ])
      return { memberships: memberships.totalDocs, registrations: registrations.totalDocs }
    }

    it('abre la cuota pendiente e inscribe en el evento', async () => {
      const memberId = await makeMember('complete@test.run')
      const event = await payload.findByID({ collection: 'events', id: openEventId, depth: 0 })

      await completeRegistration(payload, {
        memberId,
        membershipTypeId: typeId,
        eventSlug: event.slug!,
        sendWelcome: false,
        name: 'Socio',
        email: 'complete@test.run',
      })

      expect(await countFor(memberId)).toEqual({ memberships: 1, registrations: 1 })
      const membership = await payload.find({
        collection: 'memberships',
        where: { member: { equals: memberId } },
        depth: 0,
        overrideAccess: true,
      })
      expect(membership.docs[0]?.paymentStatus).toBe('pending')
    })

    it('es idempotente: reejecutarla no duplica ni lanza', async () => {
      const memberId = await makeMember('idem2@test.run')
      const event = await payload.findByID({ collection: 'events', id: openEventId, depth: 0 })
      const args = {
        memberId,
        membershipTypeId: typeId,
        eventSlug: event.slug!,
        sendWelcome: false,
        name: 'Socio',
        email: 'idem2@test.run',
      }

      await completeRegistration(payload, args)
      // El camino de recuperación del alta la vuelve a llamar sobre una cuenta que ya existe.
      await expect(completeRegistration(payload, args)).resolves.toBeUndefined()

      expect(await countFor(memberId)).toEqual({ memberships: 1, registrations: 1 })
    })

    it('no lanza aunque el evento no exista', async () => {
      const memberId = await makeMember('sinevento@test.run')
      await expect(
        completeRegistration(payload, {
          memberId,
          membershipTypeId: null,
          eventSlug: 'no-existe-jamas',
          sendWelcome: false,
          name: 'Socio',
          email: 'sinevento@test.run',
        }),
      ).resolves.toBeUndefined()
      // La cuota se abre igual: el fallo de la inscripción no arrastra al resto.
      expect((await countFor(memberId)).memberships).toBe(1)
    })
  })
})
