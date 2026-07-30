import React from 'react'
import Link from 'next/link'
import { BrandPattern } from '../BrandPattern'

type LogoProps = {
  /** Tagline visibility; hidden on tight spaces. */
  withTagline?: boolean
  tagline?: string
  dark?: boolean
  size?: number
}

/** ABTR lockup: brand module + wordmark. Used in header and footer. */
export function Logo({
  withTagline = true,
  tagline = 'Club de corredores Albatera',
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
          <span className={`block text-xs font-semibold ${dark ? 'text-white/70' : 'text-muted-foreground'}`}>
            {tagline}
          </span>
        )}
      </span>
    </Link>
  )
}
