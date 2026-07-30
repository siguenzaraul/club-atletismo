import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import type { ColumnDef } from '@tanstack/react-table'

import { DataTable } from '@/components/ui/data-table'

afterEach(cleanup)

type Row = { name: string; status: string }

const columns: ColumnDef<Row>[] = [
  { accessorKey: 'name', header: 'Nombre' },
  { accessorKey: 'status', header: 'Estado' },
]

const data: Row[] = [
  { name: 'Ana Belmonte', status: 'Pendiente' },
  { name: 'Carlos Ruiz', status: 'Al corriente' },
  { name: 'Diego Sáez', status: 'Exenta' },
]

describe('DataTable', () => {
  it('paginates: shows the first page and a range summary', () => {
    render(<DataTable columns={columns} data={data} pageSize={2} filterPlaceholder="Buscar…" />)
    expect(screen.getByText('Ana Belmonte')).toBeTruthy()
    expect(screen.getByText('Carlos Ruiz')).toBeTruthy()
    // Third row is on page 2.
    expect(screen.queryByText('Diego Sáez')).toBeNull()
    expect(screen.getByText('1–2 de 3')).toBeTruthy()
  })

  it('advances to the next page', () => {
    render(<DataTable columns={columns} data={data} pageSize={2} />)
    fireEvent.click(screen.getByRole('button', { name: 'Página siguiente' }))
    expect(screen.getByText('Diego Sáez')).toBeTruthy()
    expect(screen.getByText('3–3 de 3')).toBeTruthy()
  })

  it('filters rows with the search box', () => {
    render(<DataTable columns={columns} data={data} filterPlaceholder="Buscar…" />)
    fireEvent.change(screen.getByLabelText('Buscar…'), { target: { value: 'Ana' } })
    expect(screen.getByText('Ana Belmonte')).toBeTruthy()
    expect(screen.queryByText('Carlos Ruiz')).toBeNull()
    expect(screen.getByText('1–1 de 1')).toBeTruthy()
  })
})
