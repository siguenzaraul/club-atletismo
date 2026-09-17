import type { GlobalConfig } from 'payload'

import { anyone, isAdminOrEditor, isAdminOrEditorFieldLevel } from '../access'

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
      label: 'Cuota: cuenta para el pago',
      admin: {
        description:
          'Se muestra en la zona de socio y en el correo de bienvenida. Si lo dejas vacío se usa la cuenta que ya tiene el club configurada en el código.',
      },
      fields: [
        {
          name: 'bankIban',
          type: 'text',
          label: 'IBAN',
          // Lectura restringida a staff: este global es `read: anyone`, y sin esto el IBAN se
          // serviría en /api/globals/site-settings a cualquiera. Quien lo necesita
          // (correo y zona de socio) lo lee con `overrideAccess` desde src/lib/payments.ts.
          access: { read: isAdminOrEditorFieldLevel, update: isAdminOrEditorFieldLevel },
          admin: { placeholder: 'ES00 0000 0000 0000 0000 0000' },
        },
        {
          name: 'bankHolder',
          type: 'text',
          label: 'Titular de la cuenta',
          access: { read: isAdminOrEditorFieldLevel, update: isAdminOrEditorFieldLevel },
          admin: { placeholder: 'Club de Running Albatera' },
        },
        {
          name: 'paymentNotes',
          type: 'textarea',
          label: 'Instrucciones de pago',
          access: { read: isAdminOrEditorFieldLevel, update: isAdminOrEditorFieldLevel },
          admin: { description: 'Opcional: plazos, pago en mano, a quién preguntar…' },
        },
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
