import type { CollectionConfig } from 'payload'

import { anyone, isAdmin, isAdminOrEditor } from '../access'

/** Una talla concreta dentro de una escala (M, 42, Única…). */
export const Sizes: CollectionConfig = {
  slug: 'sizes',
  labels: { singular: 'Talla', plural: 'Tallas' },
  defaultSort: 'order',
  admin: {
    useAsTitle: 'label',
    defaultColumns: ['label', 'scale', 'order'],
    group: 'Configuración',
  },
  access: { read: anyone, create: isAdminOrEditor, update: isAdminOrEditor, delete: isAdmin },
  fields: [
    { name: 'label', type: 'text', label: 'Talla', required: true, admin: { description: 'Ej. M, 42, Única' } },
    { name: 'scale', type: 'relationship', relationTo: 'size-scales', label: 'Escala', required: true },
    { name: 'order', type: 'number', label: 'Orden', defaultValue: 0, admin: { position: 'sidebar' } },
  ],
}
