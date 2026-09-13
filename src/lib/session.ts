/**
 * Sesión de socio y de staff, en un solo sitio.
 *
 * Módulo **sin** `'use server'`: lo importan Server Components directamente, así que
 * `cache()` de React deduplica dentro del mismo render. Antes, `SiteHeader` y la página
 * resolvían la sesión por separado en cada petición.
 */

import { cache } from 'react'
import { cookies, headers as nextHeaders } from 'next/headers'

import { getClient } from '@/lib/payload'
import { MEMBER_TOKEN_EXPIRATION, SESSION_COOKIE } from '@/lib/auth-config'
import type { Member, User } from '@/payload-types'

export { MEMBER_TOKEN_EXPIRATION, SESSION_COOKIE }

const authenticate = async () => {
  // Sin cookie no hay nada que verificar: ahorra un `payload.auth()` (y su findByID) en cada
  // render anónimo, que es la mayoría del tráfico público.
  const store = await cookies()
  if (!store.get(SESSION_COOKIE)) return null
  const payload = await getClient()
  const { user } = await payload.auth({ headers: await nextHeaders() })
  return user ?? null
}

/** El socio logueado, o null. Deduplicado por render. */
export const currentMember = cache(async (): Promise<Member | null> => {
  const user = await authenticate()
  return user?.collection === 'members' ? (user as Member) : null
})

/** El usuario de staff logueado (colección `users`), o null. Deduplicado por render. */
export const currentStaff = cache(async (): Promise<User | null> => {
  const user = await authenticate()
  return user?.collection === 'users' ? (user as User) : null
})
