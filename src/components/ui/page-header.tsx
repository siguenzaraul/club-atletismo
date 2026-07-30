import * as React from 'react'

import { cn } from '@/lib/utils'

type Crumb = { label: string; href?: string }

type PageHeaderProps = {
  title: React.ReactNode
  description?: React.ReactNode
  breadcrumbs?: Crumb[]
  actions?: React.ReactNode
  className?: string
}

/** Consistent page title block for the staff area: breadcrumbs, title and actions. */
export function PageHeader({ title, description, breadcrumbs, actions, className }: PageHeaderProps): React.JSX.Element {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {breadcrumbs?.length ? (
        <nav aria-label="Ruta" className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
          {breadcrumbs.map((c, i) => (
            <span key={`${c.label}-${i}`} className="flex items-center gap-1">
              {c.href ? (
                <a href={c.href} className="hover:text-foreground">
                  {c.label}
                </a>
              ) : (
                <span className="text-foreground">{c.label}</span>
              )}
              {i < breadcrumbs.length - 1 ? <span aria-hidden>/</span> : null}
            </span>
          ))}
        </nav>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-3xl tracking-tight uppercase sm:text-4xl">{title}</h1>
          {description ? <p className="mt-1 text-muted-foreground">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  )
}
