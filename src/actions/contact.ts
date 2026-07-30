'use server'

import { getClient } from '@/lib/payload'

export type ContactState = { ok: boolean; error?: string; message?: string }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const sendContactAction = async (
  _prev: ContactState,
  formData: FormData,
): Promise<ContactState> => {
  // Honeypot: bots fill hidden fields.
  if (String(formData.get('website') ?? '')) return { ok: true, message: 'Gracias, te responderemos pronto.' }

  const name = String(formData.get('name') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim()
  const subject = String(formData.get('subject') ?? 'general')
  const message = String(formData.get('message') ?? '').trim()

  if (!name || !email || !message) return { ok: false, error: 'Rellena nombre, email y mensaje.' }
  if (!EMAIL_RE.test(email)) return { ok: false, error: 'El email no parece válido.' }

  const payload = await getClient()
  try {
    await payload.create({
      collection: 'contact-messages',
      data: { name, email, subject: subject as 'general', message },
      overrideAccess: true,
    })
  } catch (err) {
    payload.logger.error({ err }, 'sendContactAction failed')
    return { ok: false, error: 'No se pudo enviar el mensaje. Inténtalo más tarde.' }
  }
  return { ok: true, message: 'Mensaje enviado. Te responderemos pronto.' }
}
