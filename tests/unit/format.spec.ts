import { describe, it, expect } from 'vitest'
import { slugify } from '@/lib/slugify'
import { seriesColor, seriesLabel, formatDate } from '@/lib/format'

describe('slugify', () => {
  it('lowercases, strips accents and spaces', () => {
    expect(slugify('ALBATERUN 2026')).toBe('albaterun-2026')
    expect(slugify('Entrenamiento de club — series')).toBe('entrenamiento-de-club-series')
    expect(slugify('Carrera Niños')).toBe('carrera-ninos')
  })

  it('trims leading/trailing separators', () => {
    expect(slugify('  ¡Hola!  ')).toBe('hola')
  })
})

describe('seriesLabel', () => {
  it('maps known series to Spanish labels', () => {
    expect(seriesLabel('carrera-principal')).toBe('Carrera principal')
    expect(seriesLabel('social-run')).toBe('Social Run')
    expect(seriesLabel('club')).toBe('Club')
    expect(seriesLabel('carrera-externa')).toBe('Carrera externa')
  })

  it('uses readable text colours for every event label', () => {
    expect(seriesColor('club')).toContain('text-abtr-black')
    expect(seriesColor('carrera-externa')).toContain('text-white')
  })
})

describe('formatDate', () => {
  it('formats ISO dates in Spanish', () => {
    expect(formatDate('2026-10-04T09:00:00.000Z')).toContain('2026')
  })
  it('returns empty string for nullish', () => {
    expect(formatDate(null)).toBe('')
  })
})
