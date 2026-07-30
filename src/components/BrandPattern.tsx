import React from 'react'

type BrandPatternProps = {
  /** Size of the square module in pixels. */
  size?: number
  className?: string
  /** Light renders the top-left cell on paper; dark renders it on black. */
  variant?: 'color' | 'mono-light' | 'mono-dark'
  /** Purely ornamental use: hide from assistive tech. */
  decorative?: boolean
}

const COLORS = {
  black: '#000000',
  blue: '#009fe3',
  red: '#e30613',
  yellow: '#ffed00',
  paper: '#ffffff',
} as const

/**
 * ABTR brand mark module: a 2×2 grid of squares carrying half-circles (top row)
 * and full circles (bottom row) — the runner-in-motion motif from the manual.
 */
export function BrandPattern({ size = 64, className, variant = 'color', decorative = false }: BrandPatternProps) {
  const u = size / 2 // cell size
  const r = u / 2 // circle radius

  const cells =
    variant === 'color'
      ? { tl: COLORS.black, tlShape: COLORS.blue, tr: COLORS.blue, trShape: COLORS.black, bl: COLORS.yellow, blShape: COLORS.red, br: COLORS.red, brShape: COLORS.yellow }
      : variant === 'mono-dark'
        ? { tl: COLORS.black, tlShape: COLORS.paper, tr: COLORS.black, trShape: COLORS.paper, bl: COLORS.black, blShape: COLORS.paper, br: COLORS.black, brShape: COLORS.paper }
        : { tl: COLORS.paper, tlShape: COLORS.black, tr: COLORS.paper, trShape: COLORS.black, bl: COLORS.paper, blShape: COLORS.black, br: COLORS.paper, brShape: COLORS.black }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      {...(decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': 'Emblema ABTR' })}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* backgrounds */}
      <rect x={0} y={0} width={u} height={u} fill={cells.tl} />
      <rect x={u} y={0} width={u} height={u} fill={cells.tr} />
      <rect x={0} y={u} width={u} height={u} fill={cells.bl} />
      <rect x={u} y={u} width={u} height={u} fill={cells.br} />
      {/* top row: half circles opening downward */}
      <path d={`M0 ${u / 2} a ${r} ${r} 0 0 0 ${u} 0 Z`} fill={cells.tlShape} />
      <path d={`M${u} ${u / 2} a ${r} ${r} 0 0 0 ${u} 0 Z`} fill={cells.trShape} />
      {/* bottom row: full circles */}
      <circle cx={u / 2} cy={u + u / 2} r={r} fill={cells.blShape} />
      <circle cx={u + u / 2} cy={u + u / 2} r={r} fill={cells.brShape} />
    </svg>
  )
}
