'use client'

import React, { useEffect } from 'react'
import Link from 'next/link'

/**
 * Con todas las páginas en `force-dynamic` y Neon (cold start, límite de conexiones), un fallo
 * de base de datos mostraba la pantalla genérica de Next: sin marca, sin salida y sin reintento.
 */
export default function FrontendError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center band-ink px-6 py-24 text-center">
      <p className="font-semibold uppercase tracking-[0.2em] text-abtr-yellow">Vaya</p>
      <h1 className="mt-4 font-display text-4xl uppercase sm:text-5xl">Algo se ha torcido</h1>
      <p className="mt-4 max-w-md text-white/70">
        No hemos podido cargar esta página. Suele ser algo puntual: prueba a reintentar.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-abtr-red px-6 py-3 font-bold text-white transition-opacity hover:opacity-90"
        >
          Reintentar
        </button>
        <Link
          href="/"
          className="rounded-full border border-white/40 px-6 py-3 font-bold text-white transition-colors hover:bg-white hover:text-abtr-black"
        >
          Ir al inicio
        </Link>
      </div>
      {error.digest && <p className="mt-8 font-mono text-xs text-white/40">ref: {error.digest}</p>}
    </main>
  )
}
