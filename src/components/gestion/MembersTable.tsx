'use client'

import * as React from 'react'
import type { ColumnDef } from '@tanstack/react-table'

import { cn } from '@/lib/utils'
import { StatusBadge, type StatusTone } from '@/components/ui/status-badge'
import { DataTable } from '@/components/ui/data-table'

export type MemberRow = {
  id: number
  name: string
  email: string
  categoryLabel: string
  status: 'active' | 'pending' | 'inactive'
}

const STATUS: Record<MemberRow['status'], { label: string; tone: StatusTone }> = {
  active: { label: 'Al corriente', tone: 'success' },
  pending: { label: 'Pendiente', tone: 'warning' },
  inactive: { label: 'Baja', tone: 'neutral' },
}

const FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Al corriente' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'inactive', label: 'Baja' },
] as const

function Avatar({ name }: { name: string }) {
  return (
    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/12 text-xs font-bold text-primary">
      {name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  )
}

const columns: ColumnDef<MemberRow>[] = [
  {
    accessorKey: 'name',
    header: 'Socio',
    enableHiding: false,
    cell: ({ row }) => (
      <div className="flex items-center gap-2.5">
        <Avatar name={row.original.name} />
        <div className="min-w-0 font-medium">{row.original.name}</div>
      </div>
    ),
  },
  { accessorKey: 'email', header: 'Email', cell: ({ getValue }) => (
    <span className="text-muted-foreground">{getValue<string>()}</span>
  ) },
  { accessorKey: 'categoryLabel', header: 'Categoría' },
  {
    accessorKey: 'status',
    header: 'Cuota',
    cell: ({ getValue }) => {
      const s = STATUS[getValue<MemberRow['status']>()]
      return <StatusBadge tone={s.tone}>{s.label}</StatusBadge>
    },
  },
]

const columnLabels = { name: 'Socio', email: 'Email', categoryLabel: 'Categoría', status: 'Cuota' }

export function MembersTable({ rows }: { rows: MemberRow[] }) {
  const [status, setStatus] = React.useState<(typeof FILTERS)[number]['value']>('all')

  const counts = React.useMemo(() => {
    const c: Record<string, number> = { all: rows.length, active: 0, pending: 0, inactive: 0 }
    for (const r of rows) c[r.status] = (c[r.status] ?? 0) + 1
    return c
  }, [rows])

  const filtered = React.useMemo(
    () => (status === 'all' ? rows : rows.filter((r) => r.status === status)),
    [rows, status],
  )

  return (
    <DataTable
      columns={columns}
      data={filtered}
      filterPlaceholder="Buscar por nombre o email…"
      columnLabels={columnLabels}
      emptyMessage="No hay socios que coincidan."
      onRowHref={(r) => `/gestion/${r.id}`}
      toolbar={
        <div className="flex flex-wrap items-center gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatus(f.value)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                status === f.value
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border text-muted-foreground hover:bg-muted',
              )}
            >
              {f.label}
              <span className="ml-1 tabular-nums opacity-70">{counts[f.value] ?? 0}</span>
            </button>
          ))}
        </div>
      }
    />
  )
}
