// @vitest-environment node
import { existsSync, rmSync } from 'fs'
import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { beforeAll, describe, expect, it } from 'vitest'

import { getRegistrationSettings } from '@/lib/registration-form'
import { DEFAULT_REGISTER_CONFIG } from '@/lib/validation/register'

let payload: Payload
let publicadoId: number
let despublicadoId: number
let inactivoId: number

describe('Configuración del formulario de alta', () => {
  beforeAll(async () => {
    if (existsSync('./tests/.test.db')) rmSync('./tests/.test.db')
    payload = await getPayload({ config: await config })

    await payload.create({ collection: 'seasons', data: { name: '2025/26', isCurrent: true } })

    const publicado = await payload.create({
      collection: 'membership-types',
      data: { name: 'Adulto', showOnWebsite: true, active: true, requiresPayment: true, amount: 30 },
      overrideAccess: true,
    })
    publicadoId = publicado.id

    const despublicado = await payload.create({
      collection: 'membership-types',
      data: { name: 'Honorífico', showOnWebsite: false, active: true },
      overrideAccess: true,
    })
    despublicadoId = despublicado.id

    const inactivo = await payload.create({
      collection: 'membership-types',
      data: { name: 'Antiguo', showOnWebsite: true, active: false },
      overrideAccess: true,
    })
    inactivoId = inactivo.id
  })

  it('con el global vacío se comporta exactamente como antes', async () => {
    // Si esto cambia, un despliegue alteraría el alta sin que el club toque nada.
    const settings = await getRegistrationSettings(payload)
    expect(settings.config.phone).toEqual(DEFAULT_REGISTER_CONFIG.phone)
    expect(settings.config.membershipType).toEqual(DEFAULT_REGISTER_CONFIG.membershipType)
    expect(settings.config.garments).toEqual([])
    expect(settings.garments).toEqual([])
  })

  it('sólo ofrece los tipos de cuota publicados y activos', async () => {
    // Ésta es la lista contra la que `registerAction` valida el `membershipType` del POST: un
    // tipo despublicado o desactivado no puede colarse desde el formulario.
    const settings = await getRegistrationSettings(payload)
    const ids = settings.membershipTypes.map((t) => t.id)
    expect(ids).toContain(publicadoId)
    expect(ids).not.toContain(despublicadoId)
    expect(ids).not.toContain(inactivoId)
  })

  it('si el club desactiva la pregunta, no hay ningún tipo que aceptar', async () => {
    await payload.updateGlobal({
      slug: 'registration-form',
      data: { membershipTypeEnabled: false },
      overrideAccess: true,
    })
    const settings = await getRegistrationSettings(payload)
    expect(settings.config.membershipType.enabled).toBe(false)
    // Lista vacía ⇒ `registerAction` no puede resolver ningún id ⇒ el POST manipulado se ignora.
    expect(settings.membershipTypes).toEqual([])

    await payload.updateGlobal({
      slug: 'registration-form',
      data: { membershipTypeEnabled: true },
      overrideAccess: true,
    })
  })

  it('descarta los tipos de prenda sin artículos activos', async () => {
    // Un desplegable vacío en el alta es peor que no preguntar.
    const categoria = await payload.create({
      collection: 'equipment-categories',
      data: { name: 'Parte de arriba' },
      overrideAccess: true,
    })
    await payload.updateGlobal({
      slug: 'registration-form',
      data: { garments: [{ category: categoria.id, enabled: true, required: true, askSize: true }] },
      overrideAccess: true,
    })

    expect((await getRegistrationSettings(payload)).garments).toEqual([])

    const escala = await payload.create({
      collection: 'size-scales',
      data: { name: 'Ropa', slug: 'ropa-test' },
      overrideAccess: true,
    })
    await payload.create({
      collection: 'equipment-items',
      data: { name: 'Camiseta de tirantes', sizeScale: escala.id, category: categoria.id },
      overrideAccess: true,
    })

    const settings = await getRegistrationSettings(payload)
    expect(settings.garments).toHaveLength(1)
    expect(settings.garments[0]?.categoryId).toBe(categoria.id)
    expect(settings.config.garments[0]?.required).toBe(true)
  })

  it('una fila desactivada no llega al formulario', async () => {
    const categoria = await payload.find({
      collection: 'equipment-categories',
      limit: 1,
      overrideAccess: true,
    })
    await payload.updateGlobal({
      slug: 'registration-form',
      data: {
        garments: [
          { category: categoria.docs[0]!.id, enabled: false, required: true, askSize: true },
        ],
      },
      overrideAccess: true,
    })
    expect((await getRegistrationSettings(payload)).garments).toEqual([])
  })
})
