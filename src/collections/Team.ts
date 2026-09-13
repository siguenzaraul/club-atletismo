import type { CollectionConfig } from 'payload'

import { anyone, isAdminOrEditor } from '../access'

/** Public "Equipo" section: coaches and featured athletes. */
export const Team: CollectionConfig = {
  slug: 'team',
  labels: { singular: 'Miembro del equipo', plural: 'Equipo' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'role', 'order'],
    group: 'Contenido',
  },
  access: {
    read: anyone,
    create: isAdminOrEditor,
    update: isAdminOrEditor,
    delete: isAdminOrEditor,
  },
  defaultSort: 'order',
  fields: [
    { name: 'name', type: 'text', label: 'Nombre', required: true },
    {
      name: 'role',
      type: 'text',
      label: 'Rol',
      admin: { description: 'Ej. Entrenador, Atleta destacada, Presidente…' },
    },
    { name: 'photo', type: 'upload', relationTo: 'media', label: 'Foto' },
    { name: 'bio', type: 'textarea', label: 'Biografía' },
    {
      name: 'member',
      type: 'relationship',
      relationTo: 'members',
      label: 'Socio vinculado',
      admin: {
        description:
          'Opcional. Si este miembro del equipo también es socio y tiene ficha pública, la tarjeta enlazará a /atletas.',
      },
    },
    {
      name: 'order',
      type: 'number',
      label: 'Orden',
      defaultValue: 0,
      admin: { position: 'sidebar' },
    },
  ],
}
