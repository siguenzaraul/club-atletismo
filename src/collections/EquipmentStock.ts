import type { CollectionConfig } from 'payload'

import { isAdmin, isAdminOrEditor } from '../access'

/** Existencias por artículo + talla + temporada. Contadores recalculados desde las entregas. */
export const EquipmentStock: CollectionConfig = {
  slug: 'equipment-stock',
  labels: { singular: 'Existencias', plural: 'Existencias' },
  defaultSort: 'quantityAvailable',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['item', 'size', 'season', 'quantityTotal', 'quantityDelivered', 'quantityAvailable'],
    group: 'Equipación',
    description: 'Cuántas unidades tienes de cada artículo y talla. "Quedan" se calcula solo.',
  },
  access: {
    // Not public: stock is internal.
    read: isAdminOrEditor,
    create: isAdminOrEditor,
    update: isAdminOrEditor,
    delete: isAdmin,
  },
  indexes: [{ fields: ['item', 'size', 'season'], unique: true }],
  fields: [
    { name: 'item', type: 'relationship', relationTo: 'equipment-items', label: 'Artículo', required: true },
    { name: 'size', type: 'relationship', relationTo: 'sizes', label: 'Talla', required: true },
    { name: 'season', type: 'relationship', relationTo: 'seasons', label: 'Temporada', required: true },
    { name: 'quantityTotal', type: 'number', label: 'Unidades compradas', defaultValue: 0, min: 0 },
    {
      name: 'quantityDelivered',
      type: 'number',
      label: 'Entregadas',
      defaultValue: 0,
      admin: { readOnly: true },
    },
    {
      name: 'quantityReserved',
      type: 'number',
      label: 'Reservadas',
      defaultValue: 0,
      admin: { readOnly: true },
    },
    {
      name: 'quantityAvailable',
      type: 'number',
      label: 'Quedan',
      defaultValue: 0,
      admin: { readOnly: true, description: 'Compradas − entregadas − reservadas.' },
    },
  ],
  hooks: {
    // Keep "available" consistent when staff edit the purchased total.
    beforeChange: [
      ({ data, originalDoc }) => {
        // Respaldo en `originalDoc` por seguridad, no porque haga falta hoy: comprobado que en
        // un update parcial Payload ya fusiona el documento existente en `data` antes de este
        // hook, así que `?? 0` no llega a dispararse. Si esa fusión cambiara, sin el respaldo
        // un `recalcStock` (que no manda `quantityTotal`) pondría las unidades compradas a 0.
        // Lo cubren los tests de `tests/int/equipment.int.spec.ts` → describe «stock».
        const total = data.quantityTotal ?? originalDoc?.quantityTotal ?? 0
        const delivered = data.quantityDelivered ?? originalDoc?.quantityDelivered ?? 0
        const reserved = data.quantityReserved ?? originalDoc?.quantityReserved ?? 0
        data.quantityAvailable = total - delivered - reserved
        return data
      },
    ],
  },
}
