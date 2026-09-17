'use client'

import React, { useId } from 'react'

/**
 * Campo de los formularios públicos (alta, login, contacto).
 *
 * Deliberadamente NO usa `components/ui/input.tsx`: aquél es `h-8 text-sm`, densidad de panel
 * de gestión. Los formularios públicos son grandes a propósito (`px-4 py-3 text-base`), que es
 * lo que sostiene el objetivo de PRODUCT.md de targets generosos para un público de edad amplia
 * y mayoritariamente móvil. Lo que sí unifica es la duplicación real que había entre
 * AuthForms y ContactForm, y añade el cableado de accesibilidad que faltaba.
 */

type BaseProps = {
  name: string
  label: string
  error?: string
  hint?: string
  /** `true` para mensajes que cambian mientras se escribe (aria-live en vez de role="alert"). */
  live?: boolean
  className?: string
}

export type PublicFieldProps = BaseProps &
  Omit<React.InputHTMLAttributes<HTMLInputElement>, 'name' | 'className'>

export const publicFieldClass =
  'w-full rounded-xl border border-input bg-background px-4 py-3 text-base text-foreground outline-none transition-colors focus:border-abtr-blue aria-[invalid=true]:border-destructive'

export const publicLabelClass = 'text-sm font-semibold text-foreground'

/** Botón de envío de los formularios públicos. Mismo aspecto en alta, login y perfil. */
export const publicSubmitClass =
  'w-full rounded-full bg-abtr-red px-6 py-3 font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50'

export function FieldShell({
  label,
  htmlFor,
  messageId,
  error,
  hint,
  live,
  children,
}: {
  label: string
  htmlFor: string
  messageId: string
  error?: string
  hint?: string
  live?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className={publicLabelClass}>
        {label}
      </label>
      {children}
      {error ? (
        <p
          id={messageId}
          {...(live ? { 'aria-live': 'polite' as const } : { role: 'alert' as const })}
          className="text-sm font-semibold text-destructive"
        >
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export function PublicField({ name, label, error, hint, live, ...rest }: PublicFieldProps) {
  const id = useId()
  const messageId = `${id}-msg`
  return (
    <FieldShell label={label} htmlFor={id} messageId={messageId} error={error} hint={hint} live={live}>
      <input
        {...rest}
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? messageId : undefined}
        className={publicFieldClass}
      />
    </FieldShell>
  )
}

export type PublicTextareaProps = BaseProps &
  Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'name' | 'className'>

export function PublicTextarea({ name, label, error, hint, live, ...rest }: PublicTextareaProps) {
  const id = useId()
  const messageId = `${id}-msg`
  return (
    <FieldShell label={label} htmlFor={id} messageId={messageId} error={error} hint={hint} live={live}>
      <textarea
        {...rest}
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? messageId : undefined}
        className={publicFieldClass}
      />
    </FieldShell>
  )
}

export type PublicSelectProps = BaseProps &
  Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'name' | 'className'>

export function PublicSelect({ name, label, error, hint, live, children, ...rest }: PublicSelectProps) {
  const id = useId()
  const messageId = `${id}-msg`
  return (
    <FieldShell label={label} htmlFor={id} messageId={messageId} error={error} hint={hint} live={live}>
      <select
        {...rest}
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? messageId : undefined}
        className={publicFieldClass}
      >
        {children}
      </select>
    </FieldShell>
  )
}
