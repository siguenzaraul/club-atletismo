import type { CollectionConfig } from 'payload'

import { adminOrOwn, isAdmin, isAdminOrEditor } from '../access'
import { formatAttributeValue, valueFieldFor } from '../lib/attributes'
import type { AttributeType } from '../lib/attributes'

const VALUE_FIELDS = [
  'valueText',
  'valueLongtext',
  'valueNumber',
  'valueDate',
  'valueBoolean',
  'valueOption',
  'valueFile',
] as const

/** Valor de un campo a medida para un socio concreto. Columnas tipadas → filtrables. */
export const MemberAttributes: CollectionConfig = {
  slug: 'member-attributes',
  labels: { singular: 'Dato del socio', plural: 'Datos del socio' },
  admin: {
    useAsTitle: 'label',
    defaultColumns: ['label', 'member'],
    group: 'Club',
    description: 'Valores de los campos a medida. Rellena la columna que corresponda al tipo del campo.',
  },
  access: {
    read: adminOrOwn('member'),
    create: isAdminOrEditor,
    update: isAdminOrEditor,
    delete: isAdmin,
  },
  indexes: [{ fields: ['member', 'definition'], unique: true }],
  fields: [
    { name: 'member', type: 'relationship', relationTo: 'members', label: 'Socio', required: true },
    {
      name: 'definition',
      type: 'relationship',
      relationTo: 'attribute-definitions',
      label: 'Campo',
      required: true,
    },
    { name: 'label', type: 'text', admin: { hidden: true } },
    {
      type: 'collapsible',
      label: 'Valor',
      admin: { description: 'Rellena solo el campo que coincida con el tipo definido.' },
      fields: [
        { name: 'valueText', type: 'text', label: 'Texto corto' },
        { name: 'valueLongtext', type: 'textarea', label: 'Texto largo' },
        { name: 'valueNumber', type: 'number', label: 'Número' },
        { name: 'valueDate', type: 'date', label: 'Fecha' },
        { name: 'valueBoolean', type: 'checkbox', label: 'Sí / No' },
        { name: 'valueOption', type: 'text', label: 'Opción elegida' },
        { name: 'valueFile', type: 'upload', relationTo: 'media', label: 'Archivo' },
      ],
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, req }) => {
        const defId =
          data?.definition && typeof data.definition === 'object' ? data.definition.id : data?.definition
        if (!defId) return data
        const def = await req.payload.findByID({
          collection: 'attribute-definitions',
          id: defId,
          depth: 0,
          overrideAccess: true,
          req,
        })
        if (!def) return data
        const type = def.type as AttributeType
        const keep = valueFieldFor(type)
        // Null out every value column except the one matching the definition type.
        for (const f of VALUE_FIELDS) {
          if (f !== keep) (data as Record<string, unknown>)[f] = null
        }
        // Friendly title = "Campo: valor".
        const summary = formatAttributeValue(data as never, type)
        data.label = summary ? `${def.label}: ${summary}` : def.label
        return data
      },
    ],
  },
}
