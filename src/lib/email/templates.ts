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

/** Cuenta del club para el ingreso de la cuota, ya formateada por `src/lib/payments.ts`. */
export type PaymentInstructions = {
  /** IBAN en grupos de cuatro. */
  formattedIban: string
  holder: string
  /** Concepto que debe poner el socio en la transferencia. */
  concept: string
  amount?: number | null
  notes?: string | null
}

const euros = (amount: number): string =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount)

export const welcomeEmail = (args: {
  name: string
  membershipTypeName?: string | null
  eventTitle?: string | null
  /** Ausente cuando el tipo de socio no paga cuota: entonces no se enseña ninguna cuenta. */
  payment?: PaymentInstructions | null
  footer?: EmailFooter
}): EmailContent => {
  const firstName = args.name.trim().split(/\s+/)[0] || args.name
  const subject = `¡Bienvenido al club, ${firstName}!`
  const { payment } = args

  const body = [
    p('Ya eres parte del <strong>Club de Running Albatera</strong>. Nos alegra tenerte con nosotros — nos vemos en el asfalto.'),

    card({
      accent: 'yellow',
      title: 'Tu cuota',
      body: args.membershipTypeName
        ? `Alta como <strong>${escapeHtml(args.membershipTypeName)}</strong>. Queda <strong>pendiente de confirmar</strong> por el club; te avisamos en cuanto esté lista.`
        : 'Queda <strong>pendiente de confirmar</strong> por el club; te avisamos en cuanto esté lista.',
    }),

    payment
      ? card({
          accent: 'blue',
          title: 'Cómo pagar la cuota',
          body: [
            'Por transferencia o ingreso a la cuenta del club:',
            `<strong style="font-size:17px;letter-spacing:0.03em;">${escapeHtml(payment.formattedIban)}</strong>`,
            `Titular: <strong>${escapeHtml(payment.holder)}</strong>`,
            `Concepto: <strong>${escapeHtml(payment.concept)}</strong>`,
            typeof payment.amount === 'number' ? `Importe: <strong>${escapeHtml(euros(payment.amount))}</strong>` : '',
            payment.notes ? escapeHtml(payment.notes) : '',
            'Cuando lo hayas hecho, avísanos con el botón <strong>«Ya he hecho el ingreso»</strong> de tu zona de socio y el club lo confirmará.',
          ]
            .filter(Boolean)
            .join('<br>'),
        })
      : '',

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
    payment
      ? [
          'CÓMO PAGAR LA CUOTA',
          `Cuenta: ${payment.formattedIban}`,
          `Titular: ${payment.holder}`,
          `Concepto: ${payment.concept}`,
          typeof payment.amount === 'number' ? `Importe: ${euros(payment.amount)}` : '',
          payment.notes ?? '',
          'Cuando lo hayas hecho, avísanos con el botón «Ya he hecho el ingreso» de tu zona de socio.',
          '',
        ]
          .filter(Boolean)
          .join('\n')
      : '',
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

/** Aviso interno: alguien se ha dado de alta desde la web. Copia para el club, no para el socio. */
export const newMemberEmail = (args: {
  memberId: number
  memberName: string
  memberEmail: string
  memberPhone?: string | null
  categoryLabel?: string | null
  membershipTypeName?: string | null
  eventTitle?: string | null
  footer?: EmailFooter
}): EmailContent => {
  const subject = `Nuevo socio — ${args.memberName}`

  const body = [
    p('Alguien acaba de darse de alta desde la web. Su cuota queda <strong>pendiente</strong> hasta que la confirmes.'),
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px;">
      ${dataRow('Socio', args.memberName)}
      ${dataRow('Email', args.memberEmail)}
      ${args.memberPhone ? dataRow('Teléfono', args.memberPhone) : ''}
      ${args.categoryLabel ? dataRow('Categoría', args.categoryLabel) : ''}
      ${dataRow('Tipo de socio', args.membershipTypeName || 'Sin asignar')}
      ${args.eventTitle ? dataRow('Se inscribió en', args.eventTitle) : ''}
    </table>`,
    button(`${SITE_URL}/gestion/${args.memberId}`, 'Ver la ficha del socio'),
    muted('Ya le hemos mandado a él el correo de bienvenida con la cuenta para pagar la cuota.'),
  ].join('\n')

  const text = [
    'Alguien acaba de darse de alta desde la web. Su cuota queda pendiente hasta que la confirmes.',
    '',
    `Socio: ${args.memberName}`,
    `Email: ${args.memberEmail}`,
    args.memberPhone ? `Teléfono: ${args.memberPhone}` : '',
    args.categoryLabel ? `Categoría: ${args.categoryLabel}` : '',
    `Tipo de socio: ${args.membershipTypeName || 'Sin asignar'}`,
    args.eventTitle ? `Se inscribió en: ${args.eventTitle}` : '',
    '',
    `Ficha del socio: ${SITE_URL}/gestion/${args.memberId}`,
  ]
    .filter(Boolean)
    .join('\n')

  return {
    subject,
    html: shell({ title: subject, body, footer: args.footer, eyebrow: 'Alta desde la web' }),
    text,
  }
}

/**
 * Aviso interno: un socio dice que ya ha ingresado su cuota. La cuota NO se marca como pagada
 * sola — este correo existe para que alguien del club compruebe el movimiento y la confirme.
 */
export const paymentReportedEmail = (args: {
  memberId: number
  memberName: string
  memberEmail: string
  memberPhone?: string | null
  seasonName?: string | null
  membershipTypeName?: string | null
  amount?: number | null
  concept: string
  footer?: EmailFooter
}): EmailContent => {
  const subject = `Pago de cuota comunicado — ${args.memberName}`

  const body = [
    p('Un socio dice que ya ha hecho el ingreso de su cuota. Comprueba el movimiento y márcala como pagada en su ficha.'),
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px;">
      ${dataRow('Socio', args.memberName)}
      ${dataRow('Email', args.memberEmail)}
      ${args.memberPhone ? dataRow('Teléfono', args.memberPhone) : ''}
      ${args.seasonName ? dataRow('Temporada', args.seasonName) : ''}
      ${args.membershipTypeName ? dataRow('Tipo de socio', args.membershipTypeName) : ''}
      ${typeof args.amount === 'number' ? dataRow('Importe de referencia', euros(args.amount)) : ''}
      ${dataRow('Concepto', args.concept)}
    </table>`,
    button(`${SITE_URL}/gestion/${args.memberId}`, 'Ver la ficha del socio'),
    muted('La cuota sigue en «pendiente» hasta que la marques como pagada.'),
  ].join('\n')

  const text = [
    'Un socio dice que ya ha hecho el ingreso de su cuota.',
    '',
    `Socio: ${args.memberName}`,
    `Email: ${args.memberEmail}`,
    args.memberPhone ? `Teléfono: ${args.memberPhone}` : '',
    args.seasonName ? `Temporada: ${args.seasonName}` : '',
    args.membershipTypeName ? `Tipo de socio: ${args.membershipTypeName}` : '',
    typeof args.amount === 'number' ? `Importe de referencia: ${euros(args.amount)}` : '',
    `Concepto: ${args.concept}`,
    '',
    `Ficha del socio: ${SITE_URL}/gestion/${args.memberId}`,
    '',
    'La cuota sigue en «pendiente» hasta que la marques como pagada.',
  ]
    .filter(Boolean)
    .join('\n')

  return {
    subject,
    html: shell({ title: subject, body, footer: args.footer, eyebrow: 'Aviso de pago' }),
    text,
  }
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
