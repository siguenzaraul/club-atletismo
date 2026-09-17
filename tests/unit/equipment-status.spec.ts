import { describe, expect, it } from 'vitest'

import {
  describeGarment,
  summarizeMemberEquipment,
  type MemberDelivery,
} from '@/lib/equipment-status'

const arriba = { categoryId: 1, label: 'Prenda parte superior', required: true }
const abajo = { categoryId: 2, label: 'Prenda parte inferior', required: false }

const entrega = (over: Partial<MemberDelivery> & { id: number }): MemberDelivery => ({
  itemName: 'Camiseta de manga corta',
  sizeLabel: 'M',
  status: 'reserved',
  categoryId: 1,
  ...over,
})

describe('describeGarment', () => {
  it('junta prenda y talla', () => {
    expect(describeGarment({ itemName: 'Pantalón corto', sizeLabel: 'S' })).toBe('Pantalón corto · talla S')
  })

  it('aguanta una prenda sin talla', () => {
    expect(describeGarment({ itemName: 'Gorra', sizeLabel: null })).toBe('Gorra')
  })
})

describe('summarizeMemberEquipment', () => {
  /**
   * El caso que motivó todo esto: el socio tenía DOS prendas reservadas y la zona de socio le
   * decía que le faltaba una tercera, porque comparaba contra el pack de la temporada en vez de
   * mirar lo que él mismo había elegido.
   */
  it('cuenta como pendientes de recoger TODAS las reservadas, no una', () => {
    const res = summarizeMemberEquipment(
      [
        entrega({ id: 1, itemName: 'Camiseta de manga corta', sizeLabel: 'M', categoryId: 1 }),
        entrega({ id: 2, itemName: 'Pantalón corto', sizeLabel: 'S', categoryId: 2 }),
      ],
      [arriba, abajo],
    )
    expect(res.pendingPickup.map(describeGarment)).toEqual([
      'Camiseta de manga corta · talla M',
      'Pantalón corto · talla S',
    ])
    expect(res.missingChoices).toEqual([])
    expect(res.delivered).toEqual([])
  })

  it('la lista de espera también está pendiente de recoger', () => {
    const res = summarizeMemberEquipment([entrega({ id: 1, status: 'requested' })], [arriba])
    expect(res.pendingPickup).toHaveLength(1)
  })

  it('lo entregado deja de estar pendiente', () => {
    const res = summarizeMemberEquipment(
      [entrega({ id: 1, status: 'delivered' }), entrega({ id: 2, categoryId: 2, status: 'reserved' })],
      [arriba, abajo],
    )
    expect(res.pendingPickup.map((d) => d.id)).toEqual([2])
    expect(res.delivered.map((d) => d.id)).toEqual([1])
    // Entregada sigue cubriendo su tipo: no vuelve a pedirse.
    expect(res.missingChoices).toEqual([])
  })

  it('sólo avisa de lo que falta por elegir si el club lo pide como obligatorio', () => {
    const res = summarizeMemberEquipment([], [arriba, abajo])
    expect(res.missingChoices).toEqual(['Prenda parte superior'])
  })

  it('una prenda devuelta vuelve a contar como no elegida', () => {
    const res = summarizeMemberEquipment([entrega({ id: 1, status: 'returned' })], [arriba])
    expect(res.pendingPickup).toEqual([])
    expect(res.delivered.map((d) => d.id)).toEqual([1])
    expect(res.missingChoices).toEqual(['Prenda parte superior'])
  })

  it('sin tipos de prenda configurados no inventa nada que falte', () => {
    const res = summarizeMemberEquipment([entrega({ id: 1 })])
    expect(res.pendingPickup).toHaveLength(1)
    expect(res.missingChoices).toEqual([])
  })
})
