'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CheckIcon } from 'lucide-react'

import { saveCuotaAction } from '@/actions/gestion'
import { cn } from '@/lib/utils'
import { Field } from '@/components/ui/field'
import { NativeSelect } from '@/components/ui/native-select'
import { Button } from '@/components/ui/button'

type PaymentStatus = 'paid' | 'pending' | 'exempt'

const OPTIONS: { value: PaymentStatus; label: string; active: string }[] = [
  { value: 'paid', label: 'Pagada', active: 'bg-abtr-success text-white border-abtr-success' },
  { value: 'pending', label: 'Pendiente', active: 'bg-abtr-yellow text-abtr-black border-abtr-yellow' },
  { value: 'exempt', label: 'Exenta (no paga)', active: 'bg-foreground text-background border-foreground' },
]

export function CuotaControls({
  memberId,
  current,
  currentTypeId,
  membershipTypes,
}: {
  memberId: number
  current: PaymentStatus | null
  currentTypeId: number | null
  membershipTypes: { id: number; name: string }[]
}) {
  const [pending, startTransition] = useTransition()
  const [typeId, setTypeId] = useState<string>(currentTypeId ? String(currentTypeId) : '')
  const router = useRouter()

  const apply = (status: PaymentStatus) =>
    startTransition(async () => {
      const res = await saveCuotaAction(memberId, status, typeId ? Number(typeId) : null)
      if (res.ok) {
        toast.success(res.message ?? 'Cuota actualizada.')
        router.refresh()
      } else {
        toast.error(res.error ?? 'No se pudo actualizar.')
      }
    })

  return (
    <div className="flex flex-col gap-4">
      <Field label="Tipo de socio" htmlFor="cuota-tipo" className="max-w-xs">
        <NativeSelect id="cuota-tipo" value={typeId} onChange={(e) => setTypeId(e.target.value)}>
          <option value="">Sin asignar</option>
          {membershipTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </NativeSelect>
      </Field>

      <div>
        <p className="mb-2 text-sm font-medium text-foreground">Estado de la cuota</p>
        <div className="flex flex-wrap gap-2">
          {OPTIONS.map((o) => {
            const isCurrent = current === o.value
            return (
              <Button
                key={o.value}
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => apply(o.value)}
                aria-pressed={isCurrent}
                className={cn('h-10 rounded-full px-5', isCurrent && o.active)}
              >
                {isCurrent ? <CheckIcon /> : null}
                {o.label}
              </Button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
