import type { CollectionConfig } from 'payload'

import { anyone, isAdmin, isAdminOrEditor } from '../access'
import { slugField } from '../fields/slug'

export const ATTRIBUTE_TYPES = [
  { label: 'Texto corto', value: 'text' },
  { label: 'Texto largo', value: 'longtext' },
  { label: 'Número', value: 'number' },
  { label: 'Fecha', value: 'date' },
  { label: 'Sí / No', value: 'boolean' },
  { label: 'Lista de opciones', value: 'select' },
  { label: 'Archivo', value: 'file' },
] as const

/**
 * Campos a medida que el club define sin tocar código. Cada definición describe
 * QUÉ se puede registrar de un socio; el valor vive en `member-attributes`.
 */
export const AttributeDefinitions: CollectionConfig = {
  slug: 'attribute-definitions',
  labels: { singular: 'Campo del socio', plural: 'Campos del socio' },
  admin: {
    useAsTitle: 'label',
    defaultColumns: ['label', 'type', 'group', 'visibleToMember', 'active'],
    group: 'Configuración',
    description:
      'Define aquí cualquier dato que quieras llevar de cada socio (ropa, salud, permisos…). Aparecerá en la ficha de cada socio.',
  },
  access: {
    read: anyone,
    create: isAdminOrEditor,
    update: isAdminOrEditor,
    delete: isAdmin,
  },
  fields: [
    { name: 'label', type: 'text', label: 'Nombre del campo', required: true, admin: { description: 'Ej. Talla de zapatilla, Alergias, Consentimiento de imagen' } },
    slugField('label'),
    {
      name: 'type',
      type: 'select',
      label: 'Tipo de dato',
      required: true,
      defaultValue: 'text',
      options: [...ATTRIBUTE_TYPES],
    },
    {
      name: 'options',
      type: 'array',
      label: 'Opciones',
      labels: { singular: 'Opción', plural: 'Opciones' },
      admin: {
        condition: (data) => data?.type === 'select',
        description: 'Valores posibles cuando el tipo es "Lista de opciones".',
      },
      fields: [{ name: 'label', type: 'text', label: 'Opción', required: true }],
    },
    {
      name: 'group',
      type: 'text',
      label: 'Grupo',
      defaultValue: 'General',
      admin: { description: 'Para organizar la ficha: Datos personales, Salud, Administrativo…' },
    },
    {
      name: 'visibleToMember',
      type: 'checkbox',
      label: 'Visible para el socio',
      defaultValue: true,
      admin: { description: 'Si está marcado, el socio lo ve en su zona privada.' },
    },
    {
      name: 'editableByMember',
      type: 'checkbox',
      label: 'Editable por el socio',
      defaultValue: false,
      admin: { description: 'Si está marcado, el socio puede cambiar su valor.' },
    },
    { name: 'required', type: 'checkbox', label: 'Obligatorio', defaultValue: false, admin: { position: 'sidebar' } },
    { name: 'order', type: 'number', label: 'Orden', defaultValue: 0, admin: { position: 'sidebar' } },
    { name: 'active', type: 'checkbox', label: 'Activo', defaultValue: true, admin: { position: 'sidebar' } },
  ],
}
