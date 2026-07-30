import type { CollectionConfig } from 'payload'

import { anyone, isAdminOrEditor } from '../access'

export const SPONSOR_TIERS = [
  { label: 'Principal', value: 'principal' },
  { label: 'Oro', value: 'oro' },
  { label: 'Plata', value: 'plata' },
  { label: 'Bronce', value: 'bronce' },
  { label: 'Colaborador', value: 'colaborador' },
] as const

/** Patrocinadores. Reused across the site via the SponsorsBlock component. */
export const Sponsors: CollectionConfig = {
  slug: 'sponsors',
  labels: { singular: 'Patrocinador', plural: 'Patrocinadores' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'tier', 'global', 'clubSponsor', 'mainRaceSponsor'],
    group: 'Club',
  },
  access: {
    read: anyone,
    create: isAdminOrEditor,
    update: isAdminOrEditor,
    delete: isAdminOrEditor,
  },
  fields: [
    { name: 'name', type: 'text', label: 'Nombre', required: true },
    { name: 'logo', type: 'upload', relationTo: 'media', label: 'Logo' },
    { name: 'url', type: 'text', label: 'Web (URL)' },
    {
      name: 'tier',
      type: 'select',
      label: 'Nivel',
      options: [...SPONSOR_TIERS],
      defaultValue: 'colaborador',
      required: true,
      admin: {
        description:
          'El nivel determina el orden y el tamaño con el que aparece el patrocinador en la web.',
      },
    },
    {
      type: 'collapsible',
      label: 'Dónde aparece',
      admin: {
        initCollapsed: false,
        description:
          'Puedes combinar varios ámbitos y, además, añadir este patrocinador a carreras concretas.',
      },
      fields: [
        {
          name: 'global',
          type: 'checkbox',
          label: 'Patrocinador global',
          defaultValue: false,
          admin: { description: 'Aparece en toda la web y en el pie de página.' },
        },
        {
          name: 'clubSponsor',
          type: 'checkbox',
          label: 'Patrocinador del club',
          defaultValue: false,
          admin: { description: 'Aparece en los espacios generales del club y en la portada.' },
        },
        {
          name: 'mainRaceSponsor',
          type: 'checkbox',
          label: 'Patrocinador de la carrera principal',
          defaultValue: false,
          admin: {
            description:
              'Se muestra automáticamente en la próxima carrera principal activa (ALBATERUN).',
          },
        },
      ],
    },
  ],
}
