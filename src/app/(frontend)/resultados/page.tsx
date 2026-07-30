import React from 'react'
import { getClient } from '@/lib/payload'
import { MEMBER_CATEGORIES } from '@/collections/Members'
import type { Where } from 'payload'
import type { Event } from '@/payload-types'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Resultados | ABTR' }

const categoryLabel = (v?: string | null) =>
  MEMBER_CATEGORIES.find((c) => c.value === v)?.label ?? v ?? '—'

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ evento?: string; categoria?: string }>
}) {
  const { evento, categoria } = await searchParams
  const payload = await getClient()

  const events = await payload.find({ collection: 'events', sort: '-date', limit: 100 })

  const where: Where = {}
  if (evento) where.event = { equals: Number(evento) }
  if (categoria) where.category = { equals: categoria }

  const results = await payload.find({
    collection: 'results',
    where,
    sort: 'position',
    limit: 500,
    depth: 1,
  })

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="font-display text-4xl uppercase tracking-tight sm:text-5xl">Resultados</h1>
      <p className="mt-3 max-w-xl text-abtr-ink/60">Marcas y clasificaciones de nuestras pruebas.</p>

      <form className="mt-8 flex flex-wrap gap-3" method="get">
        <select
          name="evento"
          defaultValue={evento ?? ''}
          className="rounded-full border border-border bg-card px-4 py-2 text-sm text-foreground"
        >
          <option value="">Todos los eventos</option>
          {events.docs.map((e: Event) => (
            <option key={e.id} value={e.id}>
              {e.title}
            </option>
          ))}
        </select>
        <select
          name="categoria"
          defaultValue={categoria ?? ''}
          className="rounded-full border border-border bg-card px-4 py-2 text-sm text-foreground"
        >
          <option value="">Todas las categorías</option>
          {MEMBER_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-full bg-abtr-black px-5 py-2 text-sm font-bold text-white"
        >
          Filtrar
        </button>
        <a
          href={`/resultados/descargar?${new URLSearchParams({ ...(evento ? { evento } : {}), ...(categoria ? { categoria } : {}) }).toString()}`}
          className="rounded-full border border-abtr-ink/20 px-5 py-2 text-sm font-bold hover:bg-abtr-ink/5"
        >
          Descargar CSV
        </a>
      </form>

      {results.docs.length > 0 ? (
        <div className="mt-10 overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-abtr-ink/15 text-abtr-ink/60">
                <th className="py-3 pr-4 font-semibold">Pos.</th>
                <th className="py-3 pr-4 font-semibold">Atleta</th>
                <th className="py-3 pr-4 font-semibold">Evento</th>
                <th className="py-3 pr-4 font-semibold">Categoría</th>
                <th className="py-3 font-semibold">Marca</th>
              </tr>
            </thead>
            <tbody>
              {results.docs.map((r) => {
                const ev = r.event && typeof r.event === 'object' ? r.event.title : ''
                return (
                  <tr key={r.id} className="border-b border-abtr-ink/5">
                    <td className="py-3 pr-4 font-display text-lg">{r.position ?? '—'}</td>
                    <td className="whitespace-nowrap py-3 pr-4 font-semibold">{r.athleteName}</td>
                    <td className="py-3 pr-4 text-abtr-ink/70">{ev}</td>
                    <td className="whitespace-nowrap py-3 pr-4 text-abtr-ink/70">{categoryLabel(r.category)}</td>
                    <td className="whitespace-nowrap py-3 font-mono">{r.mark ?? '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-10 text-abtr-ink/60">No hay resultados para este filtro.</p>
      )}
    </main>
  )
}
