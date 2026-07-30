import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { SponsorsBlock } from '@/components/site/SponsorsBlock'
import type { Sponsor } from '@/payload-types'

afterEach(cleanup)

const sponsor = (id: number, name: string, tier: Sponsor['tier']): Sponsor =>
  ({
    id,
    name,
    tier,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }) as Sponsor

describe('SponsorsBlock', () => {
  it('orders all five tiers by contribution level and gives each one a distinct scale', () => {
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

    const items = Array.from(container.querySelectorAll<HTMLElement>('[data-tier]'))
    expect(items.map((item) => item.dataset.tier)).toEqual([
      'principal',
      'oro',
      'plata',
      'bronce',
      'colaborador',
    ])
    expect(items[0]?.querySelector('span')?.className).toContain('text-3xl')
    expect(items[4]?.querySelector('span')?.className).toContain('text-base')
  })
})
