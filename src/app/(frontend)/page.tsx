import React from 'react'
import Link from 'next/link'
import { RichText } from '@payloadcms/richtext-lexical/react'
import { getClient } from '@/lib/payload'
import { EventCard } from '@/components/site/EventCard'
import { FeaturedRace } from '@/components/site/FeaturedRace'
import { HomeHero } from '@/components/site/HomeHero'
import { SponsorsBlock } from '@/components/site/SponsorsBlock'
import { MediaImage } from '@/components/site/MediaImage'
import type { Sponsor, Team } from '@/payload-types'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const payload = await getClient()
  const nowIso = new Date().toISOString()

  const [home, events, featuredRace, team, sponsors, mainRaceSponsors] = await Promise.all([
    payload.findGlobal({ slug: 'home-page', depth: 1 }),
    payload.find({
      collection: 'events',
      where: { date: { greater_than_equal: nowIso } },
      sort: 'date',
      limit: 3,
      depth: 1,
    }),
    payload.find({
      collection: 'events',
      where: {
        and: [{ series: { equals: 'carrera-principal' } }, { date: { greater_than_equal: nowIso } }],
      },
      sort: 'date',
      limit: 1,
      depth: 1,
    }),
    payload.find({ collection: 'team', sort: 'order', limit: 3, depth: 1 }),
    payload.find({
      collection: 'sponsors',
      where: {
        or: [
          { global: { equals: true } },
          { clubSponsor: { equals: true } },
        ],
      },
      depth: 1,
      limit: 100,
    }),
    payload.find({
      collection: 'sponsors',
      where: { mainRaceSponsor: { equals: true } },
      depth: 1,
      limit: 100,
    }),
  ])

  const nextRace = featuredRace.docs[0]
  const nextRaceSponsors = nextRace
    ? Array.from(
        new Map(
          [
            ...(Array.isArray(nextRace.sponsors)
              ? nextRace.sponsors.filter((s): s is Sponsor => typeof s === 'object')
              : []),
            ...mainRaceSponsors.docs,
          ].map((sponsor) => [sponsor.id, sponsor]),
        ).values(),
      )
    : []

  return (
    <main>
      <HomeHero
        eyebrow={home.heroEyebrow}
        title={home.heroTitle}
        subtitle={home.heroSubtitle}
        backgroundImage={home.heroImage}
        foregroundImage={home.heroForegroundImage}
        showBrandPattern={home.heroShowBrandPattern}
        theme={home.heroTheme}
        overlay={home.heroOverlay}
        align={home.heroAlign}
        height={home.heroHeight}
        primaryLabel={home.heroPrimaryLabel}
        primaryHref={home.heroPrimaryHref}
        secondaryLabel={home.heroSecondaryLabel}
        secondaryHref={home.heroSecondaryHref}
      />

      {/* Carrera principal destacada (solo si hay edición próxima) */}
      {nextRace && <FeaturedRace race={nextRace} />}
      {nextRace && nextRaceSponsors.length > 0 && (
        <section className="mx-auto -mt-6 max-w-6xl px-6 pb-16 sm:pb-20">
          <SponsorsBlock
            sponsors={nextRaceSponsors}
            title={`Patrocinadores de ${nextRace.title}`}
          />
        </section>
      )}

      {/* Sobre el club */}
      {(home.aboutTitle || home.aboutBody) && (
        <section className="mx-auto max-w-3xl px-6 py-20">
          <h2 className="font-display text-3xl sm:text-4xl">{home.aboutTitle ?? 'Sobre el club'}</h2>
          {home.aboutBody && (
            <div className="prose prose-lg mt-6 max-w-none text-abtr-ink/80">
              <RichText data={home.aboutBody} />
            </div>
          )}
        </section>
      )}

      {/* Próximos eventos */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-10 flex items-end justify-between gap-4">
          <h2 className="font-display text-3xl sm:text-4xl">Próximos eventos</h2>
          <Link href="/eventos" className="shrink-0 text-sm font-bold text-abtr-blue hover:underline">
            Ver todos →
          </Link>
        </div>
        {events.docs.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {events.docs.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        ) : (
          <p className="text-abtr-ink/60">Aún no hay eventos programados.</p>
        )}
      </section>

      {/* Equipo */}
      {team.docs.length > 0 && (
        <section className="bg-abtr-ink/[0.03] py-20">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="mb-10 font-display text-3xl sm:text-4xl">El equipo</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {team.docs.map((m: Team) => {
                const hasPhoto = m.photo && typeof m.photo === 'object'
                return (
                  <div key={m.id} className="rounded-2xl border border-border bg-card p-6">
                    <div className="relative mb-4 size-16 overflow-hidden rounded-full bg-abtr-ink/10">
                      {hasPhoto && (
                        <MediaImage
                          media={m.photo}
                          alt={m.name}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      )}
                    </div>
                    <h3 className="font-display text-lg">{m.name}</h3>
                    {m.role && <p className="text-sm text-abtr-blue">{m.role}</p>}
                    {m.bio && <p className="mt-2 text-sm text-abtr-ink/60">{m.bio}</p>}
                  </div>
                )
              })}
            </div>
            <Link href="/equipo" className="mt-8 inline-block text-sm font-bold text-abtr-blue hover:underline">
              Conoce a todo el equipo →
            </Link>
          </div>
        </section>
      )}

      {/* Patrocinadores */}
      {sponsors.docs.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 py-20">
          <SponsorsBlock sponsors={sponsors.docs} title="Patrocinadores del club" />
        </section>
      )}

      {/* CTA socio */}
      <section className="bg-abtr-blue py-20 text-white">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="font-display text-4xl uppercase tracking-tight sm:text-5xl">
            Corre con nosotros
          </h2>
          <p className="mx-auto mt-4 max-w-md text-lg text-white/80">
            Únete al Club de corredores Albatera y forma parte del movimiento.
          </p>
          <Link
            href="/hazte-socio"
            className="mt-8 inline-block rounded-full bg-white px-8 py-3 font-bold text-abtr-blue transition-opacity hover:opacity-90"
          >
            Hazte socio
          </Link>
        </div>
      </section>
    </main>
  )
}
