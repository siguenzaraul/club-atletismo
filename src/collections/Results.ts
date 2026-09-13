import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'

import { anyone, isAdminOrEditor } from '../access'
import { parseMarkToSeconds } from '../lib/marks'
import { MEMBER_CATEGORIES } from './Members'

/**
 * Normaliza la marca a segundos y hereda la distancia del evento cuando la fila no la trae.
 *
 * Hook de colección (no de campo) a propósito: necesita `originalDoc` para que un update
 * parcial de otro campo no borre `markSeconds`, y `req` para que el lookup del evento vaya
 * dentro de la misma transacción.
 */
const normalizeMarkAndDistance: CollectionBeforeChangeHook = async ({ data, originalDoc, req }) => {
  const mark = data.mark ?? originalDoc?.mark ?? null
  const markSeconds = parseMarkToSeconds(mark)

  let distanceMeters = data.distanceMeters ?? originalDoc?.distanceMeters ?? null
  if (distanceMeters == null) {
    const rel = data.event ?? originalDoc?.event
    const eventId = rel && typeof rel === 'object' ? (rel as { id?: number }).id : rel
    if (eventId) {
      const ev = await req.payload
        .findByID({ collection: 'events', id: eventId as number, depth: 0, req, overrideAccess: true })
        .catch(() => null)
      distanceMeters = ev?.distanceMeters ?? null
    }
  }

  return { ...data, markSeconds, distanceMeters }
}

/** Race results / rankings. Public to read; an athlete may be a member or a free-text name. */
export const Results: CollectionConfig = {
  slug: 'results',
  labels: { singular: 'Resultado', plural: 'Resultados' },
  admin: {
    useAsTitle: 'athleteName',
    defaultColumns: ['dorsal', 'athleteName', 'event', 'position', 'mark', 'distanceMeters', 'category'],
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
      name: 'distanceMeters',
      type: 'number',
      label: 'Distancia (m)',
      min: 0,
      index: true,
      admin: {
        description:
          'Si la dejas vacía se hereda de la distancia principal del evento. 10000 = 10K, 21097 = media.',
      },
    },
    {
      name: 'markSeconds',
      type: 'number',
      label: 'Marca (segundos)',
      index: true,
      admin: {
        readOnly: true,
        description: 'Se calcula solo a partir de la marca. Es lo que permite ordenar y comparar.',
      },
    },
    {
      name: 'category',
      type: 'select',
      label: 'Categoría',
      options: [...MEMBER_CATEGORIES],
    },
  ],
  hooks: {
    beforeChange: [normalizeMarkAndDistance],
  },
}
