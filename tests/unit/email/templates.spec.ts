import { describe, expect, it } from 'vitest'

import {
  contactAckEmail,
  contactNotificationEmail,
  registrationConfirmedEmail,
  welcomeEmail,
} from '@/lib/email/templates'
import { escapeHtml } from '@/lib/email/render'

const footer = { email: 'hola@abtr.run', phone: '600000000', address: 'Albatera' }

describe('escapeHtml', () => {
  it('neutraliza el HTML de datos de usuario', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;',
    )
    expect(escapeHtml(`"' & <`)).toBe('&quot;&#39; &amp; &lt;')
  })

  it('trata null y undefined como vacío', () => {
    expect(escapeHtml(null)).toBe('')
    expect(escapeHtml(undefined)).toBe('')
  })
})

describe('welcomeEmail', () => {
  const mail = welcomeEmail({ name: 'Ana Pérez', membershipTypeName: 'Socio adulto', footer })

  it('saluda por el nombre de pila y nombra el tipo de socio', () => {
    expect(mail.subject).toContain('Bienvenido')
    expect(mail.html).toContain('Ana')
    expect(mail.html).toContain('Socio adulto')
  })

  it('lleva CTA a la zona de socio y versión en texto plano', () => {
    expect(mail.html).toContain('/socios')
    expect(mail.text.length).toBeGreaterThan(0)
    expect(mail.text).not.toContain('<')
  })

  it('menciona el evento cuando el alta viene de una inscripción', () => {
    const withEvent = welcomeEmail({ name: 'Ana', eventTitle: 'ALBATERUN 5K', footer })
    expect(withEvent.html).toContain('ALBATERUN 5K')
    expect(withEvent.text).toContain('ALBATERUN 5K')
  })
})

describe('contactNotificationEmail', () => {
  it('escapa el mensaje del formulario público', () => {
    const mail = contactNotificationEmail({
      name: '<b>Mallory</b>',
      email: 'mallory@ejemplo.com',
      subjectLabel: 'Consulta general',
      message: '<script>alert("xss")</script>',
      footer,
    })
    expect(mail.html).not.toContain('<script>')
    expect(mail.html).not.toContain('<b>Mallory</b>')
    expect(mail.html).toContain('&lt;script&gt;')
  })

  it('incluye el asunto y un enlace para responder', () => {
    const mail = contactNotificationEmail({
      name: 'Ana',
      email: 'ana@ejemplo.com',
      subjectLabel: 'Patrocinio',
      message: 'Hola',
      footer,
    })
    expect(mail.subject).toContain('Patrocinio')
    expect(mail.html).toContain('mailto:ana@ejemplo.com')
  })
})

describe('contactAckEmail', () => {
  it('devuelve el mensaje del remitente ya escapado', () => {
    const mail = contactAckEmail({ name: 'Ana', message: '<i>hola</i>', footer })
    expect(mail.subject).toBe('Hemos recibido tu mensaje')
    expect(mail.html).toContain('&lt;i&gt;hola&lt;/i&gt;')
    expect(mail.html).not.toContain('<i>hola</i>')
  })
})

describe('registrationConfirmedEmail', () => {
  const mail = registrationConfirmedEmail({
    name: 'Ana Pérez',
    eventTitle: 'ALBATERUN 5K',
    eventDate: '2026-10-04T09:00:00.000Z',
    eventLocation: 'Albatera',
    eventSlug: 'albaterun-5k',
    footer,
  })

  it('nombra la prueba en el asunto y enlaza al evento', () => {
    expect(mail.subject).toContain('ALBATERUN 5K')
    expect(mail.html).toContain('/eventos/albaterun-5k')
  })

  it('formatea la fecha en español', () => {
    expect(mail.html).toMatch(/octubre/i)
    expect(mail.text).toMatch(/octubre/i)
  })

  it('funciona sin fecha ni lugar', () => {
    const bare = registrationConfirmedEmail({ name: 'Ana', eventTitle: 'Social Run' })
    expect(bare.html).toContain('Social Run')
    expect(bare.text).toContain('Social Run')
  })
})
