import type { CollectionConfig } from 'payload'

import { adminOrOwn, isAdmin, isAdminOrEditor } from '../access'
import { idOf, recalcStock, slotKeyFor } from '../lib/equipment'

export const DELIVERY_STATUSES = [
  { label: 'Solicitado', value: 'requested' },
  { label: 'Reservado', value: 'reserved' },
  { label: 'Entregado', value: 'delivered' },
  { label: 'Devuelto', value: 'returned' },
] as const

export const DELIVERY_PAYMENTS = [
  { label: 'Incluida en la cuota', value: 'included' },
  { label: 'Pagada aparte', value: 'paid' },
  { label: 'Pendiente de pago', value: 'pending' },
] as const

/**
 * De dónde salió la entrega. Texto libre con catálogo en TypeScript, **no** un `select`: un
 * `select` sería un enum nativo de Postgres y cada valor nuevo exigiría un
 * `ALTER TYPE … ADD VALUE`, irreversible en el `down()` de la migración.
 */
export const DELIVERY_SOURCES = [
  { label: 'Alta en la web', value: 'registration' },
  { label: 'Elegida por el socio', value: 'member' },
  { label: 'Registrada por el club', value: 'staff' },
  { label: 'Importación', value: 'import' },
] as const

export type DeliverySource = (typeof DELIVERY_SOURCES)[number]['value']

/** Qué equipación se le entrega a cada socio: talla, cantidad, estado, pago. */
export const EquipmentDeliveries: CollectionConfig = {
  slug: 'equipment-deliveries',
  labels: { singular: 'Entrega de equipación', plural: 'Entregas de equipación' },
  admin: {
    useAsTitle: 'label',
    defaultColumns: ['member', 'item', 'size', 'season', 'status', 'payment'],
    group: 'Equipación',
    description: 'Registro de qué se ha entregado a cada socio. El stock se actualiza solo.',
  },
  access: {
    read: adminOrOwn('member'),
    create: isAdminOrEditor,
    update: isAdminOrEditor,
    delete: isAdmin,
  },
  fields: [
    { name: 'member', type: 'relationship', relationTo: 'members', label: 'Socio', required: true },
    { name: 'season', type: 'relationship', relationTo: 'seasons', label: 'Temporada', required: true },
    { name: 'item', type: 'relationship', relationTo: 'equipment-items', label: 'Artículo', required: true },
    {
      name: 'size',
      type: 'relationship',
      relationTo: 'sizes',
      label: 'Talla',
      validate: (value: unknown, { siblingData }: { siblingData: Partial<{ status: string }> }) => {
        if (siblingData?.status === 'delivered' && !value) return 'Indica la talla para poder marcarla como entregada.'
        return true
      },
    },
    { name: 'quantity', type: 'number', label: 'Cantidad', defaultValue: 1, min: 1 },
    {
      name: 'status',
      type: 'select',
      label: 'Estado',
      defaultValue: 'requested',
      options: [...DELIVERY_STATUSES],
    },
    {
      name: 'payment',
      type: 'select',
      label: 'Pago',
      defaultValue: 'included',
      options: [...DELIVERY_PAYMENTS],
    },
    {
      name: 'deliveredAt',
      type: 'date',
      label: 'Fecha de entrega',
      admin: { condition: (data) => data?.status === 'delivered' },
    },
    { name: 'label', type: 'text', admin: { hidden: true } },
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'equipment-categories',
      label: 'Tipo de prenda',
      // Denormalizado desde el artículo en `beforeChange`: el índice de exclusividad lo necesita
      // en esta tabla, y así un artículo que cambie de tipo no reescribe el histórico.
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'slotKey',
      type: 'text',
      unique: true,
      // Columna recién creada y toda a NULL: es la única situación en la que se puede añadir un
      // índice único sobre una tabla con datos. Ver `slotKeyFor` en src/lib/equipment.ts.
      admin: { hidden: true },
    },
    {
      name: 'source',
      type: 'text',
      label: 'Origen',
      admin: { readOnly: true, position: 'sidebar' },
      validate: (value: unknown) =>
        !value || DELIVERY_SOURCES.some((s) => s.value === value) ? true : 'Origen desconocido.',
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, originalDoc, operation, req }) => {
        // Stamp delivery date automatically when marked delivered.
        if (data.status === 'delivered' && !data.deliveredAt) data.deliveredAt = new Date().toISOString()

        // `originalDoc` importa: un update parcial (p. ej. sólo el estado) no trae `item`,
        // `member` ni `season`, y sin esto la clave de exclusividad se recalcularía a NULL y
        // liberaría la plaza en silencio.
        const itemRef = data.item ?? originalDoc?.item
        const item =
          itemRef && typeof itemRef === 'object'
            ? itemRef
            : itemRef
              ? await req.payload
                  .findByID({ collection: 'equipment-items', id: itemRef, depth: 0, overrideAccess: true, req })
                  .catch(() => null)
              : null
        data.label = item?.name ? `${item.name}` : 'Entrega'

        const categoryId = idOf(item?.category)
        data.category = categoryId
        const category = categoryId
          ? await req.payload
              .findByID({ collection: 'equipment-categories', id: categoryId, depth: 0, overrideAccess: true, req })
              .catch(() => null)
          : null

        data.slotKey = slotKeyFor({
          memberId: idOf(data.member ?? originalDoc?.member),
          seasonId: idOf(data.season ?? originalDoc?.season),
          categoryId,
          status: data.status ?? originalDoc?.status ?? 'requested',
          exclusive: category?.exclusive !== false,
        })

        if (operation === 'create' && !data.source) data.source = 'staff'
        return data
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, req }) => {
        await recalcStock(req.payload, doc.item, doc.size, doc.season, req)
        // Si la entrega ha cambiado de artículo, talla o TEMPORADA, la combinación anterior se
        // queda con una unidad de más hasta que algo vuelva a tocarla: hay que recontarla.
        // El stock se lleva por `(artículo, talla, temporada)`, así que las tres cuentan.
        const moved =
          idOf(previousDoc?.item) !== idOf(doc.item) ||
          idOf(previousDoc?.size) !== idOf(doc.size) ||
          idOf(previousDoc?.season) !== idOf(doc.season)
        if (moved && previousDoc) {
          await recalcStock(req.payload, previousDoc.item, previousDoc.size, previousDoc.season, req)
        }
      },
    ],
    afterDelete: [
      async ({ doc, req }) => {
        await recalcStock(req.payload, doc.item, doc.size, doc.season, req)
      },
    ],
  },
}
