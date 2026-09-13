'use server'

import { cookies, headers as nextHeaders } from 'next/headers'
import { redirect } from 'next/navigation'
import { after } from 'next/server'
import { AuthenticationError, LockedAuth } from 'payload'

import { getClient } from '@/lib/payload'
import { MEMBER_TOKEN_EXPIRATION, SESSION_COOKIE, currentMember } from '@/lib/session'
import { getRegistrationSettings } from '@/lib/registration-form'
import {
  LOGIN_LANDING,
  resolveLoginCollection,
  tokenExpirationFor,
  type LoginCollection,
} from '@/lib/login'
import type { GarmentSelection } from '@/lib/equipment'
import {
  completeRegistration,
  isDuplicateEmail,
  registerMemberInEvent,
} from '@/lib/registration'
import {
  hasErrors,
  validateRegister,
  type RegisterFieldErrors,
} from '@/lib/validation/register'
import type { Member } from '@/payload-types'

/**
 * `maxAge` debe coincidir con el `tokenExpiration` de la colección que emitió el token, o el
 * usuario vuelve con cookie válida y token caducado. Ver src/lib/login.ts.
 */
const setTokenCookie = async (token: string, maxAge: number = MEMBER_TOKEN_EXPIRATION) => {
  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  })
}

/** Returns the logged-in member, or null. */
export const getCurrentMember = async (): Promise<Member | null> => currentMember()

export type AuthState = {
  /** Fallo global (login, error inesperado). */
  error?: string
  /** Errores por campo del alta. */
  fieldErrors?: RegisterFieldErrors
  /** Repuebla el formulario cuando el alta falla. Nunca contiene contraseñas. */
  values?: { name?: string; email?: string; phone?: string; membershipType?: string }
}

/** Fallo de red/base de datos, no de credenciales. Sólo estos se reintentan. */
const isTransient = (err: unknown): boolean => {
  if (err instanceof AuthenticationError || err instanceof LockedAuth) return false
  const code = (err as { code?: string })?.code
  if (code && ['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', '57P01', '08006'].includes(code)) return true
  return err instanceof Error && /connection|timeout|terminated/i.test(err.message)
}

/**
 * Login contra la colección indicada. Un solo reintento y sólo ante fallo de conexión:
 * `payload.login` es idempotente (únicamente añade una sesión), así que repetirlo es seguro — a
 * diferencia de `create`. Nunca se reintenta una contraseña incorrecta: gastaría intentos del
 * bloqueo de la cuenta.
 */
const loginWithRetry = async <C extends LoginCollection>(
  payload: Awaited<ReturnType<typeof getClient>>,
  collection: C,
  email: string,
  password: string,
) => {
  try {
    return await payload.login({ collection, data: { email, password } })
  } catch (err) {
    if (!isTransient(err)) throw err
    payload.logger.warn({ err }, 'login: reintentando tras fallo de conexión')
    return payload.login({ collection, data: { email, password } })
  }
}

/**
 * Acceso desde el formulario público, para socios y para staff.
 *
 * La colección se resuelve por el email (ver src/lib/login.ts) y el destino depende de ella:
 * mandar a un usuario de staff a `/socios` lo devolvería a `/login`, porque esa página exige un
 * socio. Los mensajes de error son los mismos en ambos casos: el formulario no debe revelar si
 * un email es de staff.
 */
export const loginAction = async (_prev: AuthState, formData: FormData): Promise<AuthState> => {
  const email = String(formData.get('email') ?? '')
  const password = String(formData.get('password') ?? '')
  const payload = await getClient()

  const collection = await resolveLoginCollection(payload, email)
  try {
    const result = await loginWithRetry(payload, collection, email, password)
    if (result.token) {
      await setTokenCookie(result.token, tokenExpirationFor(payload, collection))
    }
  } catch (err) {
    if (err instanceof LockedAuth) {
      return {
        error:
          'Cuenta bloqueada temporalmente por demasiados intentos fallidos. Prueba dentro de 10 minutos.',
      }
    }
    if (err instanceof AuthenticationError) return { error: 'Email o contraseña incorrectos.' }
    // Un fallo de infraestructura no es culpa del usuario y merece traza: antes, el `catch`
    // vacío lo disfrazaba de contraseña incorrecta y no dejaba nada en los logs.
    payload.logger.error({ err }, 'loginAction failed')
    return { error: 'No hemos podido conectar. Inténtalo de nuevo en un minuto.' }
  }
  redirect(LOGIN_LANDING[collection])
}

/**
 * Alta pública de socio.
 *
 * Dos contratos distintos, y ésa es la reparación:
 *  - **Fase crítica** (`create` → `login` → cookie): si falla, el usuario vuelve al formulario.
 *  - **Best effort** (cuota, inscripción, correo), en `after()`: si falla, el socio ya está
 *    dentro y lo que quede a medias se repara desde /gestion/mantenimiento.
 *
 * Antes, un único `try` envolvía las ~10 consultas posteriores a crear la cuenta y cualquier
 * fallo transitorio hacía `return` en vez de `redirect()`: cuenta creada, sesión abierta y el
 * usuario mirando el formulario sin entender nada.
 *
 * No se usa una transacción única a propósito: haría el alta atómica, pero un fallo al abrir
 * la cuota borraría la cuenta. Mejor un socio sin cuota (visible y reparable) que un socio que
 * no existe.
 */
export const registerAction = async (_prev: AuthState, formData: FormData): Promise<AuthState> => {
  const name = String(formData.get('name') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim()
  const phone = String(formData.get('phone') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const passwordConfirm = String(formData.get('passwordConfirm') ?? '')
  const imageRightsAccepted = formData.get('imageRightsAccepted') === 'yes'
  const eventSlug = String(formData.get('eventSlug') ?? '')
  const membershipTypeRaw = String(formData.get('membershipType') ?? '')
  const payload = await getClient()

  // Misma función que usa el formulario en cliente, para que los mensajes no puedan divergir.
  // El alta desde /admin no pasa por aquí: Payload no expone un mínimo de contraseña
  // configurable en `auth: true`, y ese camino sólo lo usa el staff.
  // La configuración se relee del CMS, nunca se acepta del formulario: que el HTML no trajera
  // un campo no prueba nada, y un POST a mano puede traer lo que quiera.
  const settings = await getRegistrationSettings(payload)
  const garments: Record<string, { itemId?: string; sizeId?: string }> = {}
  for (const garment of settings.garments) {
    const itemId = String(formData.get(`garment:${garment.key}`) ?? '').trim()
    const sizeId = String(formData.get(`size:${garment.key}`) ?? '').trim()
    if (itemId || sizeId) garments[garment.key] = { itemId: itemId || undefined, sizeId: sizeId || undefined }
  }

  // El tipo de cuota se revalida contra el catálogo publicado, igual que las prendas: el POST
  // podría traer un tipo despublicado, uno que el club ni siquiera pregunta, o basura que
  // acabaría en `NaN` y dejaría al socio sin cuota en silencio. Lo que no reconocemos, se ignora.
  const membershipTypeId =
    settings.membershipTypes.find((t) => String(t.id) === membershipTypeRaw)?.id ?? null

  const values = { name, email, phone, membershipType: membershipTypeRaw }
  const fieldErrors = validateRegister(
    {
      name,
      email,
      phone,
      password,
      passwordConfirm,
      imageRightsAccepted,
      // El valor ya resuelto, no el crudo: si el tipo es obligatorio y llega uno que no está
      // publicado, debe fallar la validación en vez de colarse como «sin especificar».
      membershipType: membershipTypeId ? String(membershipTypeId) : '',
      garments,
    },
    settings.config,
  )
  if (hasErrors(fieldErrors)) return { fieldErrors, values }

  const selections: GarmentSelection[] = settings.garments.flatMap((garment) => {
    const selection = garments[garment.key]
    if (!selection?.itemId) return []
    return [
      {
        categoryId: garment.categoryId,
        itemId: Number(selection.itemId),
        sizeId: selection.sizeId ? Number(selection.sizeId) : null,
      },
    ]
  })

  // ── Fase crítica ───────────────────────────────────────────────────────────
  /** La cuenta ya existía: es un reintento tras un alta que quedó a medias. */
  let recovered = false
  try {
    await payload.create({
      collection: 'members',
      data: { name, email, phone, password, imageRightsAccepted },
    })
  } catch (err) {
    if (!isDuplicateEmail(err)) {
      payload.logger.error({ err }, 'registerAction: create member failed')
      return { error: 'No hemos podido crear tu cuenta. Vuelve a intentarlo en un minuto.', values }
    }
    recovered = true
  }

  let token: string | undefined
  let session: { id: number; category: Member['category'] | null } | null = null
  try {
    // El alta siempre crea un socio, nunca staff.
    const result = await loginWithRetry(payload, 'members', email, password)
    token = result.token
    if (result.user) session = { id: result.user.id, category: result.user.category ?? null }
  } catch (err) {
    if (err instanceof LockedAuth) {
      return {
        error:
          'Demasiados intentos fallidos con este email. Espera 10 minutos y entra desde «Acceso socios».',
        values,
      }
    }
    if (recovered) {
      // El email existe y la contraseña NO coincide: es un alta duplicada de verdad.
      return {
        fieldErrors: { email: 'Ya existe una cuenta con ese email. Entra desde «Acceso socios».' },
        values,
      }
    }
    // La cuenta SÍ se ha creado y sólo ha fallado el login. Jamás dejamos al usuario en el
    // formulario con la cuenta ya creada: se le manda a entrar.
    payload.logger.error({ err, email }, 'registerAction: login after create failed')
    redirect('/login?alta=ok')
  }

  if (!session || !token) {
    // La cuenta existe pero no hemos podido abrirle sesión. Mismo desenlace que el catch: se
    // le manda a entrar, nunca de vuelta al formulario con el email ya ocupado.
    payload.logger.error({ email }, 'registerAction: login returned no session')
    redirect('/login?alta=ok')
  }

  await setTokenCookie(token)

  // ── Best effort ────────────────────────────────────────────────────────────
  // Fuera de la respuesta. Nada de aquí puede impedir la navegación.
  const { id: memberId, category } = session
  after(() =>
    completeRegistration(payload, {
      memberId,
      membershipTypeId,
      eventSlug: eventSlug || null,
      category,
      sendWelcome: !recovered,
      name,
      email,
      equipment: {
        selections,
        reserveStock: settings.reserveStock,
        allowOverbooking: settings.allowOverbooking,
      },
    }),
  )

  redirect(recovered ? '/socios' : '/socios?alta=ok')
}

export const logoutAction = async (): Promise<void> => {
  const payload = await getClient()
  // Con `useSessions: true`, borrar la cookie NO invalida el token: quien conserve una copia
  // sigue autenticándose hasta que caduque. Payload no expone `logout` en la Local API, así
  // que se replica su núcleo quitando la sesión activa de la fila.
  try {
    const { user } = await payload.auth({ headers: await nextHeaders() })
    const sid = (user as { _sid?: string } | null)?._sid
    if (user && sid) {
      const row = await payload.db.findOne<{ id: number | string; sessions?: { id: string }[] }>({
        collection: user.collection,
        where: { id: { equals: user.id } },
      })
      if (row) {
        await payload.db.updateOne({
          id: user.id,
          collection: user.collection,
          // `updatedAt: null` es el propio truco de Payload para no tocar la fecha de la ficha
          // al quitar una sesión. Se usa `db.updateOne` y no `payload.update` para no disparar
          // los `beforeChange` de `members` (que harían un `find` extra en cada logout).
          data: { ...row, updatedAt: null, sessions: (row.sessions ?? []).filter((s) => s.id !== sid) },
          returning: false,
        })
      }
    }
  } catch (err) {
    // Revocar es best effort: nunca puede impedir que el usuario cierre sesión.
    payload.logger.error({ err }, 'logoutAction: revoke session failed')
  }

  const store = await cookies()
  store.delete(SESSION_COOKIE)
  redirect('/')
}

/** Registers the logged-in member into an event, validating open/category/capacity. */
export const inscribeAction = async (eventId: number): Promise<{ ok: boolean; error?: string }> => {
  const member = await currentMember()
  if (!member) return { ok: false, error: 'Debes iniciar sesión.' }
  const payload = await getClient()

  const res = await registerMemberInEvent(payload, {
    memberId: member.id,
    category: member.category,
    eventId,
  })
  if (!res.ok) return { ok: false, error: res.error }
  if (res.alreadyRegistered) return { ok: false, error: 'Ya estás inscrito en este evento.' }
  return { ok: true }
}
