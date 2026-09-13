'use client'

import React, { useState, useTransition } from 'react'

import { backfillResultsAction, type BackfillResult } from '@/actions/gestion'
import { Button } from '@/components/ui/button'
import { Stat } from '@/components/ui/stat'

export function BackfillResultsPanel(): React.JSX.Element {
  const [state, setState] = useState<BackfillResult | null>(null)
  const [pending, startTransition] = useTransition()

  const run = (dryRun: boolean) =>
    startTransition(async () => {
      setState(await backfillResultsAction(dryRun))
    })

  const done = state?.ok && !state.dryRun && state.restantes === 0

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-muted-foreground">
        Los resultados creados antes de que existieran la distancia y la marca en segundos están
        sin normalizar. Hasta que se normalicen no cuentan para las marcas personales ni para el
        ranking del club. Esta herramienta los repasa por lotes de 200 y{' '}
        <strong>se puede ejecutar tantas veces como haga falta</strong>: sólo toca lo que aún no
        está hecho.
      </p>

      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="outline" onClick={() => run(true)} disabled={pending}>
          {pending ? 'Comprobando…' : 'Comprobar (sin cambiar nada)'}
        </Button>
        <Button type="button" onClick={() => run(false)} disabled={pending}>
          {pending ? 'Normalizando…' : state && !state.dryRun ? 'Continuar' : 'Normalizar ahora'}
        </Button>
      </div>

      {state?.error && (
        <p role="alert" className="text-sm font-semibold text-destructive">
          {state.error}
        </p>
      )}

      {state?.ok && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Normalizados en esta pasada" value={state.procesados} />
          <Stat
            label="Pendientes"
            value={state.restantes}
            tone={state.restantes > 0 ? 'warning' : 'success'}
          />
          <Stat
            label="Marcas que no se entienden"
            value={state.sinMarcaValida}
            tone={state.sinMarcaValida > 0 ? 'warning' : 'default'}
            hint={state.sinMarcaValida > 0 ? 'Corrígelas a mano en el panel' : undefined}
          />
        </div>
      )}

      {done && (
        <p role="status" className="text-sm font-semibold text-abtr-blue">
          Todo normalizado. Las marcas personales ya se calculan solas.
        </p>
      )}
    </div>
  )
}
