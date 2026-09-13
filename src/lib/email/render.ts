import { SITE_URL } from '@/lib/site'

/**
 * Shell HTML de marca para los correos transaccionales.
 *
 * Template literals con estilos inline, no componentes React: los clientes de correo exigen
 * tablas y estilos en línea, y renderizar React aquí arrastraría `react-dom/server` al runtime
 * del CMS sin ganar nada para tres correos cortos.
 */

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

// Archivo no cargará en la mayoría de clientes de correo: Arial es el fallback real, así que
// la jerarquía se apoya en peso y tamaño, no en la familia.
const FONT = "Archivo, Arial, 'Helvetica Neue', Helvetica, sans-serif"

export type EmailFooter = {
  email?: string | null
  phone?: string | null
  address?: string | null
}

export const button = (href: string, label: string, color: 'blue' | 'red' = 'blue'): string => `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
    <tr><td bgcolor="${color === 'red' ? RED : BLUE}" style="border-radius:999px;">
      <a href="${escapeHtml(href)}" style="display:inline-block;padding:13px 28px;font-family:${FONT};font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px;">${escapeHtml(label)}</a>
    </td></tr>
  </table>`

export const dataRow = (label: string, value: unknown): string => `
  <tr>
    <td style="padding:6px 0;font-family:${FONT};font-size:14px;color:${MUTED};width:130px;vertical-align:top;">${escapeHtml(label)}</td>
    <td style="padding:6px 0;font-family:${FONT};font-size:14px;color:${INK};font-weight:600;">${escapeHtml(value)}</td>
  </tr>`

/** Envuelve el cuerpo (ya escapado) en la plantilla de marca. */
export const shell = (opts: { title: string; body: string; footer?: EmailFooter }): string => {
  const { title, body, footer } = opts
  const contact = [
    footer?.email ? `<a href="mailto:${escapeHtml(footer.email)}" style="color:${MUTED};">${escapeHtml(footer.email)}</a>` : null,
    footer?.phone ? escapeHtml(footer.phone) : null,
    footer?.address ? escapeHtml(footer.address) : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background-color:#f4f6f8;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f6f8;">
  <tr><td align="center" style="padding:24px 12px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:#ffffff;border-radius:14px;overflow:hidden;">

      <tr><td bgcolor="${BLACK}" style="padding:22px 28px;">
        <span style="font-family:${FONT};font-size:19px;font-weight:700;letter-spacing:-0.01em;color:#ffffff;">ABTR</span>
        <span style="font-family:${FONT};font-size:13px;color:#ffffff;opacity:0.65;">&nbsp;· Club de Running Albatera</span>
      </td></tr>
      <tr><td bgcolor="${YELLOW}" style="height:4px;line-height:4px;font-size:0;">&nbsp;</td></tr>

      <tr><td style="padding:32px 28px 8px;">
        <h1 style="margin:0 0 16px;font-family:${FONT};font-size:23px;line-height:1.25;font-weight:700;color:${INK};">${escapeHtml(title)}</h1>
        ${body}
      </td></tr>

      <tr><td style="padding:24px 28px 28px;border-top:1px solid #e6e9ee;">
        <p style="margin:0;font-family:${FONT};font-size:12px;line-height:1.6;color:${MUTED};">
          ${contact || 'Club de Running Albatera'}<br>
          <a href="${SITE_URL}" style="color:${MUTED};">${SITE_URL.replace(/^https?:\/\//, '')}</a>
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body></html>`
}

export const p = (html: string): string =>
  `<p style="margin:0 0 14px;font-family:${FONT};font-size:15px;line-height:1.65;color:${INK};">${html}</p>`

export const muted = (html: string): string =>
  `<p style="margin:0 0 14px;font-family:${FONT};font-size:13.5px;line-height:1.6;color:${MUTED};">${html}</p>`

export const quote = (text: string): string =>
  `<div style="margin:0 0 16px;padding:14px 16px;background-color:#f4f6f8;border-left:3px solid ${BLUE};border-radius:0 8px 8px 0;font-family:${FONT};font-size:14.5px;line-height:1.65;color:${INK};white-space:pre-wrap;">${escapeHtml(text)}</div>`
