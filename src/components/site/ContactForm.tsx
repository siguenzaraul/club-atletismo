'use client'

import React, { useActionState } from 'react'
import { sendContactAction, type ContactState } from '@/actions/contact'
import { CONTACT_SUBJECTS } from '@/collections/ContactMessages'
import { PublicField, PublicSelect, PublicTextarea } from './PublicField'

export function ContactForm() {
  const [state, action, pending] = useActionState<ContactState, FormData>(sendContactAction, {
    ok: false,
  })

  return (
    <form action={action} className="flex flex-col gap-4">
      {/* Honeypot */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        aria-hidden="true"
        autoComplete="off"
        className="hidden"
      />
      <PublicField name="name" label="Nombre" required autoComplete="name" />
      <PublicField name="email" label="Email" type="email" required autoComplete="email" />
      <PublicSelect name="subject" label="Asunto" defaultValue="general">
        {CONTACT_SUBJECTS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </PublicSelect>
      <PublicTextarea name="message" label="Mensaje" required rows={5} />

      {state.error && (
        <p role="alert" className="text-sm font-semibold text-destructive">
          {state.error}
        </p>
      )}
      {state.ok && state.message && (
        <p role="status" className="text-sm font-semibold text-abtr-blue">
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="w-full rounded-full bg-abtr-red px-6 py-3 font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? 'Enviando…' : 'Enviar mensaje'}
      </button>
    </form>
  )
}
