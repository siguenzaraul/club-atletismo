/**
 * Catálogo de tallas de ropa, en TypeScript y no como enum de base de datos.
 *
 * Mismo patrón que `src/lib/distances.ts`: las tallas viven como filas en `sizes` (ampliables
 * desde el CMS) y aquí sólo está el juego estándar que el club quiere tener sembrado, para no
 * tener que teclearlo a mano.
 */

export const STANDARD_CLOTHING_SCALE = {
  name: 'Ropa',
  // Mismo slug que la escala que ya existe en producción y en el seed: así se REUTILIZA en vez
  // de crear una segunda escala paralela con las mismas tallas.
  slug: 'ropa-xs-xxl',
} as const

export const STANDARD_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL'] as const

export type StandardSize = (typeof STANDARD_SIZES)[number]

/**
 * Normaliza cómo se escribe una talla para poder compararlas.
 *
 * El club ya ha tecleado tallas a mano: "2XL", "xxl", "3 XL". Sin esto, sembrar el catálogo
 * estándar crearía duplicados en vez de reconocer lo que ya hay.
 */
export const normalizeSizeLabel = (raw: string): string => {
  const s = raw.trim().toUpperCase().replace(/\s+/g, '')
  if (s === '2XL') return 'XXL'
  if (s === 'XXXL') return '3XL'
  if (s === 'XXXXL') return '4XL'
  return s
}

/** Posición en la escala estándar, o -1 si no es una talla estándar. */
export const standardSizeOrder = (label: string): number =>
  STANDARD_SIZES.indexOf(normalizeSizeLabel(label) as StandardSize)

/** ¿Es una de las tallas del catálogo estándar? */
export const isStandardSize = (label: string): boolean => standardSizeOrder(label) >= 0
