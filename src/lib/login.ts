/**
 * A qué colección pertenece un login, y cuánto dura su sesión.
 *
 * El formulario público sirve para socios (`members`) y para el staff (`users`). La cookie de
 * Payload (`payload-token`) es una sola para toda la aplicación — el nombre no depende de la
 * colección, sólo del `cookiePrefix` —, así que un token de staff emitido aquí vale igual para
 * `/gestion` y para `/admin`.
 *
 * Módulo sin `'use server'` ni `next/headers`: así los tests de integración pueden llamarlo con
 * la Local API.
 */

import type { Payload } from 'payload'

import { MEMBER_TOKEN_EXPIRATION } from './auth-config'

/** Colecciones con login propio. */
export type LoginCollection = 'members' | 'users'

/** A dónde va cada uno después de entrar. */
export const LOGIN_LANDING: Record<LoginCollection, string> = {
  members: '/socios',
  // Nunca `/socios`: esa página exige un `member` y mandaría al staff de vuelta a /login.
  users: '/gestion',
}

/**
 * Decide contra qué colección autenticar un email.
 *
 * Se consulta antes de intentar el login, en vez de probar una colección y caer en la otra: así
 * una contraseña equivocada gasta un intento del bloqueo de Payload y no dos, y se evita un
 * bcrypt de más en cada acceso.
 *
 * El staff manda cuando el email existe en ambas. Es el mismo criterio que ya usa la cabecera
 * del sitio (`staff ? 'staff' : member ? 'member' : 'anon'`): una persona con cuenta de staff
 * entra a gestionar. Si además es socia, su zona de socio sigue accesible entrando con la
 * cuenta de socio, que es una cuenta distinta.
 */
export const resolveLoginCollection = async (
  payload: Payload,
  email: string,
): Promise<LoginCollection> => {
  const normalized = email.trim().toLowerCase()
  if (!normalized) return 'members'

  try {
    const staff = await payload.count({
      collection: 'users',
      where: { email: { equals: normalized } },
      overrideAccess: true,
    })
    return staff.totalDocs > 0 ? 'users' : 'members'
  } catch (err) {
    // Si la consulta falla, seguir por el camino de siempre: el login dirá lo que corresponda.
    payload.logger.error({ err }, 'resolveLoginCollection failed')
    return 'members'
  }
}

/**
 * Duración del token de esa colección, en segundos. La cookie debe durar exactamente esto: si
 * dura más, el usuario vuelve con cookie válida y token caducado y acaba en /login sin motivo
 * aparente. `users` conserva el valor por defecto de Payload (2 h), que es el que usa el panel.
 */
export const tokenExpirationFor = (payload: Payload, collection: LoginCollection): number =>
  payload.collections[collection]?.config?.auth?.tokenExpiration ?? MEMBER_TOKEN_EXPIRATION
