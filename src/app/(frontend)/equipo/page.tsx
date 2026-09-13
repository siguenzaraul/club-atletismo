import React from 'react'
import Link from 'next/link'
import { getClient } from '@/lib/payload'
import { MediaImage } from '@/components/site/MediaImage'
import { EmptyState } from '@/components/ui/empty-state'
import type { Member } from '@/payload-types'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Equipo',
  description: 'Entrenadores, junta directiva y atletas del Club de Running Albatera.',
  alternates: { canonical: '/equipo' },
}

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')

export default async function TeamPage() {
  const payload = await getClient()
  const team = await payload.find({ collection: 'team', sort: 'order', limit: 200, depth: 1 })

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="font-display text-4xl uppercase tracking-tight sm:text-5xl">El equipo</h1>
      <p className="mt-3 max-w-xl text-muted-foreground">
        Entrenadores, junta directiva y atletas que forman el Club de Running Albatera. ¿Buscas
        marcas?{' '}
        <Link href="/atletas" className="font-semibold text-abtr-blue hover:underline">
          Mira las fichas de atleta
        </Link>
        .
      </p>

      {team.docs.length > 0 ? (
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {team.docs.map((m) => {
            // Enlaza a la ficha pública sólo si ese socio la ha publicado.
            const linked = m.member && typeof m.member === 'object' ? (m.member as Member) : null
            const href = linked?.publicProfile && linked.slug ? `/atletas/${linked.slug}` : null

            const card = (
              <>
                <div className="relative mb-4 grid size-20 place-items-center overflow-hidden rounded-full bg-muted font-display text-xl text-muted-foreground">
                  {m.photo && typeof m.photo === 'object' ? (
                    <MediaImage media={m.photo} alt={m.name} fill sizes="80px" className="object-cover" />
                  ) : (
                    initials(m.name)
                  )}
                </div>
                <h2 className="font-display text-xl">{m.name}</h2>
                {m.role && <p className="text-sm font-semibold text-abtr-blue">{m.role}</p>}
                {m.bio && <p className="mt-2 text-sm text-muted-foreground">{m.bio}</p>}
                {href && (
                  <p className="mt-3 text-sm font-semibold text-abtr-blue">Ver sus marcas →</p>
                )}
              </>
            )

            return href ? (
              <Link
                key={m.id}
                href={href}
                className="rounded-2xl border border-border p-6 transition hover:border-abtr-blue"
              >
                {card}
              </Link>
            ) : (
              <article key={m.id} className="rounded-2xl border border-border p-6">
                {card}
              </article>
            )
          })}
        </div>
      ) : (
        <div className="mt-12">
          <EmptyState
            title="Próximamente"
            description="Estamos preparando las fichas del equipo."
          />
        </div>
      )}
    </main>
  )
}
