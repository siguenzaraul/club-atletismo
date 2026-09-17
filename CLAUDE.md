# CLAUDE.md — ABTR (Club de Running Albatera)

Web pública + CMS del club. **Está en producción con datos reales de socios** (emails,
teléfonos, hashes, y menores en la categoría `sub18`). Todo cambio debe ser retrocompatible.

## Stack

| Pieza | Qué |
|---|---|
| Framework | Next.js 15.5 App Router · React 19 · TypeScript |
| CMS | Payload 3.85 (mismo proyecto, no un servicio aparte) |
| BD | SQLite en local por defecto · **Postgres (Neon) en Vercel** |
| Estilos | Tailwind v4 (`@theme`, sin `tailwind.config`) · shadcn/ui registry `base-nova` sobre `@base-ui/react` |
| Tema | `next-themes`, `attribute="class"` |
| Uploads | Vercel Blob en deploys · disco local si no hay token |
| Correo | Resend (`@payloadcms/email-resend`), sólo si hay `RESEND_API_KEY` |
| Tests | Vitest (unit + integración) · Playwright (e2e) |

---

## ⚠️ Trampas del repo — léelas antes de tocar nada

Cada una de estas ya ha roto algo. No son teóricas.

### 1. `pnpm dev` puede conectarse a PRODUCCIÓN

`src/payload.config.ts` hace `process.env.DATABASE_URI || process.env.DATABASE_URL`.

La integración de Neon en Vercel define **`DATABASE_URL` apuntando a producción en los tres
entornos, incluido Development**. Si haces `vercel env pull`, eso acaba en `.env.local` y tu
`pnpm dev` escribe en la base de datos del club.

**Nunca hagas `vercel env pull` sobre `.env.local`.** Descarga a un fichero temporal fuera del
repo si necesitas alguna variable.

### 2. `pnpm dev` rompe el panel de admin en producción

Sin `BLOB_READ_WRITE_TOKEN` local, `pnpm dev` **regenera** `src/app/(payload)/admin/importMap.js`
y **borra** la entrada del shim `DisabledVercelBlobUploadHandler`. Si eso se commitea, el admin
se rompe en producción — ya pasó tres veces (commits `c560090`, `cd03e38`, `678f70f`).

**Después de cualquier `pnpm dev`, comprueba `git diff src/app/(payload)/admin/importMap.js`
y revierte si ha cambiado.** `pnpm build` no lo toca, sólo `dev`.

### 3. El esquema de producción NO se actualiza solo

`node_modules/@payloadcms/db-postgres/dist/connect.js:110` sólo hace push si
`NODE_ENV !== 'production'`. En Vercel nunca corre. Además el adaptador tiene ahora
`push: false` explícito.

**Un campo nuevo sin migración = `SELECT` de columnas inexistentes = 500 en esa colección.**
Ver "Flujo de migraciones" más abajo.

### 4. `.prose-abtr` va FUERA de `@layer`

`@plugin '@tailwindcss/typography'` registra `.prose` en la capa **utilities**. El orden de
capas **gana a la especificidad**: una regla en `@layer components` no puede sobrescribirla
por muchas clases que encadenes.

El bloque `.prose.prose-abtr` de `src/app/(frontend)/styles.css` está sin capa a propósito.
Si lo metes en un `@layer`, el modo oscuro del contenido del CMS se rompe en silencio.

### 5. `loading.tsx` convierte los 404 en 200

Un `loading.tsx` crea un límite de Suspense: la respuesta empieza a transmitirse y la cabecera
ya se ha enviado cuando la página llama a `notFound()`. Resultado: **soft 404** (200 con
contenido de "no encontrado"), que Google penaliza.

Y envuelve **todo su subárbol**: `eventos/loading.tsx` afecta también a `eventos/[slug]`.

**Sólo hay `loading.tsx` en segmentos sin rutas de detalle**: `equipo`, `patrocinadores`,
`resultados`. No añadas uno en `eventos`, `noticias`, `atletas` ni en la raíz del grupo.

### 6. Los colores computados son `oklch()`, no `rgb()`

El proyecto define casi todo en `oklch`/`oklab`. Cualquier test o script que lea
`getComputedStyle().color` y parsee `rgb()` **descartará en silencio justo los elementos rotos**.
`ctx.fillStyle` tampoco normaliza (Chromium devuelve `oklch()` tal cual).

Lo único fiable: **pintar el color en un canvas 1×1 y leer el píxel**. Ver
`tests/e2e/dark-mode.e2e.spec.ts`.

### 7. Los `select` de Payload son enums nativos de Postgres

Añadir un valor a `MEMBER_CATEGORIES`, `EVENT_SERIES`, `CONTACT_SUBJECTS`… exige
`ALTER TYPE … ADD VALUE`, que es irreversible en el `down()` de la migración.

**No los toques.** Para taxonomías que crecen, usa un valor canónico numérico o de texto libre
con un catálogo en TypeScript — como se hizo con las distancias (`src/lib/distances.ts`).

### 8. `collections/Members.ts` llega al bundle del navegador

`ProfileForm` y `DatosForm` (ambos `'use client'`) importan `MEMBER_CATEGORIES` de
`collections/Members.ts`. Eso arrastra al cliente **todo lo que ese fichero importe como valor**.

Una sola línea `import { APIError } from 'payload'` en un módulo que alcance `Members.ts` mete el
logger de Payload (pino) en el bundle y el build muere con
`Module not found: Can't resolve 'worker_threads'` — un error que no menciona ni Payload ni el
componente culpable.

**En `Members.ts` y en lo que él importe, `payload` sólo en `import type`.** Por eso
`blockIfReferenced` vive en `src/lib/cascade-guard.ts` y no en `src/lib/cascade.ts`. Lo mismo
aplica a `ContactMessages.ts` y `EquipmentDeliveries.ts`, que también los importan componentes de
cliente.

### 9. Borrar un documento referenciado revienta contra la BD

Payload declara las claves ajenas como `ON DELETE SET NULL`, pero las columnas de los campos
`required` son `NOT NULL`. Resultado: borrar un socio con cuota, un tipo de prenda que pregunta el
formulario de alta, una temporada, una prueba con resultados… fallaba con
`Failed query: delete from …`, que en el panel se ve como «algo ha fallado».

Cada padre resuelve esto en un `beforeDelete` (ver `src/lib/cascade.ts`): **arrastrar** lo que no
significa nada sin él, o **parar** con un mensaje que diga qué hay dentro. Si añades una relación
`required` nueva, añade también su regla, o acabas de romper el borrado del padre.
`tests/int/borrados.int.spec.ts` los cubre.

---

## Comandos

```bash
pnpm dev               # dev server (¡ojo trampas 1 y 2!)
pnpm build             # build de producción
pnpm start             # servir el build
pnpm exec tsc --noEmit # typecheck
pnpm lint
pnpm test:int          # vitest: tests/unit/** + tests/int/**
pnpm test:e2e          # playwright: tests/e2e/**
pnpm generate:types    # regenera src/payload-types.ts tras cambiar el esquema
pnpm generate:importmap
pnpm seed              # datos de ejemplo (idempotente)

pnpm migrate           # aplica migraciones pendientes
pnpm migrate:create <nombre>
pnpm migrate:status
pnpm migrate:down      # revierte la última
```

`vercel-build` = `payload migrate && pnpm run build`. Vercel lo prioriza sobre `build`, así que
las migraciones se aplican **una vez** antes del build. Si fallan, el build falla y **no hay
deploy**: el código viejo sigue sirviendo con el esquema viejo.

---

## Entorno local fiel a producción

No se puede copiar la BD de producción al SQLite local: son motores distintos y Payload genera
esquemas distintos (enums nativos, tablas de arrays). Lo que sí funciona:

```bash
docker run -d --name abtr-pg -e POSTGRES_PASSWORD=abtr -e POSTGRES_USER=abtr \
  -e POSTGRES_DB=abtr -p 55432:5432 postgres:17-alpine   # 17 = misma major que Neon

# volcado de producción (SOLO LECTURA) a un fichero temporal FUERA del repo
vercel env pull /tmp/prod.env --environment=production
PGURL=$(grep '^POSTGRES_URL_NON_POOLING=' /tmp/prod.env | cut -d= -f2- | tr -d '"')
docker exec -e PGURL="$PGURL" abtr-pg sh -c 'pg_dump "$PGURL" --schema=public --no-owner \
  --no-privileges --no-comments -f /tmp/prod.sql'
docker exec abtr-pg sh -c 'psql -U abtr -d abtr -c "DROP SCHEMA IF EXISTS public CASCADE;" \
  && psql -U abtr -d abtr -v ON_ERROR_STOP=1 -f /tmp/prod.sql'
```

Luego en `.env.local`: `DATABASE_URI=postgres://abtr:abtr@127.0.0.1:55432/abtr`.
El contenedor se llama `abtr-pg` (`docker start abtr-pg` para retomarlo).

Las imágenes viven en Blob; para verlas en local se descargan a `media/`:
`https://<storeId>.public.blob.vercel-storage.com/<filename>`, donde `<storeId>` es el 4º campo
de `BLOB_READ_WRITE_TOKEN` separado por `_`.

**El volcado trae datos personales reales.** Que no salga del portátil ni del `.gitignore`.

---

## Flujo de migraciones

`src/migrations/` contiene:
- `*_baseline.ts` — el esquema que producción **ya tenía**. Se marca como aplicado a mano, no
  se ejecuta nunca contra producción.
- `*_marcas_personales.ts` — el primer delta real.

### Añadir campos nuevos

1. Edita las colecciones.
2. `DATABASE_URI='postgres://…' pnpm migrate:create <nombre>` — **no se conecta a la BD**, diffea
   el último snapshot `.json` contra el esquema del config. Basta con que la URL empiece por
   `postgres`.
3. **Auditoría obligatoria del SQL generado.** Sólo puede contener:
   - `ALTER TABLE … ADD COLUMN` (nullable)
   - `CREATE TABLE` (para arrays/bloques nuevos)
   - `CREATE INDEX` / `CREATE UNIQUE INDEX` / `ADD CONSTRAINT … FOREIGN KEY`

   Si aparece `DROP`, `ALTER COLUMN … TYPE`, `SET NOT NULL` o `ALTER TYPE … ADD VALUE`:
   **para y corrige la definición del campo**.
4. Prueba contra la copia local: `pnpm migrate` y humo sobre las páginas afectadas.
5. Antes de producción: rama de Neon + `DATABASE_URI` de Preview apuntando a ella.
6. `pnpm generate:types`.

### Reglas de retrocompatibilidad

1. Sólo **añadir**. Cero renombrados, borrados ni cambios de tipo.
2. Todo campo nuevo a nivel de colección: **opcional/nullable**. (Dentro de un `array` nuevo sí
   pueden ser `required`: su tabla nace vacía.)
3. `unique: true` sólo sobre columna recién creada y toda a NULL.
4. Nada de `NOT NULL` sobre columnas existentes.

### La fila `batch = -1`

Cada dev-push inserta una fila `payload_migrations` con `name='dev', batch=-1`. Si existe,
**`payload migrate` abre un prompt interactivo y en un entorno sin TTY se queda colgado sin
aplicar nada** (comprobado: >200 s en silencio). Antes de adoptar migraciones en una base:

```sql
DELETE FROM payload_migrations WHERE batch = -1;
INSERT INTO payload_migrations (name, batch, created_at, updated_at)
VALUES ('<timestamp>_baseline', 1, now(), now());
```

### Rollback

| Situación | Acción |
|---|---|
| Falla el código, esquema OK | `vercel rollback`. Las columnas extra no molestan al código viejo |
| Hay que revertir el esquema | Rollback de código primero, luego `pnpm migrate:down` |
| Catástrofe | Restore de Neon a una rama previa |

`migrate:fresh` y `migrate:reset` **no** están en `package.json` a propósito.

---

## Mapa del código

```
src/
├─ access/index.ts     isStaff · isAdmin · isAdminOrEditor · anyone · adminOrOwn(campo)
│                      + variantes *FieldLevel
├─ actions/            Server Actions ('use server')
│   ├─ auth.ts         login · register · logout · getCurrentMember · inscribeAction
│   ├─ contact.ts      formulario de contacto (honeypot + avisos por correo)
│   ├─ gestion.ts      staff: requireStaff() + import CSV + backfill
│   └─ member.ts       perfil propio · perfil público · cancelar inscripción
├─ app/
│   ├─ (frontend)/     web pública + /socios + /gestion   ← root layout propio
│   └─ (payload)/      admin + API REST/GraphQL           ← root layout propio
├─ collections/        21 colecciones
├─ components/
│   ├─ admin/          Logo · Icon · Welcome · DisabledVercelBlobUploadHandler
│   ├─ gestion/        UI del backoffice de staff
│   ├─ site/           UI pública
│   ├─ theme/          ThemeProvider · ThemeToggle
│   └─ ui/             shadcn + wrappers propios (Stat, StatusBadge, EmptyState, PageHeader…)
├─ fields/slug.ts      slugField(campoOrigen) — text unique+index con beforeValidate
├─ globals/            HomePage · SiteSettings
├─ lib/                ver abajo
├─ migrations/         generadas por Payload — NO editar a mano
└─ seed/index.ts       datos de ejemplo, idempotente
```

**Nota:** hay **dos root layouts** (`(frontend)` y `(payload)`), no existe `src/app/layout.tsx`.
Eso condiciona dónde pueden vivir `not-found.tsx` y `global-error.tsx`.

### `src/lib/`

| Fichero | Qué |
|---|---|
| `payload.ts` | `getClient()` — Local API |
| `marks.ts` | `parseMarkToSeconds` · `formatMark` · `formatPace`. Nunca lanza, devuelve `null` |
| `distances.ts` | `STANDARD_DISTANCES` + `distanceLabel` · `metersFromSlug` · `parseDistanceToMeters` |
| `personal-bests.ts` | `mergePersonalBests` — función pura, marcas derivadas en lectura |
| `public-athletes.ts` | `PUBLIC_ATHLETE_SELECT` — **la única superficie pública de `members`** |
| `validation/register.ts` | `validateRegister` — compartida entre cliente y servidor |
| `email/` | `index.ts` (sendEmail) · `render.ts` (shell + escapeHtml) · `templates.ts` |
| `format.ts` | `formatDate` · `formatDateTime` · `seriesLabel` · `seriesColor` |
| `membership.ts` | `getCurrentSeason` · `paymentToMemberStatus` |
| `attributes.ts` · `equipment.ts` · `csv.ts` · `nav.ts` · `site.ts` · `slugify.ts` · `utils.ts` | |

### Colecciones con hooks

`Members` · `Results` · `EventRegistrations` · `Memberships` · `Seasons` · `MemberAttributes` ·
`EquipmentDeliveries` · `EquipmentStock`.

Patrón dominante: `beforeChange`/`afterChange` async con `req.payload`, `overrideAccess: true` y
**guard por `context`** para evitar recursión (`Seasons.ts`, `EventRegistrations.ts`).

En un hook de colección usa `originalDoc` para que un update parcial no borre campos derivados,
y pasa `req` a los `findByID` anidados para no salir de la transacción.

### Índices únicos (cierran carreras a nivel de BD)

`event-registrations` `[event, member]` · `memberships` `[member, season]` ·
`member-attributes` `[member, definition]` · `equipment-stock` `[item, size, season]` ·
`members.slug`.

---

## Privacidad de `members`

`members.read` es `adminOrOwn('id')` y **no se debe abrir**. Abrirlo expondría `/api/members` y
`/api/graphql` al anónimo, que podría paginar y **filtrar por campos que no se devuelven**
(`?where[phone][like]=…` funciona como oráculo aunque el campo no se serialice).

El perfil público se sirve por **proyección con lista blanca** en `src/lib/public-athletes.ts`:

```ts
export const PUBLIC_ATHLETE_SELECT = {
  name: true, slug: true, photo: true, category: true,
  publicBio: true, publicProfile: true, personalBests: true,
} as const
```

El `select` de Payload recorta **a nivel de query**: `phone`, `email`, `federationNumber`,
`hash` y `salt` ni se leen de la BD. Las funciones devuelven un tipo `PublicAthlete`, nunca el
documento crudo.

**Ampliar esa constante es una decisión deliberada.** `tests/int/public-profiles.int.spec.ts` y
`tests/e2e/atletas.e2e.spec.ts` comprueban que no se filtra nada.

`publicProfile` tiene `defaultValue: false`, así que la migración emite
`ADD COLUMN … DEFAULT false`: todos los socios existentes quedan privados a nivel de DDL.

**No uses `slugField('name')` en `members`**: su `beforeValidate` generaría slug para *todos* los
socios en su siguiente guardado y dos homónimos reventarían el índice único con un 500 en
`/socios/perfil`. El slug lo asigna `assignPublicSlug` sólo al publicar, desambiguando con
`-2`, `-3`…

---

## Reglas de color (ver `DESIGN.md` para el detalle)

**Por defecto, tokens semánticos**: `foreground` · `muted-foreground` · `border` · `card` ·
`muted` · `primary` · `destructive`.

**`abtr-*` sólo para color comprometido**: lo que debe verse igual en claro y oscuro (bandas
negras, azul de enlaces, rojo de CTA, amarillo sobre negro). Nunca texto de cuerpo, secundario,
bordes ni superficies.

| No usar en el sitio público | Usar |
|---|---|
| `text-abtr-ink/60` | `text-muted-foreground` |
| `text-abtr-ink/70` · `/80` | `text-foreground/80` |
| `text-abtr-ink` | `text-foreground` |
| `border-abtr-ink/*` | `border-border` |
| `bg-abtr-ink/*` | `bg-muted` |
| `bg-abtr-black text-white` (banda) | `band-ink` |

Dos clases propias en `styles.css`: **`.prose-abtr`** (obligatoria junto a `prose`, ver trampa 4)
y **`.band-ink`** (bandas negras con hairline en oscuro).

`tests/unit/theme/dark-mode-guard.spec.ts` congela estas reglas de forma estática.

---

## Correo

Configurado en `payload.config.ts` **sólo si** hay `RESEND_API_KEY` **y**
(`EMAIL_ENABLED=true` o `VERCEL_ENV=production`). Sin eso Payload usa su adaptador mock (loguea
a consola), así que `payload.sendEmail()` sigue siendo llamable y **ningún punto de llamada
necesita condicionales**. Un preview nunca escribe a un socio real.

`EMAIL_REDIRECT_TO` desvía **todo** el correo a una dirección con el destinatario real en el
asunto: imprescindible hasta que el dominio esté verificado en Resend.

| Correo | Dónde se dispara | Por qué ahí |
|---|---|---|
| Bienvenida | `registerAction` | `members` también se crea desde el panel y desde el seed; un hook mandaría bienvenidas en cada `pnpm seed` |
| Aviso de contacto + acuse | `sendContactAction` | Un solo creador |
| Confirmación de inscripción | hook `afterChange` de `EventRegistrations` | **Tres** creadores: `inscribeAction`, `registerAction` y el panel |

Reglas: `sendEmail` **nunca lanza**; todo envío se programa con `after()` de `next/server` (en
Postgres los `afterChange` corren dentro de la transacción, así aplazar evita mandar correo de
algo que luego revierte); `escapeHtml()` es **obligatorio** en todo dato de usuario.

---

## Tests

```
tests/
├─ unit/          Vitest + jsdom. Funciones puras y componentes (Testing Library)
├─ int/           Payload Local API real sobre SQLite.
│                 Cada fichero BORRA tests/.test.db en su beforeAll → fileParallelism: false
└─ e2e/           Playwright. webServer: pnpm dev con reuseExistingServer
```

`vitest.setup.ts` fuerza `DATABASE_URI=file:./tests/.test.db`.

Al crear un `event` en un test hay que pasar `series` (es `required`), o TypeScript se va por la
rama de draft con un error confuso sobre `draft: true`.

**Un test que no mide nada pasa siempre.** El de contraste (`tests/e2e/dark-mode.e2e.spec.ts`)
falla a propósito si algún color queda sin interpretar o si mide menos de 15 textos en una
página — porque ya dio verde una vez con el modo oscuro visiblemente roto.

---

## Convenciones de código

- `type` sobre `interface`. Uniones de literales, **nunca `enum`**. `as const satisfies`.
- Tipo de retorno explícito en funciones exportadas.
- Comentarios cortos que expliquen el **porqué** cuando no es obvio. Nada de ensayos.
- Español en la UI y en los comentarios nuevos; el código existente mezcla, no lo unifiques por
  unificar.
- Nunca editar autogenerados: `src/payload-types.ts`, `src/migrations/`,
  `src/app/(payload)/admin/importMap.js`.
- `pnpm`, nunca npm/yarn.

---

## Pendiente / decisiones abiertas

- **Recuperación de contraseña.** Hoy un socio que la olvida **no tiene ninguna salida**: el
  endpoint `forgotPassword` existe en `members` pero sin adaptador no enviaba nada. Con Resend
  ya montado queda a un paso: dos páginas + `auth: { forgotPassword: { generateEmailHTML } }`.
- **Paleta de marca y AA.** Tres combinaciones no llegan a 4.5:1 y están listadas como excepción
  conocida en el test e2e: blanco sobre `#009FE3` (2.97), `#009FE3` sobre blanco (2.97),
  `#E30613` sobre negro (4.30). Propuesta en `DESIGN.md`: un azul sólo para texto (`#007AB3`,
  4.74:1) manteniendo `#009FE3` para rellenos.
- **ISR.** Todas las páginas son `force-dynamic`: nada se cachea. Candidatas a `revalidate`:
  `/`, `/equipo`, `/patrocinadores`, `/noticias`, los detalles. Requiere emparejarlo con
  `revalidatePath` en los `afterChange`, o el club publica y no ve el cambio.
- **Backfill de resultados.** `/gestion/mantenimiento` normaliza `markSeconds` y `distanceMeters`
  de los resultados antiguos. Es idempotente y va por lotes de 200. **Hay que ejecutarlo en
  producción** tras desplegar, o las marcas personales no se calculan.
