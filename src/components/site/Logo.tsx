import React from 'react'
import Link from 'next/link'
import { BrandPattern } from '../BrandPattern'
import { cn } from '@/lib/utils'

type LogoProps = {
  /** Tagline visibility; hidden on tight spaces. */
  withTagline?: boolean
  tagline?: string
  /** Extra classes for the tagline (e.g. to hide it responsively in the header). */
  taglineClassName?: string
  dark?: boolean
  size?: number
}

/** ABTR lockup: brand module + wordmark. Used in header and footer. */
export function Logo({
  withTagline = true,
  tagline = 'Club de Running Albatera',
  taglineClassName,
  dark = false,
  size = 44,
}: LogoProps) {
  return (
    <Link href="/" className="flex items-center gap-3" aria-label="ABTR — inicio">
      <BrandPattern size={size} variant={dark ? 'mono-dark' : 'color'} />
      <span className="leading-none">
        <span
          className={`block font-display text-2xl font-extrabold tracking-tight ${dark ? 'text-white' : 'text-foreground'}`}
        >
          ABTR
        </span>
        {withTagline && (
          <span
            className={cn(
              'block text-xs font-semibold',
              dark ? 'text-white/70' : 'text-muted-foreground',
              taglineClassName,
            )}
          >
            {tagline}
          </span>
        )}
      </span>
    </Link>
  )
}
