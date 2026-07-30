import type { CollectionConfig } from 'payload'

import { adminOrOwn, isAdmin, isAdminOrEditor } from '../access'
import { recalcStock } from '../lib/equipment'

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
  ],
  hooks: {
    beforeChange: [
      async ({ data, req }) => {
        // Stamp delivery date automatically when marked delivered.
        if (data.status === 'delivered' && !data.deliveredAt) data.deliveredAt = new Date().toISOString()
        // Friendly title.
        const item =
          data.item && typeof data.item === 'object'
            ? data.item
            : data.item
              ? await req.payload.findByID({ collection: 'equipment-items', id: data.item, depth: 0, overrideAccess: true }).catch(() => null)
              : null
        data.label = item?.name ? `${item.name}` : 'Entrega'
        return data
      },
    ],
    afterChange: [
      async ({ doc, req }) => {
        await recalcStock(req.payload, doc.item, doc.size, doc.season)
      },
    ],
    afterDelete: [
      async ({ doc, req }) => {
        await recalcStock(req.payload, doc.item, doc.size, doc.season)
      },
    ],
  },
}
