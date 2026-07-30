import type { Access, CollectionConfig } from 'payload'

import { isAdminOrEditor, isAdminOrEditorFieldLevel, adminOrOwn } from '../access'
import { MEMBER_CATEGORIES } from './Members'

// Any authenticated user (staff or member) may register; members get linked automatically.
const canCreate: Access = ({ req: { user } }) => Boolean(user)

export const EventRegistrations: CollectionConfig = {
  slug: 'event-registrations',
  labels: { singular: 'Inscripción', plural: 'Inscripciones' },
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['event', 'member', 'category', 'status'],
    group: 'Club',
  },
  access: {
    create: canCreate,
    read: adminOrOwn('member'),
    update: isAdminOrEditor,
    delete: isAdminOrEditor,
  },
  // Prevents duplicate registrations at the DB level (closes the find+create race).
  indexes: [{ fields: ['event', 'member'], unique: true }],
  hooks: {
    beforeChange: [
      ({ req, data, operation }) => {
        // Stamp the logged-in member as the owner on creation.
        if (operation === 'create' && req.user?.collection === 'members') {
          return { ...data, member: req.user.id }
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'event',
      type: 'relationship',
      relationTo: 'events',
      label: 'Evento',
      required: true,
    },
    {
      name: 'member',
      type: 'relationship',
      relationTo: 'members',
      label: 'Socio',
    },
    {
      name: 'category',
      type: 'select',
      label: 'Categoría',
      options: [...MEMBER_CATEGORIES],
    },
    {
      name: 'status',
      type: 'select',
      label: 'Estado',
      defaultValue: 'pending',
      access: { update: isAdminOrEditorFieldLevel },
      options: [
        { label: 'Pendiente', value: 'pending' },
        { label: 'Confirmada', value: 'confirmed' },
        { label: 'Cancelada', value: 'cancelled' },
      ],
    },
  ],
}
