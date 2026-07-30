import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { EventCompanions } from '@/components/site/EventCompanions'

afterEach(cleanup)

describe('EventCompanions', () => {
  it('shows a compact empty state when nobody else is registered', () => {
    render(<EventCompanions eventTitle="Carrera de Albatera" names={[]} />)

    expect(screen.getByText('Aún no se ha apuntado ningún compañero.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Ver los/ })).toBeNull()
  })

  it('shows up to three names directly without an unnecessary dialog', () => {
    render(
      <EventCompanions
        eventTitle="Carrera de Albatera"
        names={['Ana Martínez', 'Carlos García', 'Lucía Sánchez']}
      />,
    )

    expect(screen.getByText('Van 3 compañeros')).toBeTruthy()
    expect(screen.getByText('Ana Martínez, Carlos García, Lucía Sánchez')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Ver los/ })).toBeNull()
  })

  it('keeps one hundred names compact and filters them inside the dialog', () => {
    const names = Array.from(
      { length: 100 },
      (_, index) => `Compañero ${String(index + 1).padStart(3, '0')}`,
    )
    render(<EventCompanions eventTitle="Carrera de Albatera" names={names} />)

    expect(screen.getByText('Van 100 compañeros')).toBeTruthy()
    expect(screen.getByText('+97')).toBeTruthy()
    expect(screen.getByText('Compañero 001, Compañero 002, Compañero 003 y 97 más')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Ver los 100' }))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('heading', { name: 'Compañeros que van' })).toBeTruthy()
    expect(within(dialog).getByText(/Carrera de Albatera · Van 100 compañeros/)).toBeTruthy()

    fireEvent.change(within(dialog).getByRole('searchbox', { name: 'Buscar compañero' }), {
      target: { value: '100' },
    })
    expect(within(dialog).getByText('Compañero 100')).toBeTruthy()
    expect(within(dialog).queryByText('Compañero 001')).toBeNull()

    fireEvent.change(within(dialog).getByRole('searchbox', { name: 'Buscar compañero' }), {
      target: { value: 'ninguno' },
    })
    expect(within(dialog).getByRole('status').textContent).toBe(
      'No hay compañeros que coincidan con la búsqueda.',
    )
  })
})
