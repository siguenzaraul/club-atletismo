import { existsSync, rmSync } from 'fs'
import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { describe, it, beforeAll, expect } from 'vitest'

let payload: Payload
let memberAId: number
let eventId: number

const memberUser = (id: number) => ({ id, collection: 'members' as const })

describe('Access control & schema', () => {
  beforeAll(async () => {
    if (existsSync('./tests/.test.db')) rmSync('./tests/.test.db')
    payload = await getPayload({ config: await config })

    await payload.create({
      collection: 'users',
      data: { name: 'Admin', email: 'admin@test.run', password: 'changeme123', roles: ['admin'] },
    })
    const a = await payload.create({
      collection: 'members',
      data: {
        name: 'Socio A',
        email: 'a@test.run',
        phone: '+34 600 200 100',
        password: 'changeme123',
        imageRightsAccepted: true,
      },
    })
    memberAId = a.id
    await payload.create({
      collection: 'members',
      data: {
        name: 'Socio B',
        email: 'b@test.run',
        phone: '+34 600 200 200',
        password: 'changeme123',
        imageRightsAccepted: true,
      },
    })
    const ev = await payload.create({
      collection: 'events',
      data: { title: 'ALBATERUN 2026', series: 'carrera-principal', date: new Date('2026-10-04').toISOString() },
    })
    eventId = ev.id
    await payload.create({
      collection: 'sponsors',
      data: { name: 'Ayto. Albatera', tier: 'principal', global: true },
    })
  })

  it('auto-generates a slug from the title', async () => {
    const ev = await payload.findByID({ collection: 'events', id: eventId })
    expect(ev.slug).toBe('albaterun-2026')
  })

  it('lets the public read events and global sponsors', async () => {
    const events = await payload.find({ collection: 'events', overrideAccess: false })
    expect(events.totalDocs).toBeGreaterThan(0)
    const sponsors = await payload.find({
      collection: 'sponsors',
      overrideAccess: false,
      where: { global: { equals: true } },
    })
    expect(sponsors.totalDocs).toBe(1)
  })

  it('hides the members list from anonymous visitors', async () => {
    // Rejects regardless of the (localized) error message.
    await expect(payload.find({ collection: 'members', overrideAccess: false })).rejects.toThrow()
  })

  it('requires a mobile number and image-rights acceptance for every new member', async () => {
    await expect(
      payload.create({
        collection: 'members',
        data: {
          name: 'Sin móvil',
          email: 'sin-movil@test.run',
          password: 'changeme123',
          imageRightsAccepted: true,
        },
      }),
    ).rejects.toThrow()

    await expect(
      payload.create({
        collection: 'members',
        data: {
          name: 'Sin derechos',
          email: 'sin-derechos@test.run',
          phone: '+34 600 200 300',
          password: 'changeme123',
          imageRightsAccepted: false,
        },
      }),
    ).rejects.toThrow()
  })

  it('only lets a member see their own record', async () => {
    const members = await payload.find({
      collection: 'members',
      overrideAccess: false,
      user: memberUser(memberAId),
    })
    expect(members.totalDocs).toBe(1)
    expect(members.docs[0]?.id).toBe(memberAId)
  })

  it('does not let a member change their own fee status', async () => {
    // Staff leaves the fee as pending.
    await payload.update({
      collection: 'members',
      id: memberAId,
      data: { membershipStatus: 'pending' },
      overrideAccess: true,
    })
    // The member tries to mark themselves as up to date on their own record.
    await payload.update({
      collection: 'members',
      id: memberAId,
      overrideAccess: false,
      user: memberUser(memberAId),
      data: { membershipStatus: 'active' },
    })
    const after = await payload.findByID({ collection: 'members', id: memberAId, overrideAccess: true })
    expect(after.membershipStatus).toBe('pending')
  })

  it('stamps the logged-in member as owner of a registration', async () => {
    const reg = await payload.create({
      collection: 'event-registrations',
      data: { event: eventId },
      overrideAccess: false,
      user: memberUser(memberAId),
    })
    const memberRef = typeof reg.member === 'object' ? reg.member?.id : reg.member
    expect(memberRef).toBe(memberAId)
  })
})
