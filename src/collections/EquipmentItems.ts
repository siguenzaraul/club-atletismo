import type { CollectionConfig } from 'payload'

import { anyone, isAdmin, isAdminOrEditor } from '../access'
import { slugField } from '../fields/slug'

/** Catálogo de equipación, ampliable por el club sin tocar código. */
export const EquipmentItems: CollectionConfig = {
  slug: 'equipment-items',
  labels: { singular: 'Artículo de equipación', plural: 'Catálogo de equipación' },
  defaultSort: 'order',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'sizeScale', 'active', 'order'],
    group: 'Equipación',
    description: 'Camisetas, pantalones, sudaderas… Añade los artículos que quieras.',
  },
  access: { read: anyone, create: isAdminOrEditor, update: isAdminOrEditor, delete: isAdmin },
  fields: [
    { name: 'name', type: 'text', label: 'Nombre', required: true, admin: { description: 'Ej. Camiseta oficial, Pantalón corto' } },
    slugField('name'),
    {
      name: 'sizeScale',
      type: 'relationship',
      relationTo: 'size-scales',
      label: 'Escala de tallas',
      required: true,
      admin: { description: 'Qué tallas admite este artículo.' },
    },
    { name: 'description', type: 'textarea', label: 'Descripción' },
    { name: 'active', type: 'checkbox', label: 'Activo', defaultValue: true, admin: { position: 'sidebar' } },
    { name: 'order', type: 'number', label: 'Orden', defaultValue: 0, admin: { position: 'sidebar' } },
  ],
}
