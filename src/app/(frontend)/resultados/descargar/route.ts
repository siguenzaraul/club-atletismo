import { getClient } from '@/lib/payload'
import { MEMBER_CATEGORIES } from '@/collections/Members'
import { distanceLabel, metersFromSlug } from '@/lib/distances'
import type { Where } from 'payload'

const categoryLabel = (v?: string | null) =>
  MEMBER_CATEGORIES.find((c) => c.value === v)?.label ?? v ?? ''

/** Escape a CSV cell (quote + double inner quotes). */
const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`

/** `Number('abc')` es NaN y `{ equals: NaN }` revienta en Postgres. */
const asId = (raw: string | null): number | null => {
  if (!raw) return null
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : null
}

const PAGE_SIZE = 500

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const eventId = asId(searchParams.get('evento'))
  const categoria = searchParams.get('categoria')
  const distanceMeters = metersFromSlug(searchParams.get('distancia'))
  const validCategory = MEMBER_CATEGORIES.some((c) => c.value === categoria) ? categoria : null

  const payload = await getClient()
  const filters: Where[] = []
  if (eventId) filters.push({ event: { equals: eventId } })
  if (validCategory) filters.push({ category: { equals: validCategory } })
  if (distanceMeters) filters.push({ distanceMeters: { equals: distanceMeters } })
  const where: Where = filters.length > 0 ? { and: filters } : {}

  // Se pagina en bucle hasta agotar: un límite fijo truncaba en silencio una carrera grande.
  const rows: string[][] = []
  let page = 1
  for (;;) {
    const res = await payload.find({
      collection: 'results',
      where,
      sort: ['position', 'athleteName'],
      limit: PAGE_SIZE,
      page,
      depth: 1,
    })
    for (const r of res.docs) {
      rows.push([
        String(r.position ?? ''),
        r.athleteName ?? '',
        r.event && typeof r.event === 'object' ? r.event.title : '',
        r.distanceMeters ? distanceLabel(r.distanceMeters) : '',
        categoryLabel(r.category),
        r.mark ?? '',
      ])
    }
    if (!res.hasNextPage) break
    page += 1
  }

  const header = ['Posición', 'Atleta', 'Evento', 'Distancia', 'Categoría', 'Marca']
  const csv = [header, ...rows].map((row) => row.map(cell).join(',')).join('\r\n')

  return new Response('﻿' + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="resultados-abtr.csv"',
    },
  })
}
