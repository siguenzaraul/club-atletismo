import { SITE_URL } from '@/lib/site'
import {
  button,
  card,
  dataRow,
  escapeHtml,
  link,
  muted,
  p,
  quote,
  shell,
  steps,
  type EmailFooter,
} from './render'

/** Toda plantilla devuelve también `text`: entregabilidad y clientes en texto plano. */
export type EmailContent = { subject: string; html: string; text: string }

export const welcomeEmail = (args: {
  name: string
  membershipTypeName?: string | null
  eventTitle?: string | null
  footer?: EmailFooter
}): EmailContent => {
  const firstName = args.name.trim().split(/\s+/)[0] || args.name
  const subject = `¡Bienvenido al club, ${firstName}!`

  const body = [
    p('Ya eres parte del <strong>Club de Running Albatera</strong>. Nos alegra tenerte con nosotros — nos vemos en el asfalto.'),

    card({
      accent: 'yellow',
      title: 'Tu cuota',
      body: args.membershipTypeName
        ? `Alta como <strong>${escapeHtml(args.membershipTypeName)}</strong>. Queda <strong>pendiente de confirmar</strong> por el club; te avisamos en cuanto esté lista.`
        : 'Queda <strong>pendiente de confirmar</strong> por el club; te avisamos en cuanto esté lista.',
    }),

    args.eventTitle
      ? card({
          accent: 'red',
          title: 'Ya tienes dorsal',
          body: `Te hemos inscrito en <strong>${escapeHtml(args.eventTitle)}</strong>. Puedes consultarla o cancelarla desde tu zona de socio.`,
        })
      : '',

    `<h2 style="margin:26px 0 14px;font-family:Archivo,Arial,'Helvetica Neue',Helvetica,sans-serif;font-size:17px;font-weight:800;letter-spacing:-0.01em;color:#111111;">Qué puedes hacer ahora</h2>`,
    steps([
      'Completar tu <strong>perfil de socio</strong> con tus datos.',
      'Apuntarte a las <strong>carreras y social runs</strong> con inscripción abierta.',
      'Consultar tu <strong>equipación</strong>: qué te toca y qué has recogido ya.',
    ]),

    button(`${SITE_URL}/socios`, 'Entrar en mi zona de socio'),

    muted(
      `¿Alguna duda? Responde a este correo y te echamos una mano. También puedes escribirnos desde ${link(`${SITE_URL}/contacto`, 'el formulario de contacto')}.`,
    ),
  ]
    .filter(Boolean)
    .join('\n')

  const text = [
    `Hola ${firstName}, ya eres parte del Club de Running Albatera.`,
    '',
    'TU CUOTA',
    args.membershipTypeName ? `Alta como: ${args.membershipTypeName}.` : '',
    'Queda pendiente de confirmar por el club; te avisamos en cuanto esté lista.',
    '',
    args.eventTitle ? `YA TIENES DORSAL\nTe hemos inscrito en: ${args.eventTitle}.\n` : '',
    'QUÉ PUEDES HACER AHORA',
    '1. Completar tu perfil de socio con tus datos.',
    '2. Apuntarte a las carreras y social runs con inscripción abierta.',
    '3. Consultar tu equipación: qué te toca y qué has recogido ya.',
    '',
    `Tu zona de socio: ${SITE_URL}/socios`,
    '',
    '¿Alguna duda? Responde a este correo y te echamos una mano.',
  ]
    .filter(Boolean)
    .join('\n')

  return {
    subject,
    html: shell({
      title: subject,
      body,
      footer: args.footer,
      eyebrow: 'Alta confirmada',
      preheader: 'Tu cuenta ya está lista. Te contamos qué puedes hacer desde tu zona de socio.',
    }),
    text,
  }
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
