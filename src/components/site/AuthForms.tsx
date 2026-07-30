'use client'

import React, { useActionState, useId } from 'react'
import Link from 'next/link'
import { loginAction, registerAction, type AuthState } from '@/actions/auth'

const initial: AuthState = {}

const field =
  'w-full rounded-xl border border-abtr-ink/20 px-4 py-3 text-base outline-none focus:border-abtr-blue'
const labelCls = 'text-sm font-semibold text-abtr-ink'

export type MembershipTypeOption = {
  id: number
  name: string
  requiresPayment?: boolean | null
  amount?: number | null
}

function Field({
  name,
  label,
  type = 'text',
  required,
  autoComplete,
  inputMode,
  minLength,
  placeholder,
}: {
  name: string
  label: string
  type?: string
  required?: boolean
  autoComplete?: string
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
  minLength?: number
  placeholder?: string
}) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={labelCls}>
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        inputMode={inputMode}
        minLength={minLength}
        placeholder={placeholder}
        className={field}
      />
    </div>
  )
}

function SubmitButton({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="w-full rounded-full bg-abtr-red px-6 py-3 font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
    >
      {pending ? 'Enviando…' : children}
    </button>
  )
}

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initial)
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field name="email" label="Email" type="email" required autoComplete="email" />
      <Field name="password" label="Contraseña" type="password" required autoComplete="current-password" />
      {state.error && (
        <p role="alert" className="text-sm font-semibold text-abtr-red">
          {state.error}
        </p>
      )}
      <SubmitButton pending={pending}>Entrar</SubmitButton>
      <p className="text-center text-sm text-abtr-ink/60">
        ¿Aún no eres socio?{' '}
        <Link href="/hazte-socio" className="font-semibold text-abtr-blue hover:underline">
          Hazte socio
        </Link>
      </p>
    </form>
  )
}

export function RegisterForm({
  eventSlug,
  membershipTypes = [],
}: {
  eventSlug?: string
  membershipTypes?: MembershipTypeOption[]
}) {
  const [state, action, pending] = useActionState(registerAction, initial)
  const typeId = useId()
  return (
    <form action={action} className="flex flex-col gap-4">
      {eventSlug && <input type="hidden" name="eventSlug" value={eventSlug} />}
      <Field name="name" label="Nombre completo" required autoComplete="name" />
      <Field name="email" label="Email" type="email" required autoComplete="email" />
      <Field
        name="phone"
        label="Teléfono móvil"
        type="tel"
        required
        autoComplete="tel"
        inputMode="tel"
        minLength={9}
        placeholder="+34 600 000 000"
      />
      <Field
        name="password"
        label="Contraseña (mín. 8)"
        type="password"
        required
        minLength={8}
        autoComplete="new-password"
      />
      {membershipTypes.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={typeId} className={labelCls}>
            Tipo de socio
          </label>
          <select id={typeId} name="membershipType" className={field} defaultValue="">
            <option value="">Sin especificar (lo asigna el club)</option>
            {membershipTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
                {t.requiresPayment && t.amount ? ` · ${t.amount} €` : t.requiresPayment ? '' : ' · gratis'}
              </option>
            ))}
          </select>
        </div>
      )}
      {eventSlug && (
        <p className="rounded-xl bg-abtr-blue/10 px-4 py-3 text-sm text-abtr-ink/80">
          Te inscribiremos automáticamente en <strong>{eventSlug}</strong> al registrarte.
        </p>
      )}
      <label className="flex items-start gap-3 rounded-xl border border-abtr-ink/15 p-4">
        <input
          name="imageRightsAccepted"
          type="checkbox"
          value="yes"
          required
          className="mt-0.5 size-5 shrink-0 accent-abtr-blue"
        />
        <span className="text-sm leading-relaxed text-abtr-ink/80">
          <strong className="text-abtr-ink">Acepto los derechos de imagen.</strong> Autorizo al
          Club de Running Albatera a utilizar fotografías y vídeos en los que aparezca para la
          comunicación y difusión de las actividades del club. Esta aceptación es obligatoria
          para completar el alta.
        </span>
      </label>
      {state.error && (
        <p role="alert" className="text-sm font-semibold text-abtr-red">
          {state.error}
        </p>
      )}
      <SubmitButton pending={pending}>Crear cuenta</SubmitButton>
      <p className="text-center text-sm text-abtr-ink/60">
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" className="font-semibold text-abtr-blue hover:underline">
          Inicia sesión
        </Link>
      </p>
    </form>
  )
}
