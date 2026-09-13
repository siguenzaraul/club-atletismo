import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

export interface LoginOptions {
  page: Page
  serverURL?: string
  user: {
    email: string
    password: string
  }
}

/**
 * Logs the user into the admin panel via the login page.
 */
export async function login({
  page,
  serverURL = 'http://localhost:3000',
  user,
}: LoginOptions): Promise<void> {
  await page.goto(`${serverURL}/admin/login`)

  await page.fill('#field-email', user.email)
  await page.fill('#field-password', user.password)
  await page.click('button[type="submit"]')

  await page.waitForURL(`${serverURL}/admin`)

  // `.step-nav__first` era una clase interna de Payload 2 que ya no existe en 3.x
  // (la actual es `.step-nav__home`), así que este test llevaba roto desde el inicio.
  // Se comprueba por rol: no depende de las clases internas del paquete.
  await expect(page.getByRole('navigation').first()).toBeVisible()
}
