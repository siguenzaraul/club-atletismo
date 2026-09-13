import React from 'react'
import Link from 'next/link'
import type { Event } from '@/payload-types'
import { formatDate, seriesColor, seriesLabel } from '@/lib/format'
import { MediaImage } from './MediaImage'

export function EventCard({ event }: { event: Event }) {
  const hasImage = event.image && typeof event.image === 'object'

  return (
    <Link
      href={`/eventos/${event.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition hover:border-foreground/30 hover:shadow-lg"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        {hasImage ? (
          <MediaImage
            media={event.image}
            alt={event.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center font-display text-3xl text-muted-foreground/50">
            ABTR
          </div>
        )}
        <span
          className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-bold ${seriesColor(event.series)}`}
        >
          {seriesLabel(event.series)}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <time className="text-sm font-semibold text-abtr-blue">{formatDate(event.date)}</time>
        <h3 className="font-display text-xl leading-tight">{event.title}</h3>
        {event.location && <p className="text-sm text-muted-foreground">{event.location}</p>}
        {event.registrationOpen && (
          <span className="mt-auto pt-2 text-sm font-bold text-destructive">Inscripciones abiertas →</span>
        )}
      </div>
    </Link>
  )
}
