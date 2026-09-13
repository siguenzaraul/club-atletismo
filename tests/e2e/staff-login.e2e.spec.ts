import { test, expect } from '@playwright/test'

import { cleanupTestUser, seedTestUser, testUser } from '../helpers/seedUser'

/**
 * El staff entra por el mismo formulario que los socios.
 *
 * La cookie de Payload es una sola para toda la aplicación, así que el token emitido aquí vale
 * igual para `/gestion` y para `/admin`: no hace falta volver a entrar por el panel.
 */
const BASE = 'http://localhost:3000'

test.describe.configure({ mode: 'serial' })

test.describe('Acceso del staff desde el formulario público', () => {
  test.beforeAll(async () => {
    await seedTestUser()
  })

  test.afterAll(async () => {
    await cleanupTestUser()
  })

  test('entra y aterriza en la gestión, no en la zona de socio', async ({ page }) => {
    await page.goto(`${BASE}/login`)
    await page.getByLabel('Email').fill(testUser.email)
    await page.getByLabel('Contraseña').fill(testUser.password)
    await page.getByRole('button', { name: 'Entrar' }).click()

    // `/socios` exige un socio: si aterrizara ahí, volvería rebotado a /login.
    await page.waitForURL(/\/gestion/, { timeout: 20_000 })
    await expect(page.getByRole('link', { name: 'Stock' })).toBeVisible()
  })

  test('la misma sesión sirve para el panel de administración', async ({ page }) => {
    await page.goto(`${BASE}/login`)
    await page.getByLabel('Email').fill(testUser.email)
    await page.getByLabel('Contraseña').fill(testUser.password)
    await page.getByRole('button', { name: 'Entrar' }).click()
    await page.waitForURL(/\/gestion/, { timeout: 20_000 })

    await page.goto(`${BASE}/admin`)
    await expect(page).toHaveURL(`${BASE}/admin`)
  })

  test('volver a /login con sesión de staff no deja al usuario atrapado', async ({ page }) => {
    await page.goto(`${BASE}/login`)
    await page.getByLabel('Email').fill(testUser.email)
    await page.getByLabel('Contraseña').fill(testUser.password)
    await page.getByRole('button', { name: 'Entrar' }).click()
    await page.waitForURL(/\/gestion/, { timeout: 20_000 })

    await page.goto(`${BASE}/login`)
    await expect(page).toHaveURL(/\/gestion/)
  })

  test('una contraseña incorrecta de staff da el mismo mensaje que la de un socio', async ({
    page,
  }) => {
    // El formulario no puede delatar qué emails son de staff.
    await page.goto(`${BASE}/login`)
    await page.getByLabel('Email').fill(testUser.email)
    await page.getByLabel('Contraseña').fill('noeslabuena')
    await page.getByRole('button', { name: 'Entrar' }).click()

    await expect(
      page.getByRole('alert').filter({ hasText: 'Email o contraseña incorrectos' }),
    ).toBeVisible()
    await expect(page).toHaveURL(/\/login/)
  })

  test('cerrar sesión de staff corta el acceso a la gestión', async ({ page }) => {
    await page.goto(`${BASE}/login`)
    await page.getByLabel('Email').fill(testUser.email)
    await page.getByLabel('Contraseña').fill(testUser.password)
    await page.getByRole('button', { name: 'Entrar' }).click()
    await page.waitForURL(/\/gestion/, { timeout: 20_000 })

    await page.getByRole('button', { name: 'Cerrar sesión' }).first().click()
    await page.waitForURL(`${BASE}/`, { timeout: 20_000 })

    await page.goto(`${BASE}/gestion`)
    await expect(page).toHaveURL(/\/admin\/login/)
  })
})
