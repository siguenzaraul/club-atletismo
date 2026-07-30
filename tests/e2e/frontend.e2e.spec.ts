import { test, expect } from '@playwright/test'

test.describe('Frontend', () => {
  test('homepage shows the ABTR brand', async ({ page }) => {
    await page.goto('http://localhost:3000')
    await expect(page).toHaveTitle(/ABTR/)
    await expect(page.locator('h1').first()).toBeVisible()
  })

  test('events page lists events', async ({ page }) => {
    await page.goto('http://localhost:3000/eventos')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Eventos')
  })

  test('members area redirects anonymous users to login', async ({ page }) => {
    await page.goto('http://localhost:3000/socios')
    await expect(page).toHaveURL(/\/login/)
  })
})
