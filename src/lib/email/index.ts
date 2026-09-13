import type { Payload, PayloadRequest } from 'payload'
import type { EmailFooter } from './render'

export * from './templates'
export type { EmailFooter } from './render'

export type SendEmailArgs = {
  to: string
  subject: string
  html: string
  text: string
  replyTo?: string
}

/**
 * Envía un correo sin poder romper nunca el flujo del usuario: captura cualquier fallo y solo
 * loguea. Un error de Resend no puede tumbar un alta ni una inscripción.
 *
 * Si `EMAIL_REDIRECT_TO` está definida, TODO el correo se desvía ahí con el destinatario real
 * en el asunto. Es la caja de arena para previews y para el periodo en que el dominio aún no
 * está verificado en Resend (que solo permite enviar a la dirección de la cuenta).
 */
export const sendEmail = async (payload: Payload, args: SendEmailArgs): Promise<{ ok: boolean }> => {
  const to = args.to?.trim()
  if (!to) return { ok: false }

  const redirectTo = process.env.EMAIL_REDIRECT_TO?.trim()
  const finalTo = redirectTo || to
  const subject = redirectTo ? `[→ ${to}] ${args.subject}` : args.subject

  try {
    await payload.sendEmail({
      to: finalTo,
      subject,
      html: args.html,
      text: args.text,
      ...(args.replyTo ? { replyTo: args.replyTo } : {}),
    })
    return { ok: true }
  } catch (err) {
    payload.logger.error({ err, subject: args.subject }, 'sendEmail failed')
    return { ok: false }
  }
}

/**
 * Programa el envío para después de responder al usuario. `after()` de Next corre tras enviar
 * la respuesta pero DENTRO del ciclo de vida de la función, así que el envío no se pierde por
 * congelación de la instancia (lo que sí pasaría con una promesa suelta). Y en Postgres los
 * hooks `afterChange` corren dentro de la transacción: aplazar evita mandar un correo de algo
 * que luego revierte.
 *
 * Fuera del scope de una petición (seed, scripts) `after()` lanza; ahí se envía en línea.
 */
export const sendEmailAfterResponse = async (payload: Payload, args: SendEmailArgs): Promise<void> => {
  try {
    const { after } = await import('next/server')
    after(() => sendEmail(payload, args))
  } catch {
    await sendEmail(payload, args)
  }
}

/**
 * Datos de contacto del club para el pie de los correos. Nunca lanza.
 *
 * Pasa `req` cuando lo llames desde un hook: en Postgres los hooks corren dentro de la
 * transacción y sin `req` esta consulta toma una segunda conexión del pool mientras la primera
 * sigue ocupada. Con varias altas a la vez eso agota el pool.
 */
export const getEmailFooter = async (
  payload: Payload,
  req?: PayloadRequest,
): Promise<EmailFooter> => {
  try {
    const s = (await payload.findGlobal({ slug: 'site-settings', depth: 0, req })) as EmailFooter
    return { email: s?.email ?? null, phone: s?.phone ?? null, address: s?.address ?? null }
  } catch {
    return {}
  }
}

/**
 * Destinatario del aviso interno de contacto:
 * Ajustes del sitio → Email, y si está vacío `CONTACT_NOTIFY_TO`.
 */
export const getStaffNotifyAddress = async (payload: Payload): Promise<string | null> => {
  const footer = await getEmailFooter(payload)
  const address = footer.email?.trim() || process.env.CONTACT_NOTIFY_TO?.trim()
  if (!address) {
    payload.logger.warn(
      'No hay destinatario para el aviso de contacto: rellena Ajustes del sitio → Email o CONTACT_NOTIFY_TO.',
    )
    return null
  }
  return address
}
