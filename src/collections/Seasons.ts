import type { CollectionConfig } from 'payload'

import { anyone, isAdmin, isAdminOrEditor } from '../access'
import { blockIfReferenced } from '../lib/cascade-guard'
import { slugField } from '../fields/slug'

/** Temporadas del club (ej. 2025/2026). Eje transversal de cuotas, packs y stock. */
export const Seasons: CollectionConfig = {
  slug: 'seasons',
  labels: { singular: 'Temporada', plural: 'Temporadas' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'isCurrent', 'startDate', 'endDate'],
    group: 'Configuración',
  },
  access: {
    read: anyone,
    create: isAdminOrEditor,
    update: isAdminOrEditor,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      label: 'Nombre',
      required: true,
      admin: { description: 'Ej. 2025/2026' },
    },
    slugField('name'),
    {
      name: 'isCurrent',
      type: 'checkbox',
      label: 'Temporada actual',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'Marca la temporada en curso. Solo una debería estar activa.',
      },
    },
    { name: 'startDate', type: 'date', label: 'Inicio' },
    { name: 'endDate', type: 'date', label: 'Fin' },
  ],
  hooks: {
    beforeDelete: [
      async ({ id, req }) => {
        // Una temporada es el eje de las cuotas, la equipación y el stock: borrarla arrastraría
        // años de datos del club. Se corta diciendo qué hay dentro.
        await blockIfReferenced(
          req,
          id,
          [
            { collection: 'memberships', field: 'season', label: 'cuotas' },
            { collection: 'equipment-deliveries', field: 'season', label: 'entregas de equipación' },
            { collection: 'equipment-stock', field: 'season', label: 'filas de stock' },
            { collection: 'equipment-packs', field: 'season', label: 'packs de equipación' },
          ],
          'Si de verdad quieres borrarla, vacía antes esos datos.',
        )
      },
    ],
    // Keep a single current season: unmark the others when one is set current.
    afterChange: [
      async ({ doc, req, operation, context }) => {
        if (context?.skipSeasonSync) return
        if (doc.isCurrent) {
          await req.payload.update({
            collection: 'seasons',
            where: { and: [{ isCurrent: { equals: true } }, { id: { not_equals: doc.id } }] },
            data: { isCurrent: false },
            overrideAccess: true,
            context: { skipSeasonSync: true },
            req,
          })
        }
        void operation
      },
    ],
  },
}
