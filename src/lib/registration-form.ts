/**
 * Lee la configuración del alta del CMS y la convierte en lo que necesitan el formulario
 * público y la server action.
 *
 * Un solo sitio donde cliente y servidor podrían divergir — y no divergen, porque ambos parten
 * de este mismo objeto: la página lo pasa por props y `registerAction` lo vuelve a leer.
 */

import type { Payload } from 'payload'

import { getCurrentSeason } from '@/lib/membership'
import { idOf } from '@/lib/equipment'
import type { RegisterFormConfig } from '@/lib/validation/register'
import type { MembershipTypeOption } from '@/components/site/AuthForms'

export type GarmentItemOption = { id: number; name: string; sizeScale: number | null }
export type GarmentSizeOption = { id: number; label: string; scale: number | null }

export type GarmentOption = {
  /** Slug del tipo de prenda: da nombre a los campos `garment:<key>` y `size:<key>`. */
  key: string
  categoryId: number
  label: string
  help: string | null
  required: boolean
  askSize: boolean
  items: GarmentItemOption[]
  sizes: GarmentSizeOption[]
}

export type RegistrationSettings = {
  intro: string | null
  config: RegisterFormConfig
  garments: GarmentOption[]
  membershipTypes: MembershipTypeOption[]
  reserveStock: boolean
  allowOverbooking: boolean
  /** Sin temporada actual no se puede reservar nada; el formulario no pregunta por equipación. */
  hasCurrentSeason: boolean
}

/**
 * Todo se lee con `?? default`: el global puede no tener fila hasta que alguien lo abra en el
 * panel, y en ese caso el formulario debe comportarse exactamente como antes.
 */
export const getRegistrationSettings = async (payload: Payload): Promise<RegistrationSettings> => {
  const [global, typesRes, season] = await Promise.all([
    payload.findGlobal({ slug: 'registration-form', depth: 0 }).catch(() => null),
    payload.find({
      collection: 'membership-types',
      where: { and: [{ showOnWebsite: { equals: true } }, { active: { equals: true } }] },
      sort: 'order',
      limit: 50,
    }),
    getCurrentSeason(payload),
  ])

  const config: RegisterFormConfig = {
    phone: {
      enabled: global?.phoneEnabled !== false,
      required: global?.phoneRequired !== false,
    },
    membershipType: {
      enabled: global?.membershipTypeEnabled !== false,
      required: global?.membershipTypeRequired === true,
    },
    garments: [],
  }

  const membershipTypes: MembershipTypeOption[] = config.membershipType.enabled
    ? typesRes.docs.map((t) => ({
        id: t.id,
        name: t.name,
        requiresPayment: t.requiresPayment,
        amount: t.amount,
      }))
    : []

  const settings: RegistrationSettings = {
    intro: global?.intro ?? null,
    config,
    garments: [],
    membershipTypes,
    reserveStock: global?.reserveStock !== false,
    allowOverbooking: global?.allowOverbooking !== false,
    hasCurrentSeason: Boolean(season),
  }

  const rows = (global?.garments ?? []).filter((row) => row.enabled !== false)
  // Sin temporada actual no se puede crear la entrega: preguntar por una prenda que se va a
  // perder es peor que no preguntar. El alta NO se bloquea — que el club olvide marcar la
  // temporada no puede cerrar las altas.
  if (rows.length === 0 || !season) return settings

  const categoryIds = rows.map((row) => idOf(row.category)).filter((id): id is number => Boolean(id))
  if (categoryIds.length === 0) return settings

  const [categoriesRes, itemsRes, sizesRes] = await Promise.all([
    payload.find({
      collection: 'equipment-categories',
      where: { and: [{ id: { in: categoryIds } }, { active: { not_equals: false } }] },
      depth: 0,
      limit: 100,
    }),
    payload.find({
      collection: 'equipment-items',
      where: { and: [{ category: { in: categoryIds } }, { active: { not_equals: false } }] },
      sort: 'order',
      depth: 0,
      limit: 500,
    }),
    payload.find({
      collection: 'sizes',
      // `not_equals: false` y no `equals: true`: defensivo por si alguna fila quedara a NULL.
      where: { active: { not_equals: false } },
      sort: 'order',
      depth: 0,
      limit: 500,
    }),
  ])

  const categoriesById = new Map(categoriesRes.docs.map((c) => [c.id, c]))
  const sizes: GarmentSizeOption[] = sizesRes.docs.map((s) => ({
    id: s.id,
    label: s.label,
    scale: idOf(s.scale),
  }))

  for (const row of rows) {
    const categoryId = idOf(row.category)
    if (!categoryId) continue
    const category = categoriesById.get(categoryId)
    if (!category) continue

    const items: GarmentItemOption[] = itemsRes.docs
      .filter((item) => idOf(item.category) === categoryId)
      .map((item) => ({ id: item.id, name: item.name, sizeScale: idOf(item.sizeScale) }))

    // Un desplegable vacío es peor que no preguntar.
    if (items.length === 0) continue

    const key = category.slug ?? String(category.id)
    const label = category.publicLabel?.trim() || category.name
    const askSize = row.askSize !== false

    settings.garments.push({
      key,
      categoryId,
      label,
      help: row.help?.trim() || category.description?.trim() || null,
      required: row.required !== false,
      askSize,
      items,
      // Sólo las tallas de las escalas que usan los artículos de este tipo.
      sizes: askSize
        ? sizes.filter((size) => items.some((item) => item.sizeScale === size.scale))
        : [],
    })
    settings.config.garments.push({
      key,
      label,
      required: row.required !== false,
      askSize,
    })
  }

  return settings
}

/** Tallas válidas para un artículo: las de su escala. Compartido por el alta y el backoffice. */
export const sizesForItem = <S extends { scale: number | null }>(
  sizes: S[],
  item: { sizeScale: number | null } | null | undefined,
): S[] => (item ? sizes.filter((s) => s.scale === item.sizeScale) : [])
