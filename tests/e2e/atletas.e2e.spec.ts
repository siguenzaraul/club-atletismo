import { test, expect } from '@playwright/test'
import { getPayload, type Payload } from 'payload'

import config from '@/payload.config'

const BASE = 'http://localhost:3000'

const SUFFIX = String(Date.now()).slice(-8)
const PUBLIC_NAME = `Publica Test ${SUFFIX}`
const PRIVATE_NAME = `Privada Test ${SUFFIX}`
const PHONE = '600987654'
const PUBLIC_EMAIL = `publica-${SUFFIX}@e2e.test`
const PRIVATE_EMAIL = `privada-${SUFFIX}@e2e.test`

let payload: Payload
let publicSlug = ''
let privateSlug = ''

test.beforeAll(async () => {
  payload = await getPayload({ config: await config })

  const pub = await payload.create({
    collection: 'members',
    data: {
      name: PUBLIC_NAME,
      email: PUBLIC_EMAIL,
      password: 'changeme123',
      phone: PHONE,
      federationNumber: 'FED-E2E-1',
      imageRightsAccepted: true,
      publicProfile: true,
      publicBio: 'Ficha de prueba end to end.',
      personalBests: [{ distanceMeters: 10000, mark: '42:15' }],
    },
    overrideAccess: true,
  })
  publicSlug = pub.slug ?? ''

  const priv = await payload.create({
    collection: 'members',
    data: {
      name: PRIVATE_NAME,
      email: PRIVATE_EMAIL,
      password: 'changeme123',
      phone: PHONE,
      imageRightsAccepted: true,
      publicProfile: false,
    },
    overrideAccess: true,
  })
  privateSlug = priv.slug ?? 'privada-test'
})

test.afterAll(async () => {
  for (const email of [PUBLIC_EMAIL, PRIVATE_EMAIL]) {
    const found = await payload.find({
      collection: 'members',
      where: { email: { equals: email } },
      limit: 1,
      overrideAccess: true,
    })
    if (found.docs[0]) {
      await payload.delete({ collection: 'members', id: found.docs[0].id, overrideAccess: true })
    }
  }
})

test('el índice lista al atleta público y no al privado', async ({ page }) => {
  await page.goto(`${BASE}/atletas`)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Atletas')
  await expect(page.getByRole('link', { name: new RegExp(PUBLIC_NAME) })).toBeVisible()
  await expect(page.getByText(PRIVATE_NAME)).toHaveCount(0)
})

test('la ficha pública muestra las marcas', async ({ page }) => {
  await page.goto(`${BASE}/atletas/${publicSlug}`)
  await expect(page.getByRole('heading', { level: 1 })).toContainText(PUBLIC_NAME)
  await expect(page.getByRole('region', { name: /Marcas personales/ })).toContainText('10K')
  await expect(page.getByRole('region', { name: /Marcas personales/ })).toContainText('42:15')
})

// La comprobación que de verdad cierra la fuga: no basta con que el componente no lo pinte,
// el dato no debe llegar al HTML por ninguna vía (payload RSC incluido).
test('la ficha pública no filtra teléfono, email ni nº de federación', async ({ page }) => {
  await page.goto(`${BASE}/atletas/${publicSlug}`)
  const html = await page.content()
  expect(html).not.toContain(PHONE)
  expect(html).not.toContain(PUBLIC_EMAIL)
  expect(html).not.toContain('FED-E2E-1')
  expect(html).not.toContain('"salt"')
  expect(html).not.toContain('"hash"')
})

test('un socio privado no tiene ficha accesible', async ({ page }) => {
  await page.goto(`${BASE}/atletas/${privateSlug}`)
  await expect(page.getByRole('heading', { level: 1 })).not.toContainText(PRIVATE_NAME)
  const html = await page.content()
  expect(html).not.toContain(PRIVATE_EMAIL)
  expect(html).not.toContain(PRIVATE_NAME)
})

test('la API pública sigue sin exponer socios al anónimo', async ({ request }) => {
  const res = await request.get(`${BASE}/api/members`)
  expect(res.status()).toBe(403)
})
