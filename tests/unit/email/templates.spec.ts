import { describe, expect, it } from 'vitest'

import {
  contactAckEmail,
  contactNotificationEmail,
  paymentReportedEmail,
  registrationConfirmedEmail,
  welcomeEmail,
} from '@/lib/email/templates'
import { escapeHtml } from '@/lib/email/render'

const footer = { email: 'hola@abtr.run', phone: '600000000', address: 'Albatera' }

const payment = {
  formattedIban: 'ES49 3005 0050 0530 3295 0226',
  holder: 'Club de Running Albatera',
  concept: 'Cuota 2025/26 Ana Pérez',
  amount: 30,
  notes: null,
}

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

  describe('cuenta para el pago de la cuota', () => {
    const conPago = welcomeEmail({ name: 'Ana Pérez', membershipTypeName: 'Adulto', payment, footer })

    it('lleva IBAN, titular, concepto e importe en HTML y en texto plano', () => {
      for (const version of [conPago.html, conPago.text]) {
        expect(version).toContain('ES49 3005 0050 0530 3295 0226')
        expect(version).toContain('Club de Running Albatera')
        expect(version).toContain('Cuota 2025/26 Ana Pérez')
        expect(version).toMatch(/30,00/)
      }
    })

    it('explica cómo avisar al club del ingreso', () => {
      expect(conPago.html).toMatch(/Ya he hecho el ingreso/)
      expect(conPago.text).toMatch(/Ya he hecho el ingreso/)
    })

    it('omite la cuenta cuando el tipo de socio no paga', () => {
      const exento = welcomeEmail({ name: 'Ana', membershipTypeName: 'Honorífico', footer })
      expect(exento.html).not.toContain('ES49')
      expect(exento.text).not.toContain('ES49')
    })

    it('funciona sin importe y escapa las instrucciones del CMS', () => {
      const sinImporte = welcomeEmail({
        name: 'Ana',
        payment: { ...payment, amount: null, notes: '<b>Antes del 31</b>' },
        footer,
      })
      expect(sinImporte.html).not.toMatch(/Importe:/)
      expect(sinImporte.html).toContain('&lt;b&gt;Antes del 31&lt;/b&gt;')
      expect(sinImporte.html).not.toContain('<b>Antes del 31</b>')
    })
  })
})

describe('paymentReportedEmail', () => {
  const mail = paymentReportedEmail({
    memberId: 42,
    memberName: 'Ana Pérez',
    memberEmail: 'ana@ejemplo.com',
    memberPhone: '600111222',
    seasonName: '2025/26',
    membershipTypeName: 'Adulto',
    amount: 30,
    concept: 'Cuota 2025/26 Ana Pérez',
    footer,
  })

  it('identifica al socio y enlaza a su ficha de gestión', () => {
    expect(mail.subject).toContain('Ana Pérez')
    expect(mail.html).toContain('/gestion/42')
    expect(mail.text).toContain('/gestion/42')
    expect(mail.html).toContain('ana@ejemplo.com')
  })

  it('deja claro que la cuota sigue pendiente hasta que el club la confirme', () => {
    expect(mail.html).toMatch(/pendiente/i)
    expect(mail.text).toMatch(/pendiente/i)
  })

  it('escapa el nombre del socio, que es dato de usuario', () => {
    const hostil = paymentReportedEmail({
      memberId: 1,
      memberName: '<script>alert(1)</script>',
      memberEmail: 'x@y.z',
      concept: 'Cuota',
    })
    expect(hostil.html).not.toContain('<script>')
    expect(hostil.html).toContain('&lt;script&gt;')
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

/**
 * Accesibilidad del shell, aplicada a los CUATRO correos.
 *
 * Son reglas mecánicas de la guía de correo accesible: si alguien añade una plantilla nueva o
 * toca el shell, esto las mantiene. La comprobación que NO se puede automatizar —que el texto
 * alternativo describa la imagen, o que la jerarquía tenga sentido— sigue siendo a ojo.
 */
describe('accesibilidad del shell', () => {
  const todos = [
    ['bienvenida', welcomeEmail({ name: 'Ana Pérez', membershipTypeName: 'Adulto', eventTitle: 'ALBATERUN', footer })],
    ['bienvenida mínima', welcomeEmail({ name: 'Ana', footer })],
    ['bienvenida con cuenta de pago', welcomeEmail({ name: 'Ana Pérez', payment, footer })],
    [
      'aviso de pago',
      paymentReportedEmail({
        memberId: 7,
        memberName: 'Ana Pérez',
        memberEmail: 'ana@ejemplo.com',
        seasonName: '2025/26',
        concept: 'Cuota 2025/26 Ana Pérez',
        footer,
      }),
    ],
    ['aviso de contacto', contactNotificationEmail({ name: 'Ana', email: 'a@b.c', subjectLabel: 'Dudas', message: 'Hola', footer })],
    ['acuse de contacto', contactAckEmail({ name: 'Ana', message: 'Hola', footer })],
    ['inscripción', registrationConfirmedEmail({ name: 'Ana', eventTitle: 'ALBATERUN', eventSlug: 'albaterun', footer })],
  ] as const

  for (const [nombre, mail] of todos) {
    describe(nombre, () => {
      it('declara idioma y dirección en <html> y en los hijos de <body>', () => {
        // Varios clientes borran los atributos de <html>: por eso van duplicados.
        expect(mail.html).toContain('<html lang="es" dir="ltr">')
        expect(mail.html).toContain('<body lang="es" dir="ltr"')
        expect(mail.html).toMatch(/<div lang="es" dir="ltr"/)
      })

      it('tiene un <title> propio del correo, no la marca', () => {
        const title = mail.html.match(/<title>(.*?)<\/title>/)?.[1]
        expect(title).toBeTruthy()
        expect(title).not.toBe('ABTR')
        expect(title!.length).toBeGreaterThan(10)
      })

      it('marca todas las tablas de maquetación como presentacionales', () => {
        const tablas = mail.html.match(/<table(?![^>]*role="presentation")[^>]*>/g) ?? []
        expect(tablas).toEqual([])
      })

      it('tiene exactamente un <h1>', () => {
        expect(mail.html.match(/<h1[\s>]/g) ?? []).toHaveLength(1)
      })

      it('no usa textos de enlace vacíos de significado', () => {
        const textos = [...mail.html.matchAll(/<a\b[^>]*>(.*?)<\/a>/gs)].map((m) =>
          m[1].replace(/<[^>]*>/g, '').trim(),
        )
        expect(textos.length).toBeGreaterThan(0)
        for (const t of textos) {
          expect(t).not.toBe('')
          expect(t.toLowerCase()).not.toMatch(/^(clic|click|pincha|aquí|here|leer más|ver más)$/)
        }
      })

      it('manda también una versión en texto plano con contenido', () => {
        expect(mail.text.trim().length).toBeGreaterThan(40)
        expect(mail.text).not.toContain('<')
      })

      it('no fuerza el modo oscuro del cliente sobre la paleta de marca', () => {
        expect(mail.html).toContain('name="color-scheme" content="light"')
      })
    })
  }

  it('el correo de bienvenida lleva texto de vista previa propio', () => {
    // Sin preheader el cliente enseña el principio del HTML, que aquí es la cabecera.
    const mail = welcomeEmail({ name: 'Ana', footer })
    const pre = mail.html.match(/mso-hide:all;">(.*?)<\/div>/)?.[1]
    expect(pre).toBeTruthy()
    expect(pre).not.toBe(mail.subject)
  })

  it('el botón principal no usa el azul de marca como fondo de texto', () => {
    // Blanco sobre #009fe3 da 2.97:1 y el texto del botón no llega al umbral de «texto grande».
    const mail = welcomeEmail({ name: 'Ana', footer })
    const botones = [...mail.html.matchAll(/<td bgcolor="(#[0-9a-f]{6})"[^>]*border-radius:999px/gi)]
    expect(botones.length).toBeGreaterThan(0)
    for (const b of botones) expect(b[1].toLowerCase()).not.toBe('#009fe3')
  })
})
