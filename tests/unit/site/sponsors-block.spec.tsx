import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { SponsorsBlock } from '@/components/site/SponsorsBlock'
import type { Sponsor } from '@/payload-types'

afterEach(cleanup)

const sponsor = (
  id: number,
  name: string,
  tier: Sponsor['tier'],
  extra: Partial<Sponsor> = {},
): Sponsor =>
  ({
    id,
    name,
    tier,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...extra,
  }) as Sponsor

const tiersOf = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLElement>('[data-tier]')).map((el) => el.dataset.tier)

describe('SponsorsBlock', () => {
  it('pliega los cinco valores del enum en los tres niveles visibles', () => {
    // `plata` y `bronce` siguen en el enum de Postgres por los datos que ya existen, pero el
    // club trabaja con tres niveles: en la web se muestran como «Patrocinador» y «Colaborador».
    const { container } = render(
      <SponsorsBlock
        sponsors={[
          sponsor(5, 'Colaborador', 'colaborador'),
          sponsor(3, 'Plata', 'plata'),
          sponsor(1, 'Principal', 'principal'),
          sponsor(4, 'Bronce', 'bronce'),
          sponsor(2, 'Oro', 'oro'),
        ]}
      />,
    )

    expect(tiersOf(container)).toEqual(['principal', 'oro', 'oro', 'colaborador', 'colaborador'])

    const items = Array.from(container.querySelectorAll<HTMLElement>('[data-tier]'))
    // Un «plata» heredado se ve exactamente igual que un «oro»: mismo nivel, mismo tamaño.
    expect(items[1]?.querySelector('span')?.className).toBe(
      items[2]?.querySelector('span')?.className,
    )
    expect(items[0]?.querySelector('span')?.className).toContain('text-3xl')
    expect(items[4]?.querySelector('span')?.className).toContain('text-base')
  })

  it('dentro del mismo nivel manda el orden manual, y el nombre desempata', () => {
    const { container } = render(
      <SponsorsBlock
        sponsors={[
          sponsor(1, 'Zeta', 'colaborador', { order: 1 }),
          sponsor(2, 'Alfa', 'colaborador', { order: 5 }),
          sponsor(3, 'Beta', 'colaborador', { order: 1 }),
        ]}
      />,
    )
    const names = Array.from(container.querySelectorAll('li span')).map((el) => el.textContent)
    expect(names).toEqual(['Beta', 'Zeta', 'Alfa'])
  })

  it('descarta los inactivos', () => {
    const { container } = render(
      <SponsorsBlock
        sponsors={[
          sponsor(1, 'Activo', 'oro', { active: true }),
          sponsor(2, 'Retirado', 'oro', { active: false }),
        ]}
      />,
    )
    expect(Array.from(container.querySelectorAll('li span')).map((el) => el.textContent)).toEqual([
      'Activo',
    ])
  })

  it('trata `active: null` como activo — es la fila que ya existe en producción', () => {
    const { container } = render(
      <SponsorsBlock sponsors={[sponsor(1, 'Heredado', 'oro', { active: null })]} />,
    )
    expect(tiersOf(container)).toEqual(['oro'])
  })

  it('descarta las relaciones sin poblar y no rompe sin patrocinadores', () => {
    const { container } = render(<SponsorsBlock sponsors={[7, sponsor(1, 'Real', 'oro')]} />)
    expect(tiersOf(container)).toEqual(['oro'])

    const empty = render(<SponsorsBlock sponsors={[]} />)
    expect(empty.container.innerHTML).toBe('')
  })
})
