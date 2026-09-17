'use client'

import React, { useActionState, useEffect, useId, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { updateProfileAction, type ActionResult } from '@/actions/member'
import { MEMBER_CATEGORIES } from '@/collections/Members'
import {
  FieldShell,
  PublicField,
  PublicSelect,
  PublicTextarea,
  publicFieldClass,
  publicSubmitClass,
} from './PublicField'

export type EditableAttribute = {
  id: number
  label: string
  type: string
  value: string
  boolean: boolean
  /** Sólo para el tipo `select`: las opciones que definió el club. */
  options: string[]
}

export function ProfileForm({
  defaults,
  editableAttributes,
}: {
  defaults: {
    name: string
    email: string
    phone: string
    federationNumber: string
    category: string
  }
  editableAttributes: EditableAttribute[]
}) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(updateProfileAction, { ok: false })
  const router = useRouter()
  const emailId = useId()
  const seen = useRef(state)

  useEffect(() => {
    if (state === seen.current) return
    seen.current = state
    if (state.ok && state.message) {
      toast.success(state.message)
      router.refresh()
    } else if (state.error) {
      toast.error(state.error)
    }
  }, [state, router])

  return (
    <form action={action} className="flex flex-col gap-4">
      <PublicField
        name="name"
        label="Nombre completo"
        required
        autoComplete="name"
        defaultValue={defaults.name}
      />

      {/* El email identifica la cuenta y no se cambia desde aquí, pero el socio necesita verlo:
          es el dato por el que entra y al que le llegan los correos del club. */}
      <FieldShell
        label="Email"
        htmlFor={emailId}
        messageId={`${emailId}-msg`}
        hint="Es tu usuario para entrar. Para cambiarlo, escríbenos."
      >
        <input
          id={emailId}
          type="email"
          value={defaults.email}
          readOnly
          aria-describedby={`${emailId}-msg`}
          className={`${publicFieldClass} cursor-not-allowed text-muted-foreground`}
        />
      </FieldShell>

      <PublicField
        name="phone"
        label="Teléfono móvil"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        required
        minLength={9}
        placeholder="+34 600 000 000"
        defaultValue={defaults.phone}
      />
      <PublicField
        name="federationNumber"
        label="Nº de federación (opcional)"
        defaultValue={defaults.federationNumber}
      />
      <PublicSelect name="category" label="Categoría deportiva" defaultValue={defaults.category}>
        {MEMBER_CATEGORIES.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </PublicSelect>

      {editableAttributes.length > 0 && (
        <fieldset className="mt-2 flex flex-col gap-4 border-t border-border pt-4">
          <legend className="font-display text-lg tracking-wide">Otros datos</legend>
          {editableAttributes.map((a) => (
            <AttributeField key={a.id} attr={a} />
          ))}
        </fieldset>
      )}

      {state.error && (
        <p role="alert" className="text-sm font-semibold text-destructive">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} aria-busy={pending} className={publicSubmitClass}>
        {pending ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </form>
  )
}

function AttributeField({ attr }: { attr: EditableAttribute }) {
  const id = useId()
  const name = `attr_${attr.id}`

  if (attr.type === 'boolean') {
    return (
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4">
        <input
          id={id}
          name={name}
          type="checkbox"
          value="yes"
          defaultChecked={attr.boolean}
          className="mt-0.5 size-5 shrink-0 accent-abtr-blue"
        />
        <span className="text-sm leading-relaxed text-foreground/80">{attr.label}</span>
      </label>
    )
  }

  if (attr.type === 'select') {
    // Antes era un campo de texto libre: el socio tecleaba lo que quería y se guardaba tal cual,
    // así que el recuento por opciones de /gestion/resumen contaba valores que no existían.
    return (
      <PublicSelect name={name} label={attr.label} defaultValue={attr.value}>
        <option value="">Sin especificar</option>
        {attr.options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </PublicSelect>
    )
  }

  if (attr.type === 'longtext') {
    return <PublicTextarea name={name} label={attr.label} rows={3} defaultValue={attr.value} />
  }

  return (
    <PublicField
      name={name}
      label={attr.label}
      type={attr.type === 'number' ? 'number' : attr.type === 'date' ? 'date' : 'text'}
      defaultValue={attr.value}
    />
  )
}
