# Design

Visual system for ABTR — Club de corredores Albatera. Source of truth: the 2026 brand
manual. Tokens live in `src/app/(frontend)/styles.css` (Tailwind v4 `@theme`).

## Theme

Light by default (paper white), with full-bleed **committed/drenched** color blocks:
hero on black, CTA on blue, footer on black. The body is white so the four brand colors
hit hard where they land. This is a brand surface — color carries identity.

## Color

OKLCH-friendly hex from the manual (used as-is for brand fidelity):

- `--color-abtr-black` `#000000` — primary ink, hero/footer backgrounds.
- `--color-abtr-blue` `#009FE3` — primary accent, links, CTA band, Social Run tag.
- `--color-abtr-red` `#E30613` — action/urgency (inscríbete, hazte socio), carrera tag.
- `--color-abtr-yellow` `#FFED00` — highlight on dark only; club tag (with black text).
- `--color-abtr-ink` `#111` / `--color-abtr-paper` `#fff` — text/surface.

Contrast rules: never yellow text on white. Muted text uses `abtr-ink/60–70`, not light
gray. On colored bands, text is white or black, not gray.

## Typography

- Una sola familia para titulares, logotipo, cuerpo y UI: **Archivo**, grotesca neutra de
  formas compactas y “a” de dos pisos. Bound to `--font-display` y `--font-sans`.
- Cuerpo en 400, navegación/controles en 600 y titulares en 700. Uppercase para los grandes
  titulares de marca, tracking ~-0.015em (nunca menor de -0.04em) y clamp máximo ~6rem.
- Longitud de línea 65–75ch y `text-wrap: balance` en h1–h3.

## Components

- `BrandPattern` — 2×2 Bauhaus module (half-circles + circles) = runner motif. Decorative
  system element: hero, section accents, avatars. Color / mono-light / mono-dark variants.
- `SponsorsBlock` — reusable sponsor strip (grayscale→color on hover), used on home,
  `/carrera`, each event and the footer.
- `EventCard` — image + series tag (color-coded) + date + location, registration nudge.
- `SiteHeader` (sticky, blur) / `SiteFooter` (black, sponsors + contact).

## Layout

- Max width 6xl (`72rem`) for content, generous vertical rhythm between full-bleed bands.
- Radius: cards 16px (`rounded-2xl`), pills for tags/buttons. No 32px+ over-rounding.
- Responsive grids: `sm:grid-cols-2 lg:grid-cols-3`.

## Motion

Intentional, ease-out, no bounce. Card image scale on hover, sponsor grayscale fade,
subtle reveal on scroll for sections. Every animation has a `prefers-reduced-motion`
fallback (crossfade/instant). Content is visible by default; reveals only enhance.

## Dark mode y reglas de color

El tema se controla con `next-themes` (`attribute="class"`, `.dark` en `<html>`). Todos los
tokens semánticos se voltean solos en `.dark`; los tokens de marca (`--color-abtr-*`) no.

**Por defecto: tokens semánticos.** Todo lo que deba adaptarse al tema usa
`background` / `foreground` / `card` / `muted` / `muted-foreground` / `border` / `input` /
`primary` / `destructive` / `ring`.

**`abtr-*` sólo para color comprometido**, es decir, lo que debe verse igual en claro y en
oscuro: bandas negras, azul de enlaces y acentos, rojo de CTA, amarillo sobre negro. Nunca
para texto de cuerpo, texto secundario, bordes ni superficies.

| No usar en el sitio público | Usar |
|---|---|
| `text-abtr-ink` | `text-foreground` |
| `text-abtr-ink/70` · `/80` | `text-foreground/80` |
| `text-abtr-ink/60` | `text-muted-foreground` |
| `border-abtr-ink/10` · `/15` · `/20` | `border-border` (o `border-input` en controles) |
| `bg-abtr-ink/5` · `/10` | `bg-muted` |
| `bg-abtr-black text-white` (banda) | `band-ink` |

No es sólo coherencia: `abtr-ink/60` sobre blanco da ≈4.0:1, por debajo del objetivo AA de
4.5:1 que fija `PRODUCT.md`. `--muted-foreground` da ≈4.8:1 en claro y ≈8:1 en oscuro.

### Dos clases propias

- **`.prose-abtr`** — obligatoria junto a `prose` en **todo** rich text del CMS. Mapea las
  variables de `@tailwindcss/typography` a los tokens semánticos, así que no hace falta
  `dark:prose-invert`: un solo juego de reglas sirve para los dos temas y no se pueden
  desincronizar. Sin ella, los títulos salen en gris casi negro sobre el fondo oscuro.

  **Está declarada FUERA de `@layer` a propósito.** `@plugin '@tailwindcss/typography'`
  registra `.prose` en la capa `utilities`, que va después de `components`, y **el orden de
  capas gana a la especificidad**: una regla en `components` no puede sobrescribirla por
  muchas clases que encadene. El CSS sin capa gana a todo lo que esté en una capa. Si mueves
  ese bloque dentro de un `@layer`, el modo oscuro del contenido del CMS vuelve a romperse
  sin que nada avise en tiempo de compilación.
- **`.band-ink`** — bandas negras de marca (footer, hero de evento, 404, cabecera de
  contacto). Se quedan negras en ambos temas a propósito; en oscuro añaden una hairline
  para que sigan leyéndose como banda contra el fondo.

Dos tests congelan estas reglas: `tests/unit/theme/dark-mode-guard.spec.ts` (estático) y
`tests/e2e/dark-mode.e2e.spec.ts`, que fuerza el tema oscuro y mide el contraste real de
cada texto renderizado contra el mínimo WCAG AA.

Ojo con el segundo: los colores computados llegan en el formato en que se declararon, y aquí
casi todo es `oklch()`/`oklab()`. Un parser de `rgb()` los descarta **en silencio** y el test
pasa con el modo oscuro roto a la vista — pasó exactamente eso. Tampoco vale normalizar con
`ctx.fillStyle`, que en Chromium devuelve `oklch()` sin convertir: hay que **pintar el color y
leer el píxel**. Por eso el test falla si algún color queda sin interpretar o si mide menos de
15 textos en una página.

### Pendiente: paleta de marca

Tres combinaciones de la paleta no llegan a AA y están listadas como excepción conocida en
el test e2e, a la espera de una decisión de marca:

| Combinación | Ratio | Mínimo |
|---|---|---|
| blanco sobre `#009FE3` | 2.97:1 | 3.0 (texto grande) |
| `#009FE3` sobre blanco | 2.97:1 | 4.5 |
| `#E30613` sobre negro | 4.30:1 | 4.5 |

Propuesta: un azul sólo para **texto** (`#007AB3` da 4.74:1 sobre blanco), manteniendo
`#009FE3` para rellenos grandes, que es donde vive la identidad.
