import type { CollectionConfig } from 'payload'

import { anyone, isAdminOrEditor } from '../access'
import { MEMBER_CATEGORIES } from './Members'

/** Race results / rankings. Public to read; an athlete may be a member or a free-text name. */
export const Results: CollectionConfig = {
  slug: 'results',
  labels: { singular: 'Resultado', plural: 'Resultados' },
  admin: {
    useAsTitle: 'athleteName',
    defaultColumns: ['dorsal', 'athleteName', 'event', 'position', 'mark', 'category'],
    group: 'Contenido',
  },
  access: {
    read: anyone,
    create: isAdminOrEditor,
    update: isAdminOrEditor,
    delete: isAdminOrEditor,
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
      label: 'Socio (si aplica)',
    },
    {
      name: 'athleteName',
      type: 'text',
      label: 'Nombre del atleta',
      required: true,
      admin: { description: 'Rellénalo aunque enlaces a un socio (para mostrar en público).' },
    },
    { name: 'dorsal', type: 'number', label: 'Dorsal' },
    { name: 'position', type: 'number', label: 'Posición' },
    {
      name: 'mark',
      type: 'text',
      label: 'Marca / tiempo',
      admin: { description: 'Ej. 00:42:15 o 38:20' },
    },
    {
      name: 'category',
      type: 'select',
      label: 'Categoría',
      options: [...MEMBER_CATEGORIES],
    },
  ],
}
