import React from 'react'
import Link from 'next/link'
import { getClient } from '@/lib/payload'
import { EventCard } from '@/components/site/EventCard'
import { seriesLabel } from '@/lib/format'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Eventos',
  description:
    'Carreras propias, Social Runs, eventos de club y pruebas externas del Club de Running Albatera.',
  // Los filtros van por querystring: sin canonical, cada combinación es contenido duplicado.
  alternates: { canonical: '/eventos' },
}

const FILTERS = [
  { value: '', label: 'Todos' },
  { value: 'carrera-principal', label: 'Carrera' },
  { value: 'social-run', label: 'Social Runs' },
  { value: 'club', label: 'Club' },
  { value: 'carrera-externa', label: 'Carreras externas' },
]

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ serie?: string }>
}) {
  const { serie } = await searchParams
  const payload = await getClient()
  const events = await payload.find({
    collection: 'events',
    where: serie ? { series: { equals: serie } } : {},
    sort: 'date',
    limit: 100,
    depth: 1,
  })

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="font-display text-4xl uppercase tracking-tight sm:text-5xl">Eventos</h1>
      <p className="mt-3 max-w-xl text-muted-foreground">
        Carreras propias, Social Runs, eventos de club y pruebas externas a las que vamos juntos.{' '}
        {serie && `Filtrando: ${seriesLabel(serie)}.`}
      </p>

      <nav className="mt-8 flex flex-wrap gap-2" aria-label="Filtrar por tipo">
        {FILTERS.map((f) => {
          const active = (serie ?? '') === f.value
          return (
            <Link
              key={f.value}
              href={f.value ? `/eventos?serie=${f.value}` : '/eventos'}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                active ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              {f.label}
            </Link>
          )
        })}
      </nav>

      {events.docs.length > 0 ? (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {events.docs.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </div>
      ) : (
        <p className="mt-10 text-muted-foreground">No hay eventos para este filtro.</p>
      )}
    </main>
  )
}
