/**
 * Catálogo de distancias.
 *
 * La distancia se guarda en la base de datos como **metros** (`distanceMeters`), no como un
 * `select`. Los `select` de Payload compilan a enums nativos de Postgres, así que añadir una
 * distancia exigiría un `ALTER TYPE … ADD VALUE` irreversible dentro de la transacción de
 * migración. Con metros, **añadir una distancia nueva es una línea en este array y nada más**:
 * cero migraciones, y las distancias libres (trail, 7,5 km) funcionan sin estar catalogadas.
 */

export type DistanceKind = 'ruta' | 'pista' | 'trail'

export type StandardDistance = {
  readonly meters: number
  readonly label: string
  readonly slug: string
  readonly kind: DistanceKind
}

export const STANDARD_DISTANCES = [
  { meters: 1500, label: '1.500 m', slug: '1500', kind: 'pista' },
  { meters: 3000, label: '3.000 m', slug: '3000', kind: 'pista' },
  { meters: 5000, label: '5K', slug: '5k', kind: 'ruta' },
  { meters: 10000, label: '10K', slug: '10k', kind: 'ruta' },
  { meters: 15000, label: '15K', slug: '15k', kind: 'ruta' },
  { meters: 21097, label: 'Media maratón', slug: 'media-maraton', kind: 'ruta' },
  { meters: 42195, label: 'Maratón', slug: 'maraton', kind: 'ruta' },
] as const satisfies readonly StandardDistance[]

export type DistanceSlug = (typeof STANDARD_DISTANCES)[number]['slug']

/** Las cuatro que se destacan en las fichas públicas de atleta. */
export const FEATURED_DISTANCE_METERS = [5000, 10000, 21097, 42195] as const

const byMeters = new Map<number, StandardDistance>(STANDARD_DISTANCES.map((d) => [d.meters, d]))

/** Etiqueta del catálogo, o una derivada legible ("7,5 km", "800 m") si no está catalogada. */
export const distanceLabel = (meters: number | null | undefined): string => {
  if (typeof meters !== 'number' || !Number.isFinite(meters) || meters <= 0) return '—'
  const known = byMeters.get(meters)
  if (known) return known.label
  if (meters < 1000) return `${meters} m`
  const km = meters / 1000
  return `${km.toLocaleString('es-ES', { maximumFractionDigits: 3 })} km`
}

/** Slug del catálogo, o `m-<metros>` para las libres, de modo que sirva en una URL. */
export const distanceSlugFor = (meters: number): string => byMeters.get(meters)?.slug ?? `m-${meters}`

/** Inversa de `distanceSlugFor`. Devuelve `null` si el slug no es reconocible. */
export const metersFromSlug = (slug: string | null | undefined): number | null => {
  if (!slug) return null
  const known = STANDARD_DISTANCES.find((d) => d.slug === slug)
  if (known) return known.meters
  const free = /^m-(\d+)$/.exec(slug)
  if (free) {
    const n = Number(free[1])
    return Number.isFinite(n) && n > 0 ? n : null
  }
  return null
}

/**
 * Interpreta la distancia escrita a mano en un CSV o un formulario.
 * Acepta "10k", "10 km", "10.000", "21097", "media maraton", "42,195 km".
 * Devuelve `null` si no es interpretable (nunca lanza).
 */
export const parseDistanceToMeters = (raw: string | number | null | undefined): number | null => {
  if (typeof raw === 'number') return Number.isFinite(raw) && raw > 0 ? Math.round(raw) : null
  if (typeof raw !== 'string') return null

  const s = raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, "") // "maratón" → "maraton"

  if (!s) return null

  // Nombres del catálogo y sinónimos habituales del club.
  const named: Record<string, number> = {
    'media maraton': 21097,
    media: 21097,
    'medio maraton': 21097,
    'half marathon': 21097,
    maraton: 42195,
    marathon: 42195,
  }
  if (named[s]) return named[s]

  const bySlug = metersFromSlug(s)
  if (bySlug) return bySlug

  // "10k" / "10 km" / "21,097 km" → kilómetros.
  const km = /^(\d+(?:[.,]\d+)?)\s*(k|km|kms|kilometros?)$/.exec(s)
  if (km) {
    const n = Number(km[1].replace(',', '.'))
    return Number.isFinite(n) && n > 0 ? Math.round(n * 1000) : null
  }

  // "5000 m" / "800m" / "1.500 m" → metros. El separador de miles es obligatorio en grupos de
  // tres para no tragarse un "1,5 m"; y hace falta porque las etiquetas del catálogo lo llevan
  // ("1.500 m"), así que sin esto no se podía volver a guardar lo que la propia web había pintado.
  const m = /^(\d+(?:[.,]\d{3})*)\s*(m|metros?)$/.exec(s)
  if (m) {
    const n = Number(m[1].replace(/[.,]/g, ''))
    return Number.isFinite(n) && n > 0 ? n : null
  }

  // Número pelado. "10.000" y "42,195" usan el separador de miles español;
  // por debajo de 100 se interpreta como kilómetros ("10" = 10K), que es como lo escribe el club.
  const bare = /^\d+(?:[.,]\d{3})*$/.exec(s)
  if (bare) {
    const n = Number(s.replace(/[.,]/g, ''))
    if (!Number.isFinite(n) || n <= 0) return null
    return n < 100 ? n * 1000 : n
  }

  return null
}
