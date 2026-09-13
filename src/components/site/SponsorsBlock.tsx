import React from 'react'
import {
  compareSponsors,
  displayTier,
  isActiveSponsor,
  isSponsorDoc,
  type VisibleSponsorTier,
} from '@/lib/sponsors'
import type { Sponsor, Media } from '@/payload-types'

type SponsorsBlockProps = {
  sponsors: (Sponsor | number)[] | null | undefined
  title?: string
  dark?: boolean
}

const logo = (l: Sponsor['logo']): Media | null => (l && typeof l === 'object' ? (l as Media) : null)

/** Tres tamaños para tres niveles. Los dos valores retirados se pliegan antes de llegar aquí. */
const TIER_STYLE: Record<VisibleSponsorTier, { image: string; text: string }> = {
  principal: { image: 'h-20 sm:h-24', text: 'text-3xl sm:text-4xl' },
  oro: { image: 'h-16 sm:h-20', text: 'text-2xl sm:text-3xl' },
  colaborador: { image: 'h-11 sm:h-12', text: 'text-base sm:text-lg' },
}

/** Renders a sponsor strip. Reused on home, the race page, each event and the footer. */
export function SponsorsBlock({ sponsors, title = 'Patrocinadores', dark = false }: SponsorsBlockProps) {
  const list = (sponsors ?? []).filter(isSponsorDoc).filter(isActiveSponsor).sort(compareSponsors)
  if (list.length === 0) return null

  return (
    <section className={dark ? 'text-white' : 'text-foreground'} aria-label={title}>
      <h2 className="mb-6 text-center text-sm font-bold uppercase tracking-widest opacity-60">
        {title}
      </h2>
      <ul className="flex flex-wrap items-end justify-center gap-x-10 gap-y-8">
        {list.map((s) => {
          const tier = displayTier(s.tier)
          const media = logo(s.logo)
          const style = TIER_STYLE[tier]
          const content = media?.url ? (
            // `width`/`height` vienen poblados con `depth: 1`: sin ellos el logo no reserva sitio
            // y la tira salta al cargar (CLS).
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={media.url}
              alt={s.name}
              width={media.width ?? undefined}
              height={media.height ?? undefined}
              loading="lazy"
              decoding="async"
              className={`${style.image} max-w-[min(18rem,70vw)] w-auto object-contain`}
            />
          ) : (
            <span className={`font-display ${style.text}`}>{s.name}</span>
          )
          return (
            <li
              key={s.id}
              data-tier={tier}
              className="grayscale transition hover:grayscale-0"
            >
              {s.url ? (
                <a href={s.url} target="_blank" rel="noopener noreferrer" title={s.name}>
                  {content}
                </a>
              ) : (
                content
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
