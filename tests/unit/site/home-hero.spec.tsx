import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'

import { HomeHero } from '@/components/site/HomeHero'

afterEach(cleanup)

const base = {
  eyebrow: 'Albatera · Alicante',
  title: 'Club de corredores Albatera',
  subtitle: 'Un objetivo, un municipio, un deporte.',
  primaryLabel: 'Hazte socio',
  primaryHref: '/hazte-socio',
  secondaryLabel: 'Próximos eventos',
  secondaryHref: '/eventos',
}

describe('HomeHero', () => {
  it('renders eyebrow, title, subtitle and both CTAs with their links', () => {
    render(<HomeHero {...base} />)
    expect(screen.getByText('Albatera · Alicante')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Club de corredores Albatera' })).toBeTruthy()
    expect(screen.getByText('Un objetivo, un municipio, un deporte.')).toBeTruthy()

    const primary = screen.getByRole('link', { name: 'Hazte socio' })
    expect(primary.getAttribute('href')).toBe('/hazte-socio')
    const secondary = screen.getByRole('link', { name: 'Próximos eventos' })
    expect(secondary.getAttribute('href')).toBe('/eventos')
  })

  it('hides a CTA when its label is empty', () => {
    render(<HomeHero {...base} secondaryLabel="" />)
    expect(screen.getByRole('link', { name: 'Hazte socio' })).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Próximos eventos' })).toBeNull()
  })

  it('hides the eyebrow when it is empty', () => {
    render(<HomeHero {...base} eyebrow="" />)
    expect(screen.queryByText('Albatera · Alicante')).toBeNull()
  })

  it('uses white title text in the dark theme and dark title text in the light theme', () => {
    const { rerender } = render(<HomeHero {...base} theme="dark" />)
    expect(screen.getByRole('heading', { name: base.title }).className).toContain('text-white')

    rerender(<HomeHero {...base} theme="light" />)
    expect(screen.getByRole('heading', { name: base.title }).className).toContain('text-abtr-black')
  })
})
