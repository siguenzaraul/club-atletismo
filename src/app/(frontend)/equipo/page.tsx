import React from 'react'
import { getClient } from '@/lib/payload'
import type { Media } from '@/payload-types'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Equipo | ABTR' }

export default async function TeamPage() {
  const payload = await getClient()
  const team = await payload.find({ collection: 'team', sort: 'order', limit: 200, depth: 1 })

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="font-display text-4xl uppercase tracking-tight sm:text-5xl">El equipo</h1>
      <p className="mt-3 max-w-xl text-abtr-ink/60">
        Entrenadores, junta directiva y atletas que forman el Club de corredores Albatera.
      </p>

      {team.docs.length > 0 ? (
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {team.docs.map((m) => {
            const photo = m.photo && typeof m.photo === 'object' ? (m.photo as Media).url : null
            return (
              <article key={m.id} className="rounded-2xl border border-abtr-ink/10 p-6">
                <div className="mb-4 size-20 overflow-hidden rounded-full bg-abtr-ink/10">
                  {photo && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photo} alt={m.name} className="h-full w-full object-cover" />
                  )}
                </div>
                <h2 className="font-display text-xl">{m.name}</h2>
                {m.role && <p className="text-sm font-semibold text-abtr-blue">{m.role}</p>}
                {m.bio && <p className="mt-2 text-sm text-abtr-ink/60">{m.bio}</p>}
              </article>
            )
          })}
        </div>
      ) : (
        <p className="mt-10 text-abtr-ink/60">Próximamente.</p>
      )}
    </main>
  )
}
