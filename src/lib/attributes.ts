import type { BasePayload } from 'payload'
import type { AttributeDefinition, MemberAttribute, Media } from '@/payload-types'

export type AttributeType = AttributeDefinition['type']

export type MemberVisibleAttribute = {
  definitionId: number
  label: string
  group: string
  value: string
  editable: boolean
}

/** Which value column on member-attributes stores a given definition type. */
export const valueFieldFor = (type: AttributeType): keyof MemberAttribute => {
  switch (type) {
    case 'longtext':
      return 'valueLongtext'
    case 'number':
      return 'valueNumber'
    case 'date':
      return 'valueDate'
    case 'boolean':
      return 'valueBoolean'
    case 'select':
      return 'valueOption'
    case 'file':
      return 'valueFile'
    case 'text':
    default:
      return 'valueText'
  }
}

/**
 * Valor crudo listo para meterlo en un `<input>`/`<select>` del formulario.
 *
 * El caso que importa es `date`: se guarda como marca de tiempo ISO y un `<input type="date">`
 * sólo acepta `yyyy-MM-dd` — con cualquier otra cosa se pinta **vacío en silencio**, así que el
 * socio veía su fecha en blanco y al guardar la borraba.
 */
export const attributeInputValue = (raw: unknown, type: AttributeType): string => {
  if (raw == null) return ''
  switch (type) {
    case 'boolean':
      return ''
    case 'date': {
      const d = new Date(String(raw))
      return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10)
    }
    // Un archivo no se edita desde estos formularios: su valor es una relación, no texto.
    case 'file':
      return ''
    default:
      return String(raw)
  }
}

/** Human-readable value of a member attribute, given its definition type. */
export const formatAttributeValue = (
  attr: Pick<
    MemberAttribute,
    'valueText' | 'valueLongtext' | 'valueNumber' | 'valueDate' | 'valueBoolean' | 'valueOption' | 'valueFile'
  >,
  type: AttributeType,
): string => {
  switch (type) {
    case 'longtext':
      return attr.valueLongtext ?? ''
    case 'number':
      return attr.valueNumber != null ? String(attr.valueNumber) : ''
    case 'date':
      return attr.valueDate
        ? new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }).format(
            new Date(attr.valueDate),
          )
        : ''
    case 'boolean':
      return attr.valueBoolean ? 'Sí' : 'No'
    case 'select':
      return attr.valueOption ?? ''
    case 'file': {
      const f = attr.valueFile
      if (f && typeof f === 'object') return (f as Media).filename ?? 'Archivo'
      return f ? 'Archivo' : ''
    }
    case 'text':
    default:
      return attr.valueText ?? ''
  }
}

export type OptionCount = { label: string; count: number; defined: boolean }

export type SelectFieldSummary = {
  definitionId: number
  label: string
  group: string
  totalMembers: number
  answered: number
  unassigned: number
  options: OptionCount[]
}

/**
 * Counts how many members chose each option of a select-type custom field.
 * Pure: given the definition, the raw chosen values and the member total, it
 * returns every defined option (including zeros, in order) plus any legacy
 * value that no longer matches an option. Used to plan purchases (e.g. tallas).
 */
export const summarizeSelectField = (
  def: { id: number; label: string; group?: string | null; options?: ({ label?: string | null } | null)[] | null },
  values: (string | null | undefined)[],
  totalMembers: number,
): SelectFieldSummary => {
  const counts = new Map<string, number>()
  let answered = 0
  for (const raw of values) {
    const val = (raw ?? '').trim()
    if (!val) continue
    counts.set(val, (counts.get(val) ?? 0) + 1)
    answered += 1
  }

  const definedLabels = (def.options ?? [])
    .map((o) => o?.label?.trim())
    .filter((l): l is string => Boolean(l))

  const options: OptionCount[] = definedLabels.map((label) => ({
    label,
    count: counts.get(label) ?? 0,
    defined: true,
  }))
  // Values present in the data but no longer among the defined options.
  for (const [label, count] of counts) {
    if (!definedLabels.includes(label)) options.push({ label, count, defined: false })
  }

  return {
    definitionId: def.id,
    label: def.label,
    group: def.group ?? 'General',
    totalMembers,
    answered,
    unassigned: Math.max(0, totalMembers - answered),
    options,
  }
}

/** Fetches and aggregates every active select-type field across all members. */
export const getSelectFieldSummaries = async (
  payload: BasePayload,
): Promise<{ totalMembers: number; fields: SelectFieldSummary[] }> => {
  const totalMembers = (await payload.count({ collection: 'members', overrideAccess: true })).totalDocs

  const defs = await payload.find({
    collection: 'attribute-definitions',
    where: { and: [{ type: { equals: 'select' } }, { active: { equals: true } }] },
    sort: 'order',
    limit: 100,
    depth: 0,
    overrideAccess: true,
  })
  if (defs.docs.length === 0) return { totalMembers, fields: [] }

  const defIds = defs.docs.map((d) => d.id)
  const attrs = await payload.find({
    collection: 'member-attributes',
    where: { definition: { in: defIds } },
    depth: 0,
    limit: 10000,
    overrideAccess: true,
  })

  const byDef = new Map<number, string[]>()
  for (const a of attrs.docs) {
    const defId = a.definition && typeof a.definition === 'object' ? a.definition.id : a.definition
    if (defId == null) continue
    const arr = byDef.get(defId) ?? []
    arr.push(a.valueOption ?? '')
    byDef.set(defId, arr)
  }

  const fields = defs.docs.map((d) => summarizeSelectField(d, byDef.get(d.id) ?? [], totalMembers))
  return { totalMembers, fields }
}

/**
 * Attributes a member is allowed to see, resolved with their definition,
 * filtered to active + visible, sorted by the definition order.
 */
export const getMemberVisibleAttributes = async (
  payload: BasePayload,
  memberId: number,
): Promise<MemberVisibleAttribute[]> => {
  const res = await payload.find({
    collection: 'member-attributes',
    where: { member: { equals: memberId } },
    depth: 1,
    limit: 200,
    overrideAccess: true,
  })
  const items: MemberVisibleAttribute[] = []
  for (const attr of res.docs) {
    const def = attr.definition
    if (!def || typeof def !== 'object') continue
    if (!def.active || !def.visibleToMember) continue
    items.push({
      definitionId: def.id,
      label: def.label,
      group: def.group ?? 'General',
      value: formatAttributeValue(attr, def.type),
      editable: Boolean(def.editableByMember),
    })
  }
  return items.sort((a, b) => a.label.localeCompare(b.label))
}
