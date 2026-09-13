'use server'

import { getClient } from '@/lib/payload'
import {
  contactAckEmail,
  contactNotificationEmail,
  getEmailFooter,
  getStaffNotifyAddress,
  sendEmailAfterResponse,
} from '@/lib/email'
import { EMAIL_RE } from '@/lib/validation/register'
import { CONTACT_SUBJECTS } from '@/collections/ContactMessages'

export type ContactState = { ok: boolean; error?: string; message?: string }

const subjectLabelOf = (value: string): string =>
  CONTACT_SUBJECTS.find((s) => s.value === value)?.label ?? value

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

  // Aviso al club + acuse de recibo. Fuera del try del `create`: si el correo falla, el
  // mensaje ya está guardado y el usuario no debe ver un error.
  const subjectLabel = subjectLabelOf(subject)
  const footer = await getEmailFooter(payload)
  const staffTo = await getStaffNotifyAddress(payload)

  if (staffTo) {
    await sendEmailAfterResponse(payload, {
      to: staffTo,
      replyTo: email,
      ...contactNotificationEmail({ name, email, subjectLabel, message, footer }),
    })
  }
  await sendEmailAfterResponse(payload, {
    to: email,
    replyTo: footer.email ?? undefined,
    ...contactAckEmail({ name, message, footer }),
  })

  return { ok: true, message: 'Mensaje enviado. Te responderemos pronto.' }
}
