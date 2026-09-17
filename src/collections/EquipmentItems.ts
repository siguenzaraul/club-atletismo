import type { CollectionConfig } from 'payload'

import { anyone, isAdmin, isAdminOrEditor } from '../access'
import { cascadeDelete } from '../lib/cascade'
import { blockIfReferenced } from '../lib/cascade-guard'
import { slugField } from '../fields/slug'

/** Catálogo de equipación, ampliable por el club sin tocar código. */
export const EquipmentItems: CollectionConfig = {
  slug: 'equipment-items',
  labels: { singular: 'Artículo de equipación', plural: 'Catálogo de equipación' },
  defaultSort: 'order',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'category', 'sizeScale', 'active', 'order'],
    group: 'Equipación',
    description: 'Camisetas, pantalones, sudaderas… Añade los artículos que quieras.',
  },
  access: { read: anyone, create: isAdminOrEditor, update: isAdminOrEditor, delete: isAdmin },
  fields: [
    { name: 'name', type: 'text', label: 'Nombre', required: true, admin: { description: 'Ej. Camiseta oficial, Pantalón corto' } },
    slugField('name'),
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'equipment-categories',
      label: 'Tipo de prenda',
      // NO required: los artículos que ya existen en producción se quedan sin tipo y salen
      // agrupados en «Otros». Un `required` aquí rompería sus guardados.
      admin: {
        description: 'Parte de arriba, parte de abajo… Los artículos sin tipo salen en «Otros».',
      },
    },
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
  hooks: {
    beforeDelete: [
      async ({ id, req }) => {
        await blockIfReferenced(
          req,
          id,
          [{ collection: 'equipment-deliveries', field: 'item', label: 'entregas registradas' }],
          'Desactívalo en vez de borrarlo: deja de ofrecerse y el histórico se mantiene.',
        )
        // El stock es un contador derivado del artículo: sin artículo no significa nada.
        await cascadeDelete(req, id, [{ collection: 'equipment-stock', field: 'item' }])
      },
    ],
  },
}
