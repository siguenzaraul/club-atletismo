import { SITE_URL } from '@/lib/site'

/**
 * Shell HTML de marca para los correos transaccionales.
 *
 * Template literals con estilos inline, no componentes React: los clientes de correo exigen
 * tablas y estilos en línea, y renderizar React aquí arrastraría `react-dom/server` al runtime
 * del CMS sin ganar nada para cuatro correos cortos.
 */

/**
 * Nombre del club tal y como sale EN EL CORREO: remitente, cabecera, pie y bienvenida.
 *
 * Una sola constante porque estaba escrito a mano en cuatro sitios y el remitente podía acabar
 * diciendo una cosa y el cuerpo otra. El nombre de la web vive aparte (`SITE_NAME`).
 */
export const EMAIL_CLUB_NAME = 'Club de Atletismo Albaterun'

/** Obligatorio en TODO dato que venga del usuario (el aviso de contacto interpola texto libre). */
export const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const BLACK = '#000000'
const BLUE = '#009fe3'
const RED = '#e30613'
const YELLOW = '#ffed00'
const INK = '#111111'
const MUTED = '#5b6472'
const PAPER = '#ffffff'
const CANVAS = '#f4f6f8'
const HAIRLINE = '#e6e9ee'

/**
 * Azul sólo para RELLENOS. Para texto se usa `LINK`: el azul de marca sobre blanco da 2.97:1 y
 * no llega a AA. `#007ab3` da 4.74:1 y es la propuesta que ya recoge DESIGN.md.
 */
const LINK = '#007ab3'

// Archivo no cargará en la mayoría de clientes de correo: Arial es el fallback real, así que
// la jerarquía se apoya en peso y tamaño, no en la familia.
const FONT = "Archivo, Arial, 'Helvetica Neue', Helvetica, sans-serif"

export type EmailFooter = {
  email?: string | null
  phone?: string | null
  address?: string | null
}

/**
 * Botón principal en NEGRO, no en azul ni rojo: blanco sobre el azul de marca da 2.97:1 y sobre
 * el rojo 4.30:1, y el texto del botón (15px en negrita ≈ 11pt) no alcanza el umbral de «texto
 * grande», así que necesita 4.5:1. Negro sobre blanco da 21:1 y es el mismo lenguaje que las
 * bandas `band-ink` de la web.
 */
export const button = (href: string, label: string, tone: 'ink' | 'red' = 'ink'): string => `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0 8px;">
    <tr><td bgcolor="${tone === 'red' ? RED : BLACK}" style="border-radius:999px;">
      <a href="${escapeHtml(href)}" style="display:inline-block;padding:14px 30px;font-family:${FONT};font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px;">${escapeHtml(label)}</a>
    </td></tr>
  </table>`

export const dataRow = (label: string, value: unknown): string => `
  <tr>
    <td style="padding:7px 0;font-family:${FONT};font-size:14px;color:${MUTED};width:130px;vertical-align:top;">${escapeHtml(label)}</td>
    <td style="padding:7px 0;font-family:${FONT};font-size:14px;color:${INK};font-weight:600;">${escapeHtml(value)}</td>
  </tr>`

/** Tarjeta con franja de color a la izquierda. El color es decorativo: el texto lo dice todo. */
export const card = (opts: {
  accent: 'blue' | 'yellow' | 'red'
  title: string
  body: string
}): string => {
  const accent = opts.accent === 'yellow' ? YELLOW : opts.accent === 'red' ? RED : BLUE
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;margin:0 0 14px;border-collapse:separate;">
    <tr>
      <td width="4" bgcolor="${accent}" style="width:4px;border-radius:4px 0 0 4px;font-size:0;line-height:0;">&nbsp;</td>
      <td bgcolor="${CANVAS}" style="padding:14px 18px;border-radius:0 8px 8px 0;">
        <p style="margin:0 0 4px;font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${MUTED};">${escapeHtml(opts.title)}</p>
        <p style="margin:0;font-family:${FONT};font-size:15px;line-height:1.55;color:${INK};">${opts.body}</p>
      </td>
    </tr>
  </table>`
}

/** Lista de pasos con numeración de color. `items` llega ya escapado por quien lo compone. */
export const steps = (items: string[]): string => {
  const colors = [BLUE, RED, YELLOW]
  const rows = items
    .map((item, i) => {
      const bg = colors[i % colors.length]
      const fg = bg === YELLOW ? INK : '#ffffff'
      return `
      <tr>
        <td width="26" style="width:26px;padding:0 12px 12px 0;vertical-align:top;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td width="24" height="24" bgcolor="${bg}" align="center" style="width:24px;height:24px;border-radius:12px;font-family:${FONT};font-size:13px;font-weight:700;color:${fg};line-height:24px;">${i + 1}</td>
          </tr></table>
        </td>
        <td style="padding:0 0 12px;font-family:${FONT};font-size:15px;line-height:1.55;color:${INK};vertical-align:top;">${item}</td>
      </tr>`
    })
    .join('')
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;margin:4px 0 6px;">${rows}</table>`
}

/** Envuelve el cuerpo (ya escapado) en la plantilla de marca. */
export const shell = (opts: {
  title: string
  body: string
  footer?: EmailFooter
  /** Texto de vista previa en la bandeja. Si falta, el cliente enseña el principio del cuerpo. */
  preheader?: string
  /** Antetítulo pequeño sobre el titular. */
  eyebrow?: string
}): string => {
  const { title, body, footer, preheader, eyebrow } = opts
  const contact = [
    footer?.email
      ? `<a href="mailto:${escapeHtml(footer.email)}" style="color:${MUTED};text-decoration:underline;">${escapeHtml(footer.email)}</a>`
      : null,
    footer?.phone ? escapeHtml(footer.phone) : null,
    footer?.address ? escapeHtml(footer.address) : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return `<!doctype html>
<html lang="es" dir="ltr"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<!-- La paleta de marca es deliberada: si el cliente fuerza modo oscuro, derivaría colores
     propios y rompería el contraste ya comprobado. -->
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(title)}</title>
</head>
<body lang="es" dir="ltr" style="margin:0;padding:0;background-color:${CANVAS};-webkit-font-smoothing:antialiased;">

<div lang="es" dir="ltr" style="display:none;font-size:0;line-height:0;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${escapeHtml(preheader ?? title)}</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${CANVAS};">
  <tr><td align="center" style="padding:28px 12px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:${PAPER};border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(16,24,40,0.08);">

      <!-- Cabecera: banda negra, como las bandas band-ink de la web -->
      <tr><td bgcolor="${BLACK}" style="padding:24px 30px;">
        <span style="font-family:${FONT};font-size:21px;font-weight:800;letter-spacing:0.02em;color:#ffffff;">ABTR</span>
        <span style="font-family:${FONT};font-size:13px;color:#ffffff;opacity:0.7;">&nbsp;· ${EMAIL_CLUB_NAME}</span>
      </td></tr>

      <!-- Filete tricolor de marca. Decorativo: no comunica nada que no diga el texto. -->
      <tr><td style="font-size:0;line-height:0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td width="45%" bgcolor="${BLUE}" style="height:5px;line-height:5px;font-size:0;">&nbsp;</td>
          <td width="30%" bgcolor="${YELLOW}" style="height:5px;line-height:5px;font-size:0;">&nbsp;</td>
          <td width="25%" bgcolor="${RED}" style="height:5px;line-height:5px;font-size:0;">&nbsp;</td>
        </tr></table>
      </td></tr>

      <tr><td style="padding:34px 30px 10px;">
        ${eyebrow ? `<p style="margin:0 0 8px;font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${LINK};">${escapeHtml(eyebrow)}</p>` : ''}
        <h1 style="margin:0 0 18px;font-family:${FONT};font-size:27px;line-height:1.2;font-weight:800;letter-spacing:-0.015em;color:${INK};">${escapeHtml(title)}</h1>
        ${body}
      </td></tr>

      <tr><td style="padding:26px 30px 30px;border-top:1px solid ${HAIRLINE};">
        <p style="margin:0;font-family:${FONT};font-size:13px;line-height:1.7;color:${MUTED};">
          ${contact || EMAIL_CLUB_NAME}<br>
          <a href="${SITE_URL}" style="color:${LINK};text-decoration:underline;">Ir a la web del club</a>
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body></html>`
}

export const p = (html: string): string =>
  `<p style="margin:0 0 15px;font-family:${FONT};font-size:16px;line-height:1.65;color:${INK};">${html}</p>`

export const muted = (html: string): string =>
  `<p style="margin:0 0 14px;font-family:${FONT};font-size:14px;line-height:1.6;color:${MUTED};">${html}</p>`

export const quote = (text: string): string =>
  `<div style="margin:0 0 16px;padding:16px 18px;background-color:${CANVAS};border-left:3px solid ${BLUE};border-radius:0 8px 8px 0;font-family:${FONT};font-size:15px;line-height:1.65;color:${INK};white-space:pre-wrap;">${escapeHtml(text)}</div>`

/** Enlace de texto con el azul accesible, no el de marca. */
export const link = (href: string, label: string): string =>
  `<a href="${escapeHtml(href)}" style="color:${LINK};font-weight:600;text-decoration:underline;">${escapeHtml(label)}</a>`
