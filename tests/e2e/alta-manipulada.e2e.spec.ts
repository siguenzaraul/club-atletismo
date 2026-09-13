import { test, expect, type Page } from '@playwright/test'
import { getPayload } from 'payload'

import config from '../../src/payload.config'

/**
 * El formulario no es una fuente de verdad: todo lo que llega por POST se revalida contra la
 * base de datos. Aquí se manipula el DOM antes de enviar, que es lo que haría cualquiera con
 * las herramientas del navegador.
 *
 * Usa la Local API para comprobar el resultado, no la interfaz: lo que se está probando es qué
 * queda guardado, y eso no se ve en pantalla.
 */
const BASE = 'http://localhost:3000'

const fillBasics = async (page: Page, email: string) => {
  await page.getByLabel('Nombre completo').fill('Socio Manipulado')
  await page.getByLabel('Email', { exact: true }).fill(email)
  const phone = page.getByLabel(/Teléfono móvil/)
  if (await phone.isVisible().catch(() => false)) await phone.fill('600444555')
  await page.getByLabel(/^Contraseña/).fill('unaclavelarga')
  await page.getByLabel('Repite la contraseña').fill('unaclavelarga')
  await page.getByRole('checkbox').check()

  // Si el club tiene equipación configurada, hay que rellenarla o no se envía el formulario.
  const blocks = page.locator('fieldset', { hasText: 'Tu equipación' }).locator('> div')
  for (let i = 0; i < (await blocks.count()); i++) {
    const block = blocks.nth(i)
    await block.locator('select').first().selectOption({ index: 1 })
    const size = block.getByLabel('Talla')
    if (await size.isVisible().catch(() => false)) await size.selectOption({ index: 1 })
  }
}

/** Inyecta una opción que el servidor nunca ofreció y la deja seleccionada. */
const forgeMembershipType = async (page: Page, value: string) => {
  const select = page.locator('select[name="membershipType"]')
  if ((await select.count()) === 0) return false
  await select.evaluate((el: HTMLSelectElement, v: string) => {
    const option = document.createElement('option')
    option.value = v
    option.textContent = 'Inyectado'
    el.appendChild(option)
    el.value = v
  }, value)
  return true
}

const membershipTypeOf = async (email: string) => {
  const payload = await getPayload({ config: await config })
  const member = await payload.find({
    collection: 'members',
    where: { email: { equals: email } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const memberId = member.docs[0]?.id
  if (!memberId) return { exists: false as const }
  const memberships = await payload.find({
    collection: 'memberships',
    where: { member: { equals: memberId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  return {
    exists: true as const,
    memberships: memberships.totalDocs,
    type: memberships.docs[0]?.type ?? null,
    paymentStatus: memberships.docs[0]?.paymentStatus ?? null,
  }
}

test.describe('Alta con el formulario manipulado', () => {
  test('un tipo de cuota inventado se ignora, y la cuota se abre igual', async ({ page }) => {
    const email = `forjado-${Date.now()}@e2e.test`
    await page.goto(`${BASE}/hazte-socio`)
    await fillBasics(page, email)

    const hasSelect = await forgeMembershipType(page, '999999')
    test.skip(!hasSelect, 'El club no pregunta el tipo de cuota')

    await page.getByRole('button', { name: 'Crear cuenta' }).click()
    await expect(page).toHaveURL(/\/socios/)

    // La cuenta existe y tiene su cuota pendiente, pero SIN el tipo inventado.
    await expect(async () => {
      const res = await membershipTypeOf(email)
      expect(res.exists).toBe(true)
      expect(res.memberships).toBe(1)
      expect(res.type).toBeNull()
      expect(res.paymentStatus).toBe('pending')
    }).toPass({ timeout: 15_000 })
  })

  test('un tipo de cuota que no es un número no deja al socio sin cuota', async ({ page }) => {
    // Antes, `Number("abc")` daba NaN, el create de la cuota fallaba y el fallo se tragaba en
    // silencio: socio dentro, sin cuota, y nadie se enteraba hasta revisarlo a mano.
    const email = `forjado-nan-${Date.now()}@e2e.test`
    await page.goto(`${BASE}/hazte-socio`)
    await fillBasics(page, email)

    const hasSelect = await forgeMembershipType(page, 'abc')
    test.skip(!hasSelect, 'El club no pregunta el tipo de cuota')

    await page.getByRole('button', { name: 'Crear cuenta' }).click()
    await expect(page).toHaveURL(/\/socios/)

    await expect(async () => {
      const res = await membershipTypeOf(email)
      expect(res.exists).toBe(true)
      expect(res.memberships).toBe(1)
      expect(res.type).toBeNull()
    }).toPass({ timeout: 15_000 })
  })
})
