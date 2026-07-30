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
