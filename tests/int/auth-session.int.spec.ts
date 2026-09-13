// @vitest-environment node
//
// Entorno node, no jsdom: `payload.login` firma el JWT con `jose`, que exige un Uint8Array del
// mismo realm. El TextEncoder de jsdom devuelve uno de otro realm y la firma revienta con
// "payload must be an instance of Uint8Array" — un artefacto del entorno, no del código.
import { existsSync, rmSync } from 'fs'
import { AuthenticationError, LockedAuth, getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { beforeAll, describe, expect, it } from 'vitest'

import { MEMBER_TOKEN_EXPIRATION } from '@/lib/auth-config'
import { LOGIN_LANDING, resolveLoginCollection, tokenExpirationFor } from '@/lib/login'

let payload: Payload

describe('Sesión de socio', () => {
  beforeAll(async () => {
    if (existsSync('./tests/.test.db')) rmSync('./tests/.test.db')
    payload = await getPayload({ config: await config })
  })

  it('el token caduca a la vez que la cookie', () => {
    // Congela el desajuste que echaba al socio a /login pasadas 2 horas: el default de Payload
    // es 7200 s y la cookie duraba 7 días. Si alguien cambia uno sin el otro, esto falla.
    expect(payload.collections.members.config.auth.tokenExpiration).toBe(MEMBER_TOKEN_EXPIRATION)
    expect(MEMBER_TOKEN_EXPIRATION).toBe(60 * 60 * 24 * 7)
  })

  describe('a qué colección va cada login', () => {
    it('un email de staff resuelve a `users`, y uno de socio a `members`', async () => {
      await payload.create({
        collection: 'users',
        data: { name: 'Staff', email: 'staff@test.run', password: 'changeme123', roles: ['admin'] },
      })
      await payload.create({
        collection: 'members',
        data: {
          name: 'Socio',
          email: 'socio@test.run',
          phone: '+34 600 400 100',
          password: 'changeme123',
          imageRightsAccepted: true,
        },
      })

      expect(await resolveLoginCollection(payload, 'staff@test.run')).toBe('users')
      expect(await resolveLoginCollection(payload, 'socio@test.run')).toBe('members')
    })

    it('un email desconocido cae en `members` sin delatar nada', async () => {
      // Da igual la colección: el login fallará con el mismo mensaje. Lo que no puede pasar es
      // que el formulario responda distinto según exista o no una cuenta de staff.
      expect(await resolveLoginCollection(payload, 'nadie@test.run')).toBe('members')
      expect(await resolveLoginCollection(payload, '')).toBe('members')
    })

    it('ignora mayúsculas y espacios', async () => {
      expect(await resolveLoginCollection(payload, '  STAFF@test.run ')).toBe('users')
    })

    it('el staff manda si el email existe en las dos colecciones', async () => {
      const email = 'ambos@test.run'
      await payload.create({
        collection: 'users',
        data: { name: 'Ambos staff', email, password: 'changeme123', roles: ['editor'] },
      })
      await payload.create({
        collection: 'members',
        data: {
          name: 'Ambos socio',
          email,
          phone: '+34 600 400 200',
          password: 'changeme123',
          imageRightsAccepted: true,
        },
      })
      expect(await resolveLoginCollection(payload, email)).toBe('users')
    })

    it('cada colección aterriza donde puede entrar', () => {
      // `/socios` exige un socio: mandar ahí al staff lo devolvería a /login en bucle.
      expect(LOGIN_LANDING.members).toBe('/socios')
      expect(LOGIN_LANDING.users).toBe('/gestion')
    })

    it('la cookie de cada colección dura lo que su token', () => {
      expect(tokenExpirationFor(payload, 'members')).toBe(MEMBER_TOKEN_EXPIRATION)
      expect(tokenExpirationFor(payload, 'members')).toBe(60 * 60 * 24 * 7)
      // `users` conserva el valor por defecto de Payload (2 h), el que usa el panel. Valor
      // literal y no `payload.collections.users…`, que sería comparar la función consigo misma.
      expect(tokenExpirationFor(payload, 'users')).toBe(7200)
    })
  })

  it('el staff puede autenticarse con payload.login, igual que un socio', async () => {
    await payload.create({
      collection: 'users',
      data: { name: 'Staff Login', email: 'staff-login@test.run', password: 'changeme123', roles: ['admin'] },
    })
    const res = await payload.login({
      collection: 'users',
      data: { email: 'staff-login@test.run', password: 'changeme123' },
    })
    expect(res.token).toBeTruthy()
    expect(res.user?.email).toBe('staff-login@test.run')
  })

  it('login correcto devuelve token y usuario', async () => {
    await payload.create({
      collection: 'members',
      data: {
        name: 'Socio Login',
        email: 'login@test.run',
        phone: '+34 600 300 100',
        password: 'changeme123',
        imageRightsAccepted: true,
      },
    })
    const res = await payload.login({
      collection: 'members',
      data: { email: 'login@test.run', password: 'changeme123' },
    })
    expect(res.token).toBeTruthy()
    expect(res.user?.email).toBe('login@test.run')
  })

  it('cada login abre una sesión distinta y revocar una deja viva la otra', async () => {
    const member = await payload.create({
      collection: 'members',
      data: {
        name: 'Socio Sesiones',
        email: 'sesiones@test.run',
        phone: '+34 600 300 200',
        password: 'changeme123',
        imageRightsAccepted: true,
      },
    })
    await payload.login({
      collection: 'members',
      data: { email: 'sesiones@test.run', password: 'changeme123' },
    })
    await payload.login({
      collection: 'members',
      data: { email: 'sesiones@test.run', password: 'changeme123' },
    })

    const row = await payload.db.findOne<{ id: number; sessions?: { id: string }[] }>({
      collection: 'members',
      where: { id: { equals: member.id } },
    })
    const sessions = row?.sessions ?? []
    expect(sessions.length).toBe(2)

    // Esto es lo que hace `logoutAction`: quitar sólo la sesión de esta cookie.
    const victim = sessions[0]!.id
    await payload.db.updateOne({
      id: member.id,
      collection: 'members',
      data: { ...row, updatedAt: null, sessions: sessions.filter((s) => s.id !== victim) },
      returning: false,
    })

    const after = await payload.db.findOne<{ id: number; sessions?: { id: string }[] }>({
      collection: 'members',
      where: { id: { equals: member.id } },
    })
    expect(after?.sessions?.length).toBe(1)
    expect(after?.sessions?.[0]?.id).not.toBe(victim)
  })

  it('la contraseña incorrecta lanza AuthenticationError, y el sexto intento bloquea', async () => {
    await payload.create({
      collection: 'members',
      data: {
        name: 'Socio Bloqueo',
        email: 'bloqueo@test.run',
        phone: '+34 600 300 300',
        password: 'changeme123',
        imageRightsAccepted: true,
      },
    })

    const attempt = () =>
      payload
        .login({ collection: 'members', data: { email: 'bloqueo@test.run', password: 'mala' } })
        .then(() => null)
        .catch((e: unknown) => e)

    // Los cinco primeros son credenciales incorrectas…
    for (let i = 0; i < 5; i++) {
      expect(await attempt()).toBeInstanceOf(AuthenticationError)
    }
    // …y a partir de ahí Payload bloquea la cuenta 10 minutos. El `catch {}` vacío del login
    // disfrazaba esto de "email o contraseña incorrectos" y el socio reintentaba, alargándolo.
    expect(await attempt()).toBeInstanceOf(LockedAuth)
  })
})
