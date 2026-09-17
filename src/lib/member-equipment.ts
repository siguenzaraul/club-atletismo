/**
 * El socio cambia su equipación desde su perfil, **mientras el club no se la haya entregado**.
 *
 * Todo se revalida contra la base de datos igual que en el alta: que el artículo exista, esté
 * activo y sea del tipo de prenda que dice, y que la talla sea de la escala de ese artículo. El
 * formulario nunca es la fuente de verdad — un POST a mano podría reservar stock de algo que el
 * club no ofrece, o tocar la entrega de otra persona.
 *
 * Módulo **sin** `'use server'` para poder probarlo con la Local API, como `registration.ts`.
 */

import type { Payload } from 'payload'

import {
  idOf,
  reserveEquipmentForMember,
  statusForSelection,
  type GarmentSelection,
} from '@/lib/equipment'
import { getCurrentSeason } from '@/lib/membership'
import { getRegistrationSettings, type GarmentOption } from '@/lib/registration-form'

/** Estados que ocupan el tipo de prenda. `returned` no: devolver deja elegir otra vez. */
const OCCUPYING: readonly string[] = ['requested', 'reserved', 'delivered']

export type GarmentState = {
  garment: GarmentOption
  itemId: number | null
  sizeId: number | null
  status: string | null
  /** Ya entregada: desde aquí no se toca. El cambio pasa por el club. */
  locked: boolean
  /** Qué tiene, para poder enseñarlo cuando está bloqueada («Camiseta oficial · talla M»). */
  currentLabel: string | null
}

export type MemberEquipmentState = {
  seasonName: string | null
  /** Sin temporada abierta no hay nada que reservar. */
  available: boolean
  garments: GarmentState[]
}

/** Lo que necesita pintar el formulario del perfil. Nunca lanza por falta de configuración. */
export const getMemberEquipmentState = async (
  payload: Payload,
  memberId: number,
): Promise<MemberEquipmentState> => {
  const [settings, season] = await Promise.all([
    getRegistrationSettings(payload),
    getCurrentSeason(payload),
  ])

  if (!season || settings.garments.length === 0) {
    return { seasonName: season?.name ?? null, available: false, garments: [] }
  }

  const deliveries = await payload.find({
    collection: 'equipment-deliveries',
    where: { and: [{ member: { equals: memberId } }, { season: { equals: season.id } }] },
    depth: 1,
    limit: 100,
    overrideAccess: true,
  })

  const byCategory = new Map<number, (typeof deliveries.docs)[number]>()
  for (const d of deliveries.docs) {
    if (!OCCUPYING.includes(d.status ?? 'requested')) continue
    const categoryId = idOf(d.category)
    if (categoryId) byCategory.set(categoryId, d)
  }

  const garments: GarmentState[] = settings.garments.map((garment) => {
    const current = byCategory.get(garment.categoryId)
    const item = current && typeof current.item === 'object' ? current.item : null
    const size = current && typeof current.size === 'object' ? current.size : null
    const label = item?.name
      ? size?.label
        ? `${item.name} · talla ${size.label}`
        : item.name
      : null

    return {
      garment,
      itemId: idOf(current?.item),
      sizeId: idOf(current?.size),
      status: current?.status ?? null,
      locked: current?.status === 'delivered',
      currentLabel: label,
    }
  })

  return { seasonName: season.name ?? null, available: true, garments }
}

export type GarmentChoice = { key: string; itemId: number | null; sizeId: number | null }

export type UpdateEquipmentResult =
  | { ok: true; changed: number; notes: string[] }
  | { ok: false; error: string; fieldErrors?: Record<string, string> }

/**
 * Aplica los cambios de equipación de un socio.
 *
 * Una elección que cambia es un **update de la misma fila**, no un borrado más un alta: así la
 * clave de exclusividad no choca consigo misma y el `afterChange` de la colección recuenta el
 * stock de la combinación vieja y de la nueva (ya contempla el caso «se ha movido»).
 */
export const updateMemberEquipment = async (
  payload: Payload,
  args: { memberId: number; choices: GarmentChoice[] },
): Promise<UpdateEquipmentResult> => {
  const [settings, season] = await Promise.all([
    getRegistrationSettings(payload),
    getCurrentSeason(payload),
  ])
  if (!season) {
    return { ok: false, error: 'Todavía no hay temporada abierta para pedir equipación.' }
  }
  if (settings.garments.length === 0) {
    return { ok: false, error: 'El club no está pidiendo equipación ahora mismo.' }
  }

  const deliveries = await payload.find({
    collection: 'equipment-deliveries',
    where: { and: [{ member: { equals: args.memberId } }, { season: { equals: season.id } }] },
    depth: 0,
    limit: 100,
    overrideAccess: true,
  })
  const currentByCategory = new Map<number, (typeof deliveries.docs)[number]>()
  for (const d of deliveries.docs) {
    if (!OCCUPYING.includes(d.status ?? 'requested')) continue
    const categoryId = idOf(d.category)
    if (categoryId) currentByCategory.set(categoryId, d)
  }

  const fieldErrors: Record<string, string> = {}
  const notes: string[] = []
  type Plan =
    | { kind: 'update'; id: number; itemId: number; sizeId: number | null; garment: GarmentOption }
    | { kind: 'delete'; id: number }
    | { kind: 'create'; selection: GarmentSelection }
  const plans: Plan[] = []

  for (const garment of settings.garments) {
    const choice = args.choices.find((c) => c.key === garment.key)
    // Lo que no viene en el formulario no se toca: permite formularios parciales sin borrar nada.
    if (!choice) continue

    const current = currentByCategory.get(garment.categoryId)
    if (current?.status === 'delivered') {
      // Sin dos puntos tras la etiqueta: la pone el club y suele ser una pregunta
      // («¿Qué camiseta quieres?»), que encadenada quedaba ilegible.
      notes.push(`Ya te hemos entregado lo que elegiste en «${garment.label}»; para cambiarlo, habla con el club.`)
      continue
    }

    if (!choice.itemId) {
      if (garment.required) {
        fieldErrors[`garment:${garment.key}`] = 'Tienes que elegir una opción.'
        continue
      }
      // Nunca llegó a entregarse: se borra la fila y el stock se recuenta solo. Marcarla como
      // «devuelta» sería mentir en el histórico.
      if (current) plans.push({ kind: 'delete', id: current.id })
      continue
    }

    const item = await payload
      .findByID({ collection: 'equipment-items', id: choice.itemId, depth: 0, overrideAccess: true })
      .catch(() => null)
    if (!item || item.active === false || idOf(item.category) !== garment.categoryId) {
      fieldErrors[`garment:${garment.key}`] = 'Esa opción ya no está disponible.'
      continue
    }

    let sizeId: number | null = null
    if (garment.askSize) {
      if (!choice.sizeId) {
        if (garment.required) {
          fieldErrors[`size:${garment.key}`] = 'Elige tu talla.'
          continue
        }
      } else {
        const size = await payload
          .findByID({ collection: 'sizes', id: choice.sizeId, depth: 0, overrideAccess: true })
          .catch(() => null)
        if (!size || size.active === false || idOf(size.scale) !== idOf(item.sizeScale)) {
          fieldErrors[`size:${garment.key}`] = 'Esa talla no es de esta prenda.'
          continue
        }
        sizeId = size.id
      }
    }

    if (current) {
      if (idOf(current.item) === item.id && idOf(current.size) === sizeId) continue
      plans.push({ kind: 'update', id: current.id, itemId: item.id, sizeId, garment })
    } else {
      plans.push({
        kind: 'create',
        selection: { categoryId: garment.categoryId, itemId: item.id, sizeId },
      })
    }
  }

  // Nada se escribe si algún campo está mal: o se guarda el formulario entero o no se guarda.
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, error: 'Revisa las opciones marcadas.', fieldErrors }
  }

  let changed = 0
  for (const plan of plans) {
    try {
      if (plan.kind === 'delete') {
        await payload.delete({ collection: 'equipment-deliveries', id: plan.id, overrideAccess: true })
        changed++
        continue
      }
      if (plan.kind === 'update') {
        // El estado se recalcula: cambiar a una talla agotada no puede dejar el stock en
        // negativo, y salir de una agotada a una con existencias sí puede reservar.
        const status = await statusForSelection(payload, {
          itemId: plan.itemId,
          sizeId: plan.sizeId,
          seasonId: season.id,
          reserveStock: settings.reserveStock,
          allowOverbooking: settings.allowOverbooking,
        })
        await payload.update({
          collection: 'equipment-deliveries',
          id: plan.id,
          data: { item: plan.itemId, size: plan.sizeId ?? null, status },
          overrideAccess: true,
        })
        if (status === 'requested') {
          notes.push(`No quedan unidades de esa talla: quedas en lista de espera.`)
        }
        changed++
        continue
      }
      const outcome = await reserveEquipmentForMember(payload, {
        memberId: args.memberId,
        seasonId: season.id,
        selections: [plan.selection],
        reserveStock: settings.reserveStock,
        allowOverbooking: settings.allowOverbooking,
        source: 'member',
      })
      changed += outcome.reserved + outcome.waitlisted
      if (outcome.waitlisted > 0) notes.push('Alguna prenda queda en lista de espera por falta de stock.')
    } catch (err) {
      payload.logger.error({ err, memberId: args.memberId }, 'updateMemberEquipment: línea fallida')
      return { ok: false, error: 'No hemos podido guardar el cambio. Inténtalo de nuevo.' }
    }
  }

  return { ok: true, changed, notes }
}
