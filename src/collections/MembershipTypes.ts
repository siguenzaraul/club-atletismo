import type { CollectionConfig } from 'payload'

import { anyone, isAdmin, isAdminOrEditor } from '../access'
import { slugField } from '../fields/slug'

export const MEMBERSHIP_PERIODS = [
  { label: 'Temporada', value: 'temporada' },
  { label: 'Anual', value: 'anual' },
  { label: 'Mensual', value: 'mensual' },
] as const

/** Tipos de socio configurables por el club: de pago o gratuitos. */
export const MembershipTypes: CollectionConfig = {
  slug: 'membership-types',
  labels: { singular: 'Tipo de socio', plural: 'Tipos de socio' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'requiresPayment', 'amount', 'showOnWebsite', 'active'],
    group: 'Configuración',
  },
  access: {
    read: anyone,
    create: isAdminOrEditor,
    update: isAdminOrEditor,
    delete: isAdmin,
  },
  fields: [
    { name: 'name', type: 'text', label: 'Nombre', required: true, admin: { description: 'Ej. Adulto, Infantil, Honorífico' } },
    slugField('name'),
    {
      name: 'requiresPayment',
      type: 'checkbox',
      label: '¿Requiere pago?',
      defaultValue: true,
    },
    {
      name: 'amount',
      type: 'number',
      label: 'Importe (€)',
      min: 0,
      admin: {
        condition: (data) => Boolean(data?.requiresPayment),
        description: 'Cuota de referencia. El cobro se gestiona fuera de la web.',
      },
    },
    {
      name: 'period',
      type: 'select',
      label: 'Periodicidad',
      defaultValue: 'temporada',
      options: [...MEMBERSHIP_PERIODS],
      admin: { condition: (data) => Boolean(data?.requiresPayment) },
    },
    {
      name: 'includes',
      type: 'textarea',
      label: 'Qué incluye',
      admin: { description: 'Equipación, descuentos, inscripciones gratis… (una ventaja por línea).' },
    },
    {
      name: 'showOnWebsite',
      type: 'checkbox',
      label: 'Mostrar en la web',
      defaultValue: false,
      admin: { description: 'Aparece en /hazte-socio para que la gente lo elija.' },
    },
    { name: 'order', type: 'number', label: 'Orden', defaultValue: 0, admin: { position: 'sidebar' } },
    { name: 'active', type: 'checkbox', label: 'Activo', defaultValue: true, admin: { position: 'sidebar' } },
  ],
}
