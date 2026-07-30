import type { CollectionConfig } from 'payload'

import { isAdmin, isAdminFieldLevel, isAdminOrEditor } from '../access'

/** Club staff. These are the only accounts that can reach the admin panel. */
export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Usuario', plural: 'Usuarios (staff)' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'roles'],
    group: 'Administración',
  },
  auth: true,
  access: {
    read: isAdminOrEditor,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      label: 'Nombre',
      required: true,
    },
    {
      name: 'roles',
      type: 'select',
      label: 'Roles',
      hasMany: true,
      required: true,
      defaultValue: ['editor'],
      access: {
        update: isAdminFieldLevel,
      },
      options: [
        { label: 'Administrador', value: 'admin' },
        { label: 'Editor', value: 'editor' },
      ],
    },
  ],
  versions: false,
}
