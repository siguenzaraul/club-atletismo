import type { CheckboxFieldValidation, CollectionConfig, TextFieldValidation } from 'payload'

import { anyone, isAdmin, isAdminOrEditorFieldLevel, adminOrOwn } from '../access'

export const MEMBER_CATEGORIES = [
  { label: 'Sub-18', value: 'sub18' },
  { label: 'Senior', value: 'senior' },
  { label: 'Máster', value: 'master' },
  { label: 'Popular', value: 'popular' },
] as const

const validateNewMemberPhone: TextFieldValidation = (value, { operation, previousValue }) => {
  const valid = typeof value === 'string' && value.replace(/\D/g, '').length >= 9
  if (operation === 'create' && !valid) return 'El teléfono móvil es obligatorio.'
  if (operation === 'update' && previousValue && !valid) {
    return 'El teléfono móvil no se puede dejar vacío.'
  }
  return true
}

const validateImageRights: CheckboxFieldValidation = (value, { operation, previousValue }) => {
  if (operation === 'create' && value !== true) {
    return 'Es obligatorio aceptar los derechos de imagen.'
  }
  if (operation === 'update' && previousValue === true && value !== true) {
    return 'La aceptación no se puede desmarcar desde la ficha.'
  }
  return true
}

/** Socios. A separate auth collection so members can log into the public members area. */
export const Members: CollectionConfig = {
  slug: 'members',
  labels: { singular: 'Socio', plural: 'Socios' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'category', 'currentMembershipType', 'membershipStatus'],
    listSearchableFields: ['name', 'email', 'federationNumber'],
    group: 'Club',
  },
  auth: true,
  access: {
    // Public self-registration; reads/updates limited to staff or the member themselves.
    create: anyone,
    read: adminOrOwn('id'),
    update: adminOrOwn('id'),
    delete: isAdmin,
    admin: () => false, // members never access the admin panel
  },
  fields: [
    { name: 'name', type: 'text', label: 'Nombre completo', required: true },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Datos',
          fields: [
            {
              name: 'category',
              type: 'select',
              label: 'Categoría deportiva',
              options: [...MEMBER_CATEGORIES],
              defaultValue: 'popular',
            },
            { name: 'federationNumber', type: 'text', label: 'Nº de federación' },
            {
              name: 'phone',
              type: 'text',
              label: 'Teléfono móvil',
              admin: { description: 'Obligatorio para las nuevas altas y el grupo de WhatsApp.' },
              validate: validateNewMemberPhone,
            },
            {
              name: 'imageRightsAccepted',
              type: 'checkbox',
              label: 'Derechos de imagen aceptados',
              defaultValue: false,
              admin: {
                description:
                  'Condición obligatoria para las nuevas altas. Se registra automáticamente la fecha de aceptación.',
              },
              validate: validateImageRights,
            },
            {
              name: 'imageRightsAcceptedAt',
              type: 'date',
              label: 'Fecha de aceptación de derechos de imagen',
              admin: { readOnly: true },
            },
            { name: 'photo', type: 'upload', relationTo: 'media', label: 'Foto' },
          ],
        },
        {
          label: 'Cuotas',
          fields: [
            {
              name: 'currentMembershipType',
              type: 'relationship',
              relationTo: 'membership-types',
              label: 'Tipo de socio (temporada actual)',
              admin: {
                readOnly: true,
                description: 'Se rellena solo desde la cuota de la temporada actual.',
              },
              access: { update: isAdminOrEditorFieldLevel },
            },
            {
              name: 'membershipStatus',
              type: 'select',
              label: 'Estado de la cuota',
              defaultValue: 'pending',
              access: { update: isAdminOrEditorFieldLevel },
              options: [
                { label: 'Pendiente', value: 'pending' },
                { label: 'Al corriente', value: 'active' },
                { label: 'Baja', value: 'inactive' },
              ],
            },
            {
              name: 'memberships',
              type: 'join',
              collection: 'memberships',
              on: 'member',
              label: 'Histórico de cuotas',
            },
          ],
        },
        {
          label: 'Equipación',
          fields: [
            {
              name: 'deliveries',
              type: 'join',
              collection: 'equipment-deliveries',
              on: 'member',
              label: 'Equipación entregada',
            },
          ],
        },
        {
          label: 'Participación',
          fields: [
            {
              name: 'registrations',
              type: 'join',
              collection: 'event-registrations',
              on: 'member',
              label: 'Inscripciones',
            },
            {
              name: 'raceResults',
              type: 'join',
              collection: 'results',
              on: 'member',
              label: 'Resultados y marcas',
            },
          ],
        },
        {
          label: 'Personalizados',
          description: 'Campos a medida definidos por el club en Configuración → Campos del socio.',
          fields: [
            {
              name: 'attributes',
              type: 'join',
              collection: 'member-attributes',
              on: 'member',
              label: 'Datos a medida',
            },
          ],
        },
      ],
    },
  ],
  hooks: {
    beforeChange: [
      ({ data }) => {
        if (data.imageRightsAccepted === true && !data.imageRightsAcceptedAt) {
          return { ...data, imageRightsAcceptedAt: new Date().toISOString() }
        }
        return data
      },
    ],
  },
}
