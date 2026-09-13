'use client'

import React, { useState, useTransition } from 'react'

import { backfillMembershipsAction, type MembershipBackfillResult } from '@/actions/gestion'
import { Button } from '@/components/ui/button'
import { Stat } from '@/components/ui/stat'

export function BackfillMembershipsPanel(): React.JSX.Element {
  const [state, setState] = useState<MembershipBackfillResult | null>(null)
  const [pending, startTransition] = useTransition()

  const run = (dryRun: boolean) =>
    startTransition(async () => {
      setState(await backfillMembershipsAction(dryRun))
    })

  const done = state?.ok && !state.dryRun && state.restantes === 0

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-muted-foreground">
        Al darse de alta, la cuota pendiente se abre justo después de crear la cuenta. Si la base
        de datos falla en ese instante, el socio entra igual pero se queda sin cuota de esta
        temporada. Esta herramienta se la abre a todo el que le falte, en estado{' '}
        <strong>pendiente</strong>, y <strong>se puede ejecutar tantas veces como haga falta</strong>
        : sólo toca a quien no la tiene.
      </p>

      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="outline" onClick={() => run(true)} disabled={pending}>
          {pending ? 'Comprobando…' : 'Comprobar (sin cambiar nada)'}
        </Button>
        <Button type="button" onClick={() => run(false)} disabled={pending}>
          {pending ? 'Abriendo cuotas…' : state && !state.dryRun ? 'Continuar' : 'Abrir cuotas'}
        </Button>
      </div>

      {state?.error && (
        <p role="alert" className="text-sm font-semibold text-destructive">
          {state.error}
        </p>
      )}

      {state?.ok && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Temporada" value={state.season ?? '—'} />
          <Stat label="Cuotas abiertas ahora" value={state.creadas} />
          <Stat
            label="Socios sin cuota"
            value={state.restantes}
            tone={state.restantes > 0 ? 'warning' : 'success'}
          />
        </div>
      )}

      {done && (
        <p role="status" className="text-sm font-semibold text-abtr-blue">
          Todos los socios tienen su cuota de la temporada.
        </p>
      )}
    </div>
  )
}
