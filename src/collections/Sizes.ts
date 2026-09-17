import type { CollectionConfig } from 'payload'

import { anyone, isAdmin, isAdminOrEditor } from '../access'
import { cascadeDelete } from '../lib/cascade'
import { blockIfReferenced } from '../lib/cascade-guard'

/** Una talla concreta dentro de una escala (M, 42, Única…). */
export const Sizes: CollectionConfig = {
  slug: 'sizes',
  labels: { singular: 'Talla', plural: 'Tallas' },
  defaultSort: 'order',
  admin: {
    useAsTitle: 'label',
    defaultColumns: ['label', 'scale', 'active', 'order'],
    group: 'Configuración',
  },
  access: { read: anyone, create: isAdminOrEditor, update: isAdminOrEditor, delete: isAdmin },
  fields: [
    { name: 'label', type: 'text', label: 'Talla', required: true, admin: { description: 'Ej. M, 42, Única' } },
    { name: 'scale', type: 'relationship', relationTo: 'size-scales', label: 'Escala', required: true },
    {
      name: 'active',
      type: 'checkbox',
      label: 'Activa',
      // `DEFAULT true` en el DDL rellena las filas existentes (Postgres ≥ 11), así que ninguna
      // talla desaparece del selector el día del despliegue.
      defaultValue: true,
      admin: {
        position: 'sidebar',
        description:
          'Desactívala para dejar de ofrecerla. Las entregas antiguas con esta talla no se tocan.',
      },
    },
    { name: 'order', type: 'number', label: 'Orden', defaultValue: 0, admin: { position: 'sidebar' } },
  ],
  hooks: {
    beforeDelete: [
      async ({ id, req }) => {
        await blockIfReferenced(
          req,
          id,
          [{ collection: 'equipment-deliveries', field: 'size', label: 'entregas con esta talla' }],
          'Desactívala en vez de borrarla: deja de ofrecerse y las entregas antiguas se conservan.',
        )
        await cascadeDelete(req, id, [{ collection: 'equipment-stock', field: 'size' }])
      },
    ],
  },
}
