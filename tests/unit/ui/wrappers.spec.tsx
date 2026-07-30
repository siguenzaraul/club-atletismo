import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'

import { EmptyState } from '@/components/ui/empty-state'
import { Stat } from '@/components/ui/stat'
import { Field } from '@/components/ui/field'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'

afterEach(cleanup)

describe('StatusBadge', () => {
  it('renders the label and applies the tone class', () => {
    const { container } = render(<StatusBadge tone="success">Al corriente</StatusBadge>)
    expect(screen.getByText('Al corriente')).toBeTruthy()
    expect(container.querySelector('.tone-success')).toBeTruthy()
  })

  it('uses the neutral muted style for the neutral tone', () => {
    const { container } = render(<StatusBadge tone="neutral">Baja</StatusBadge>)
    expect(container.querySelector('.bg-muted')).toBeTruthy()
  })
})

describe('EmptyState', () => {
  it('renders title, description and action', () => {
    render(
      <EmptyState title="Sin socios" description="Aún no hay nadie" action={<button>Añadir</button>} />,
    )
    expect(screen.getByText('Sin socios')).toBeTruthy()
    expect(screen.getByText('Aún no hay nadie')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Añadir' })).toBeTruthy()
  })
})

describe('Stat', () => {
  it('shows label, value and hint', () => {
    render(<Stat label="Socios activos" value={96} hint="esta temporada" tone="brand" />)
    expect(screen.getByText('Socios activos')).toBeTruthy()
    expect(screen.getByText('96')).toBeTruthy()
    expect(screen.getByText('esta temporada')).toBeTruthy()
  })
})

describe('Field', () => {
  it('prefers the error message over the hint', () => {
    render(
      <Field label="Email" hint="Tu correo del club" error="Email obligatorio">
        <input aria-label="Email" />
      </Field>,
    )
    expect(screen.getByText('Email obligatorio')).toBeTruthy()
    expect(screen.queryByText('Tu correo del club')).toBeNull()
  })

  it('shows the hint when there is no error', () => {
    render(
      <Field label="Teléfono" hint="Opcional" optional>
        <input aria-label="Teléfono" />
      </Field>,
    )
    expect(screen.getByText('Opcional', { selector: 'p' })).toBeTruthy()
  })
})

describe('PageHeader', () => {
  it('renders breadcrumbs, title and actions', () => {
    render(
      <PageHeader
        title="Ana Belmonte"
        breadcrumbs={[{ label: 'Socios', href: '/gestion' }, { label: 'Ana' }]}
        actions={<button>Guardar</button>}
      />,
    )
    expect(screen.getByRole('link', { name: 'Socios' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Ana Belmonte' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeTruthy()
  })
})
