import React from 'react'
import { notFound, redirect } from 'next/navigation'
import { CalendarCheckIcon, MedalIcon } from 'lucide-react'

import { currentStaff } from '@/lib/session'
import { getClient } from '@/lib/payload'
import { getCurrentSeason } from '@/lib/membership'
import { valueFieldFor, type AttributeType } from '@/lib/attributes'
import { formatDate } from '@/lib/format'
import { MEMBER_CATEGORIES } from '@/collections/Members'
import { DatosForm } from '@/components/gestion/DatosForm'
import { CuotaControls } from '@/components/gestion/CuotaControls'
import { EntregarEquipacion } from '@/components/gestion/EntregarEquipacion'
import { CamposForm, type CampoField } from '@/components/gestion/CamposForm'
import { MemberTabs } from '@/components/gestion/MemberTabs'
import { PageHeader } from '@/components/ui/page-header'
import { Stat } from '@/components/ui/stat'
import { StatusBadge } from '@/components/ui/status-badge'
import { EmptyState } from '@/components/ui/empty-state'
import type { MemberAttribute } from '@/payload-types'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Ficha del socio' }

const idOf = (v: unknown): number | null =>
  v == null ? null : typeof v === 'object' ? ((v as { id?: number }).id ?? null) : (v as number)
const categoryLabel = (v?: string | null) => MEMBER_CATEGORIES.find((c) => c.value === v)?.label ?? '—'

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-border bg-card p-5 sm:p-6">{children}</div>
}

export default async function MemberFilePage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await currentStaff()
  if (!staff) redirect('/admin/login?redirect=/gestion')
  const { id } = await params
  const memberId = Number(id)
  if (!memberId) notFound()

  const payload = await getClient()
  const member = await payload
    .findByID({ collection: 'members', id: memberId, depth: 1, overrideAccess: true })
    .catch(() => null)
  if (!member) notFound()

  const season = await getCurrentSeason(payload)

  const [
    membershipRes,
    types,
    categoriesRes,
    items,
    sizes,
    deliveriesRes,
    defsRes,
    attrsRes,
    regsRes,
    resultsRes,
    packsRes,
  ] =
    await Promise.all([
      season
        ? payload.find({
            collection: 'memberships',
            where: { and: [{ member: { equals: memberId } }, { season: { equals: season.id } }] },
            limit: 1,
            depth: 0,
            overrideAccess: true,
          })
        : Promise.resolve({ docs: [] as { paymentStatus?: string | null; type?: unknown }[] }),
      payload.find({ collection: 'membership-types', where: { active: { equals: true } }, sort: 'order', limit: 100, overrideAccess: true }),
      payload.find({ collection: 'equipment-categories', where: { active: { not_equals: false } }, sort: 'order', limit: 100, depth: 0, overrideAccess: true }),
      payload.find({ collection: 'equipment-items', where: { active: { equals: true } }, sort: 'order', limit: 200, depth: 0, overrideAccess: true }),
      // Sólo las tallas activas: es la lista del SELECTOR. Las tallas de entregas ya hechas
      // vienen resueltas dentro del propio documento, así que no desaparecen del histórico.
      payload.find({ collection: 'sizes', where: { active: { not_equals: false } }, sort: 'order', limit: 500, depth: 0, overrideAccess: true }),
      payload.find({ collection: 'equipment-deliveries', where: { member: { equals: memberId } }, depth: 1, limit: 200, overrideAccess: true }),
      payload.find({ collection: 'attribute-definitions', where: { active: { equals: true } }, sort: 'order', limit: 200, overrideAccess: true }),
      payload.find({ collection: 'member-attributes', where: { member: { equals: memberId } }, limit: 200, overrideAccess: true }),
      payload.find({ collection: 'event-registrations', where: { member: { equals: memberId } }, depth: 1, limit: 100, overrideAccess: true }),
      payload.find({ collection: 'results', where: { member: { equals: memberId } }, depth: 1, limit: 100, overrideAccess: true }),
      season
        ? payload.find({ collection: 'equipment-packs', where: { season: { equals: season.id } }, depth: 1, limit: 100, overrideAccess: true })
        : Promise.resolve({ docs: [] as { appliesToAll?: boolean | null; membershipTypes?: unknown[]; lines?: { item?: unknown }[] }[] }),
    ])

  const membership = membershipRes.docs[0]
  const paymentStatus = (membership?.paymentStatus ?? null) as 'paid' | 'pending' | 'exempt' | null
  const currentTypeId = idOf(membership?.type) ?? idOf(member.currentMembershipType)

  const byDef = new Map<number, MemberAttribute>()
  for (const a of attrsRes.docs) {
    const d = idOf(a.definition)
    if (d) byDef.set(d, a)
  }
  const campos: CampoField[] = defsRes.docs.map((def) => {
    const type = def.type as AttributeType
    const attr = byDef.get(def.id)
    const raw = attr ? (attr as unknown as Record<string, unknown>)[valueFieldFor(type)] : null
    return {
      id: def.id,
      label: def.label,
      type,
      value: type === 'boolean' ? '' : raw != null ? String(raw) : '',
      boolean: type === 'boolean' ? Boolean(raw) : false,
      options: (def.options ?? []).map((o) => o.label).filter((l): l is string => Boolean(l)),
    }
  })

  const deliveries = deliveriesRes.docs.map((d) => ({
    id: d.id,
    itemName: typeof d.item === 'object' && d.item ? d.item.name : 'Artículo',
    sizeLabel: typeof d.size === 'object' && d.size ? d.size.label : '',
    status: d.status ?? 'delivered',
    categoryId: idOf(d.category),
    source: d.source ?? null,
  }))
  const deliveredItemIds = new Set(deliveriesRes.docs.map((d) => idOf(d.item)).filter(Boolean))
  // También por tipo de prenda: un pack que pide «Camiseta oficial» queda cubierto si el socio
  // se llevó «Camiseta de tirantes». Comparando sólo por artículo daría un falso pendiente.
  const deliveredCategoryIds = new Set(
    deliveriesRes.docs.map((d) => idOf(d.category)).filter(Boolean),
  )
  const itemCategoryById = new Map(items.docs.map((i) => [i.id, idOf(i.category)]))
  const pending: { itemId: number; itemName: string }[] = []
  for (const pack of packsRes.docs) {
    const applies =
      pack.appliesToAll ||
      (Array.isArray(pack.membershipTypes) && pack.membershipTypes.some((t) => idOf(t) === currentTypeId))
    if (!applies) continue
    for (const line of pack.lines ?? []) {
      const itemId = idOf(line.item)
      const itemName = typeof line.item === 'object' && line.item ? (line.item as { name?: string }).name : null
      if (!itemId || !itemName) continue
      const categoryId = itemCategoryById.get(itemId) ?? null
      const covered =
        deliveredItemIds.has(itemId) || (categoryId != null && deliveredCategoryIds.has(categoryId))
      if (!covered && !pending.some((p) => p.itemId === itemId)) {
        pending.push({ itemId, itemName })
      }
    }
  }

  const statusMeta =
    member.membershipStatus === 'active'
      ? { label: 'Al corriente', stat: 'success' as const, badge: 'success' as const }
      : member.membershipStatus === 'inactive'
        ? { label: 'Baja', stat: 'default' as const, badge: 'neutral' as const }
        : { label: 'Cuota pendiente', stat: 'warning' as const, badge: 'warning' as const }

  const participacion = (
    <div className="grid gap-4 sm:grid-cols-2">
      <Panel>
        <h3 className="mb-3 text-sm font-bold tracking-wide text-muted-foreground uppercase">Inscripciones</h3>
        {regsRes.docs.length > 0 ? (
          <ul className="flex flex-col divide-y divide-border">
            {regsRes.docs.map((r) => {
              const ev = typeof r.event === 'object' ? r.event : null
              return (
                <li key={r.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                  <span className="font-medium">{ev?.title ?? 'Evento'}</span>
                  <StatusBadge tone="neutral">{r.status}</StatusBadge>
                </li>
              )
            })}
          </ul>
        ) : (
          <EmptyState icon={<CalendarCheckIcon className="size-5" />} title="Sin inscripciones" className="border-0 py-6" />
        )}
      </Panel>
      <Panel>
        <h3 className="mb-3 text-sm font-bold tracking-wide text-muted-foreground uppercase">Marcas</h3>
        {resultsRes.docs.length > 0 ? (
          <ul className="flex flex-col divide-y divide-border">
            {resultsRes.docs.map((r) => {
              const ev = typeof r.event === 'object' ? r.event : null
              return (
                <li key={r.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                  <span className="font-medium">{ev?.title ?? 'Evento'}</span>
                  <span className="font-mono text-muted-foreground">
                    {r.position ? `${r.position}º · ` : ''}
                    {r.mark ?? ''}
                  </span>
                </li>
              )
            })}
          </ul>
        ) : (
          <EmptyState icon={<MedalIcon className="size-5" />} title="Sin marcas" className="border-0 py-6" />
        )}
      </Panel>
    </div>
  )

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <PageHeader
        title={member.name ?? 'Socio'}
        description={`${member.email}${season ? ` · Temporada ${season.name}` : ''} · ${categoryLabel(member.category)}`}
        breadcrumbs={[{ label: 'Socios', href: '/gestion' }, { label: member.name ?? 'Socio' }]}
        actions={
          <StatusBadge tone={statusMeta.badge} className="px-3 py-1 text-sm">
            {statusMeta.label}
          </StatusBadge>
        }
      />

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Cuota" value={statusMeta.label} tone={statusMeta.stat} />
        <Stat
          label="Equipación"
          value={pending.length ? `Falta ${pending.length}` : 'Completa'}
          tone={pending.length ? 'warning' : 'success'}
        />
        <Stat label="Inscripciones" value={regsRes.docs.length} />
        <Stat label="Marcas" value={resultsRes.docs.length} />
      </div>

      <div className="mt-6">
        <MemberTabs
          sections={[
            {
              value: 'datos',
              label: 'Datos',
              content: (
                <Panel>
                  <DatosForm
                    member={{
                      id: member.id,
                      name: member.name ?? '',
                      phone: member.phone ?? '',
                      federationNumber: member.federationNumber ?? '',
                      category: member.category ?? 'popular',
                    }}
                  />
                </Panel>
              ),
            },
            {
              value: 'cuota',
              label: 'Cuota',
              content: (
                <Panel>
                  {season ? (
                    <>
                      <p className="mb-4 text-sm text-muted-foreground">
                        Temporada {season.name}. El cobro se hace fuera de la web; aquí solo se registra.
                      </p>
                      <CuotaControls
                        memberId={member.id}
                        current={paymentStatus}
                        currentTypeId={currentTypeId}
                        membershipTypes={types.docs.map((t) => ({ id: t.id, name: t.name }))}
                      />
                    </>
                  ) : (
                    <EmptyState title="No hay temporada actual" description="Marca una temporada como actual en el panel para gestionar la cuota." />
                  )}
                </Panel>
              ),
            },
            {
              value: 'equipacion',
              label: 'Equipación',
              content: (
                <Panel>
                  <EntregarEquipacion
                    memberId={member.id}
                    categories={categoriesRes.docs.map((c) => ({ id: c.id, name: c.name }))}
                    items={items.docs.map((i) => ({
                      id: i.id,
                      name: i.name,
                      sizeScale: idOf(i.sizeScale),
                      category: idOf(i.category),
                    }))}
                    sizes={sizes.docs.map((s) => ({ id: s.id, label: s.label, scale: idOf(s.scale) }))}
                    deliveries={deliveries}
                    pending={pending}
                  />
                </Panel>
              ),
            },
            {
              value: 'campos',
              label: 'Campos personalizados',
              content: (
                <Panel>
                  <CamposForm memberId={member.id} campos={campos} />
                </Panel>
              ),
            },
            { value: 'participacion', label: 'Participación', content: participacion },
          ]}
        />
      </div>

      <p className="mt-8 text-center text-sm text-muted-foreground">{formatDate(member.createdAt)} · alta del socio</p>
    </main>
  )
}
