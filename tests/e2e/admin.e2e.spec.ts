import { test, expect, Page } from '@playwright/test'
import { login } from '../helpers/login'
import { seedTestUser, cleanupTestUser, testUser } from '../helpers/seedUser'

test.describe('Admin Panel', () => {
  let page: Page

  test.beforeAll(async ({ browser }) => {
    await seedTestUser()

    const context = await browser.newContext()
    page = await context.newPage()

    await login({ page, user: testUser })
  })

  test.afterAll(async () => {
    await cleanupTestUser()
  })

  test('can navigate to dashboard', async () => {
    await page.goto('http://localhost:3000/admin')
    await expect(page).toHaveURL('http://localhost:3000/admin')
    // Por rol, no por clases internas de Payload (`.step-nav__first` es de Payload 2).
    const nav = page.getByRole('navigation').first()
    await expect(nav).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Socios', exact: true })).toBeVisible()
  })

  test('can navigate to list view', async () => {
    await page.goto('http://localhost:3000/admin/collections/users')
    // Payload añade `?depth=&limit=` al entrar en el listado, así que la URL no es exacta.
    await expect(page).toHaveURL(/\/admin\/collections\/users(\?|$)/)
    // El panel está en español y la colección tiene labels propios ("Usuarios (staff)"),
    // así que buscar "Users" nunca podía funcionar.
    await expect(page.getByRole('heading', { name: 'Usuarios (staff)' }).first()).toBeVisible()
  })

  test('can navigate to edit view', async () => {
    await page.goto('http://localhost:3000/admin/collections/users/create')
    await expect(page).toHaveURL(/\/admin\/collections\/users\/[a-zA-Z0-9-_]+/)
    const editViewArtifact = page.locator('input[name="email"]')
    await expect(editViewArtifact).toBeVisible()
  })
})
