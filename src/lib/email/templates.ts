import { SITE_URL } from '@/lib/site'
import { button, dataRow, escapeHtml, muted, p, quote, shell, type EmailFooter } from './render'

/** Toda plantilla devuelve también `text`: entregabilidad y clientes en texto plano. */
export type EmailContent = { subject: string; html: string; text: string }

export const welcomeEmail = (args: {
  name: string
  membershipTypeName?: string | null
  eventTitle?: string | null
  footer?: EmailFooter
}): EmailContent => {
  const firstName = args.name.trim().split(/\s+/)[0] || args.name
  const subject = '¡Bienvenido al Club de Running Albatera!'

  const body = [
    p(`Hola <strong>${escapeHtml(firstName)}</strong>, ya eres parte del club. Nos alegra tenerte con nosotros.`),
    args.membershipTypeName
      ? p(`Te has dado de alta como <strong>${escapeHtml(args.membershipTypeName)}</strong>. Tu cuota queda <strong>pendiente de confirmar</strong> por el club; te avisaremos en cuanto esté todo listo.`)
      : p('Tu cuota queda <strong>pendiente de confirmar</strong> por el club; te avisaremos en cuanto esté todo listo.'),
    args.eventTitle
      ? p(`Además te hemos inscrito en <strong>${escapeHtml(args.eventTitle)}</strong>.`)
      : '',
    p('Desde tu zona de socio puedes ver tus inscripciones, tu equipación y actualizar tus datos.'),
    button(`${SITE_URL}/socios`, 'Ir a mi zona de socio'),
    muted('Si tienes cualquier duda, responde a este correo y te echamos una mano.'),
  ].join('\n')

  const text = [
    `Hola ${firstName}, ya eres parte del Club de Running Albatera.`,
    '',
    args.membershipTypeName ? `Alta como: ${args.membershipTypeName}.` : '',
    'Tu cuota queda pendiente de confirmar por el club.',
    args.eventTitle ? `Te hemos inscrito en: ${args.eventTitle}.` : '',
    '',
    `Zona de socio: ${SITE_URL}/socios`,
  ]
    .filter(Boolean)
    .join('\n')

  return { subject, html: shell({ title: subject, body, footer: args.footer }), text }
}

export const contactNotificationEmail = (args: {
  name: string
  email: string
  subjectLabel: string
  message: string
  footer?: EmailFooter
}): EmailContent => {
  const subject = `Nuevo mensaje de contacto — ${args.subjectLabel}`

  const body = [
    p('Has recibido un mensaje desde el formulario de contacto de la web.'),
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px;">
      ${dataRow('Nombre', args.name)}
      ${dataRow('Email', args.email)}
      ${dataRow('Asunto', args.subjectLabel)}
    </table>`,
    quote(args.message),
    button(`mailto:${args.email}`, 'Responder'),
  ].join('\n')

  const text = [
    'Nuevo mensaje desde el formulario de contacto.',
    '',
    `Nombre: ${args.name}`,
    `Email: ${args.email}`,
    `Asunto: ${args.subjectLabel}`,
    '',
    args.message,
  ].join('\n')

  return { subject, html: shell({ title: subject, body, footer: args.footer }), text }
}

export const contactAckEmail = (args: {
  name: string
  message: string
  footer?: EmailFooter
}): EmailContent => {
  const firstName = args.name.trim().split(/\s+/)[0] || args.name
  const subject = 'Hemos recibido tu mensaje'

  const body = [
    p(`Hola <strong>${escapeHtml(firstName)}</strong>, gracias por escribirnos. Hemos recibido tu mensaje y te responderemos lo antes posible.`),
    muted('Esto es lo que nos has enviado:'),
    quote(args.message),
    muted('No hace falta que respondas a este correo; es solo un acuse de recibo.'),
  ].join('\n')

  const text = [
    `Hola ${firstName}, gracias por escribirnos. Hemos recibido tu mensaje y te responderemos lo antes posible.`,
    '',
    'Tu mensaje:',
    args.message,
  ].join('\n')

  return { subject, html: shell({ title: subject, body, footer: args.footer }), text }
}

export const registrationConfirmedEmail = (args: {
  name: string
  eventTitle: string
  eventDate?: string | null
  eventLocation?: string | null
  eventSlug?: string | null
  footer?: EmailFooter
}): EmailContent => {
  const firstName = args.name.trim().split(/\s+/)[0] || args.name
  const subject = `Inscripción confirmada — ${args.eventTitle}`

  const dateLabel = args.eventDate
    ? new Intl.DateTimeFormat('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Madrid',
      }).format(new Date(args.eventDate))
    : null

  const body = [
    p(`Hola <strong>${escapeHtml(firstName)}</strong>, tu inscripción está confirmada. ¡Nos vemos allí!`),
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px;">
      ${dataRow('Prueba', args.eventTitle)}
      ${dateLabel ? dataRow('Fecha', dateLabel) : ''}
      ${args.eventLocation ? dataRow('Lugar', args.eventLocation) : ''}
    </table>`,
    args.eventSlug ? button(`${SITE_URL}/eventos/${args.eventSlug}`, 'Ver la prueba', 'red') : '',
    muted('Puedes consultar o cancelar tu inscripción desde tu zona de socio.'),
  ].join('\n')

  const text = [
    `Hola ${firstName}, tu inscripción está confirmada.`,
    '',
    `Prueba: ${args.eventTitle}`,
    dateLabel ? `Fecha: ${dateLabel}` : '',
    args.eventLocation ? `Lugar: ${args.eventLocation}` : '',
    '',
    `Zona de socio: ${SITE_URL}/socios`,
  ]
    .filter(Boolean)
    .join('\n')

  return { subject, html: shell({ title: subject, body, footer: args.footer }), text }
}
