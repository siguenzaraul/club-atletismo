import { getClient } from '@/lib/payload'
import { MEMBER_CATEGORIES } from '@/collections/Members'
import type { Where } from 'payload'

const categoryLabel = (v?: string | null) =>
  MEMBER_CATEGORIES.find((c) => c.value === v)?.label ?? v ?? ''

/** Escape a CSV cell (quote + double inner quotes). */
const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const evento = searchParams.get('evento')
  const categoria = searchParams.get('categoria')

  const payload = await getClient()
  const where: Where = {}
  if (evento) where.event = { equals: Number(evento) }
  if (categoria) where.category = { equals: categoria }

  const results = await payload.find({ collection: 'results', where, sort: 'position', limit: 1000, depth: 1 })

  const header = ['Posición', 'Atleta', 'Evento', 'Categoría', 'Marca']
  const rows = results.docs.map((r) => [
    r.position ?? '',
    r.athleteName ?? '',
    r.event && typeof r.event === 'object' ? r.event.title : '',
    categoryLabel(r.category),
    r.mark ?? '',
  ])
  const csv = [header, ...rows].map((row) => row.map(cell).join(',')).join('\r\n')

  return new Response('﻿' + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="resultados-abtr.csv"',
    },
  })
}
