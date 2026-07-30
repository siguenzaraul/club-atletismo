import React from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { RichText } from '@payloadcms/richtext-lexical/react'
import { getClient } from '@/lib/payload'
import { SponsorsBlock } from '@/components/site/SponsorsBlock'
import { formatDateTime, seriesColor, seriesLabel } from '@/lib/format'
import { MediaImage } from '@/components/site/MediaImage'
import type { Media, Sponsor } from '@/payload-types'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const payload = await getClient()
  const res = await payload.find({ collection: 'events', where: { slug: { equals: slug } }, depth: 1, limit: 1 })
  const event = res.docs[0]
  if (!event) return { title: 'Evento no encontrado | ABTR' }
  const description = `${formatDateTime(event.date)}${event.location ? ` · ${event.location}` : ''}`
  const image = event.image && typeof event.image === 'object' ? (event.image as Media).url : undefined
  return {
    title: `${event.title} | ABTR`,
    description,
    openGraph: { title: event.title, description, images: image ? [image] : undefined },
  }
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const payload = await getClient()
  const res = await payload.find({
    collection: 'events',
    where: { slug: { equals: slug } },
    depth: 2,
    limit: 1,
  })
  const event = res.docs[0]
  if (!event) notFound()

  const hasImage = event.image && typeof event.image === 'object'
  let automaticMainRaceSponsors: Sponsor[] = []
  if (event.series === 'carrera-principal') {
    const activeRace = await payload.find({
      collection: 'events',
      where: {
        and: [
          { series: { equals: 'carrera-principal' } },
          { date: { greater_than_equal: new Date().toISOString() } },
        ],
      },
      sort: 'date',
      depth: 0,
      limit: 1,
    })
    if (activeRace.docs[0]?.id === event.id) {
      const sponsors = await payload.find({
        collection: 'sponsors',
        where: { mainRaceSponsor: { equals: true } },
        depth: 1,
        limit: 100,
      })
      automaticMainRaceSponsors = sponsors.docs
    }
  }
  const eventSponsors = Array.from(
    new Map(
      [
        ...(Array.isArray(event.sponsors)
          ? event.sponsors.filter((s): s is Sponsor => typeof s === 'object')
          : []),
        ...automaticMainRaceSponsors,
      ].map((sponsor) => [sponsor.id, sponsor]),
    ).values(),
  )

  return (
    <main>
      <section className="bg-abtr-black text-white">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <Link href="/eventos" className="text-sm text-white/60 hover:text-white">
            ← Eventos
          </Link>
          <span
            className={`mt-6 inline-block rounded-full px-3 py-1 text-xs font-bold ${seriesColor(event.series)}`}
          >
            {seriesLabel(event.series)}
          </span>
          <h1 className="mt-4 font-display text-4xl uppercase tracking-tight sm:text-6xl">
            {event.title}
          </h1>
          <p className="mt-4 text-lg text-white/70">
            {formatDateTime(event.date)}
            {event.location ? ` · ${event.location}` : ''}
          </p>
          {event.registrationOpen && (
            <Link
              href={`/hazte-socio?evento=${event.slug}`}
              className="mt-8 inline-block rounded-full bg-abtr-red px-6 py-3 font-bold transition-opacity hover:opacity-90"
            >
              Inscríbete
            </Link>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-6 py-14">
        {hasImage && (
          <MediaImage
            media={event.image}
            alt={event.title}
            sizes="(max-width: 896px) 100vw, 896px"
            className="mb-10 h-auto w-full rounded-2xl object-cover"
          />
        )}
        {event.description && (
          <div className="prose prose-lg max-w-none">
            <RichText data={event.description} />
          </div>
        )}

        {eventSponsors.length > 0 && (
          <div className="mt-16 border-t border-abtr-ink/10 pt-12">
            <SponsorsBlock sponsors={eventSponsors} title="Patrocinadores de esta carrera" />
          </div>
        )}
      </div>
    </main>
  )
}
