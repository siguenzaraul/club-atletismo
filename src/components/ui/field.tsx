import * as React from 'react'

import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'

type FieldProps = {
  label: string
  htmlFor?: string
  hint?: string
  error?: string
  optional?: boolean
  className?: string
  children: React.ReactNode
}

/** Label + control + hint/error, the standard form row for gestión and the socio profile. */
export function Field({ label, htmlFor, hint, error, optional, className, children }: FieldProps): React.JSX.Element {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={htmlFor}>{label}</Label>
        {optional ? <span className="text-xs text-muted-foreground">Opcional</span> : null}
      </div>
      {children}
      {error ? (
        <p className="text-sm font-medium text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-sm text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}
