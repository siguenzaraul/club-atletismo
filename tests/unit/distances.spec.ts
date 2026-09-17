import { describe, expect, it } from 'vitest'

import {
  STANDARD_DISTANCES,
  distanceLabel,
  distanceSlugFor,
  metersFromSlug,
  parseDistanceToMeters,
} from '@/lib/distances'

describe('distanceLabel', () => {
  it('usa la etiqueta del catálogo', () => {
    expect(distanceLabel(10000)).toBe('10K')
    expect(distanceLabel(21097)).toBe('Media maratón')
    expect(distanceLabel(42195)).toBe('Maratón')
  })

  it('deriva una etiqueta legible para distancias libres', () => {
    expect(distanceLabel(7500)).toBe('7,5 km')
    expect(distanceLabel(800)).toBe('800 m')
  })

  it('devuelve un guion sin distancia', () => {
    expect(distanceLabel(null)).toBe('—')
    expect(distanceLabel(0)).toBe('—')
  })
})

describe('slugs', () => {
  it('el ciclo slug → metros es estable para todo el catálogo', () => {
    for (const d of STANDARD_DISTANCES) {
      expect(metersFromSlug(distanceSlugFor(d.meters))).toBe(d.meters)
    }
  })

  it('también para distancias libres', () => {
    expect(distanceSlugFor(7500)).toBe('m-7500')
    expect(metersFromSlug('m-7500')).toBe(7500)
  })

  it('devuelve null con slugs desconocidos', () => {
    expect(metersFromSlug('no-existe')).toBeNull()
    expect(metersFromSlug('')).toBeNull()
    expect(metersFromSlug(null)).toBeNull()
  })
})

describe('parseDistanceToMeters', () => {
  it.each([
    ['10k', 10000],
    ['10 km', 10000],
    ['10K', 10000],
    ['5k', 5000],
    ['21,097 km', 21097],
    ['21097', 21097],
    ['10.000', 10000],
    ['5000 m', 5000],
    ['800m', 800],
    ['media maraton', 21097],
    ['Media Maratón', 21097],
    ['maraton', 42195],
    ['Maratón', 42195],
    // Un número pequeño y pelado se lee como kilómetros: es como lo escribe el club.
    ['10', 10000],
    ['5', 5000],
  ])('interpreta %j como %i metros', (raw, expected) => {
    expect(parseDistanceToMeters(raw)).toBe(expected)
  })

  it('acepta números directamente', () => {
    expect(parseDistanceToMeters(10000)).toBe(10000)
  })

  it.each([['', 'vacío'], ['abc', 'texto'], ['~~', 'símbolos'], ['-5', 'negativo']])(
    'devuelve null para %j (%s)',
    (raw) => {
      expect(parseDistanceToMeters(raw)).toBeNull()
    },
  )

  it('nunca lanza con entradas nulas', () => {
    expect(parseDistanceToMeters(null)).toBeNull()
    expect(parseDistanceToMeters(undefined)).toBeNull()
  })
})

/**
 * El formulario de la ficha pública repinta la distancia guardada con `distanceLabel` y la
 * vuelve a enviar como texto: si el parser no entiende su propia etiqueta, el socio no puede
 * guardar dos veces seguidas. Esto pasó con «1.500 m» y «3.000 m».
 */
describe('ida y vuelta etiqueta → metros', () => {
  it.each(STANDARD_DISTANCES.map((d) => [d.label, d.meters] as const))(
    '«%s» vuelve a %i metros',
    (label, meters) => {
      expect(parseDistanceToMeters(label)).toBe(meters)
    },
  )

  it.each([800, 3500, 7500, 12000])('una distancia libre de %i m también vuelve', (meters) => {
    expect(parseDistanceToMeters(distanceLabel(meters))).toBe(meters)
  })

  it('no confunde un decimal suelto con separador de miles', () => {
    expect(parseDistanceToMeters('1,5 m')).toBeNull()
  })
})
