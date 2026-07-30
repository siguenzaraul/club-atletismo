import { NextResponse } from 'next/server'

import { getCurrentStaff } from '@/actions/gestion'
import { getClient } from '@/lib/payload'
import { MEMBER_CATEGORIES } from '@/collections/Members'
import { formatAttributeValue, type AttributeType } from '@/lib/attributes'
import { toCsv } from '@/lib/csv'

export const dynamic = 'force-dynamic'

const STATUS_LABEL: Record<string, string> = {
  active: 'Al corriente',
  pending: 'Pendiente',
  inactive: 'Baja',
}
const categoryLabel = (v?: string | null) => MEMBER_CATEGORIES.find((c) => c.value === v)?.label ?? ''

export async function GET(): Promise<NextResponse> {
  const staff = await getCurrentStaff()
  if (!staff) return new NextResponse('No autorizado', { status: 401 })

  const payload = await getClient()
  const [members, defsRes, attrsRes] = await Promise.all([
    payload.find({ collection: 'members', sort: 'name', limit: 10000, depth: 1, overrideAccess: true }),
    payload.find({
      collection: 'attribute-definitions',
      where: { active: { equals: true } },
      sort: 'order',
      limit: 200,
      depth: 0,
      overrideAccess: true,
    }),
    payload.find({ collection: 'member-attributes', limit: 100000, depth: 1, overrideAccess: true }),
  ])

  const defs = defsRes.docs
  // memberId -> (definitionId -> formatted value)
  const byMember = new Map<number, Map<number, string>>()
  for (const a of attrsRes.docs) {
    const def = a.definition
    if (!def || typeof def !== 'object') continue
    const memberId = a.member && typeof a.member === 'object' ? a.member.id : a.member
    if (memberId == null) continue
    const bucket = byMember.get(memberId) ?? new Map<number, string>()
    bucket.set(def.id, formatAttributeValue(a, def.type as AttributeType))
    byMember.set(memberId, bucket)
  }

  const baseHeaders = [
    'Nombre',
    'Email',
    'Categoría',
    'Estado cuota',
    'Tipo de socio',
    'Nº federación',
    'Teléfono',
    'Alta',
  ]
  const headers = [...baseHeaders, ...defs.map((d) => d.label)]

  const rows = members.docs.map((m) => {
    const attrs = byMember.get(m.id)
    const type = m.currentMembershipType
    const row: Record<string, string> = {
      Nombre: m.name ?? '',
      Email: m.email ?? '',
      Categoría: categoryLabel(m.category),
      'Estado cuota': STATUS_LABEL[m.membershipStatus ?? ''] ?? '',
      'Tipo de socio': type && typeof type === 'object' ? (type.name ?? '') : '',
      'Nº federación': m.federationNumber ?? '',
      Teléfono: m.phone ?? '',
      Alta: m.createdAt ? new Intl.DateTimeFormat('es-ES').format(new Date(m.createdAt)) : '',
    }
    for (const d of defs) row[d.label] = attrs?.get(d.id) ?? ''
    return row
  })

  // BOM so Spanish Excel opens the UTF-8 file with the right accents.
  const csv = '﻿' + toCsv(headers, rows)
  const date = new Intl.DateTimeFormat('sv-SE').format(new Date()) // YYYY-MM-DD
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="socios-abtr-${date}.csv"`,
    },
  })
}
