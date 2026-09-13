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

  // La prop `theme` describe sobre qué se pinta el texto, no el esquema de color del sitio.
  // Sin foto de fondo el hero "claro" es la superficie del sitio y debe seguir al tema: si
  // usara `text-abtr-black` fijo, en modo oscuro saldría negro sobre negro.
  const titleClass = () => screen.getByRole('heading', { name: base.title }).className

  it('sin foto y tema oscuro, pinta una banda negra de marca con texto blanco', () => {
    render(<HomeHero {...base} theme="dark" />)
    expect(titleClass()).toContain('text-white')
  })

  it('sin foto y tema claro, usa el token que se voltea con el tema del sitio', () => {
    render(<HomeHero {...base} theme="light" />)
    expect(titleClass()).toContain('text-foreground')
    expect(titleClass()).not.toContain('text-abtr-black')
  })

  it('con foto de fondo, el tema del CMS manda: el velo garantiza el contraste', () => {
    const backgroundImage = { id: 1, url: '/api/media/file/hero.jpg', alt: '', updatedAt: '', createdAt: '' }

    const { rerender } = render(<HomeHero {...base} theme="light" backgroundImage={backgroundImage} />)
    expect(titleClass()).toContain('text-abtr-black')

    rerender(<HomeHero {...base} theme="dark" backgroundImage={backgroundImage} />)
    expect(titleClass()).toContain('text-white')
  })
})
