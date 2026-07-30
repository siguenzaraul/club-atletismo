# ABTR — Club de Running Albatera

Web pública + CMS para el club de atletismo **ABTR**. Construido con **Next.js 15
(App Router)** y **Payload CMS 3** en un único proyecto, listo para desplegar en **Vercel**.

- Web pública en React (landing, eventos, carrera ALBATERUN, resultados, equipo, noticias, patrocinadores).
- Panel de administración estilo WordPress en `/admin` (Payload).
- Zona privada de socios con login propio (`/socios`).
- Patrocinadores globales, del club y de la carrera principal, con cinco tiers
  visuales y asignaciones específicas por evento.

## Requisitos

- Node 20+ (este repo fija 22.14.0 en `.tool-versions`).
- pnpm 9/10/11.

## Desarrollo local

```bash
pnpm install
pnpm seed     # crea la BD SQLite local + datos de ejemplo
pnpm dev      # http://localhost:3000  ·  admin en /admin
```

Base de datos en local: **SQLite** (`club-atletismo.db`), sin servicios externos.
En Vercel se usa **Postgres** automáticamente (ver despliegue).

### Credenciales de ejemplo (tras `pnpm seed`)

- Admin (staff): `admin@abtr.run` / `changeme123`
- Socio: `socio@abtr.run` / `changeme123`

## Comandos

```bash
pnpm dev               # servidor de desarrollo
pnpm build             # build de producción
pnpm lint              # ESLint
pnpm exec tsc --noEmit # typecheck
pnpm test:int          # tests unit + integración (Vitest)
pnpm test:e2e          # tests e2e (Playwright; requiere `pnpm exec playwright install`)
pnpm generate:types    # regenera src/payload-types.ts tras cambiar el esquema
pnpm generate:importmap
pnpm seed              # siembra datos (idempotente)
```

## Variables de entorno

| Variable | Local | Vercel |
|----------|-------|--------|
| `DATABASE_URI` | vacío → SQLite | URL de Postgres (Neon) |
| `PAYLOAD_SECRET` | cualquiera | secreto fuerte |
| `BLOB_READ_WRITE_TOKEN` | vacío → disco | lo provee la integración Vercel Blob |

El adaptador de base de datos se elige solo: si `DATABASE_URI` empieza por `postgres`
usa Postgres; si no, SQLite (`src/payload.config.ts`).

## Despliegue en Vercel

1. Provisiona **Neon Postgres** y **Vercel Blob** desde el Marketplace del proyecto.
2. Configura `PAYLOAD_SECRET` y verifica que `DATABASE_URI`/`BLOB_READ_WRITE_TOKEN`
   estén presentes en el entorno.
3. `pnpm build` se ejecuta en Vercel; los uploads van a Blob (el FS de Vercel es efímero).

## Identidad de marca

Tokens en `src/app/(frontend)/styles.css` (negro `#000`, azul `#009FE3`, rojo `#E30613`,
amarillo `#FFED00`). Tipografía display provisional (Archivo Black) hasta incorporar el
woff2 con licencia de **Krabby Patty**. El emblema 2×2 es el componente `BrandPattern`.
Sube los logos SVG (claro/oscuro) desde **Ajustes del sitio** en el admin.

## Licencia

Este proyecto se distribuye bajo la [licencia MIT](LICENSE).
