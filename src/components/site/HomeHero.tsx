import React from 'react'
import Link from 'next/link'
import type { Media } from '@/payload-types'
import { BrandPattern } from '@/components/BrandPattern'
import { MediaImage } from './MediaImage'

type HeroTheme = 'dark' | 'light'
type HeroOverlay = 'none' | 'subtle' | 'medium' | 'strong'
type HeroAlign = 'left' | 'center' | 'right'
type HeroHeight = 'compact' | 'medium' | 'tall'

export type HomeHeroProps = {
  eyebrow?: string | null
  title?: string | null
  subtitle?: string | null
  backgroundImage?: number | Media | null
  foregroundImage?: number | Media | null
  showBrandPattern?: boolean | null
  theme?: HeroTheme | null
  overlay?: HeroOverlay | null
  align?: HeroAlign | null
  height?: HeroHeight | null
  primaryLabel?: string | null
  primaryHref?: string | null
  secondaryLabel?: string | null
  secondaryHref?: string | null
}

const HEIGHT: Record<HeroHeight, string> = {
  compact: 'min-h-[55vh] py-16 sm:py-20',
  medium: 'min-h-[68vh] py-24 sm:py-28',
  tall: 'min-h-[82vh] py-28 sm:py-36',
}

// Base opacity of the legibility veil, per theme + strength.
const VEIL: Record<HeroTheme, Record<HeroOverlay, number>> = {
  dark: { none: 0, subtle: 0.3, medium: 0.55, strong: 0.78 },
  light: { none: 0, subtle: 0.35, medium: 0.62, strong: 0.82 },
}

function overlayGradient(theme: HeroTheme, overlay: HeroOverlay, align: HeroAlign): string | undefined {
  const base = VEIL[theme][overlay]
  if (base === 0) return undefined
  const rgb = theme === 'dark' ? '0,0,0' : '255,255,255'
  const dir = align === 'right' ? 'to left' : align === 'center' ? 'to top' : 'to right'
  return `linear-gradient(${dir}, rgba(${rgb},${base}), rgba(${rgb},${(base * 0.35).toFixed(3)}))`
}

export function HomeHero({
  eyebrow,
  title,
  subtitle,
  backgroundImage,
  foregroundImage,
  showBrandPattern,
  theme: themeProp,
  overlay: overlayProp,
  align: alignProp,
  height: heightProp,
  primaryLabel,
  primaryHref,
  secondaryLabel,
  secondaryHref,
}: HomeHeroProps) {
  const theme: HeroTheme = themeProp ?? 'dark'
  const overlay: HeroOverlay = overlayProp ?? 'medium'
  const align: HeroAlign = alignProp ?? 'left'
  const height: HeroHeight = heightProp ?? 'medium'
  const isDark = theme === 'dark'

  const hasBg = backgroundImage && typeof backgroundImage === 'object'
  const hasForeground = foregroundImage && typeof foregroundImage === 'object'
  const showPattern = !hasForeground && showBrandPattern !== false

  const titleColor = isDark ? 'text-white' : 'text-abtr-black'
  const eyebrowColor = isDark ? 'text-abtr-yellow' : 'text-abtr-red'
  const subtitleColor = isDark ? 'text-white/85' : 'text-abtr-black/70'
  const secondaryBtn = isDark
    ? 'border-white/40 text-white hover:bg-white hover:text-abtr-black'
    : 'border-abtr-black/30 text-abtr-black hover:bg-abtr-black hover:text-white'

  const gradient = hasBg ? overlayGradient(theme, overlay, align) : undefined

  const primary = primaryLabel?.trim() ? (
    <Link
      href={primaryHref || '/'}
      className="rounded-full bg-abtr-red px-6 py-3 font-bold text-white transition-transform hover:-translate-y-0.5 hover:opacity-95"
    >
      {primaryLabel}
    </Link>
  ) : null
  const secondary = secondaryLabel?.trim() ? (
    <Link
      href={secondaryHref || '/'}
      className={`rounded-full border px-6 py-3 font-bold transition-colors ${secondaryBtn}`}
    >
      {secondaryLabel}
    </Link>
  ) : null

  const textBlock = (
    <div
      className={
        align === 'center'
          ? 'flex flex-col items-center text-center'
          : align === 'right'
            ? 'flex flex-col items-start text-left md:items-end md:text-right'
            : 'flex flex-col items-start text-left'
      }
    >
      {eyebrow?.trim() ? (
        <p className={`abtr-rise mb-4 font-semibold ${eyebrowColor}`}>{eyebrow}</p>
      ) : null}
      <h1
        className={`abtr-rise font-display text-[clamp(2.25rem,8vw,5rem)] uppercase leading-[0.95] text-balance break-words ${titleColor}`}
      >
        {title ?? 'Club de corredores Albatera'}
      </h1>
      {subtitle?.trim() ? (
        <p className={`abtr-rise-2 mt-6 max-w-md text-lg ${subtitleColor}`}>{subtitle}</p>
      ) : null}
      {(primary || secondary) && (
        <div
          className={`abtr-rise-2 mt-8 flex flex-wrap gap-3 ${
            align === 'center' ? 'justify-center' : align === 'right' ? 'md:justify-end' : ''
          }`}
        >
          {primary}
          {secondary}
        </div>
      )}
    </div>
  )

  const foregroundNode = hasForeground ? (
    <MediaImage
      media={foregroundImage}
      alt={title ?? ''}
      className="h-auto w-full max-w-sm rounded-2xl object-cover shadow-2xl"
      sizes="(max-width: 768px) 90vw, 40vw"
    />
  ) : null

  return (
    <section
      className={`relative overflow-hidden ${HEIGHT[height]} ${!hasBg ? (isDark ? 'bg-abtr-black' : 'bg-background') : ''}`}
    >
      {hasBg && (
        <MediaImage
          media={backgroundImage}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      )}
      {gradient && <div className="absolute inset-0" style={{ backgroundImage: gradient }} />}

      <div className="relative mx-auto flex h-full max-w-6xl items-center px-6">
        {align === 'center' ? (
          <div className="mx-auto flex max-w-3xl flex-col items-center">
            {foregroundNode ? (
              <div className="abtr-rise mb-8 w-full max-w-xs">{foregroundNode}</div>
            ) : showPattern ? (
              <div className="abtr-rise mb-8">
                <BrandPattern size={160} />
              </div>
            ) : null}
            {textBlock}
          </div>
        ) : (
          <div
            className={`grid w-full items-center gap-10 ${
              align === 'right' ? 'md:grid-cols-[1fr_1.4fr]' : 'md:grid-cols-[1.4fr_1fr]'
            }`}
          >
            <div className={align === 'right' ? 'md:order-2' : 'md:order-1'}>{textBlock}</div>
            {(foregroundNode || showPattern) && (
              <div
                className={`${align === 'right' ? 'md:order-1' : 'md:order-2'} ${
                  foregroundNode ? 'flex justify-center md:justify-end' : 'hidden justify-self-center md:block'
                }`}
              >
                {foregroundNode ?? <BrandPattern size={260} />}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
