import React from 'react'
import Link from 'next/link'
import { getClient } from '@/lib/payload'
import { listPublicAthletes } from '@/lib/public-athletes'
import { STANDARD_DISTANCES, distanceLabel, metersFromSlug } from '@/lib/distances'
import { formatMark } from '@/lib/marks'
import { MEMBER_CATEGORIES } from '@/collections/Members'
import { MediaImage } from '@/components/site/MediaImage'
import { EmptyState } from '@/components/ui/empty-state'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Atletas',
  description:
    'Marcas personales de los socios del Club de Running Albatera que han publicado su ficha.',
  alternates: { canonical: '/atletas' },
}

const categoryLabel = (v?: string | null) =>
  MEMBER_CATEGORIES.find((c) => c.value === v)?.label ?? null

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')

export default async function AthletesPage({
  searchParams,
}: {
  searchParams: Promise<{ distancia?: string }>
}) {
  const { distancia } = await searchParams
  const payload = await getClient()
  const athletes = await listPublicAthletes(payload)

  const meters = metersFromSlug(distancia)

  // Ranking del club para la distancia elegida: sólo quien tiene marca en ella.
  const ranking = meters
    ? athletes
        .map((a) => ({ athlete: a, best: a.bests.find((b) => b.distanceMeters === meters) }))
        .filter((r): r is { athlete: (typeof athletes)[number]; best: NonNullable<typeof r.best> } =>
          Boolean(r.best),
        )
        .sort((a, b) => a.best.markSeconds - b.best.markSeconds)
    : null

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="font-display text-4xl uppercase tracking-tight sm:text-5xl">Atletas</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Marcas personales de los socios que han querido publicar su ficha. ¿Eres socio y quieres
        aparecer?{' '}
        <Link href="/socios/perfil" className="font-semibold text-abtr-blue hover:underline">
          Actívalo en tu perfil
        </Link>
        .
      </p>

      <nav className="mt-8 flex flex-wrap gap-2" aria-label="Filtrar por distancia">
        <Link
          href="/atletas"
          className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
            !meters
              ? 'bg-foreground text-background'
              : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          }`}
        >
          Todos
        </Link>
        {STANDARD_DISTANCES.filter((d) => d.kind === 'ruta').map((d) => (
          <Link
            key={d.slug}
            href={`/atletas?distancia=${d.slug}`}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              meters === d.meters
                ? 'bg-foreground text-background'
                : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            {d.label}
          </Link>
        ))}
      </nav>

      {athletes.length === 0 ? (
        <div className="mt-12">
          <EmptyState
            title="Todavía no hay fichas públicas"
            description="Los socios pueden publicar la suya desde su perfil, con sus marcas de 5K, 10K, media y maratón."
          />
        </div>
      ) : ranking ? (
        ranking.length > 0 ? (
          <div
            className="mt-10 overflow-x-auto"
            tabIndex={0}
            role="region"
            aria-label={`Ranking del club en ${distanceLabel(meters)}`}
          >
            <table className="w-full border-collapse text-left text-sm">
              <caption className="sr-only">
                Mejores marcas del club en {distanceLabel(meters)}.
              </caption>
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th scope="col" className="py-3 pr-4 font-semibold">
                    #
                  </th>
                  <th scope="col" className="py-3 pr-4 font-semibold">
                    Atleta
                  </th>
                  <th scope="col" className="py-3 pr-4 font-semibold">
                    Marca
                  </th>
                  <th scope="col" className="py-3 font-semibold">
                    Carrera
                  </th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((row, i) => (
                  <tr key={row.athlete.id} className="border-b border-border">
                    <td className="py-3 pr-4 font-display text-lg">{i + 1}</td>
                    <td className="whitespace-nowrap py-3 pr-4 font-semibold">
                      <Link href={`/atletas/${row.athlete.slug}`} className="hover:text-abtr-blue">
                        {row.athlete.name}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap py-3 pr-4 font-mono">
                      {formatMark(row.best.markSeconds)}
                    </td>
                    <td className="py-3 text-foreground/80">{row.best.eventName ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-12">
            <EmptyState
              title={`Nadie tiene marca en ${distanceLabel(meters)} todavía`}
              description="En cuanto un socio publique la suya aparecerá aquí."
            />
          </div>
        )
      ) : (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {athletes.map((a) => (
            <Link
              key={a.id}
              href={`/atletas/${a.slug}`}
              className="rounded-2xl border border-border bg-card p-6 transition hover:border-abtr-blue"
            >
              <div className="relative mb-4 grid size-20 place-items-center overflow-hidden rounded-full bg-muted font-display text-xl text-muted-foreground">
                {a.photo ? (
                  <MediaImage media={a.photo} alt={a.name} fill sizes="80px" className="object-cover" />
                ) : (
                  initials(a.name)
                )}
              </div>
              <h2 className="font-display text-xl">{a.name}</h2>
              {categoryLabel(a.category) && (
                <p className="text-sm font-semibold text-abtr-blue">{categoryLabel(a.category)}</p>
              )}
              {a.bests.length > 0 ? (
                <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  {a.bests.slice(0, 4).map((b) => (
                    <div key={b.distanceMeters} className="flex gap-1.5">
                      <dt className="text-muted-foreground">{distanceLabel(b.distanceMeters)}</dt>
                      <dd className="font-mono font-semibold">{formatMark(b.markSeconds)}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">Sin marcas publicadas.</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
