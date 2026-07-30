import React from 'react'
import type { SelectFieldSummary } from '@/lib/attributes'

const pct = (n: number, total: number): number => (total > 0 ? Math.round((n / total) * 100) : 0)

/**
 * Breakdown of a select custom field: how many members picked each option,
 * with a proportional bar and the absolute count (what you need to buy stock).
 */
export function SelectFieldSummaryCard({ field }: { field: SelectFieldSummary }): React.JSX.Element {
  const max = Math.max(1, ...field.options.map((o) => o.count))

  return (
    <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-display text-xl">{field.label}</h2>
        <p className="text-sm text-muted-foreground">
          {field.answered} de {field.totalMembers} socios
          {field.unassigned > 0 ? ` · ${field.unassigned} sin asignar` : ''}
        </p>
      </div>

      {field.answered === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Todavía ningún socio tiene un valor en este campo.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2.5">
          {field.options.map((o) => (
            <li key={o.label} className="flex items-center gap-3">
              <span className="w-28 shrink-0 truncate text-sm font-medium sm:w-36" title={o.label}>
                {o.label}
                {!o.defined && <span className="ml-1 text-xs text-muted-foreground">(antigua)</span>}
              </span>
              <div className="relative h-7 flex-1 overflow-hidden rounded-md bg-muted">
                <div
                  className="absolute inset-y-0 left-0 rounded-md bg-primary/85"
                  style={{ width: `${(o.count / max) * 100}%` }}
                />
              </div>
              <span className="flex w-20 shrink-0 items-baseline justify-end gap-1 text-right tabular-nums">
                <span className="text-sm font-bold text-foreground">{o.count}</span>
                <span className="text-xs text-muted-foreground">{pct(o.count, field.answered)}%</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
