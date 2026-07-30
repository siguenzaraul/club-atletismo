import { describe, it, expect } from 'vitest'

import { toCsv } from '@/lib/csv'

describe('toCsv', () => {
  it('writes the header row and reads cells by header key', () => {
    const csv = toCsv(['Nombre', 'Email'], [{ Nombre: 'Ana', Email: 'ana@abtr.run' }])
    expect(csv).toBe('Nombre;Email\r\nAna;ana@abtr.run')
  })

  it('quotes cells containing the delimiter, quotes or newlines', () => {
    const csv = toCsv(['A', 'B'], [{ A: 'x;y', B: 'has "quote"' }])
    expect(csv).toBe('A;B\r\n"x;y";"has ""quote"""')
  })

  it('treats missing/nullish cells as empty', () => {
    const csv = toCsv(['A', 'B'], [{ A: 'only' }])
    expect(csv).toBe('A;B\r\nonly;')
  })
})
