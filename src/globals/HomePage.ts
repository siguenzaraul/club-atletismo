import type { GlobalConfig } from 'payload'

import { anyone, isAdminOrEditor } from '../access'

export const HomePage: GlobalConfig = {
  slug: 'home-page',
  label: 'Página de inicio',
  admin: { group: 'Contenido' },
  access: {
    read: anyone,
    update: isAdminOrEditor,
  },
  fields: [
    {
      type: 'collapsible',
      label: 'Hero (cabecera principal)',
      admin: { initCollapsed: false },
      fields: [
        {
          name: 'heroEyebrow',
          type: 'text',
          label: 'Texto pequeño superior',
          defaultValue: 'Albatera · Alicante',
          admin: { description: 'Línea corta sobre el título. Déjalo vacío para ocultarlo.' },
        },
        {
          name: 'heroTitle',
          type: 'text',
          label: 'Título del hero',
          defaultValue: 'Club de Running Albatera',
        },
        {
          name: 'heroSubtitle',
          type: 'textarea',
          label: 'Subtítulo del hero',
          defaultValue: 'Un objetivo, un municipio, un deporte.',
        },
        {
          name: 'heroImage',
          type: 'upload',
          relationTo: 'media',
          label: 'Imagen de fondo',
          admin: { description: 'Foto que ocupa todo el fondo del hero. Déjalo vacío para un fondo liso.' },
        },
        {
          name: 'heroForegroundImage',
          type: 'upload',
          relationTo: 'media',
          label: 'Imagen principal (opcional)',
          admin: {
            description:
              'Foto o cartel destacado que se muestra junto al texto. Si la subes, sustituye al logo del club.',
          },
        },
        {
          name: 'heroShowBrandPattern',
          type: 'checkbox',
          label: 'Mostrar el logo del club en el hero',
          defaultValue: true,
          admin: { description: 'Se ignora si has subido una imagen principal.' },
        },
        {
          name: 'heroTheme',
          type: 'select',
          label: 'Color del texto',
          defaultValue: 'dark',
          options: [
            { label: 'Claro — texto blanco (para fondos oscuros)', value: 'dark' },
            { label: 'Oscuro — texto negro (para fondos claros)', value: 'light' },
          ],
        },
        {
          name: 'heroOverlay',
          type: 'select',
          label: 'Veladura sobre el fondo',
          defaultValue: 'medium',
          options: [
            { label: 'Ninguna', value: 'none' },
            { label: 'Suave', value: 'subtle' },
            { label: 'Media', value: 'medium' },
            { label: 'Fuerte', value: 'strong' },
          ],
          admin: { description: 'Capa sobre la foto para que el texto se lea bien.' },
        },
        {
          name: 'heroAlign',
          type: 'select',
          label: 'Posición del texto',
          defaultValue: 'left',
          options: [
            { label: 'Izquierda', value: 'left' },
            { label: 'Centro', value: 'center' },
            { label: 'Derecha', value: 'right' },
          ],
        },
        {
          name: 'heroHeight',
          type: 'select',
          label: 'Altura del hero',
          defaultValue: 'medium',
          options: [
            { label: 'Compacta', value: 'compact' },
            { label: 'Media', value: 'medium' },
            { label: 'Alta', value: 'tall' },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'heroPrimaryLabel',
              type: 'text',
              label: 'Botón principal',
              defaultValue: 'Hazte socio',
              admin: { width: '50%', description: 'Vacío para ocultarlo.' },
            },
            {
              name: 'heroPrimaryHref',
              type: 'text',
              label: 'Enlace del botón principal',
              defaultValue: '/hazte-socio',
              admin: { width: '50%' },
            },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'heroSecondaryLabel',
              type: 'text',
              label: 'Botón secundario',
              defaultValue: 'Próximos eventos',
              admin: { width: '50%', description: 'Vacío para ocultarlo.' },
            },
            {
              name: 'heroSecondaryHref',
              type: 'text',
              label: 'Enlace del botón secundario',
              defaultValue: '/eventos',
              admin: { width: '50%' },
            },
          ],
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'Sobre el club',
      admin: { initCollapsed: true },
      fields: [
        {
          name: 'aboutTitle',
          type: 'text',
          label: 'Título “Sobre el club”',
          defaultValue: 'Sobre el club',
        },
        {
          name: 'aboutBody',
          type: 'richText',
          label: 'Texto “Sobre el club”',
        },
      ],
    },
  ],
}
