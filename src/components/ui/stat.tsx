import * as React from 'react'

import { cn } from '@/lib/utils'

type StatTone = 'default' | 'brand' | 'warning' | 'success' | 'danger'

const toneStyles: Record<StatTone, string> = {
  default: 'border-border bg-card',
  brand: 'border-primary/25 bg-primary/8',
  warning: 'tone-warning',
  success: 'tone-success',
  danger: 'tone-danger',
}

// Whether the value text should inherit the tone colour (coloured) or stay neutral.
const coloredValue: Record<StatTone, boolean> = {
  default: false,
  brand: false,
  warning: true,
  success: true,
  danger: true,
}

type StatProps = {
  label: string
  value: React.ReactNode
  hint?: string
  tone?: StatTone
  icon?: React.ReactNode
  className?: string
}

/** Compact KPI card used in the socio dashboard and the member file header. */
export function Stat({ label, value, hint, tone = 'default', icon, className }: StatProps): React.JSX.Element {
  return (
    <div className={cn('rounded-xl border p-3.5', toneStyles[tone], className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold tracking-wide uppercase opacity-70">{label}</span>
        {icon ? <span className="opacity-70">{icon}</span> : null}
      </div>
      <div
        className={cn(
          'mt-1 text-lg leading-tight font-bold tracking-tight',
          coloredValue[tone] ? '' : 'text-foreground',
        )}
      >
        {value}
      </div>
      {hint ? <div className="mt-0.5 text-xs opacity-70">{hint}</div> : null}
    </div>
  )
}
