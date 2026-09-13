/**
 * Constantes de sesión, sin ninguna dependencia.
 *
 * Viven aparte de `src/lib/session.ts` porque la config de Payload las necesita y ese módulo
 * importa `next/headers`, que no existe en `pnpm seed` ni en `payload migrate`.
 */

export const SESSION_COOKIE = 'payload-token'

/**
 * Duración de la sesión de socio, en segundos.
 *
 * Es a la vez `auth.tokenExpiration` de `members` y el `maxAge` de la cookie. Cuando divergían
 * (cookie 7 días, token 2 h por defecto de Payload), el socio volvía con la cookie válida y el
 * token caducado: `payload.auth()` devolvía `null` y `/socios` lo echaba a `/login` sin motivo
 * aparente. Cambiar uno sin el otro reintroduce ese fallo.
 */
export const MEMBER_TOKEN_EXPIRATION = 60 * 60 * 24 * 7 // 7 días
