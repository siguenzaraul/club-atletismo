import React from 'react'
import Link from 'next/link'
import type { Event } from '@/payload-types'
import { formatDate } from '@/lib/format'
import { BrandPattern } from '@/components/BrandPattern'
import { MediaImage } from './MediaImage'

/**
 * Home banner for the flagship race (ALBATERUN). Only rendered when there's an
 * upcoming "carrera-principal" edition, so it never shows a dead "próximamente".
 */
export function FeaturedRace({ race }: { race: Event }) {
  const hasImage = race.image && typeof race.image === 'object'

  return (
    <section className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
      <div className="grid overflow-hidden rounded-2xl border border-border bg-card shadow-sm md:grid-cols-2">
        <div className="relative aspect-[16/10] bg-abtr-black md:aspect-auto md:min-h-[360px]">
          {hasImage ? (
            <MediaImage
              media={race.image}
              alt={race.title}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <BrandPattern size={120} decorative />
            </div>
          )}
        </div>

        <div className="flex flex-col justify-center gap-4 p-8 sm:p-10 lg:p-12">
          <span className="w-fit rounded-full bg-abtr-red px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
            Carrera principal
          </span>
          <h2 className="font-display text-4xl uppercase leading-none tracking-tight text-foreground sm:text-5xl">
            {race.title}
          </h2>
          <p className="font-semibold text-abtr-blue">
            {formatDate(race.date)}
            {race.location ? <span className="text-muted-foreground"> · {race.location}</span> : null}
          </p>
          <p className="max-w-md text-muted-foreground">
            La carrera principal del Club de corredores Albatera. Una cita anual con el municipio y el
            deporte.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            {race.registrationOpen ? (
              <>
                <Link
                  href={`/hazte-socio?evento=${race.slug}`}
                  className="rounded-full bg-abtr-red px-6 py-3 font-bold text-white transition-transform hover:-translate-y-0.5 hover:opacity-95"
                >
                  Inscríbete
                </Link>
                <Link
                  href={`/eventos/${race.slug}`}
                  className="font-bold text-abtr-blue hover:underline"
                >
                  Ver detalles →
                </Link>
              </>
            ) : (
              <Link
                href={`/eventos/${race.slug}`}
                className="rounded-full bg-foreground px-6 py-3 font-bold text-background transition-transform hover:-translate-y-0.5 hover:opacity-90"
              >
                Más información
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
