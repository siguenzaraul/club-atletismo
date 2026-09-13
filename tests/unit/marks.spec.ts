import { describe, expect, it } from 'vitest'

import { formatMark, formatPace, parseMarkToSeconds } from '@/lib/marks'

describe('parseMarkToSeconds', () => {
  it.each([
    ['38:20', 2300],
    ['00:42:15', 2535],
    ['1:23:45', 5025],
    ['2:59:59', 10799],
    // Sin ":", los puntos son separadores de campo.
    ['1.23.45', 5025],
    // El caso ambiguo se resuelve como 38m20s, que es lo que produce un crono de carrera.
    ['38.20', 2300],
    ['38,20', 2300],
    // Con ":", el decimal final son décimas y se descartan.
    ['38:20.4', 2300],
    ['0:59', 59],
    // Espacios y sufijos de crono.
    [' 38:20 ', 2300],
    ["1h 23' 45\"", 5025],
  ])('interpreta %j como %i segundos', (raw, expected) => {
    expect(parseMarkToSeconds(raw)).toBe(expected)
  })

  it.each([
    ['', 'vacío'],
    ['   ', 'sólo espacios'],
    ['DNF', 'abandono'],
    ['—', 'guion'],
    ['abandono', 'texto'],
    ['38:75', 'segundos fuera de rango'],
    ['1:75:00', 'minutos fuera de rango'],
    ['1:2:3:4', 'demasiados campos'],
    ['12', 'un solo campo'],
    ['0:00', 'cero'],
    ['25:00:00', 'más de 24 h'],
  ])('devuelve null para %j (%s)', (raw) => {
    expect(parseMarkToSeconds(raw)).toBeNull()
  })

  it('nunca lanza con entradas no string', () => {
    expect(parseMarkToSeconds(null)).toBeNull()
    expect(parseMarkToSeconds(undefined)).toBeNull()
  })
})

describe('formatMark', () => {
  it.each([
    [2300, '38:20'],
    [2535, '42:15'],
    [5025, '1:23:45'],
    [59, '0:59'],
  ])('formatea %i como %j', (seconds, expected) => {
    expect(formatMark(seconds)).toBe(expected)
  })

  it('devuelve un guion para valores inválidos', () => {
    expect(formatMark(null)).toBe('—')
    expect(formatMark(0)).toBe('—')
    expect(formatMark(Number.NaN)).toBe('—')
  })

  it('el ciclo parse → format es estable', () => {
    for (const raw of ['38:20', '1:23:45', '42:15']) {
      expect(formatMark(parseMarkToSeconds(raw))).toBe(raw.replace(/^0/, ''))
    }
  })
})

describe('formatPace', () => {
  it('calcula el ritmo por kilómetro', () => {
    expect(formatPace(2535, 10000)).toBe('4:14 /km')
    expect(formatPace(10800, 42195)).toBe('4:16 /km')
  })

  it('devuelve un guion con entradas imposibles', () => {
    expect(formatPace(0, 10000)).toBe('—')
    expect(formatPace(2535, 0)).toBe('—')
  })
})
