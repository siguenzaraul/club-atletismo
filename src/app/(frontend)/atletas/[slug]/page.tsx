import React from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

import { getClient } from '@/lib/payload'
import { getPublicAthleteBySlug } from '@/lib/public-athletes'
import { distanceLabel } from '@/lib/distances'
import { formatMark, formatPace } from '@/lib/marks'
import { formatDate } from '@/lib/format'
import { MEMBER_CATEGORIES } from '@/collections/Members'
import { MediaImage } from '@/components/site/MediaImage'
import { EmptyState } from '@/components/ui/empty-state'

export const dynamic = 'force-dynamic'

const categoryLabel = (v?: string | null) =>
  MEMBER_CATEGORIES.find((c) => c.value === v)?.label ?? null

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const payload = await getClient()
  const athlete = await getPublicAthleteBySlug(payload, slug)
  if (!athlete) return { title: 'Atleta no encontrado' }
  return {
    title: athlete.name,
    description: athlete.bio ?? `Marcas personales de ${athlete.name} en el Club de Running Albatera.`,
    alternates: { canonical: `/atletas/${athlete.slug}` },
    openGraph: {
      title: athlete.name,
      type: 'profile',
      ...(athlete.photo?.url ? { images: [{ url: athlete.photo.url }] } : {}),
    },
  }
}

export default async function AthletePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const payload = await getClient()
  const athlete = await getPublicAthleteBySlug(payload, slug)

  // No se distingue "no existe" de "no es público": filtrar la existencia sería una fuga.
  if (!athlete) notFound()

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link href="/atletas" className="text-sm text-muted-foreground hover:text-abtr-blue">
        ← Todos los atletas
      </Link>

      <header className="mt-6 flex flex-wrap items-center gap-6">
        <div className="relative grid size-28 shrink-0 place-items-center overflow-hidden rounded-full bg-muted font-display text-3xl text-muted-foreground">
          {athlete.photo ? (
            <MediaImage
              media={athlete.photo}
              alt={athlete.name}
              fill
              sizes="112px"
              className="object-cover"
            />
          ) : (
            initials(athlete.name)
          )}
        </div>
        <div>
          <h1 className="font-display text-4xl uppercase tracking-tight">{athlete.name}</h1>
          {categoryLabel(athlete.category) && (
            <p className="mt-1 font-semibold text-abtr-blue">{categoryLabel(athlete.category)}</p>
          )}
        </div>
      </header>

      {athlete.bio && (
        <p className="mt-8 max-w-prose text-lg leading-relaxed text-foreground/80">{athlete.bio}</p>
      )}

      <section className="mt-12">
        <h2 className="font-display text-2xl">Marcas personales</h2>
        {athlete.bests.length > 0 ? (
          <div
            className="mt-4 overflow-x-auto"
            tabIndex={0}
            role="region"
            aria-label={`Marcas personales de ${athlete.name}`}
          >
            <table className="w-full border-collapse text-left text-sm">
              <caption className="sr-only">
                Mejores marcas de {athlete.name} por distancia.
              </caption>
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th scope="col" className="py-3 pr-4 font-semibold">
                    Distancia
                  </th>
                  <th scope="col" className="py-3 pr-4 font-semibold">
                    Marca
                  </th>
                  <th scope="col" className="py-3 pr-4 font-semibold">
                    Ritmo
                  </th>
                  <th scope="col" className="py-3 pr-4 font-semibold">
                    Carrera
                  </th>
                  <th scope="col" className="py-3 font-semibold">
                    Fecha
                  </th>
                </tr>
              </thead>
              <tbody>
                {athlete.bests.map((b) => (
                  <tr key={b.distanceMeters} className="border-b border-border">
                    <td className="whitespace-nowrap py-3 pr-4 font-semibold">
                      {distanceLabel(b.distanceMeters)}
                    </td>
                    <td className="whitespace-nowrap py-3 pr-4 font-mono text-base font-semibold">
                      {formatMark(b.markSeconds)}
                    </td>
                    <td className="whitespace-nowrap py-3 pr-4 font-mono text-muted-foreground">
                      {formatPace(b.markSeconds, b.distanceMeters)}
                    </td>
                    <td className="py-3 pr-4 text-foreground/80">{b.eventName ?? '—'}</td>
                    <td className="whitespace-nowrap py-3 text-muted-foreground">
                      {b.date ? formatDate(b.date) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-4">
            <EmptyState
              title="Sin marcas publicadas todavía"
              description="Aparecerán aquí en cuanto se registren."
            />
          </div>
        )}
      </section>
    </main>
  )
}
