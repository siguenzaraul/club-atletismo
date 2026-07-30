import type { Field } from 'payload'

import { slugify } from '../lib/slugify'

/**
 * URL slug auto-derived from `sourceField` when left empty, but editable.
 * Unique + indexed so it can drive `/[slug]` routes.
 */
export const slugField = (sourceField = 'title'): Field => ({
  name: 'slug',
  type: 'text',
  unique: true,
  index: true,
  admin: {
    position: 'sidebar',
    description: 'Se genera del título si lo dejas vacío.',
  },
  hooks: {
    beforeValidate: [
      ({ value, data }) => {
        if (value) return slugify(value)
        const source = data?.[sourceField]
        return typeof source === 'string' ? slugify(source) : value
      },
    ],
  },
})
