import React from 'react'
import Link from 'next/link'
import { getClient } from '@/lib/payload'
import { MEMBER_CATEGORIES } from '@/collections/Members'
import { STANDARD_DISTANCES, distanceLabel, metersFromSlug } from '@/lib/distances'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import type { Where } from 'payload'
import type { Event } from '@/payload-types'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Resultados',
  description: 'Marcas y clasificaciones de las pruebas del Club de Running Albatera.',
  alternates: { canonical: '/resultados' },
}

const PAGE_SIZE = 50

const categoryLabel = (v?: string | null) =>
  MEMBER_CATEGORIES.find((c) => c.value === v)?.label ?? v ?? '—'

/** `Number('abc')` es NaN y `{ equals: NaN }` revienta en Postgres: hay que filtrarlo. */
const asId = (raw?: string | null): number | null => {
  if (!raw) return null
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : null
}

const selectClass =
  'rounded-full border border-border bg-card px-4 py-2 text-sm text-foreground'

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ evento?: string; categoria?: string; distancia?: string; page?: string }>
}) {
  const { evento, categoria, distancia, page: pageRaw } = await searchParams
  const payload = await getClient()

  const events = await payload.find({ collection: 'events', sort: '-date', limit: 100 })

  const eventId = asId(evento)
  const distanceMeters = metersFromSlug(distancia)
  const validCategory = MEMBER_CATEGORIES.some((c) => c.value === categoria) ? categoria : null

  const filters: Where[] = []
  if (eventId) filters.push({ event: { equals: eventId } })
  if (validCategory) filters.push({ category: { equals: validCategory } })
  if (distanceMeters) filters.push({ distanceMeters: { equals: distanceMeters } })
  const where: Where = filters.length > 0 ? { and: filters } : {}

  const page = Math.max(1, asId(pageRaw) ?? 1)

  const results = await payload.find({
    collection: 'results',
    where,
    // `position` es nullable: sin un segundo criterio el orden es impredecible entre motores.
    sort: ['position', 'athleteName'],
    limit: PAGE_SIZE,
    page,
    depth: 1,
  })

  const activeParams = {
    ...(evento ? { evento } : {}),
    ...(validCategory ? { categoria: validCategory } : {}),
    ...(distancia ? { distancia } : {}),
  }
  const pageHref = (n: number) =>
    `/resultados?${new URLSearchParams({ ...activeParams, page: String(n) }).toString()}`

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="font-display text-4xl uppercase tracking-tight sm:text-5xl">Resultados</h1>
      <p className="mt-3 max-w-xl text-muted-foreground">
        Marcas y clasificaciones de nuestras pruebas.
      </p>

      <form className="mt-8 flex flex-wrap items-end gap-3" method="get">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="filtro-evento" className="text-sm font-semibold text-foreground">
            Evento
          </label>
          <select id="filtro-evento" name="evento" defaultValue={evento ?? ''} className={selectClass}>
            <option value="">Todos los eventos</option>
            {events.docs.map((e: Event) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="filtro-distancia" className="text-sm font-semibold text-foreground">
            Distancia
          </label>
          <select
            id="filtro-distancia"
            name="distancia"
            defaultValue={distancia ?? ''}
            className={selectClass}
          >
            <option value="">Todas las distancias</option>
            {STANDARD_DISTANCES.map((d) => (
              <option key={d.slug} value={d.slug}>
                {d.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="filtro-categoria" className="text-sm font-semibold text-foreground">
            Categoría
          </label>
          <select
            id="filtro-categoria"
            name="categoria"
            defaultValue={validCategory ?? ''}
            className={selectClass}
          >
            <option value="">Todas las categorías</option>
            {MEMBER_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <Button type="submit" className="rounded-full">
          Filtrar
        </Button>
        {/* Segundo submit del MISMO formulario: así el CSV hereda los filtros que el usuario
            tiene puestos ahora, no los de la última navegación. Sin JavaScript. */}
        <Button type="submit" variant="outline" formAction="/resultados/descargar" className="rounded-full">
          Descargar CSV
        </Button>
      </form>

      {results.docs.length > 0 ? (
        <>
          <div
            className="mt-10 overflow-x-auto"
            tabIndex={0}
            role="region"
            aria-label="Tabla de resultados"
          >
            <table className="w-full border-collapse text-left text-sm">
              <caption className="sr-only">
                Resultados de las pruebas del club, ordenados por posición.
              </caption>
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th scope="col" className="py-3 pr-4 font-semibold">
                    Pos.
                  </th>
                  <th scope="col" className="py-3 pr-4 font-semibold">
                    Atleta
                  </th>
                  <th scope="col" className="py-3 pr-4 font-semibold">
                    Evento
                  </th>
                  <th scope="col" className="py-3 pr-4 font-semibold">
                    Distancia
                  </th>
                  <th scope="col" className="py-3 pr-4 font-semibold">
                    Categoría
                  </th>
                  <th scope="col" className="py-3 font-semibold">
                    Marca
                  </th>
                </tr>
              </thead>
              <tbody>
                {results.docs.map((r) => {
                  const ev = r.event && typeof r.event === 'object' ? r.event.title : ''
                  return (
                    <tr key={r.id} className="border-b border-border">
                      <td className="py-3 pr-4 font-display text-lg">{r.position ?? '—'}</td>
                      <td className="whitespace-nowrap py-3 pr-4 font-semibold">{r.athleteName}</td>
                      <td className="py-3 pr-4 text-foreground/80">{ev}</td>
                      <td className="whitespace-nowrap py-3 pr-4 text-foreground/80">
                        {distanceLabel(r.distanceMeters)}
                      </td>
                      <td className="whitespace-nowrap py-3 pr-4 text-foreground/80">
                        {categoryLabel(r.category)}
                      </td>
                      <td className="whitespace-nowrap py-3 font-mono">{r.mark ?? '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <nav
            className="mt-8 flex items-center justify-between gap-4 text-sm"
            aria-label="Paginación de resultados"
          >
            <p className="text-muted-foreground">
              {results.totalDocs} resultado{results.totalDocs === 1 ? '' : 's'} · página{' '}
              {results.page} de {results.totalPages}
            </p>
            <div className="flex gap-2">
              {results.hasPrevPage && (
                <Link
                  href={pageHref((results.page ?? 2) - 1)}
                  className="rounded-full border border-border px-4 py-2 font-semibold hover:bg-muted"
                >
                  ← Anterior
                </Link>
              )}
              {results.hasNextPage && (
                <Link
                  href={pageHref((results.page ?? 1) + 1)}
                  className="rounded-full border border-border px-4 py-2 font-semibold hover:bg-muted"
                >
                  Siguiente →
                </Link>
              )}
            </div>
          </nav>
        </>
      ) : (
        <div className="mt-10">
          <EmptyState
            title="No hay resultados para este filtro"
            description="Prueba a cambiar el evento, la distancia o la categoría."
          />
        </div>
      )}
    </main>
  )
}
