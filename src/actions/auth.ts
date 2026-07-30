'use server'

import { cookies, headers as nextHeaders } from 'next/headers'
import { redirect } from 'next/navigation'
import { getClient } from '@/lib/payload'
import { getCurrentSeason } from '@/lib/membership'
import type { Member } from '@/payload-types'

const COOKIE = 'payload-token'

const setTokenCookie = async (token: string) => {
  const store = await cookies()
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })
}

/** Returns the logged-in member, or null. */
export const getCurrentMember = async (): Promise<Member | null> => {
  const payload = await getClient()
  const { user } = await payload.auth({ headers: await nextHeaders() })
  if (user && user.collection === 'members') return user as Member
  return null
}

export type AuthState = { error?: string }

export const loginAction = async (_prev: AuthState, formData: FormData): Promise<AuthState> => {
  const email = String(formData.get('email') ?? '')
  const password = String(formData.get('password') ?? '')
  const payload = await getClient()
  try {
    const result = await payload.login({ collection: 'members', data: { email, password } })
    if (result.token) await setTokenCookie(result.token)
  } catch {
    return { error: 'Email o contraseña incorrectos.' }
  }
  redirect('/socios')
}

export const registerAction = async (_prev: AuthState, formData: FormData): Promise<AuthState> => {
  const name = String(formData.get('name') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim()
  const phone = String(formData.get('phone') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const imageRightsAccepted = formData.get('imageRightsAccepted') === 'yes'
  const eventSlug = String(formData.get('eventSlug') ?? '')
  const membershipTypeRaw = String(formData.get('membershipType') ?? '')
  const membershipTypeId = membershipTypeRaw ? Number(membershipTypeRaw) : null
  const payload = await getClient()

  if (phone.replace(/\D/g, '').length < 9) {
    return { error: 'Introduce un teléfono móvil válido para el grupo de WhatsApp.' }
  }
  if (!imageRightsAccepted) {
    return { error: 'Debes aceptar los derechos de imagen para completar el alta.' }
  }

  try {
    await payload.create({
      collection: 'members',
      data: { name, email, phone, password, imageRightsAccepted },
    })
    const result = await payload.login({ collection: 'members', data: { email, password } })
    if (result.token) await setTokenCookie(result.token)

    // Open a pending membership for the current season so staff can confirm the fee.
    if (result.user) {
      const season = await getCurrentSeason(payload)
      if (season) {
        await payload.create({
          collection: 'memberships',
          data: {
            member: result.user.id,
            season: season.id,
            type: membershipTypeId ?? undefined,
            paymentStatus: 'pending',
          },
          overrideAccess: true,
        })
      }
    }

    if (eventSlug && result.user) {
      const ev = await payload.find({
        collection: 'events',
        where: { slug: { equals: eventSlug } },
        limit: 1,
      })
      const event = ev.docs[0]
      if (event) {
        await payload.create({
          collection: 'event-registrations',
          data: { event: event.id, member: result.user.id },
          overrideAccess: true,
        })
      }
    }
  } catch (err) {
    const message = err instanceof Error && /unique|duplicate/i.test(err.message)
      ? 'Ya existe una cuenta con ese email.'
      : 'No se pudo completar el registro.'
    return { error: message }
  }
  redirect('/socios')
}

export const logoutAction = async (): Promise<void> => {
  const store = await cookies()
  store.delete(COOKIE)
  redirect('/')
}

/** Registers the logged-in member into an event, validating open/category/capacity. */
export const inscribeAction = async (eventId: number): Promise<{ ok: boolean; error?: string }> => {
  const member = await getCurrentMember()
  if (!member) return { ok: false, error: 'Debes iniciar sesión.' }
  const payload = await getClient()

  const event = await payload.findByID({ collection: 'events', id: eventId, depth: 0, overrideAccess: true }).catch(() => null)
  if (!event) return { ok: false, error: 'Evento no encontrado.' }
  if (!event.registrationOpen) return { ok: false, error: 'Las inscripciones para este evento están cerradas.' }

  // Category must be one the event admits (when the event restricts categories).
  if (event.categories && event.categories.length > 0 && member.category) {
    if (!event.categories.includes(member.category)) {
      return { ok: false, error: 'Tu categoría no está admitida en este evento.' }
    }
  }

  // Capacity: count active (non-cancelled) registrations.
  if (typeof event.capacity === 'number' && event.capacity > 0) {
    const count = await payload.count({
      collection: 'event-registrations',
      where: { and: [{ event: { equals: eventId } }, { status: { not_equals: 'cancelled' } }] },
      overrideAccess: true,
    })
    if (count.totalDocs >= event.capacity) return { ok: false, error: 'No quedan plazas para este evento.' }
  }

  try {
    await payload.create({
      collection: 'event-registrations',
      data: { event: eventId, member: member.id, category: member.category },
      overrideAccess: true,
    })
  } catch (err) {
    // Unique (event, member) index closes the race: a duplicate means already registered.
    if (err instanceof Error && /unique|duplicate/i.test(err.message)) {
      return { ok: false, error: 'Ya estás inscrito en este evento.' }
    }
    payload.logger.error({ err }, 'inscribeAction failed')
    return { ok: false, error: 'No se pudo completar la inscripción.' }
  }
  return { ok: true }
}
