import type { GlobalConfig } from 'payload'

import { anyone, isAdminOrEditor } from '../access'

/**
 * Qué se le pregunta al socio en «Hazte socio».
 *
 * `read: anyone` porque aquí no hay ningún dato personal: sólo la configuración del formulario
 * público, que la propia página necesita leer sin sesión.
 *
 * Nota: nombre, email, contraseña y derechos de imagen NO son configurables. Son identidad,
 * credenciales y consentimiento legal; quitarlos rompería el alta o dejaría al club sin la
 * autorización que necesita para publicar fotos.
 *
 * Ningún campo es un `select`: los `select` de Payload son enums nativos de Postgres y cada
 * valor nuevo exigiría un `ALTER TYPE … ADD VALUE` irreversible.
 */
export const RegistrationForm: GlobalConfig = {
  slug: 'registration-form',
  label: 'Formulario de alta',
  admin: {
    group: 'Administración',
    description: 'Qué se pide al darse de alta en la web y qué es obligatorio.',
  },
  access: { read: anyone, update: isAdminOrEditor },
  fields: [
    {
      name: 'intro',
      type: 'textarea',
      label: 'Texto sobre el formulario',
      admin: { description: 'Opcional. Aparece encima de los campos.' },
    },
    {
      type: 'collapsible',
      label: 'Datos de contacto',
      admin: { initCollapsed: false },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'phoneEnabled',
              type: 'checkbox',
              label: 'Pedir teléfono',
              defaultValue: true,
              admin: { width: '50%' },
            },
            {
              name: 'phoneRequired',
              type: 'checkbox',
              label: 'Teléfono obligatorio',
              defaultValue: true,
              admin: { width: '50%', condition: (data) => data?.phoneEnabled !== false },
            },
          ],
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'Tipo de cuota',
      admin: { initCollapsed: false },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'membershipTypeEnabled',
              type: 'checkbox',
              label: 'Pedir tipo de cuota',
              defaultValue: true,
              admin: { width: '50%' },
            },
            {
              name: 'membershipTypeRequired',
              type: 'checkbox',
              label: 'Obligatorio',
              defaultValue: false,
              admin: { width: '50%', condition: (data) => data?.membershipTypeEnabled !== false },
            },
          ],
        },
      ],
    },
    {
      name: 'garments',
      type: 'array',
      label: 'Equipación que se pide en el alta',
      labels: { singular: 'Tipo de prenda', plural: 'Tipos de prenda' },
      admin: {
        description:
          'Cada fila añade al formulario un desplegable de prenda y, si quieres, el de talla. Nace vacío: hasta que añadas una fila, el formulario no cambia.',
      },
      fields: [
        {
          // `required` dentro de un array nuevo sí se puede: su tabla nace vacía.
          name: 'category',
          type: 'relationship',
          relationTo: 'equipment-categories',
          label: 'Tipo de prenda',
          required: true,
        },
        {
          type: 'row',
          fields: [
            {
              name: 'enabled',
              type: 'checkbox',
              label: 'Preguntar',
              defaultValue: true,
              admin: { width: '33%' },
            },
            {
              name: 'required',
              type: 'checkbox',
              label: 'Obligatorio',
              defaultValue: true,
              admin: { width: '33%' },
            },
            {
              name: 'askSize',
              type: 'checkbox',
              label: 'Pedir talla',
              defaultValue: true,
              admin: { width: '33%' },
            },
          ],
        },
        { name: 'help', type: 'text', label: 'Texto de ayuda' },
      ],
    },
    {
      type: 'collapsible',
      label: 'Reserva de stock',
      admin: { initCollapsed: false },
      fields: [
        {
          name: 'reserveStock',
          type: 'checkbox',
          label: 'Reservar stock al darse de alta',
          defaultValue: true,
          admin: {
            description:
              'Crea la entrega como «Reservada» y descuenta del stock disponible. Si lo desmarcas se guarda como «Solicitada» y no descuenta.',
          },
        },
        {
          name: 'allowOverbooking',
          type: 'checkbox',
          label: 'Permitir reservar sin stock',
          defaultValue: true,
          admin: {
            description:
              'Si lo desmarcas, cuando no queden unidades el socio pasa a lista de espera («Solicitada») en vez de dejar el stock en negativo.',
          },
        },
      ],
    },
  ],
}
