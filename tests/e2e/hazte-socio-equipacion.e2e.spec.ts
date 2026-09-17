import { test, expect, type Page } from '@playwright/test'

/**
 * Alta con equipación: prenda → subtipo excluyente → talla.
 *
 * Requiere que el club haya configurado al menos un tipo de prenda en
 * Administración → Formulario de alta. Si no hay ninguno, el formulario no los pinta y estos
 * tests se saltan solos: el global nace vacío a propósito para que un despliegue no cambie el
 * alta hasta que el club lo encienda.
 */
const BASE = 'http://localhost:3000'

const fillBasics = async (page: Page, email: string) => {
  await page.getByLabel('Nombre completo').fill('Socio Equipación')
  await page.getByLabel('Email', { exact: true }).fill(email)
  const phone = page.getByLabel(/Teléfono móvil/)
  if (await phone.isVisible().catch(() => false)) await phone.fill('600222333')
  await page.getByLabel(/^Contraseña/).fill('unaclavelarga')
  await page.getByLabel('Repite la contraseña').fill('unaclavelarga')
  await page.getByRole('checkbox').check()
}

test.describe('Alta con equipación', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/hazte-socio`)
    const configured = await page.locator('fieldset', { hasText: 'Tu equipación' }).count()
    test.skip(configured === 0, 'No hay tipos de prenda configurados en el CMS')
  })

  test('elegir prenda acota las tallas a las de su escala', async ({ page }) => {
    const fieldset = page.locator('fieldset', { hasText: 'Tu equipación' })
    const firstBlock = fieldset.locator('> div').first()
    const sizeSelect = firstBlock.getByLabel('Talla')

    // Nunca deshabilitado: sin JavaScript no volvería a habilitarse jamás y el alta quedaría
    // bloqueada. Se ofrecen todas las tallas del tipo hasta que se elige prenda.
    await expect(sizeSelect).toBeEnabled()
    const antes = await sizeSelect.locator('option').count()
    expect(antes).toBeGreaterThan(1)

    await firstBlock.locator('select').first().selectOption({ index: 1 })
    await expect(sizeSelect).toBeEnabled()
    expect(await sizeSelect.locator('option').count()).toBeGreaterThan(1)
  })

  test('cambiar de prenda limpia la talla elegida', async ({ page }) => {
    const firstBlock = page
      .locator('fieldset', { hasText: 'Tu equipación' })
      .locator('> div')
      .first()
    const garmentSelect = firstBlock.locator('select').first()
    const sizeSelect = firstBlock.getByLabel('Talla')

    await garmentSelect.selectOption({ index: 1 })
    await sizeSelect.selectOption({ index: 1 })
    await expect(sizeSelect).not.toHaveValue('')

    // La talla podría no existir en la escala de la prenda nueva.
    await garmentSelect.selectOption({ index: 2 })
    await expect(sizeSelect).toHaveValue('')
  })

  test('sólo se puede elegir un subtipo por tipo de prenda', async ({ page }) => {
    const fieldset = page.locator('fieldset', { hasText: 'Tu equipación' })
    const garmentSelect = fieldset.locator('select').first()
    // Un único `<select>`: elegir tirantes descarta manga corta por construcción, que es
    // justamente el requisito («sólo una, no las dos»).
    expect(await garmentSelect.evaluate((el: HTMLSelectElement) => el.multiple)).toBe(false)
    expect(await garmentSelect.locator('option').count()).toBeGreaterThan(2)
  })

  test('el alta sin elegir la prenda obligatoria no crea la cuenta', async ({ page }) => {
    const email = `equip-falla-${Date.now()}@e2e.test`
    await fillBasics(page, email)
    await page.getByRole('button', { name: 'Crear cuenta' }).click()

    // El navegador corta el envío por el `required` del desplegable: seguimos en el formulario.
    await expect(page).toHaveURL(/\/hazte-socio/)
  })

  test('el alta con prenda y talla entra y deja la reserva registrada', async ({ page }) => {
    const email = `equip-ok-${Date.now()}@e2e.test`
    await fillBasics(page, email)

    const fieldset = page.locator('fieldset', { hasText: 'Tu equipación' })
    const firstBlock = fieldset.locator('> div').first()
    const garmentSelect = firstBlock.locator('select').first()
    const sizeSelect = firstBlock.getByLabel('Talla')
    await garmentSelect.selectOption({ index: 1 })
    await sizeSelect.selectOption({ index: 1 })

    // Lo elegido, para comprobar después que es exactamente lo que se le reserva.
    const prenda = await garmentSelect.locator('option:checked').innerText()
    const talla = await sizeSelect.locator('option:checked').innerText()

    await page.getByRole('button', { name: 'Crear cuenta' }).click()
    await expect(page).toHaveURL(/\/socios/)

    // La reserva se crea en `after()`, fuera de la respuesta: hay que darle un momento.
    await expect(async () => {
      await page.reload()
      await expect(page.getByRole('heading', { name: 'Mi equipación' })).toBeVisible()
      await expect(page.locator('text=Reservada').first()).toBeVisible()
    }).toPass({ timeout: 15_000 })

    /**
     * Lo que el socio eligió en el alta es lo que le falta por recoger, con su talla.
     *
     * Antes este aviso salía de los «packs de equipación», una lista aparte de lo que le tocaba
     * a cada tipo de socio: decía «te falta la prenda de arriba» mientras el socio tenía dos
     * prendas reservadas. Ahora la única fuente es lo que él eligió.
     */
    const panel = page.locator('section', { hasText: 'Mi equipación' }).last()
    const pendiente = panel.locator('text=Te falta por recoger esta temporada').locator('..')
    await expect(pendiente).toContainText(prenda.trim())
    await expect(pendiente).toContainText(talla.trim())
  })
})
