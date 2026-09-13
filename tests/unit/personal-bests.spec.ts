import { describe, expect, it } from 'vitest'

import { mergePersonalBests, type PersonalBest } from '@/lib/personal-bests'

const pb = (over: Partial<PersonalBest>): PersonalBest => ({
  distanceMeters: 10000,
  markSeconds: 2535,
  mark: '42:15',
  date: null,
  eventName: null,
  source: 'manual',
  resultId: null,
  ...over,
})

describe('mergePersonalBests', () => {
  it('se queda con la mejor marca de cada distancia', () => {
    const result = mergePersonalBests(
      [pb({ markSeconds: 2600 })],
      [pb({ markSeconds: 2400, source: 'result', resultId: 1 })],
    )
    expect(result).toHaveLength(1)
    expect(result[0].markSeconds).toBe(2400)
  })

  it('la manual gana si es mejor, aunque venga de fuera del club', () => {
    const result = mergePersonalBests(
      [pb({ markSeconds: 2300 })],
      [pb({ markSeconds: 2400, source: 'result', resultId: 1 })],
    )
    expect(result[0].markSeconds).toBe(2300)
    expect(result[0].source).toBe('manual')
  })

  it('a igualdad gana la de resultados, que es verificable', () => {
    const result = mergePersonalBests(
      [pb({ markSeconds: 2400 })],
      [pb({ markSeconds: 2400, source: 'result', resultId: 7 })],
    )
    expect(result[0].source).toBe('result')
    expect(result[0].resultId).toBe(7)
  })

  it('conserva las distancias que no están en el catálogo', () => {
    const result = mergePersonalBests([pb({ distanceMeters: 7500, markSeconds: 1800 })], [])
    expect(result).toHaveLength(1)
    expect(result[0].distanceMeters).toBe(7500)
  })

  it('ordena por distancia ascendente', () => {
    const result = mergePersonalBests(
      [
        pb({ distanceMeters: 42195, markSeconds: 12000 }),
        pb({ distanceMeters: 5000, markSeconds: 1200 }),
        pb({ distanceMeters: 21097, markSeconds: 5400 }),
      ],
      [],
    )
    expect(result.map((b) => b.distanceMeters)).toEqual([5000, 21097, 42195])
  })

  it('descarta filas sin distancia o sin marca válidas', () => {
    const result = mergePersonalBests(
      [
        pb({ distanceMeters: 0 }),
        pb({ markSeconds: 0, distanceMeters: 5000 }),
        pb({ distanceMeters: Number.NaN }),
      ],
      [],
    )
    expect(result).toHaveLength(0)
  })

  it('devuelve vacío sin entradas', () => {
    expect(mergePersonalBests([], [])).toEqual([])
  })
})
