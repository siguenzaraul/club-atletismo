import type { CollectionConfig } from 'payload'

import { anyone, isAdmin, isAdminOrEditor } from '../access'

/**
 * Qué equipación incluye cada tipo de socio en una temporada.
 * Permite responder "¿qué le falta por entregar a este socio?".
 */
export const EquipmentPacks: CollectionConfig = {
  slug: 'equipment-packs',
  labels: { singular: 'Pack de equipación', plural: 'Packs de equipación' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'season', 'appliesToAll'],
    group: 'Equipación',
    description: 'La equipación que le corresponde a un socio según su tipo y temporada.',
  },
  access: { read: anyone, create: isAdminOrEditor, update: isAdminOrEditor, delete: isAdmin },
  fields: [
    { name: 'name', type: 'text', label: 'Nombre', required: true, admin: { description: 'Ej. Pack adulto 2025/2026' } },
    { name: 'season', type: 'relationship', relationTo: 'seasons', label: 'Temporada', required: true },
    {
      name: 'appliesToAll',
      type: 'checkbox',
      label: 'Aplica a todos los socios',
      defaultValue: true,
      admin: { description: 'Si lo desmarcas, elige a qué tipos de socio aplica.' },
    },
    {
      name: 'membershipTypes',
      type: 'relationship',
      relationTo: 'membership-types',
      hasMany: true,
      label: 'Tipos de socio',
      admin: { condition: (data) => !data?.appliesToAll },
    },
    {
      name: 'lines',
      type: 'array',
      label: 'Artículos incluidos',
      labels: { singular: 'Artículo', plural: 'Artículos' },
      fields: [
        { name: 'item', type: 'relationship', relationTo: 'equipment-items', label: 'Artículo', required: true },
        { name: 'quantity', type: 'number', label: 'Cantidad', defaultValue: 1, min: 1 },
      ],
    },
  ],
}
