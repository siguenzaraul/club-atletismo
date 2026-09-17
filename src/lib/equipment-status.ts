/**
 * Qué equipación tiene un socio y qué le falta.
 *
 * **La verdad son las entregas del socio** (`equipment-deliveries`), que nacen de lo que eligió
 * en el alta o en su perfil, y **la pregunta son los tipos de prenda del formulario de alta**.
 * No hay más fuentes.
 *
 * Antes esto salía de los «packs de equipación»: una lista aparte de lo que le tocaba a cada
 * tipo de socio. Comparar un catálogo teórico contra lo entregado daba avisos que no cuadraban
 * con la realidad — «te falta la prenda de arriba» mientras el socio tenía dos reservadas.
 *
 * Función pura: no toca la base de datos, así que se puede probar y reutilizar en la zona de
 * socio y en el backoffice sin duplicar el criterio.
 */

/** Ya recogida o devuelta: el club no le debe nada. */
const CLOSED_STATUSES: readonly string[] = ['delivered', 'returned']

/** Elegida y aún en manos del club. `requested` es lista de espera; `reserved`, apartada. */
export const PENDING_PICKUP_STATUSES: readonly string[] = ['requested', 'reserved']

/** Lo que ocupa el hueco de un tipo de prenda (ver `slotKeyFor` en equipment.ts). */
const OCCUPYING_STATUSES: readonly string[] = ['requested', 'reserved', 'delivered']

export type MemberDelivery = {
  id: number
  itemName: string
  sizeLabel: string | null
  status: string | null
  categoryId: number | null
}

export type ConfiguredGarment = {
  categoryId: number
  label: string
  required: boolean
}

export type EquipmentSummary = {
  /** Elegida y sin recoger: exactamente lo que el club le tiene que dar. */
  pendingPickup: MemberDelivery[]
  /** Ya en su poder. */
  delivered: MemberDelivery[]
  /** Tipos de prenda obligatorios del alta sobre los que aún no ha elegido nada. */
  missingChoices: string[]
}

/** «Camiseta de manga corta · talla M». La talla es opcional: hay prendas que no la piden. */
export const describeGarment = (d: Pick<MemberDelivery, 'itemName' | 'sizeLabel'>): string =>
  d.sizeLabel ? `${d.itemName} · talla ${d.sizeLabel}` : d.itemName

export const summarizeMemberEquipment = (
  deliveries: MemberDelivery[],
  garments: ConfiguredGarment[] = [],
): EquipmentSummary => {
  const pendingPickup = deliveries.filter((d) =>
    PENDING_PICKUP_STATUSES.includes(d.status ?? 'requested'),
  )
  const delivered = deliveries.filter((d) => CLOSED_STATUSES.includes(d.status ?? ''))

  const covered = new Set(
    deliveries
      .filter((d) => OCCUPYING_STATUSES.includes(d.status ?? 'requested'))
      .map((d) => d.categoryId)
      .filter((id): id is number => id != null),
  )
  const missingChoices = garments
    .filter((g) => g.required && !covered.has(g.categoryId))
    .map((g) => g.label)

  return { pendingPickup, delivered, missingChoices }
}
