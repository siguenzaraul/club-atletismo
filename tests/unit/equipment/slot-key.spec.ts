import { describe, expect, it } from 'vitest'

import { slotKeyFor } from '@/lib/equipment'

const base = {
  memberId: 7,
  seasonId: 3,
  categoryId: 2,
  status: 'reserved' as string | null | undefined,
  exclusive: true,
}

describe('slotKeyFor', () => {
  it('genera la clave de ocupación cuando la entrega está viva', () => {
    expect(slotKeyFor(base)).toBe('7:3:2')
  })

  it('los tres estados vivos comparten clave', () => {
    // Importa que sea la misma: pasar una reserva a entregada es un update de la misma fila y
    // no puede chocar consigo mismo en el índice único.
    const keys = ['requested', 'reserved', 'delivered'].map((status) =>
      slotKeyFor({ ...base, status }),
    )
    expect(new Set(keys).size).toBe(1)
    expect(keys[0]).toBe('7:3:2')
  })

  it('devolver libera la plaza', () => {
    expect(slotKeyFor({ ...base, status: 'returned' })).toBeNull()
  })

  it('sin estado cuenta como solicitada (el valor por defecto)', () => {
    expect(slotKeyFor({ ...base, status: null })).toBe('7:3:2')
    expect(slotKeyFor({ ...base, status: undefined })).toBe('7:3:2')
  })

  it('un tipo de prenda no excluyente nunca ocupa', () => {
    expect(slotKeyFor({ ...base, exclusive: false })).toBeNull()
  })

  it('sin tipo de prenda no ocupa — protege el histórico de producción', () => {
    // Las entregas que ya existen no tienen categoría: si ocuparan plaza, dos del mismo socio
    // chocarían y el índice único no se habría podido crear.
    expect(slotKeyFor({ ...base, categoryId: null })).toBeNull()
  })

  it('sin socio o sin temporada no ocupa', () => {
    expect(slotKeyFor({ ...base, memberId: null })).toBeNull()
    expect(slotKeyFor({ ...base, seasonId: null })).toBeNull()
  })

  it('socios, temporadas o tipos distintos dan claves distintas', () => {
    expect(slotKeyFor({ ...base, memberId: 8 })).not.toBe(slotKeyFor(base))
    expect(slotKeyFor({ ...base, seasonId: 4 })).not.toBe(slotKeyFor(base))
    expect(slotKeyFor({ ...base, categoryId: 9 })).not.toBe(slotKeyFor(base))
  })
})
