import type { CollectionConfig } from 'payload'

import { anyone, isAdmin, isAdminOrEditor } from '../access'
import { blockIfReferenced } from '../lib/cascade-guard'
import { slugField } from '../fields/slug'

/** Escalas de talla configurables: XS-XXL, numéricas, única… */
export const SizeScales: CollectionConfig = {
  slug: 'size-scales',
  labels: { singular: 'Escala de tallas', plural: 'Escalas de tallas' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name'],
    group: 'Configuración',
    description: 'Grupos de tallas. Cada artículo usa una escala (ropa XS-XXL, calzado numérico, única…).',
  },
  access: { read: anyone, create: isAdminOrEditor, update: isAdminOrEditor, delete: isAdmin },
  fields: [
    { name: 'name', type: 'text', label: 'Nombre', required: true, admin: { description: 'Ej. Ropa XS-XXL, Calzado, Talla única' } },
    slugField('name'),
    { name: 'sizes', type: 'join', collection: 'sizes', on: 'scale', label: 'Tallas de esta escala' },
  ],
  hooks: {
    beforeDelete: [
      async ({ id, req }) => {
        await blockIfReferenced(
          req,
          id,
          [
            { collection: 'equipment-items', field: 'sizeScale', label: 'artículos que la usan' },
            { collection: 'sizes', field: 'scale', label: 'tallas dentro de ella' },
          ],
          'Cambia primero esos artículos de escala, o borra antes sus tallas.',
        )
      },
    ],
  },
}
