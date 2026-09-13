import React from 'react'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Esqueleto de los listados públicos.
 *
 * IMPORTANTE: sólo en segmentos SIN rutas hijas de detalle. Un `loading.tsx` envuelve todo su
 * subárbol, así que `eventos/loading.tsx` afectaría también a `eventos/[slug]`.
 * Un `loading.tsx` crea un límite de Suspense y hace que la respuesta empiece a transmitirse;
 * si la página llama luego a `notFound()`, la cabecera ya se envió y el 404 se convierte en un
 * 200 con contenido de "no encontrado" (soft 404), que Google penaliza.
 */
export function ListSkeleton({ cards = 6 }: { cards?: number }): React.JSX.Element {
  return (
    <main className="mx-auto max-w-6xl px-6 py-16" aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando…</span>
      <Skeleton className="h-12 w-64" />
      <Skeleton className="mt-4 h-5 w-full max-w-xl" />
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: cards }).map((_, i) => (
          <Skeleton key={i} className="h-56 w-full rounded-2xl" />
        ))}
      </div>
    </main>
  )
}
