import { describe, it, expect } from 'vitest'

import { summarizeSelectField } from '@/lib/attributes'

const shirt = {
  id: 1,
  label: 'Talla de camiseta',
  group: 'Equipación',
  options: [{ label: 'S' }, { label: 'M' }, { label: 'L' }, { label: 'XL' }],
}

describe('summarizeSelectField', () => {
  it('counts each defined option in order and keeps zeros', () => {
    const s = summarizeSelectField(shirt, ['M', 'M', 'L', 'S', 'M'], 10)
    expect(s.options.map((o) => [o.label, o.count])).toEqual([
      ['S', 1],
      ['M', 3],
      ['L', 1],
      ['XL', 0],
    ])
    expect(s.answered).toBe(5)
    expect(s.unassigned).toBe(5)
  })

  it('ignores empty/blank values and never goes negative on unassigned', () => {
    const s = summarizeSelectField(shirt, ['M', '', '  ', null, undefined], 2)
    expect(s.answered).toBe(1)
    expect(s.unassigned).toBe(1)
  })

  it('surfaces legacy values that no longer match a defined option', () => {
    const s = summarizeSelectField(shirt, ['M', 'XXL', 'XXL'], 3)
    const legacy = s.options.find((o) => o.label === 'XXL')
    expect(legacy).toEqual({ label: 'XXL', count: 2, defined: false })
    expect(s.options.filter((o) => o.defined)).toHaveLength(4)
  })

  it('handles a field with no options defined', () => {
    const s = summarizeSelectField({ id: 2, label: 'Vacío', options: null }, [], 4)
    expect(s.options).toEqual([])
    expect(s.answered).toBe(0)
    expect(s.group).toBe('General')
  })
})
