import { test, expect, type BrowserContext, type Page } from '@playwright/test'

/**
 * Alta, login y logout de socio de principio a fin.
 *
 * Antes no existía ni un test de estos flujos, y el fallo que motivó todo esto — cuenta creada
 * pero sin redirect — vivía justo aquí.
 *
 * Serie y con un contexto de navegador compartido: los pasos encadenan la misma sesión, que es
 * precisamente lo que hay que comprobar. El email lleva un sufijo único para que la suite se
 * pueda reejecutar sobre la misma base de datos de desarrollo.
 */
test.describe.configure({ mode: 'serial' })

const BASE = 'http://localhost:3000'
const stamp = Date.now()
const EMAIL = `socio-${stamp}@e2e.test`
const PASSWORD = 'unaclavelarga'
const NAME = 'Socio E2E'

const fillRegistration = async (page: Page, email: string) => {
  await page.getByLabel('Nombre completo').fill(NAME)
  await page.getByLabel('Email', { exact: true }).fill(email)
  const phone = page.getByLabel(/Teléfono móvil/)
  if (await phone.isVisible().catch(() => false)) await phone.fill('600111222')
  await page.getByLabel(/^Contraseña/).fill(PASSWORD)
  await page.getByLabel('Repite la contraseña').fill(PASSWORD)
  await page.getByRole('checkbox').check()

  // Qué campos pide el alta lo decide el club desde el CMS, así que el test no puede dar por
  // hecho que no hay equipación: si la hay, se rellena. Lo específico de la equipación se
  // prueba en hazte-socio-equipacion.e2e.spec.ts.
  const blocks = page.locator('fieldset', { hasText: 'Tu equipación' }).locator('> div')
  for (let i = 0; i < (await blocks.count()); i++) {
    const block = blocks.nth(i)
    await block.locator('select').first().selectOption({ index: 1 })
    const size = block.getByLabel('Talla')
    if (await size.isVisible().catch(() => false)) await size.selectOption({ index: 1 })
  }
}

test.describe('Alta y acceso de socios', () => {
  let context: BrowserContext
  let page: Page

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext()
    page = await context.newPage()
  })

  test.afterAll(async () => {
    await context.close()
  })

  test('el alta crea la cuenta y lleva a la zona de socio', async () => {
    await page.goto(`${BASE}/hazte-socio`)
    await fillRegistration(page, EMAIL)
    await page.getByRole('button', { name: 'Crear cuenta' }).click()

    // Éste es el síntoma que reportó el club: la cuenta se creaba y el usuario se quedaba aquí.
    await expect(page).toHaveURL(/\/socios/)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Hola,')
    await expect(page.getByRole('status').first()).toContainText('Bienvenido')
  })

  test('la cookie de sesión dura lo mismo que el token', async () => {
    const cookie = (await context.cookies()).find((c) => c.name === 'payload-token')
    expect(cookie).toBeTruthy()
    expect(cookie!.httpOnly).toBe(true)

    // 7 días. Cuando la cookie duraba 7 días y el token 2 horas, el socio volvía y lo echaba.
    const days = (cookie!.expires * 1000 - Date.now()) / 86_400_000
    expect(days).toBeGreaterThan(6)
    expect(days).toBeLessThan(8)
  })

  test('la sesión sigue viva al recargar', async () => {
    await page.goto(`${BASE}/socios`)
    await expect(page).toHaveURL(/\/socios/)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Hola,')
  })

  test('cerrar sesión devuelve a la portada y corta el acceso', async () => {
    await page.goto(`${BASE}/socios`)
    await page.getByRole('button', { name: 'Cerrar sesión' }).first().click()
    // Margen amplio: en `pnpm dev` la primera invocación de una server action incluye su
    // compilación, que se come varios segundos y no dice nada del logout en sí.
    await page.waitForURL(`${BASE}/`, { timeout: 20_000 })

    await page.goto(`${BASE}/socios`)
    await expect(page).toHaveURL(/\/login/)
  })

  test('el login funciona con las mismas credenciales', async () => {
    await page.goto(`${BASE}/login`)
    await page.getByLabel('Email').fill(EMAIL)
    await page.getByLabel('Contraseña').fill(PASSWORD)
    await page.getByRole('button', { name: 'Entrar' }).click()
    await expect(page).toHaveURL(/\/socios/)
  })

  test('una contraseña incorrecta deja un mensaje claro y no entra', async () => {
    await context.clearCookies()
    await page.goto(`${BASE}/login`)
    await page.getByLabel('Email').fill(EMAIL)
    await page.getByLabel('Contraseña').fill('noeslabuena')
    await page.getByRole('button', { name: 'Entrar' }).click()

    // `.first()` no vale: Next inyecta su propio `role="alert"` (el anunciador de rutas) y el
    // orden en el DOM no está garantizado. Se filtra por el texto del formulario.
    await expect(
      page.getByRole('alert').filter({ hasText: 'Email o contraseña incorrectos' }),
    ).toBeVisible()
    await expect(page).toHaveURL(/\/login/)
  })

  test('repetir el alta con la misma contraseña recupera la sesión en vez de bloquear', async () => {
    // El caso real del bug: el alta quedó a medias y el socio reenvía el formulario. Antes le
    // decía "ya existe una cuenta con ese email" y se quedaba fuera de su propia cuenta.
    await context.clearCookies()
    await page.goto(`${BASE}/hazte-socio`)
    await fillRegistration(page, EMAIL)
    await page.getByRole('button', { name: 'Crear cuenta' }).click()

    await expect(page).toHaveURL(/\/socios/)
  })
})

test.describe('Alta sin JavaScript', () => {
  // El formulario de alta usaba una función de cliente como `action`, así que antes de hidratar
  // el envío no hacía nada. Éste es el único test que lo detecta.
  test.use({ javaScriptEnabled: false })

  test('el formulario sigue enviando sin hidratar', async ({ page }) => {
    await page.goto(`${BASE}/hazte-socio`)
    await fillRegistration(page, `socio-nojs-${Date.now()}@e2e.test`)
    await page.getByRole('button', { name: 'Crear cuenta' }).click()

    await expect(page).toHaveURL(/\/socios/)
  })
})
