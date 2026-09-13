import type { CollectionConfig } from 'payload'

import { anyone, isAdminOrEditor } from '../access'
import { slugField } from '../fields/slug'
import { MEMBER_CATEGORIES } from './Members'

export const EVENT_SERIES = [
  { label: 'Carrera principal (ALBATERUN)', value: 'carrera-principal' },
  { label: 'Social Run', value: 'social-run' },
  { label: 'Evento de club', value: 'club' },
  { label: 'Carrera externa (acude el club)', value: 'carrera-externa' },
] as const

export const Events: CollectionConfig = {
  slug: 'events',
  labels: { singular: 'Evento', plural: 'Eventos' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'series', 'date', 'registrationOpen'],
    group: 'Contenido',
  },
  access: {
    read: anyone,
    create: isAdminOrEditor,
    update: isAdminOrEditor,
    delete: isAdminOrEditor,
  },
  fields: [
    { name: 'title', type: 'text', label: 'Título', required: true },
    slugField('title'),
    {
      name: 'series',
      type: 'select',
      label: 'Tipo de evento',
      options: [...EVENT_SERIES],
      required: true,
      defaultValue: 'club',
    },
    { name: 'date', type: 'date', label: 'Fecha', required: true },
    { name: 'location', type: 'text', label: 'Lugar' },
    {
      name: 'distanceMeters',
      type: 'number',
      label: 'Distancia principal (m)',
      min: 0,
      admin: {
        description:
          'Opcional. 5000 = 5K, 10000 = 10K, 21097 = media, 42195 = maratón. Se usa como distancia por defecto de los resultados de este evento.',
      },
    },
    { name: 'image', type: 'upload', relationTo: 'media', label: 'Imagen' },
    { name: 'description', type: 'richText', label: 'Descripción' },
    {
      name: 'registrationOpen',
      type: 'checkbox',
      label: 'Inscripciones abiertas',
      defaultValue: false,
    },
    {
      name: 'capacity',
      type: 'number',
      label: 'Plazas (aforo)',
      min: 0,
      admin: { description: 'Déjalo vacío para plazas ilimitadas.' },
    },
    {
      name: 'categories',
      type: 'select',
      label: 'Categorías admitidas',
      hasMany: true,
      options: [...MEMBER_CATEGORIES],
    },
    {
      type: 'collapsible',
      label: 'Patrocinio de esta carrera',
      admin: {
        initCollapsed: false,
        description:
          'Añade patrocinadores específicos de esta carrera. En la carrera principal activa también se suman automáticamente los marcados como patrocinadores de ALBATERUN.',
      },
      fields: [
        {
          name: 'sponsors',
          type: 'relationship',
          relationTo: 'sponsors',
          hasMany: true,
          label: 'Patrocinadores específicos',
          admin: {
            description:
              'Puedes elegir patrocinadores distintos para cada carrera sin cambiar sus ámbitos generales.',
          },
        },
      ],
    },
  ],
}
