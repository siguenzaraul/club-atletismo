'use client'

import React, { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { PackageIcon, Trash2Icon } from 'lucide-react'

import { entregarEquipacionAction, borrarEntregaAction } from '@/actions/gestion'
import { NativeSelect } from '@/components/ui/native-select'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import { EmptyState } from '@/components/ui/empty-state'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

type Item = { id: number; name: string; sizeScale: number | null }
type Size = { id: number; label: string; scale: number | null }
type Delivery = { id: number; itemName: string; sizeLabel: string; status: string }
type PendingItem = { itemId: number; itemName: string }

const STATUS_LABEL: Record<string, string> = {
  requested: 'Solicitada',
  reserved: 'Reservada',
  delivered: 'Entregada',
  returned: 'Devuelta',
}

export function EntregarEquipacion({
  memberId,
  items,
  sizes,
  deliveries,
  pending: pendingItems,
}: {
  memberId: number
  items: Item[]
  sizes: Size[]
  deliveries: Delivery[]
  pending: PendingItem[]
}) {
  const [itemId, setItemId] = useState('')
  const [sizeId, setSizeId] = useState('')
  const [busy, startTransition] = useTransition()
  const router = useRouter()

  const selectedItem = items.find((i) => String(i.id) === itemId)
  const availableSizes = useMemo(
    () => (selectedItem ? sizes.filter((s) => s.scale === selectedItem.sizeScale) : []),
    [selectedItem, sizes],
  )

  const entregar = () =>
    startTransition(async () => {
      const res = await entregarEquipacionAction(memberId, Number(itemId), Number(sizeId))
      if (res.ok) {
        toast.success(res.message ?? 'Equipación entregada.')
        setItemId('')
        setSizeId('')
        router.refresh()
      } else {
        toast.error(res.error ?? 'No se pudo registrar la entrega.')
      }
    })

  return (
    <div className="flex flex-col gap-5">
      {pendingItems.length > 0 && (
        <div className="rounded-xl border border-abtr-yellow/50 bg-abtr-yellow/15 p-4">
          <p className="text-sm font-semibold text-foreground">Le falta por recoger esta temporada:</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {pendingItems.map((p) => (
              <li key={p.itemId}>
                <StatusBadge tone="warning">{p.itemName}</StatusBadge>
              </li>
            ))}
          </ul>
        </div>
      )}

      {deliveries.length > 0 ? (
        <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
          {deliveries.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <span className="font-medium">
                  {d.itemName}
                  {d.sizeLabel ? <span className="text-muted-foreground"> · talla {d.sizeLabel}</span> : null}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge tone={d.status === 'delivered' ? 'success' : 'neutral'}>
                  {STATUS_LABEL[d.status] ?? d.status}
                </StatusBadge>
                <DeleteDeliveryButton
                  label={`${d.itemName}${d.sizeLabel ? ` · talla ${d.sizeLabel}` : ''}`}
                  onConfirm={() =>
                    new Promise<boolean>((resolve) =>
                      startTransition(async () => {
                        const res = await borrarEntregaAction(d.id)
                        if (res.ok) {
                          toast.success(res.message ?? 'Entrega eliminada.')
                          router.refresh()
                          resolve(true)
                        } else {
                          toast.error(res.error ?? 'No se pudo borrar.')
                          resolve(false)
                        }
                      }),
                    )
                  }
                  busy={busy}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={<PackageIcon className="size-5" />}
          title="Todavía no se le ha entregado nada"
          description="Registra la primera entrega abajo; el stock se descuenta solo."
        />
      )}

      <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/40 p-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="mb-1.5 block text-sm font-medium" htmlFor="eq-item">
            Artículo
          </label>
          <NativeSelect
            id="eq-item"
            value={itemId}
            onChange={(e) => {
              setItemId(e.target.value)
              setSizeId('')
            }}
          >
            <option value="">Elige artículo…</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex-1">
          <label className="mb-1.5 block text-sm font-medium" htmlFor="eq-size">
            Talla
          </label>
          <NativeSelect id="eq-size" value={sizeId} onChange={(e) => setSizeId(e.target.value)} disabled={!selectedItem}>
            <option value="">Elige talla…</option>
            {availableSizes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </NativeSelect>
        </div>
        <Button
          type="button"
          disabled={busy || !itemId || !sizeId}
          onClick={entregar}
          className="h-10 px-6"
        >
          {busy ? 'Guardando…' : 'Entregar'}
        </Button>
      </div>
    </div>
  )
}

function DeleteDeliveryButton({
  label,
  onConfirm,
  busy,
}: {
  label: string
  onConfirm: () => Promise<boolean>
  busy: boolean
}) {
  const [open, setOpen] = useState(false)
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label={`Quitar ${label}`}>
            <Trash2Icon />
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Quitar esta entrega?</AlertDialogTitle>
          <AlertDialogDescription>
            Se eliminará «{label}» y el stock volverá a sumarse. Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={busy}
            onClick={async () => {
              const ok = await onConfirm()
              if (ok) setOpen(false)
            }}
          >
            Sí, quitar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
