'use client'

import React, { useActionState, useId, useState } from 'react'
import Link from 'next/link'
import { loginAction, registerAction, type AuthState } from '@/actions/auth'
import { PASSWORD_MIN } from '@/lib/validation/register'
import type { RegistrationSettings } from '@/lib/registration-form'
import { GarmentPicker } from './GarmentPicker'
import { PublicField, PublicSelect } from './PublicField'

const initial: AuthState = {}

export type MembershipTypeOption = {
  id: number
  name: string
  requiresPayment?: boolean | null
  amount?: number | null
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

/** Alterna la visibilidad de una contraseña: reduce mucho los fallos de tecleo en móvil. */
function RevealToggle({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={shown}
      className="self-start text-sm font-semibold text-abtr-blue hover:underline"
    >
      {shown ? 'Ocultar contraseñas' : 'Mostrar contraseñas'}
    </button>
  )
}

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initial)
  return (
    <form action={action} className="flex flex-col gap-4">
      <PublicField name="email" label="Email" type="email" required autoComplete="email" />
      <PublicField
        name="password"
        label="Contraseña"
        type="password"
        required
        autoComplete="current-password"
      />
      {state.error && (
        <p role="alert" className="text-sm font-semibold text-destructive">
          {state.error}
        </p>
      )}
      <SubmitButton pending={pending}>Entrar</SubmitButton>
      <p className="text-center text-sm text-muted-foreground">
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
  eventTitle,
  settings,
}: {
  eventSlug?: string
  eventTitle?: string | null
  settings: RegistrationSettings
}) {
  const { config, garments, membershipTypes } = settings
  const [state, formAction, pending] = useActionState(registerAction, initial)
  const rightsId = useId()

  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [reveal, setReveal] = useState(false)
  // Sólo se grita tras el primer intento de envío o al salir del campo de confirmación.
  const [touched, setTouched] = useState(false)

  const mismatch = pw2.length > 0 && pw !== pw2
  const tooShort = pw.length > 0 && pw.length < PASSWORD_MIN

  const clientErrors = {
    password: tooShort ? `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.` : undefined,
    passwordConfirm: mismatch ? 'Las contraseñas no coinciden.' : undefined,
  }
  // Los del servidor se muestran siempre; los del cliente sólo tras `touched`.
  const errorFor = (field: 'password' | 'passwordConfirm') =>
    state.fieldErrors?.[field] ?? (touched ? clientErrors[field] : undefined)

  // La `action` es la server action directa, no una función de cliente: así el formulario
  // sigue enviando aunque React no haya hidratado todavía (en móvil con red lenta, el primer
  // toque llegaba a no hacer nada). El atajo de cliente vive en `onSubmit`, donde
  // `preventDefault` sí impide que React invoque la action; el servidor sigue siendo la
  // autoridad y revalida todo.
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    setTouched(true)
    if (clientErrors.password || clientErrors.passwordConfirm) e.preventDefault()
  }

  return (
    <form action={formAction} onSubmit={onSubmit} className="flex flex-col gap-4">
      {eventSlug && <input type="hidden" name="eventSlug" value={eventSlug} />}

      {settings.intro && (
        <p className="text-sm text-foreground/80 whitespace-pre-line">{settings.intro}</p>
      )}

      <PublicField
        name="name"
        label="Nombre completo"
        required
        autoComplete="name"
        defaultValue={state.values?.name}
        error={state.fieldErrors?.name}
      />
      <PublicField
        name="email"
        label="Email"
        type="email"
        required
        autoComplete="email"
        defaultValue={state.values?.email}
        error={state.fieldErrors?.email}
      />
      {config.phone.enabled && (
        <PublicField
          name="phone"
          label={config.phone.required ? 'Teléfono móvil' : 'Teléfono móvil (opcional)'}
          type="tel"
          required={config.phone.required}
          autoComplete="tel"
          inputMode="tel"
          minLength={config.phone.required ? 9 : undefined}
          placeholder="+34 600 000 000"
          defaultValue={state.values?.phone}
          error={state.fieldErrors?.phone}
        />
      )}

      <PublicField
        name="password"
        label={`Contraseña (mín. ${PASSWORD_MIN})`}
        type={reveal ? 'text' : 'password'}
        required
        minLength={PASSWORD_MIN}
        autoComplete="new-password"
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        error={errorFor('password')}
        live
      />
      <PublicField
        name="passwordConfirm"
        label="Repite la contraseña"
        type={reveal ? 'text' : 'password'}
        required
        autoComplete="new-password"
        value={pw2}
        onChange={(e) => setPw2(e.target.value)}
        onBlur={() => setTouched(true)}
        error={errorFor('passwordConfirm')}
        live
      />
      <RevealToggle shown={reveal} onToggle={() => setReveal((v) => !v)} />

      {membershipTypes.length > 0 && (
        <PublicSelect
          name="membershipType"
          label="Tipo de socio"
          defaultValue={state.values?.membershipType ?? ''}
          required={config.membershipType.required}
          error={state.fieldErrors?.membershipType}
        >
          <option value="">
            {config.membershipType.required ? 'Elige una opción' : 'Sin especificar (lo asigna el club)'}
          </option>
          {membershipTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
              {t.requiresPayment && t.amount ? ` · ${t.amount} €` : t.requiresPayment ? '' : ' · gratis'}
            </option>
          ))}
        </PublicSelect>
      )}

      {garments.length > 0 && (
        <fieldset className="flex flex-col gap-3">
          <legend className="text-sm font-semibold text-foreground">Tu equipación</legend>
          <p className="text-sm text-muted-foreground">
            Elige lo que quieres y tu talla. El club te lo entregará cuando esté disponible.
          </p>
          {garments.map((garment) => (
            <GarmentPicker key={garment.key} garment={garment} errors={state.fieldErrors} />
          ))}
        </fieldset>
      )}

      {eventSlug && (
        <p className="rounded-xl bg-abtr-blue/10 px-4 py-3 text-sm text-foreground/80">
          Te inscribiremos automáticamente en <strong>{eventTitle ?? eventSlug}</strong> al
          registrarte.
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="flex items-start gap-3 rounded-xl border border-border p-4">
          <input
            id={rightsId}
            name="imageRightsAccepted"
            type="checkbox"
            value="yes"
            required
            aria-invalid={state.fieldErrors?.imageRightsAccepted ? true : undefined}
            className="mt-0.5 size-5 shrink-0 accent-abtr-blue"
          />
          <span className="text-sm leading-relaxed text-foreground/80">
            <strong className="text-foreground">Acepto los derechos de imagen.</strong> Autorizo al
            Club de Running Albatera a utilizar fotografías y vídeos en los que aparezca para la
            comunicación y difusión de las actividades del club. Esta aceptación es obligatoria
            para completar el alta.
          </span>
        </label>
        {state.fieldErrors?.imageRightsAccepted && (
          <p role="alert" className="text-sm font-semibold text-destructive">
            {state.fieldErrors.imageRightsAccepted}
          </p>
        )}
      </div>

      {state.error && (
        <p role="alert" className="text-sm font-semibold text-destructive">
          {state.error}
        </p>
      )}

      <SubmitButton pending={pending}>Crear cuenta</SubmitButton>
      <p className="text-center text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" className="font-semibold text-abtr-blue hover:underline">
          Inicia sesión
        </Link>
      </p>
    </form>
  )
}
