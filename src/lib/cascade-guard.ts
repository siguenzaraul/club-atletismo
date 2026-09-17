/**
 * Cortar un borrado con un mensaje que se entienda.
 *
 * Vive aparte de `cascade.ts` porque necesita `APIError` como VALOR, y ese módulo lo alcanzan
 * componentes de cliente a través de `collections/Members.ts`. Aquí sólo entran colecciones de
 * servidor.
 */

import { APIError } from 'payload'
import type { PayloadRequest, Where } from 'payload'

import type { Dependency } from './cascade'

const countRefs = async (
  req: PayloadRequest,
  dep: Dependency,
  id: number | string,
): Promise<number> => {
  const where = { [dep.field]: { equals: id } } as Where
  const res = await req.payload.count({ collection: dep.collection, where, overrideAccess: true, req })
  return res.totalDocs
}

/**
 * Corta el borrado si algo depende del documento, diciendo **qué** y **cuánto**.
 *
 * Un mensaje concreto («tiene 12 resultados») es lo que convierte un callejón sin salida en una
 * tarea: el club sabe qué mirar. `APIError` con 400 es lo que el panel enseña tal cual.
 */
export const blockIfReferenced = async (
  req: PayloadRequest,
  id: number | string,
  checks: (Dependency & { label: string })[],
  hint: string,
): Promise<void> => {
  const found: string[] = []
  for (const check of checks) {
    const total = await countRefs(req, check, id)
    if (total > 0) found.push(`${total} ${check.label}`)
  }
  if (found.length === 0) return
  throw new APIError(`No se puede borrar: ${found.join(', ')}. ${hint}`, 400)
}
