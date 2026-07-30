import type { GlobalConfig } from 'payload'

import { anyone, isAdminOrEditor } from '../access'

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'Ajustes del sitio',
  admin: { group: 'Administración' },
  access: {
    read: anyone,
    update: isAdminOrEditor,
  },
  fields: [
    {
      type: 'collapsible',
      label: 'Contacto',
      fields: [
        { name: 'email', type: 'text', label: 'Email de contacto' },
        { name: 'phone', type: 'text', label: 'Teléfono' },
        { name: 'address', type: 'text', label: 'Dirección' },
      ],
    },
    {
      type: 'collapsible',
      label: 'Redes sociales',
      fields: [
        { name: 'instagram', type: 'text', label: 'Instagram' },
        { name: 'facebook', type: 'text', label: 'Facebook' },
        { name: 'strava', type: 'text', label: 'Strava' },
      ],
    },
    {
      name: 'logoLight',
      type: 'upload',
      relationTo: 'media',
      label: 'Logo (fondo claro)',
    },
    {
      name: 'logoDark',
      type: 'upload',
      relationTo: 'media',
      label: 'Logo (fondo oscuro)',
    },
    {
      type: 'collapsible',
      label: 'Marca (colores)',
      admin: {
        description:
          'Cambia los colores del club en toda la web sin tocar código. Usa códigos hex (ej. #009FE3). Déjalos vacíos para usar los de por defecto.',
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'brandPrimary',
              type: 'text',
              label: 'Color primario',
              admin: { placeholder: '#009FE3', width: '33%' },
            },
            {
              name: 'brandSecondary',
              type: 'text',
              label: 'Color secundario',
              admin: { placeholder: '#E30613', width: '33%' },
            },
            {
              name: 'brandAccent',
              type: 'text',
              label: 'Color de acento',
              admin: { placeholder: '#FFED00', width: '33%' },
            },
          ],
        },
      ],
    },
  ],
}
