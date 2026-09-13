'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { sembrarTallasAction, type StaffResult } from '@/actions/gestion'
import { Button } from '@/components/ui/button'
import { STANDARD_SIZES } from '@/lib/sizes'

export function SembrarTallasPanel(): React.JSX.Element {
  const [state, setState] = useState<StaffResult | null>(null)
  const [busy, startTransition] = useTransition()
  const router = useRouter()

  const run = () =>
    startTransition(async () => {
      const res = await sembrarTallasAction()
      setState(res)
      if (res.ok) router.refresh()
    })

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-muted-foreground">
        Crea las tallas <strong>{STANDARD_SIZES.join(' · ')}</strong> que falten en la escala de
        ropa. <strong>No borra, no renombra y no desactiva nada</strong>: si ya tienes una talla
        escrita de otra forma (por ejemplo «2XL» en vez de «XXL») la reconoce y no la duplica. Para
        dejar de ofrecer una talla, desactívala desde Configuración → Tallas.
      </p>

      <div>
        <Button type="button" onClick={run} disabled={busy}>
          {busy ? 'Creando…' : 'Crear tallas estándar que falten'}
        </Button>
      </div>

      {state?.error && (
        <p role="alert" className="text-sm font-semibold text-destructive">
          {state.error}
        </p>
      )}
      {state?.ok && state.message && (
        <p role="status" className="text-sm font-semibold text-abtr-blue">
          {state.message}
        </p>
      )}
    </div>
  )
}
