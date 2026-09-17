import type { CollectionConfig } from 'payload'

import { anyone, isAdmin, isAdminOrEditor } from '../access'
import { removeFromGlobalArray } from '../lib/cascade'
import { slugField } from '../fields/slug'

/**
 * Agrupa artículos entre los que el socio elige UNO: "parte de arriba", "parte de abajo".
 *
 * Los subtipos (camiseta de tirantes, camiseta de manga corta…) **son artículos** del catálogo,
 * no filas de otra colección: así el stock por talla, los packs de bienvenida y las entregas
 * siguen funcionando tal cual, y el club compra y cuenta por subtipo, que es lo que necesita
 * para planificar. Esta colección sólo aporta el agrupador y la regla de exclusividad.
 */
export const EquipmentCategories: CollectionConfig = {
  slug: 'equipment-categories',
  labels: { singular: 'Tipo de prenda', plural: 'Tipos de prenda' },
  defaultSort: 'order',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'exclusive', 'active', 'order'],
    group: 'Equipación',
    description:
      'Parte de arriba, parte de abajo… Dentro de cada tipo, el socio elige una sola prenda.',
  },
  access: { read: anyone, create: isAdminOrEditor, update: isAdminOrEditor, delete: isAdmin },
  fields: [
    {
      name: 'name',
      type: 'text',
      label: 'Nombre',
      required: true,
      admin: { description: 'Ej. Parte de arriba, Parte de abajo' },
    },
    slugField('name'),
    {
      name: 'publicLabel',
      type: 'text',
      label: 'Etiqueta en el formulario de alta',
      admin: { description: 'Cómo se le pregunta al socio. Si lo dejas vacío se usa el nombre.' },
    },
    { name: 'description', type: 'textarea', label: 'Texto de ayuda para el socio' },
    {
      name: 'exclusive',
      type: 'checkbox',
      label: 'Sólo una prenda por socio y temporada',
      defaultValue: true,
      admin: {
        position: 'sidebar',
        description:
          'Desmárcalo sólo si un socio puede llevarse varias prendas distintas de este tipo.',
      },
    },
    {
      name: 'active',
      type: 'checkbox',
      label: 'Activo',
      defaultValue: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'order',
      type: 'number',
      label: 'Orden',
      defaultValue: 0,
      admin: { position: 'sidebar' },
    },
    {
      name: 'items',
      type: 'join',
      collection: 'equipment-items',
      on: 'category',
      label: 'Prendas de este tipo',
    },
  ],
  hooks: {
    beforeDelete: [
      async ({ id, req }) => {
        // El formulario de alta guarda el tipo de prenda en una columna NOT NULL: sin quitar esa
        // fila, borrar el tipo desde el panel reventaba contra la base de datos. Quitarla es
        // además lo que el club quiere decir al borrarlo: deja de preguntarse en el alta.
        await removeFromGlobalArray(req, id, {
          slug: 'registration-form',
          arrayField: 'garments',
          refField: 'category',
        })
      },
    ],
  },
}
