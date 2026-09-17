import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'

// La acción es un módulo `'use server'`: en jsdom no se puede importar, y aquí sólo interesa
// lo que el formulario PINTA, no lo que guarda.
vi.mock('@/actions/member', () => ({ updateProfileAction: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))

const { ProfileForm } = await import('@/components/site/ProfileForm')

afterEach(cleanup)

const defaults = {
  name: 'Ana Pérez',
  email: 'ana@ejemplo.com',
  phone: '600111222',
  federationNumber: 'A-123',
  category: 'master',
}

describe('ProfileForm', () => {
  it('rellena los datos del socio, incluido el email en solo lectura', () => {
    render(<ProfileForm defaults={defaults} editableAttributes={[]} />)

    expect((screen.getByLabelText('Nombre completo') as HTMLInputElement).value).toBe('Ana Pérez')
    expect((screen.getByLabelText('Teléfono móvil') as HTMLInputElement).value).toBe('600111222')
    expect((screen.getByLabelText('Nº de federación (opcional)') as HTMLInputElement).value).toBe('A-123')

    const email = screen.getByLabelText('Email') as HTMLInputElement
    expect(email.value).toBe('ana@ejemplo.com')
    expect(email.readOnly).toBe(true)
    // Sin `name` no viaja en el envío: el email no se cambia desde aquí.
    expect(email.getAttribute('name')).toBeNull()
  })

  it('deja marcada la categoría que ya tiene el socio', () => {
    render(<ProfileForm defaults={defaults} editableAttributes={[]} />)
    expect((screen.getByLabelText('Categoría deportiva') as HTMLSelectElement).value).toBe('master')
  })

  it('pinta un campo de lista como desplegable con sus opciones', () => {
    render(
      <ProfileForm
        defaults={defaults}
        editableAttributes={[
          { id: 7, label: 'Talla de camiseta', type: 'select', value: 'M', boolean: false, options: ['S', 'M', 'L'] },
        ]}
      />,
    )

    const select = screen.getByLabelText('Talla de camiseta') as HTMLSelectElement
    expect(select.tagName).toBe('SELECT')
    expect(select.name).toBe('attr_7')
    expect(select.value).toBe('M')
    expect([...select.options].map((o) => o.value)).toEqual(['', 'S', 'M', 'L'])
  })

  it('rellena una fecha ya guardada', () => {
    render(
      <ProfileForm
        defaults={defaults}
        editableAttributes={[
          { id: 3, label: 'Fecha de nacimiento', type: 'date', value: '1990-04-12', boolean: false, options: [] },
        ]}
      />,
    )
    const input = screen.getByLabelText('Fecha de nacimiento') as HTMLInputElement
    expect(input.type).toBe('date')
    expect(input.value).toBe('1990-04-12')
  })

  it('pinta un sí/no como casilla marcada', () => {
    render(
      <ProfileForm
        defaults={defaults}
        editableAttributes={[
          { id: 9, label: 'Autoriza fotos', type: 'boolean', value: '', boolean: true, options: [] },
        ]}
      />,
    )
    const box = screen.getByLabelText('Autoriza fotos') as HTMLInputElement
    expect(box.type).toBe('checkbox')
    expect(box.checked).toBe(true)
  })
})
