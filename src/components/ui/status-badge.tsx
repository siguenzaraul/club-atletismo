import * as React from 'react'

import { cn } from '@/lib/utils'

export type StatusTone = 'success' | 'warning' | 'info' | 'danger' | 'neutral'

const TONE: Record<StatusTone, string> = {
  success: 'tone-success',
  warning: 'tone-warning',
  info: 'tone-info',
  danger: 'tone-danger',
  neutral: 'border-transparent bg-muted text-muted-foreground',
}

type StatusBadgeProps = {
  tone: StatusTone
  children: React.ReactNode
  className?: string
}

/** Consistent status pill (paid, delivered, pending…) that reads well in light and dark. */
export function StatusBadge({ tone, children, className }: StatusBadgeProps): React.JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap [&>svg]:size-3.5',
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
