'use client'

import React, { useActionState, useId } from 'react'
import { sendContactAction, type ContactState } from '@/actions/contact'
import { CONTACT_SUBJECTS } from '@/collections/ContactMessages'

const field =
  'w-full rounded-xl border border-abtr-ink/20 px-4 py-3 text-base outline-none focus:border-abtr-blue'
const labelCls = 'text-sm font-semibold text-abtr-ink'

export function ContactForm() {
  const [state, action, pending] = useActionState<ContactState, FormData>(sendContactAction, { ok: false })
  const nameId = useId()
  const emailId = useId()
  const subjectId = useId()
  const messageId = useId()

  return (
    <form action={action} className="flex flex-col gap-4">
      {/* Honeypot */}
      <input type="text" name="website" tabIndex={-1} aria-hidden="true" autoComplete="off" className="hidden" />
      <div className="flex flex-col gap-1.5">
        <label htmlFor={nameId} className={labelCls}>
          Nombre
        </label>
        <input id={nameId} name="name" required autoComplete="name" className={field} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={emailId} className={labelCls}>
          Email
        </label>
        <input id={emailId} name="email" type="email" required autoComplete="email" className={field} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={subjectId} className={labelCls}>
          Asunto
        </label>
        <select id={subjectId} name="subject" defaultValue="general" className={field}>
          {CONTACT_SUBJECTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={messageId} className={labelCls}>
          Mensaje
        </label>
        <textarea id={messageId} name="message" required rows={5} className={field} />
      </div>
      {state.error && (
        <p role="alert" className="text-sm font-semibold text-abtr-red">
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
