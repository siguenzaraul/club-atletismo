import React from 'react'
import type { Sponsor, Media } from '@/payload-types'

type SponsorsBlockProps = {
  sponsors: (Sponsor | number)[] | null | undefined
  title?: string
  dark?: boolean
}

const isSponsor = (s: Sponsor | number): s is Sponsor => typeof s === 'object'
const logoUrl = (logo: Sponsor['logo']): string | null =>
  logo && typeof logo === 'object' ? ((logo as Media).url ?? null) : null

const TIER_ORDER: Record<Sponsor['tier'], number> = {
  principal: 0,
  oro: 1,
  plata: 2,
  bronce: 3,
  colaborador: 4,
}

const TIER_STYLE: Record<Sponsor['tier'], { image: string; text: string }> = {
  principal: { image: 'h-20 sm:h-24', text: 'text-3xl sm:text-4xl' },
  oro: { image: 'h-16 sm:h-20', text: 'text-2xl sm:text-3xl' },
  plata: { image: 'h-14 sm:h-16', text: 'text-xl sm:text-2xl' },
  bronce: { image: 'h-12 sm:h-14', text: 'text-lg sm:text-xl' },
  colaborador: { image: 'h-9 sm:h-10', text: 'text-base sm:text-lg' },
}

/** Renders a sponsor strip. Reused on home, the race page, each event and the footer. */
export function SponsorsBlock({ sponsors, title = 'Patrocinadores', dark = false }: SponsorsBlockProps) {
  const list = (sponsors ?? [])
    .filter(isSponsor)
    .sort(
      (a, b) =>
        TIER_ORDER[a.tier] - TIER_ORDER[b.tier] ||
        a.name.localeCompare(b.name, 'es'),
    )
  if (list.length === 0) return null

  return (
    <section className={dark ? 'text-white' : 'text-abtr-ink'} aria-label={title}>
      <h2 className="mb-6 text-center text-sm font-bold uppercase tracking-widest opacity-60">
        {title}
      </h2>
      <ul className="flex flex-wrap items-end justify-center gap-x-10 gap-y-8">
        {list.map((s) => {
          const url = logoUrl(s.logo)
          const style = TIER_STYLE[s.tier]
          const content = url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt={s.name}
              className={`${style.image} max-w-[min(18rem,70vw)] w-auto object-contain`}
            />
          ) : (
            <span className={`font-display ${style.text}`}>{s.name}</span>
          )
          return (
            <li
              key={s.id}
              data-tier={s.tier}
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
