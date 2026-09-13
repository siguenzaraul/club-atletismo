import { test, expect, type Page } from '@playwright/test'

/**
 * Red de seguridad real del modo oscuro: en vez de comprobar clases, mide el contraste
 * efectivo del texto ya renderizado. Captura toda la familia de fallos (prose, hero, pills,
 * bandas), no sólo el caso conocido de los títulos del CMS.
 */

const BASE = 'http://localhost:3000'

const forceDark = async (page: Page) => {
  // `storageKey` por defecto de next-themes.
  await page.addInitScript(() => window.localStorage.setItem('theme', 'dark'))
}

type Offender = { text: string; ratio: number; color: string; background: string; tag: string }
type Measurement = { offenders: Offender[]; unparsed: string[]; measured: number }

/** Recorre el texto visible y devuelve lo que no llega al mínimo WCAG AA. */
const measureContrast = (page: Page): Promise<Measurement> =>
  page.evaluate(() => {
    const srgb = (c: number) => {
      const s = c / 255
      return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
    }

    // Los colores computados llegan en el formato en que se declararon, y este proyecto usa
    // `oklch()`/`oklab()`. Un parser de `rgb()` los descartaba EN SILENCIO — y eran justo los
    // elementos rotos, por eso el test daba verde con el modo oscuro roto a la vista.
    // Tampoco vale normalizar con `ctx.fillStyle`: Chromium devuelve `oklch()` sin convertir.
    // Lo único fiable es pintar el color y leer el píxel: sirve para cualquier color que el
    // navegador sepa renderizar, presente o futuro.
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    const ctx2d = canvas.getContext('2d', { willReadFrequently: true })!
    const unparsed = new Set<string>()
    const cache = new Map<string, [number, number, number, number] | null>()

    const parse = (value: string): [number, number, number, number] | null => {
      const v = (value || '').trim()
      if (!v || v === 'transparent' || v === 'none') return [0, 0, 0, 0]
      if (cache.has(v)) return cache.get(v)!

      let result: [number, number, number, number] | null = null
      ctx2d.clearRect(0, 0, 1, 1)
      ctx2d.fillStyle = '#000000'
      ctx2d.fillStyle = v
      // Si el navegador no entiende el color, `fillStyle` se queda en el negro anterior.
      if (ctx2d.fillStyle !== '#000000' || /^(#000000|black|rgb\(0, ?0, ?0\))$/i.test(v)) {
        ctx2d.fillRect(0, 0, 1, 1)
        const [r, g, b, a] = ctx2d.getImageData(0, 0, 1, 1).data
        result = [r, g, b, a / 255]
      } else {
        // Nunca saltarse un color en silencio: se reporta para que el test falle.
        unparsed.add(v)
      }

      cache.set(v, result)
      return result
    }
    const luminance = (rgb: [number, number, number]) =>
      0.2126 * srgb(rgb[0]) + 0.7152 * srgb(rgb[1]) + 0.0722 * srgb(rgb[2])

    /** Sube por los ancestros hasta encontrar un fondo no transparente. */
    const effectiveBg = (el: Element): [number, number, number] => {
      let node: Element | null = el
      while (node) {
        const parsed = parse(getComputedStyle(node).backgroundColor)
        if (parsed && parsed[3] > 0.5) return [parsed[0], parsed[1], parsed[2]]
        node = node.parentElement
      }
      return [0, 0, 0]
    }

    const out: Offender[] = []
    let measured = 0
    const nodes = document.querySelectorAll('h1, h2, h3, h4, p, li, a, td, th, strong, label, span')

    for (const el of Array.from(nodes)) {
      const text = (el.textContent ?? '').trim()
      if (!text || text.length > 200) continue
      // Sólo nodos con texto propio, para no contar dos veces los contenedores.
      const ownText = Array.from(el.childNodes).some(
        (n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? '').trim().length > 0,
      )
      if (!ownText) continue

      const rect = el.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) continue
      const style = getComputedStyle(el)
      if (style.visibility === 'hidden' || style.opacity === '0') continue
      // Los enlaces de "saltar al contenido" viven fuera de pantalla hasta recibir foco.
      if (rect.bottom < 0 || rect.right < 0) continue

      const fg = parse(style.color)
      if (!fg || fg[3] < 0.5) continue
      const bg = effectiveBg(el)

      // Mezcla el alfa del texto sobre su fondo para medir el color realmente percibido.
      const blended: [number, number, number] = [
        fg[0] * fg[3] + bg[0] * (1 - fg[3]),
        fg[1] * fg[3] + bg[1] * (1 - fg[3]),
        fg[2] * fg[3] + bg[2] * (1 - fg[3]),
      ]

      measured++
      const l1 = luminance(blended)
      const l2 = luminance(bg)
      const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)

      const size = parseFloat(style.fontSize)
      const weight = parseInt(style.fontWeight, 10) || 400
      const isLarge = size >= 24 || (size >= 18.66 && weight >= 700)
      const min = isLarge ? 3 : 4.5

      if (ratio < min) {
        out.push({
          text: text.slice(0, 60),
          ratio: Math.round(ratio * 100) / 100,
          color: style.color,
          background: `rgb(${bg.map(Math.round).join(',')})`,
          tag: el.tagName.toLowerCase(),
        })
      }
    }
    return { offenders: out, unparsed: [...unparsed], measured }
  })

/**
 * Combinaciones de la PALETA DE MARCA que no llegan a AA y que son anteriores a este trabajo.
 * No se silencian por comodidad: se listan aquí para que el test siga detectando regresiones
 * nuevas mientras el club decide si retoca la paleta. Arreglarlas cambia el aspecto del sitio,
 * así que es una decisión de marca, no técnica.
 *
 *   blanco sobre #009FE3 → 2.97:1   (CTA "Corre con nosotros", etiqueta "Social Run")
 *   #009FE3 sobre blanco → 2.97:1   (enlace "Hazte socio")
 *   #E30613 sobre negro  → 4.30:1   (aviso "Inscripciones abiertas")
 *
 * Propuesta: un tono de azul sólo para TEXTO (#007AB3 da 4.74:1 sobre blanco) manteniendo
 * #009FE3 para rellenos grandes, que es donde vive la identidad.
 */
const KNOWN_BRAND_ISSUES: { color: string; background: string }[] = [
  { color: 'rgb(255, 255, 255)', background: 'rgb(0,159,227)' },
  { color: 'rgb(0, 159, 227)', background: 'rgb(255,255,255)' },
  { color: 'rgb(227, 6, 19)', background: 'rgb(0,0,0)' },
]

const isKnownBrandIssue = (o: Offender) =>
  KNOWN_BRAND_ISSUES.some((k) => k.color === o.color && k.background === o.background)

const ROUTES = ['/', '/eventos', '/resultados', '/equipo', '/atletas', '/noticias', '/patrocinadores', '/contacto']

for (const route of ROUTES) {
  test(`modo oscuro: contraste AA en ${route}`, async ({ page }) => {
    await forceDark(page)
    await page.goto(`${BASE}${route}`)
    await expect(page.locator('html')).toHaveClass(/dark/)
    await page.waitForLoadState('networkidle')

    const { offenders, unparsed, measured } = await measureContrast(page)

    // Un test que no mide nada pasa siempre. Estas dos comprobaciones son las que impiden
    // que vuelva a dar verde con el modo oscuro visiblemente roto.
    expect(unparsed, `Colores que el test no supo interpretar en ${route}`).toEqual([])
    expect(measured, `No se midió apenas texto en ${route}: el test no vale para nada`).toBeGreaterThan(15)

    const real = offenders.filter((o) => !isKnownBrandIssue(o))
    expect(
      real,
      `Texto con contraste insuficiente en ${route}:\n${JSON.stringify(real, null, 2)}`,
    ).toEqual([])
  })
}

test('modo oscuro: el rich text del CMS se lee en la home', async ({ page }) => {
  await forceDark(page)
  await page.goto(BASE)
  await page.waitForLoadState('networkidle')

  const prose = page.locator('.prose').first()
  if ((await prose.count()) === 0) test.skip(true, 'La home no tiene contenido rich text')

  // El bug original: los títulos dentro de `prose` se quedaban en gris casi negro.
  await expect(prose).toHaveClass(/prose-abtr/)
  const { offenders, unparsed, measured } = await measureContrast(page)
  expect(unparsed).toEqual([])
  expect(measured).toBeGreaterThan(15)

  // El bug era este: cuerpo y titulares del rich text en gris casi negro sobre fondo oscuro.
  const inProse = offenders.filter((o) => !isKnownBrandIssue(o))
  expect(inProse, JSON.stringify(inProse, null, 2)).toEqual([])
})
