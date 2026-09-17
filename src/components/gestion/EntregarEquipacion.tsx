'use client'

import React, { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { PackageIcon, Trash2Icon } from 'lucide-react'

import {
  actualizarEntregaAction,
  borrarEntregaAction,
  entregarEquipacionAction,
} from '@/actions/gestion'
import { DELIVERY_STATUSES } from '@/collections/EquipmentDeliveries'
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

type Category = { id: number; name: string }
type Item = { id: number; name: string; sizeScale: number | null; category: number | null }
type Size = { id: number; label: string; scale: number | null }
type Delivery = {
  id: number
  itemName: string
  sizeLabel: string
  status: string
  categoryId: number | null
  source: string | null
}

/** Derivado de la colección: un estado nuevo ya no puede aparecer en crudo en la pantalla. */
const STATUS_LABEL: Record<string, string> = Object.fromEntries(
  DELIVERY_STATUSES.map((s) => [s.value, s.label]),
)

/** Los artículos sin tipo de prenda (los de siempre) siguen accesibles bajo este grupo. */
const UNCATEGORIZED = '0'

export function EntregarEquipacion({
  memberId,
  categories,
  items,
  sizes,
  deliveries,
  pending: pendingItems,
}: {
  memberId: number
  categories: Category[]
  items: Item[]
  sizes: Size[]
  deliveries: Delivery[]
  /** Lo que el socio eligió y aún no se ha llevado, ya descrito («Camiseta · talla M»). */
  pending: string[]
}) {
  const [categoryId, setCategoryId] = useState('')
  const [itemId, setItemId] = useState('')
  const [sizeId, setSizeId] = useState('')
  const [busy, startTransition] = useTransition()
  const router = useRouter()

  const hasUncategorized = items.some((i) => i.category == null)

  const itemsForCategory = useMemo(() => {
    if (!categoryId) return []
    if (categoryId === UNCATEGORIZED) return items.filter((i) => i.category == null)
    return items.filter((i) => i.category === Number(categoryId))
  }, [categoryId, items])

  const selectedItem = itemsForCategory.find((i) => String(i.id) === itemId)
  const availableSizes = useMemo(
    () => (selectedItem ? sizes.filter((s) => s.scale === selectedItem.sizeScale) : []),
    [selectedItem, sizes],
  )

  // Aviso antes de chocar contra el índice único: el socio ya tiene prenda viva de este tipo.
  const conflicting = useMemo(() => {
    if (!categoryId || categoryId === UNCATEGORIZED) return null
    return (
      deliveries.find(
        (d) => d.categoryId === Number(categoryId) && d.status !== 'returned',
      ) ?? null
    )
  }, [categoryId, deliveries])

  const entregar = () =>
    startTransition(async () => {
      const res = await entregarEquipacionAction(memberId, Number(itemId), Number(sizeId))
      if (res.ok) {
        toast.success(res.message ?? 'Equipación entregada.')
        setCategoryId('')
        setItemId('')
        setSizeId('')
        router.refresh()
      } else {
        toast.error(res.error ?? 'No se pudo registrar la entrega.')
      }
    })

  const marcarEntregada = (deliveryId: number) =>
    startTransition(async () => {
      const res = await actualizarEntregaAction(deliveryId, {
        status: 'delivered',
        payment: 'included',
      })
      if (res.ok) {
        toast.success(res.message ?? 'Entrega actualizada.')
        router.refresh()
      } else {
        toast.error(res.error ?? 'No se pudo actualizar.')
      }
    })

  return (
    <div className="flex flex-col gap-5">
      {pendingItems.length > 0 && (
        <div className="rounded-xl border border-abtr-yellow/50 bg-abtr-yellow/15 p-4">
          <p className="text-sm font-semibold text-foreground">Pendiente de entregarle:</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {pendingItems.map((label) => (
              <li key={label}>
                <StatusBadge tone="warning">{label}</StatusBadge>
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
                {d.source === 'registration' && d.status !== 'delivered' && (
                  <StatusBadge tone="warning">La eligió al darse de alta</StatusBadge>
                )}
                {d.status !== 'delivered' && d.status !== 'returned' && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => marcarEntregada(d.id)}
                  >
                    Marcar entregada
                  </Button>
                )}
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

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/40 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1.5 block text-sm font-medium" htmlFor="eq-category">
              Tipo de prenda
            </label>
            <NativeSelect
              id="eq-category"
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value)
                setItemId('')
                setSizeId('')
              }}
            >
              <option value="">Elige tipo…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
              {hasUncategorized && <option value={UNCATEGORIZED}>Otros</option>}
            </NativeSelect>
          </div>
          <div className="flex-1">
            <label className="mb-1.5 block text-sm font-medium" htmlFor="eq-item">
              Artículo
            </label>
            <NativeSelect
              id="eq-item"
              value={itemId}
              disabled={!categoryId}
              onChange={(e) => {
                setItemId(e.target.value)
                setSizeId('')
              }}
            >
              <option value="">{categoryId ? 'Elige artículo…' : 'Elige antes el tipo'}</option>
              {itemsForCategory.map((i) => (
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
            <NativeSelect
              id="eq-size"
              value={sizeId}
              onChange={(e) => setSizeId(e.target.value)}
              disabled={!selectedItem}
            >
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
            disabled={busy || !itemId || !sizeId || Boolean(conflicting)}
            onClick={entregar}
            className="h-10 px-6"
          >
            {busy ? 'Guardando…' : 'Entregar'}
          </Button>
        </div>

        {conflicting && (
          <p role="status" className="text-sm text-foreground/80">
            Ya tiene <strong>{conflicting.itemName}</strong>
            {conflicting.sizeLabel ? ` (talla ${conflicting.sizeLabel})` : ''} de este tipo. Cambia
            esa entrega o márcala como devuelta antes de darle otra.
          </p>
        )}
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
