/**
 * Qué pasa con lo que depende de un documento cuando se borra.
 *
 * El problema real: Payload declara las claves ajenas como `ON DELETE SET NULL`, pero las
 * columnas de los campos `required` son `NOT NULL`. Borrar un socio con una cuota, o un tipo de
 * prenda que el formulario de alta pregunta, reventaba contra la base de datos con un
 * «Failed query: delete from …» que en el panel sólo se ve como «algo ha fallado».
 *
 * Aquí se decide, para cada relación, una de dos cosas:
 *  - **arrastrar**: los datos dependientes no significan nada sin el padre (la cuota de un socio
 *    que ya no existe), así que se borran con él;
 *  - **parar**: son historia del club o configuración que el borrado destruiría en silencio
 *    (los resultados de una carrera), así que se corta con un mensaje que dice qué hacer.
 *
 * Todas las consultas pasan `req`: en Postgres el `beforeDelete` corre dentro de la transacción
 * del borrado y sin `req` saldrían de ella, dejando el arrastre commiteado aunque el borrado
 * revierta.
 */

// Sólo importaciones de TIPO de `payload`: este módulo lo alcanza `collections/Members.ts`, que
// a su vez importan componentes de cliente por `MEMBER_CATEGORIES`. Una importación de valor
// arrastraría el logger de Payload (pino) al bundle del navegador y el build falla. El corte con
// mensaje vive en `cascade-guard.ts`, que sólo usan colecciones de servidor.
import type { CollectionSlug, PayloadRequest, Where } from 'payload'

export type Dependency = {
  collection: CollectionSlug
  /** Campo de la colección dependiente que apunta al documento que se borra. */
  field: string
}

/** Borra todo lo que dependía del documento. Para datos que no significan nada sin él. */
export const cascadeDelete = async (
  req: PayloadRequest,
  id: number | string,
  deps: Dependency[],
): Promise<void> => {
  for (const dep of deps) {
    await req.payload.delete({
      collection: dep.collection,
      where: { [dep.field]: { equals: id } } as Where,
      overrideAccess: true,
      req,
    })
  }
}

/** Deja huérfanas las referencias opcionales, en vez de borrar la fila entera. */
export const detachRefs = async (
  req: PayloadRequest,
  id: number | string,
  deps: Dependency[],
): Promise<void> => {
  for (const dep of deps) {
    await req.payload.update({
      collection: dep.collection,
      where: { [dep.field]: { equals: id } } as Where,
      data: { [dep.field]: null },
      overrideAccess: true,
      req,
    })
  }
}

/**
 * Quita de un array de un global las filas que apuntan al documento que se borra.
 *
 * Es el caso del formulario de alta: la fila que pregunta por «parte de arriba» guarda el tipo
 * de prenda en una columna `NOT NULL`, así que borrar ese tipo desde el panel fallaba contra la
 * base de datos. Quitar la fila es además lo que el club quiere decir al borrarlo: deja de
 * preguntarse en el alta.
 */
export const removeFromGlobalArray = async (
  req: PayloadRequest,
  id: number | string,
  target: { slug: 'registration-form'; arrayField: string; refField: string },
): Promise<void> => {
  const doc = (await req.payload.findGlobal({
    slug: target.slug,
    depth: 0,
    overrideAccess: true,
    req,
  })) as unknown as Record<string, unknown>

  const rows = doc?.[target.arrayField]
  if (!Array.isArray(rows) || rows.length === 0) return

  const idOf = (v: unknown) =>
    v == null ? null : typeof v === 'object' ? ((v as { id?: unknown }).id ?? null) : v
  const kept = rows.filter((row) => String(idOf((row as Record<string, unknown>)[target.refField])) !== String(id))
  if (kept.length === rows.length) return

  await req.payload.updateGlobal({
    slug: target.slug,
    data: { [target.arrayField]: kept } as never,
    overrideAccess: true,
    req,
  })
}
