import { describe, expect, it } from 'vitest'

import { compareSponsors, displayTier, isActiveSponsor, mergeEventSponsors } from '@/lib/sponsors'
import type { Sponsor } from '@/payload-types'

const sponsor = (id: number, name: string, tier: Sponsor['tier'], extra: Partial<Sponsor> = {}) =>
  ({ id, name, tier, ...extra }) as Sponsor

describe('displayTier', () => {
  it('mantiene los tres niveles vigentes', () => {
    expect(displayTier('principal')).toBe('principal')
    expect(displayTier('oro')).toBe('oro')
    expect(displayTier('colaborador')).toBe('colaborador')
  })

  it('pliega los dos retirados', () => {
    expect(displayTier('plata')).toBe('oro')
    expect(displayTier('bronce')).toBe('colaborador')
  })
})

describe('isActiveSponsor', () => {
  it('sólo descarta el `false` explícito', () => {
    expect(isActiveSponsor(sponsor(1, 'A', 'oro', { active: true }))).toBe(true)
    // Fila anterior a que existiera el campo: no puede desaparecer de la web.
    expect(isActiveSponsor(sponsor(2, 'B', 'oro', { active: null }))).toBe(true)
    expect(isActiveSponsor(sponsor(3, 'C', 'oro', { active: false })).valueOf()).toBe(false)
  })
})

describe('compareSponsors', () => {
  it('ordena por nivel, luego por orden manual, luego por nombre', () => {
    const list = [
      sponsor(1, 'Zeta', 'colaborador', { order: 0 }),
      sponsor(2, 'Alfa', 'principal', { order: 9 }),
      sponsor(3, 'Beta', 'colaborador', { order: 0 }),
      sponsor(4, 'Gamma', 'oro', { order: 2 }),
      sponsor(5, 'Delta', 'oro', { order: 1 }),
    ].sort(compareSponsors)
    expect(list.map((s) => s.name)).toEqual(['Alfa', 'Delta', 'Gamma', 'Beta', 'Zeta'])
  })

  it('no rompe con `order` a null', () => {
    const list = [
      sponsor(1, 'Sin orden', 'oro', { order: null }),
      sponsor(2, 'Con orden', 'oro', { order: -1 }),
    ].sort(compareSponsors)
    expect(list.map((s) => s.name)).toEqual(['Con orden', 'Sin orden'])
  })
})

describe('mergeEventSponsors', () => {
  it('deduplica por id y el documento del evento gana', () => {
    const automatic = [sponsor(1, 'Automático', 'oro')]
    const merged = mergeEventSponsors([sponsor(1, 'Del evento', 'principal')], automatic)
    expect(merged).toHaveLength(1)
    expect(merged[0]?.name).toBe('Del evento')
    expect(merged[0]?.tier).toBe('principal')
  })

  it('descarta las relaciones sin poblar', () => {
    // Con `depth` insuficiente la relación llega como número: antes desaparecía en silencio.
    const merged = mergeEventSponsors([7, sponsor(1, 'Real', 'oro')], [])
    expect(merged.map((s) => s.name)).toEqual(['Real'])
  })

  it('descarta inactivos por los dos lados', () => {
    const merged = mergeEventSponsors(
      [sponsor(1, 'Evento inactivo', 'oro', { active: false })],
      [sponsor(2, 'Auto inactivo', 'oro', { active: false }), sponsor(3, 'Bueno', 'oro')],
    )
    expect(merged.map((s) => s.name)).toEqual(['Bueno'])
  })

  it('devuelve lista ordenada y tolera null', () => {
    const merged = mergeEventSponsors(null, [
      sponsor(1, 'Colabora', 'colaborador'),
      sponsor(2, 'Principal', 'principal'),
    ])
    expect(merged.map((s) => s.name)).toEqual(['Principal', 'Colabora'])
    expect(mergeEventSponsors(undefined, [])).toEqual([])
  })
})
