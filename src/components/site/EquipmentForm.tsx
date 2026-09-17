'use client'

import React, { useActionState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { LockIcon } from 'lucide-react'

import { updateEquipmentAction, type EquipmentResult } from '@/actions/member'
import type { GarmentOption } from '@/lib/registration-form'
import { GarmentPicker } from './GarmentPicker'
import { StatusBadge } from '@/components/ui/status-badge'
import { publicSubmitClass } from './PublicField'

export type EquipmentGarmentState = {
  garment: GarmentOption
  itemId: number | null
  sizeId: number | null
  status: string | null
  locked: boolean
  currentLabel: string | null
}

const STATUS_LABEL: Record<string, string> = {
  requested: 'En lista de espera',
  reserved: 'Reservada',
  delivered: 'Entregada',
}

export function EquipmentForm({
  garments,
  seasonName,
}: {
  garments: EquipmentGarmentState[]
  seasonName: string | null
}): React.JSX.Element {
  const [state, action, pending] = useActionState<EquipmentResult, FormData>(updateEquipmentAction, {
    ok: false,
  })
  const router = useRouter()
  const seen = useRef(state)

  useEffect(() => {
    if (state === seen.current) return
    seen.current = state
    if (state.ok && state.message) {
      toast.success(state.message)
      router.refresh()
    } else if (state.error) {
      toast.error(state.error)
    }
  }, [state, router])

  const editable = garments.filter((g) => !g.locked)

  return (
    <form action={action} className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Puedes cambiar tu elección{seasonName ? ` de la temporada ${seasonName}` : ''} mientras el
        club no te la haya entregado.
      </p>

      {garments.map((g) =>
        g.locked ? (
          <div key={g.garment.key} className="flex flex-col gap-2 rounded-xl border border-border bg-muted/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold text-foreground">{g.garment.label}</span>
              <StatusBadge tone="success">
                <LockIcon /> {STATUS_LABEL[g.status ?? ''] ?? 'Entregada'}
              </StatusBadge>
            </div>
            <p className="text-base font-semibold">{g.currentLabel ?? '—'}</p>
            <p className="text-sm text-muted-foreground">
              Ya la tienes contigo, así que este cambio pasa por el club.
            </p>
          </div>
        ) : (
          <div key={g.garment.key} className="flex flex-col gap-2">
            <GarmentPicker
              garment={g.garment}
              defaultItemId={g.itemId ? String(g.itemId) : ''}
              defaultSizeId={g.sizeId ? String(g.sizeId) : ''}
              errors={state.fieldErrors}
            />
            {g.status && (
              <p className="text-sm text-muted-foreground">
                Ahora mismo: <strong className="text-foreground">{g.currentLabel}</strong> ·{' '}
                {STATUS_LABEL[g.status] ?? g.status}
              </p>
            )}
          </div>
        ),
      )}

      {state.error && (
        <p role="alert" className="text-sm font-semibold text-destructive">
          {state.error}
        </p>
      )}

      {editable.length > 0 && (
        <button type="submit" disabled={pending} aria-busy={pending} className={publicSubmitClass}>
          {pending ? 'Guardando…' : 'Guardar mi equipación'}
        </button>
      )}
    </form>
  )
}
