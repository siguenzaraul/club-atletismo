import { existsSync, rmSync } from 'fs'
import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { beforeAll, describe, expect, it } from 'vitest'

import { NOTIFY_COOLDOWN_MS, getMemberPaymentPanelData, reportMembershipPayment } from '@/lib/payment-report'
import { DEFAULT_CLUB_IBAN } from '@/lib/payments'

let payload: Payload
let seasonId: number
let typeId: number

const makeMember = async (email: string, name = 'Socio') => {
  const m = await payload.create({
    collection: 'members',
    data: { name, email, phone: '+34 600 100 100', password: 'changeme123', imageRightsAccepted: true },
  })
  return m.id
}

const membershipOf = async (memberId: number) =>
  (
    await payload.find({
      collection: 'memberships',
      where: { and: [{ member: { equals: memberId } }, { season: { equals: seasonId } }] },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
  ).docs[0] ?? null

describe('Aviso de pago de la cuota', () => {
  beforeAll(async () => {
    if (existsSync('./tests/.test.db')) rmSync('./tests/.test.db')
    payload = await getPayload({ config: await config })

    const season = await payload.create({ collection: 'seasons', data: { name: '2025/26', isCurrent: true } })
    seasonId = season.id
    const type = await payload.create({
      collection: 'membership-types',
      data: { name: 'Adulto', requiresPayment: true, amount: 30 },
    })
    typeId = type.id
  })

  it('abre la cuota si el alta se quedó sin ella y deja el aviso, sin marcarla pagada', async () => {
    const memberId = await makeMember('sin-cuota@ejemplo.com')
    expect(await membershipOf(memberId)).toBeNull()

    const res = await reportMembershipPayment(payload, { memberId })
    expect(res).toMatchObject({ ok: true, state: 'reported' })

    const membership = await membershipOf(memberId)
    expect(membership?.paymentReportedAt).toBeTruthy()
    // Lo esencial: avisar no cobra. Sólo el staff pasa la cuota a «pagada».
    expect(membership?.paymentStatus).toBe('pending')

    const member = await payload.findByID({ collection: 'members', id: memberId, overrideAccess: true })
    expect(member.membershipStatus).toBe('pending')
  })

  it('anota el aviso sobre la cuota que ya existía', async () => {
    const memberId = await makeMember('con-cuota@ejemplo.com')
    const created = await payload.create({
      collection: 'memberships',
      data: { member: memberId, season: seasonId, type: typeId, paymentStatus: 'pending' },
      overrideAccess: true,
    })

    const res = await reportMembershipPayment(payload, { memberId })
    expect(res).toMatchObject({ ok: true, state: 'reported' })

    const membership = await membershipOf(memberId)
    expect(membership?.id).toBe(created.id)
    expect(membership?.paymentReportedAt).toBeTruthy()
  })

  it('un segundo aviso seguido no vuelve a molestar al club', async () => {
    const memberId = await makeMember('doble-aviso@ejemplo.com')
    await reportMembershipPayment(payload, { memberId })

    const repeated = await reportMembershipPayment(payload, { memberId })
    expect(repeated).toMatchObject({ ok: true, state: 'already-reported' })
  })

  it('pasada la ventana de silencio vuelve a avisar', async () => {
    const memberId = await makeMember('aviso-antiguo@ejemplo.com')
    await payload.create({
      collection: 'memberships',
      data: {
        member: memberId,
        season: seasonId,
        paymentStatus: 'pending',
        paymentReportedAt: new Date(Date.now() - NOTIFY_COOLDOWN_MS - 1000).toISOString(),
      },
      overrideAccess: true,
    })

    const res = await reportMembershipPayment(payload, { memberId })
    expect(res).toMatchObject({ ok: true, state: 'reported' })
  })

  it('no toca una cuota ya pagada ni una exenta', async () => {
    for (const status of ['paid', 'exempt'] as const) {
      const memberId = await makeMember(`${status}@ejemplo.com`)
      await payload.create({
        collection: 'memberships',
        data: { member: memberId, season: seasonId, paymentStatus: status },
        overrideAccess: true,
      })

      const res = await reportMembershipPayment(payload, { memberId })
      expect(res).toMatchObject({ ok: true, state: 'already-paid' })

      const membership = await membershipOf(memberId)
      expect(membership?.paymentStatus).toBe(status)
      expect(membership?.paymentReportedAt ?? null).toBeNull()
    }
  })

  it('rechaza un socio inexistente', async () => {
    const res = await reportMembershipPayment(payload, { memberId: 999999 })
    expect(res).toMatchObject({ ok: false })
  })

  it('el panel de la zona de socio trae cuenta, concepto e importe del tipo de socio', async () => {
    const data = await getMemberPaymentPanelData(payload, {
      memberName: 'Ana Pérez',
      seasonName: '2025/26',
      membershipTypeId: typeId,
    })
    expect(data.iban).toBe(DEFAULT_CLUB_IBAN)
    expect(data.formattedIban).toBe('ES49 3005 0050 0530 3295 0226')
    expect(data.concept).toBe('Cuota 2025/26 Ana Pérez')
    expect(data.amount).toBe(30)
  })

  it('un tipo de socio exento no arrastra importe al panel', async () => {
    const exempt = await payload.create({
      collection: 'membership-types',
      data: { name: 'Honorífico', requiresPayment: false, amount: 30 },
    })
    const data = await getMemberPaymentPanelData(payload, {
      memberName: 'Ana',
      seasonName: '2025/26',
      membershipTypeId: exempt.id,
    })
    expect(data.amount).toBeNull()
  })

  it('la cuenta del CMS manda sobre la constante de respaldo', async () => {
    await payload.updateGlobal({
      slug: 'site-settings',
      data: { bankIban: 'es99 1111 2222 3333 4444 5555', bankHolder: 'Otro titular' },
      overrideAccess: true,
    })
    const data = await getMemberPaymentPanelData(payload, { memberName: 'Ana', seasonName: '2025/26' })
    expect(data.iban).toBe('ES9911112222333344445555')
    expect(data.formattedIban).toBe('ES99 1111 2222 3333 4444 5555')
    expect(data.holder).toBe('Otro titular')
  })
})
