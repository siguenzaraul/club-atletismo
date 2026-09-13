import { describe, expect, it } from 'vitest'

import { isStandardSize, normalizeSizeLabel, standardSizeOrder } from '@/lib/sizes'

describe('normalizeSizeLabel', () => {
  it('ignora mayúsculas y espacios', () => {
    expect(normalizeSizeLabel(' m ')).toBe('M')
    expect(normalizeSizeLabel('x l')).toBe('XL')
  })

  it('reconoce las formas alternativas que el club ya ha tecleado', () => {
    // Sin esto, sembrar el catálogo estándar crearía un "XXL" junto al "2XL" existente.
    expect(normalizeSizeLabel('2XL')).toBe('XXL')
    expect(normalizeSizeLabel('xxxl')).toBe('3XL')
    expect(normalizeSizeLabel('XXXXL')).toBe('4XL')
  })

  it('deja intacto lo que no reconoce', () => {
    expect(normalizeSizeLabel('42')).toBe('42')
    expect(normalizeSizeLabel('Única')).toBe('ÚNICA')
  })
})

describe('standardSizeOrder', () => {
  it('ordena de XS a 4XL', () => {
    // Desordenada a propósito: con la lista ya ordenada, una función que devolviera siempre lo
    // mismo daría comparador 0, el sort estable no movería nada y el test pasaría igualmente.
    const barajada = ['XL', '4XL', 'XS', 'XXL', 'M', '3XL', 'S', 'L']
    const ordered = barajada.sort((a, b) => standardSizeOrder(a) - standardSizeOrder(b))
    expect(ordered).toEqual(['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL'])
  })

  it('mezcla grafías alternativas en el sitio correcto', () => {
    const barajada = ['2XL', 'XS', '3XL', 'm']
    const ordered = barajada.sort((a, b) => standardSizeOrder(a) - standardSizeOrder(b))
    expect(ordered).toEqual(['XS', 'm', '2XL', '3XL'])
  })

  it('una talla alternativa cae en la posición de su equivalente', () => {
    expect(standardSizeOrder('2XL')).toBe(standardSizeOrder('XXL'))
    expect(standardSizeOrder('XXL')).toBe(5)
  })

  it('devuelve -1 si no es estándar', () => {
    expect(standardSizeOrder('42')).toBe(-1)
    expect(isStandardSize('42')).toBe(false)
    expect(isStandardSize('m')).toBe(true)
  })
})
