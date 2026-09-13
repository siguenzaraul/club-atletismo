'use client'

import React, { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { guardarStockAction, recalcularStockAction } from '@/actions/gestion'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type StockRow = {
  itemId: number
  itemName: string
  categoryName: string
  sizeId: number
  sizeLabel: string
  total: number
  delivered: number
  reserved: number
  available: number
}

export function StockTable({
  rows,
  editable,
}: {
  rows: StockRow[]
  editable: boolean
}): React.JSX.Element {
  const [busy, startTransition] = useTransition()
  const router = useRouter()
  const [drafts, setDrafts] = useState<Record<string, string>>({})

  const grouped = useMemo(() => {
    const byCategory = new Map<string, Map<string, StockRow[]>>()
    for (const row of rows) {
      const items = byCategory.get(row.categoryName) ?? new Map<string, StockRow[]>()
      const list = items.get(row.itemName) ?? []
      list.push(row)
      items.set(row.itemName, list)
      byCategory.set(row.categoryName, items)
    }
    return byCategory
  }, [rows])

  const keyOf = (row: StockRow) => `${row.itemId}:${row.sizeId}`

  const save = (row: StockRow) => {
    const raw = drafts[keyOf(row)]
    if (raw === undefined) return
    const value = Number(raw)
    startTransition(async () => {
      const res = await guardarStockAction(row.itemId, row.sizeId, value)
      if (res.ok) {
        toast.success(res.message ?? 'Stock actualizado.')
        setDrafts((d) => {
          const next = { ...d }
          delete next[keyOf(row)]
          return next
        })
        router.refresh()
      } else {
        toast.error(res.error ?? 'No se pudo guardar.')
      }
    })
  }

  const recalc = () =>
    startTransition(async () => {
      const res = await recalcularStockAction()
      if (res.ok) {
        toast.success(res.message ?? 'Stock recalculado.')
        router.refresh()
      } else {
        toast.error(res.error ?? 'No se pudo recalcular.')
      }
    })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          «Compradas» es lo único que se edita a mano. Reservadas y entregadas se recuentan solas
          desde las entregas reales.
        </p>
        <Button type="button" variant="outline" onClick={recalc} disabled={busy}>
          {busy ? 'Recalculando…' : 'Recalcular stock'}
        </Button>
      </div>

      {Array.from(grouped.entries()).map(([category, items]) => (
        <section key={category} className="flex flex-col gap-3">
          <h2 className="font-display text-2xl tracking-wide">{category}</h2>
          {Array.from(items.entries()).map(([itemName, itemRows]) => (
            <div key={itemName} className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full min-w-[34rem] text-sm">
                <caption className="border-b border-border bg-muted/40 px-4 py-2 text-left font-semibold">
                  {itemName}
                </caption>
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th scope="col" className="px-4 py-2 font-medium">Talla</th>
                    <th scope="col" className="px-4 py-2 font-medium">Compradas</th>
                    <th scope="col" className="px-4 py-2 font-medium">Reservadas</th>
                    <th scope="col" className="px-4 py-2 font-medium">Entregadas</th>
                    <th scope="col" className="px-4 py-2 font-medium">Quedan</th>
                  </tr>
                </thead>
                <tbody>
                  {itemRows.map((row) => {
                    const key = keyOf(row)
                    const draft = drafts[key]
                    const dirty = draft !== undefined && Number(draft) !== row.total
                    return (
                      <tr
                        key={key}
                        className={cn(
                          'border-b border-border last:border-0',
                          // Negativo no es un fallo: es «hay reservas que no has comprado».
                          row.available < 0 && 'bg-destructive/10',
                        )}
                      >
                        <th scope="row" className="px-4 py-2 text-left font-medium">
                          {row.sizeLabel}
                        </th>
                        <td className="px-4 py-2">
                          {editable ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min={0}
                                aria-label={`Unidades compradas de ${itemName} talla ${row.sizeLabel}`}
                                value={draft ?? String(row.total)}
                                onChange={(e) =>
                                  setDrafts((d) => ({ ...d, [key]: e.target.value }))
                                }
                                className="w-20 rounded-lg border border-input bg-background px-2 py-1 text-sm"
                              />
                              {dirty && (
                                <Button type="button" size="sm" disabled={busy} onClick={() => save(row)}>
                                  Guardar
                                </Button>
                              )}
                            </div>
                          ) : (
                            row.total
                          )}
                        </td>
                        <td className="px-4 py-2">{row.reserved}</td>
                        <td className="px-4 py-2">{row.delivered}</td>
                        <td
                          className={cn(
                            'px-4 py-2 font-semibold',
                            row.available < 0 && 'text-destructive',
                          )}
                        >
                          {row.available}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </section>
      ))}
    </div>
  )
}
