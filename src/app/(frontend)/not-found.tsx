import React from 'react'
import Link from 'next/link'
import { BrandPattern } from '@/components/BrandPattern'

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center band-ink px-6 py-24 text-center">
      <BrandPattern size={120} variant="mono-dark" decorative />
      <p className="mt-8 font-display text-7xl uppercase leading-none text-abtr-yellow">404</p>
      <h1 className="mt-4 font-display text-2xl uppercase tracking-tight">Esta ruta no existe</h1>
      <p className="mt-2 max-w-sm text-white/70">
        Prueba a volver a la salida y coger otro camino.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className="rounded-full bg-abtr-red px-5 py-3 font-bold hover:opacity-90">
          Inicio
        </Link>
        <Link href="/eventos" className="rounded-full border border-white/40 px-5 py-3 font-bold hover:bg-white hover:text-abtr-black">
          Eventos
        </Link>
        <Link href="/contacto" className="rounded-full border border-white/40 px-5 py-3 font-bold hover:bg-white hover:text-abtr-black">
          Contacto
        </Link>
      </div>
    </main>
  )
}
