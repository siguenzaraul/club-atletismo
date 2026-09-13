import React from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CalendarCheckIcon, MedalIcon, ShirtIcon, TicketIcon } from 'lucide-react'

import { getClient } from '@/lib/payload'
import { currentMember } from '@/lib/session'
import { getCurrentSeason } from '@/lib/membership'
import { InscribeButton } from '@/components/site/InscribeButton'
import { CancelRegistrationButton } from '@/components/site/CancelRegistrationButton'
import { EventCompanions } from '@/components/site/EventCompanions'
import { formatDate, formatDateTime } from '@/lib/format'
import { MEMBER_CATEGORIES } from '@/collections/Members'
import { getMemberVisibleAttributes } from '@/lib/attributes'
import { Stat } from '@/components/ui/stat'
import { StatusBadge } from '@/components/ui/status-badge'
import { EmptyState } from '@/components/ui/empty-state'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Zona de socios' }

const idOf = (v: unknown): number | null =>
  v == null ? null : typeof v === 'object' ? ((v as { id?: number }).id ?? null) : (v as number)
const categoryLabel = (v?: string | null) => MEMBER_CATEGORIES.find((c) => c.value === v)?.label ?? '—'

const STATUS_LABEL: Record<string, string> = { pending: 'Pendiente', confirmed: 'Confirmada', cancelled: 'Cancelada' }
const DELIVERY_STATUS_LABEL: Record<string, string> = {
  requested: 'Solicitada',
  reserved: 'Reservada',
  delivered: 'Entregada',
  returned: 'Devuelta',
}
const CUOTA = {
  active: { label: 'Al corriente', stat: 'success' as const, badge: 'success' as const },
  pending: { label: 'Cuota pendiente', stat: 'warning' as const, badge: 'warning' as const },
  inactive: { label: 'Baja', stat: 'default' as const, badge: 'neutral' as const },
} as const

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <h2 className="font-display text-2xl tracking-wide">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  )
}

export default async function MembersAreaPage({
  searchParams,
}: {
  searchParams: Promise<{ alta?: string }>
}) {
  const member = await currentMember()
  if (!member) redirect('/login')
  const { alta } = await searchParams

  const payload = await getClient()
  const season = await getCurrentSeason(payload)
  const customAttributes = await getMemberVisibleAttributes(payload, member.id)

  const [registrations, results, openEvents, deliveries, membershipRes, packsRes] = await Promise.all([
    payload.find({ collection: 'event-registrations', where: { member: { equals: member.id } }, depth: 1, limit: 100, overrideAccess: true }),
    payload.find({ collection: 'results', where: { member: { equals: member.id } }, depth: 1, limit: 100, overrideAccess: true }),
    payload.find({ collection: 'events', where: { registrationOpen: { equals: true } }, sort: 'date', limit: 100 }),
    payload.find({ collection: 'equipment-deliveries', where: { member: { equals: member.id } }, depth: 1, limit: 100, overrideAccess: true }),
    season
      ? payload.find({ collection: 'memberships', where: { and: [{ member: { equals: member.id } }, { season: { equals: season.id } }] }, depth: 1, limit: 1, overrideAccess: true })
      : Promise.resolve({ docs: [] as { type?: unknown }[] }),
    season
      ? payload.find({ collection: 'equipment-packs', where: { season: { equals: season.id } }, depth: 1, limit: 100, overrideAccess: true })
      : Promise.resolve({ docs: [] as { appliesToAll?: boolean | null; membershipTypes?: unknown[]; lines?: { item?: unknown }[] }[] }),
  ])

  // Acompañantes de los eventos abiertos. Una sola consulta para todos: antes iba una por
  // evento (N+1) y con `depth: 1` traía a memoria el email, el teléfono y el nº de federación
  // de cada inscrito sólo para pintar nombres. Aquí se piden los ids y luego sólo `name`.
  const openEventIds = openEvents.docs.map((e) => e.id)
  const attendees = openEventIds.length
    ? await payload.find({
        collection: 'event-registrations',
        where: {
          and: [{ event: { in: openEventIds } }, { status: { not_equals: 'cancelled' } }],
        },
        depth: 0,
        pagination: false,
        overrideAccess: true,
      })
    : { docs: [] as { event?: unknown; member?: unknown }[] }

  const attendeeIds = Array.from(
    new Set(attendees.docs.map((r) => idOf(r.member)).filter((id): id is number => Boolean(id))),
  ).filter((id) => id !== member.id)

  const namesById = new Map<number, string>()
  if (attendeeIds.length) {
    const membersRes = await payload.find({
      collection: 'members',
      where: { id: { in: attendeeIds } },
      // Lista blanca explícita: el `select` recorta a nivel de query, así que ni se leen de la
      // base de datos los campos personales. Misma doctrina que src/lib/public-athletes.ts.
      select: { name: true },
      depth: 0,
      pagination: false,
      overrideAccess: true,
    })
    for (const m of membersRes.docs) if (m.name) namesById.set(m.id, m.name)
  }

  const companionsByEvent = new Map<number, string[]>()
  for (const eventId of openEventIds) companionsByEvent.set(eventId, [])
  for (const registration of attendees.docs) {
    const eventId = idOf(registration.event)
    const attendeeId = idOf(registration.member)
    if (!eventId || !attendeeId || attendeeId === member.id) continue
    const name = namesById.get(attendeeId)
    const list = companionsByEvent.get(eventId)
    if (name && list && !list.includes(name)) list.push(name)
  }
  for (const list of companionsByEvent.values()) list.sort((a, b) => a.localeCompare(b, 'es'))

  const membership = membershipRes.docs[0]
  const membershipTypeName =
    membership && typeof membership.type === 'object' && membership.type
      ? ((membership.type as { name?: string }).name ?? null)
      : null
  const currentTypeId = idOf(membership?.type) ?? idOf(member.currentMembershipType)
  const cuota = CUOTA[(member.membershipStatus ?? 'pending') as keyof typeof CUOTA] ?? CUOTA.pending

  const deliveredItemIds = new Set(deliveries.docs.map((d) => idOf(d.item)).filter(Boolean))
  const pendingEquipment: string[] = []
  for (const pack of packsRes.docs) {
    const applies =
      pack.appliesToAll || (Array.isArray(pack.membershipTypes) && pack.membershipTypes.some((t) => idOf(t) === currentTypeId))
    if (!applies) continue
    for (const line of pack.lines ?? []) {
      const itemId = idOf(line.item)
      const itemName = typeof line.item === 'object' && line.item ? (line.item as { name?: string }).name : null
      if (itemId && itemName && !deliveredItemIds.has(itemId) && !pendingEquipment.includes(itemName)) {
        pendingEquipment.push(itemName)
      }
    }
  }

  const registeredEventIds = new Set(registrations.docs.map((r) => idOf(r.event)))
  const nextRegistered = registrations.docs
    .map((r) => (typeof r.event === 'object' ? r.event : null))
    .filter((e): e is NonNullable<typeof e> => Boolean(e?.date) && new Date(e!.date) > new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0]

  const pill =
    'rounded-full bg-muted px-3 py-1 text-sm font-medium text-muted-foreground dark:bg-white/12 dark:text-white/85'

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      {alta === 'ok' && (
        <p
          role="status"
          className="mb-6 rounded-xl border border-abtr-blue/40 bg-abtr-blue/10 px-4 py-3 text-sm text-foreground/80"
        >
          <strong className="text-foreground">¡Bienvenido al club!</strong> Ya tienes tu cuenta. El
          club confirmará tu cuota en los próximos días.
        </p>
      )}
      {/* Carnet de socio: claro en modo claro, oscuro en modo oscuro, con el sello del club. */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 text-foreground shadow-sm sm:p-8 dark:border-white/10 dark:bg-black dark:text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-16 -right-10 size-64 rounded-full opacity-40 dark:opacity-45"
          style={{ background: 'radial-gradient(circle at 30% 30%, var(--color-abtr-blue), transparent 62%)' }}
        />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium tracking-wide text-muted-foreground dark:text-white/60">
              Zona de socio{season ? ` · Temporada ${season.name}` : ''}
            </p>
            <h1 className="mt-1 font-display text-4xl tracking-wide uppercase sm:text-5xl">Hola, {member.name}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatusBadge tone={cuota.badge} className="px-3 py-1 text-sm">
                {cuota.label}
              </StatusBadge>
              <span className={pill}>{categoryLabel(member.category)}</span>
              {membershipTypeName && <span className={pill}>Socio {membershipTypeName}</span>}
            </div>
          </div>
          <Link
            href="/socios/perfil"
            className="relative rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-muted dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
          >
            Editar mi perfil
          </Link>
        </div>

        <dl className="relative mt-6 grid gap-x-6 gap-y-3 border-t border-border pt-6 sm:grid-cols-3 dark:border-white/10">
          <div>
            <dt className="text-sm text-muted-foreground dark:text-white/55">Email</dt>
            <dd className="font-semibold break-words">{member.email}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground dark:text-white/55">Teléfono</dt>
            <dd className="font-semibold">{member.phone || '—'}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground dark:text-white/55">Nº de federación</dt>
            <dd className="font-semibold">{member.federationNumber || '—'}</dd>
          </div>
        </dl>
      </div>

      {/* Resumen accionable */}
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Tu cuota" value={cuota.label} tone={cuota.stat} hint="El cobro lo gestiona el club" />
        <Stat
          label="Próximo evento"
          value={nextRegistered ? nextRegistered.title : '—'}
          hint={nextRegistered ? formatDate(nextRegistered.date) : 'Sin inscripciones futuras'}
        />
        <Stat
          label="Equipación pendiente"
          value={pendingEquipment.length ? `${pendingEquipment.length} artículo(s)` : 'Al día'}
          tone={pendingEquipment.length ? 'warning' : 'success'}
          hint={pendingEquipment.length ? 'Pásate por el club a recogerla' : 'Lo tienes todo'}
        />
      </div>

      <div className="mt-6 flex flex-col gap-5">
        {customAttributes.length > 0 && (
          <Panel title="Otros datos">
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {customAttributes.map((a) => (
                <div key={a.definitionId} className="flex flex-col border-b border-border pb-2">
                  <dt className="text-sm text-muted-foreground">{a.label}</dt>
                  <dd className="font-semibold">{a.value || '—'}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        )}

        <Panel title="Mi equipación">
          {pendingEquipment.length > 0 && (
            <div className="mb-4 rounded-xl border border-abtr-yellow/50 bg-abtr-yellow/15 p-4">
              <p className="text-sm font-semibold">Te falta por recoger esta temporada:</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {pendingEquipment.map((name) => (
                  <li key={name}>
                    <StatusBadge tone="warning">{name}</StatusBadge>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {deliveries.docs.length > 0 ? (
            <ul className="divide-y divide-border">
              {deliveries.docs.map((d) => {
                const item = typeof d.item === 'object' ? d.item : null
                const size = typeof d.size === 'object' ? d.size : null
                return (
                  <li key={d.id} className="flex items-center justify-between gap-3 py-3">
                    <span className="font-medium">
                      {item?.name ?? 'Artículo'}
                      {size?.label ? <span className="text-muted-foreground"> · talla {size.label}</span> : ''}
                      {d.quantity && d.quantity > 1 ? ` · x${d.quantity}` : ''}
                    </span>
                    {d.status === 'delivered' ? (
                      <StatusBadge tone="success">
                        Entregada{d.deliveredAt ? ` · ${formatDate(d.deliveredAt)}` : ''}
                      </StatusBadge>
                    ) : (
                      <StatusBadge tone="neutral">{DELIVERY_STATUS_LABEL[d.status ?? 'requested']}</StatusBadge>
                    )}
                  </li>
                )
              })}
            </ul>
          ) : (
            <EmptyState
              icon={<ShirtIcon className="size-5" />}
              title="Aún no hay equipación registrada"
              description="El club la irá actualizando cada temporada."
            />
          )}
        </Panel>

        <Panel title="Mis inscripciones">
          {registrations.docs.length > 0 ? (
            <ul className="divide-y divide-border">
              {registrations.docs.map((r) => {
                const ev = typeof r.event === 'object' ? r.event : null
                const isFuture = ev?.date ? new Date(ev.date) > new Date() : true
                return (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <span className="font-medium">{ev?.title ?? 'Evento'}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">
                        {ev?.date ? formatDate(ev.date) : ''} · {STATUS_LABEL[r.status ?? 'pending']}
                      </span>
                      {r.status !== 'cancelled' && isFuture && (
                        <CancelRegistrationButton registrationId={r.id} eventTitle={ev?.title ?? 'este evento'} />
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <EmptyState
              icon={<TicketIcon className="size-5" />}
              title="Todavía no te has inscrito en ningún evento"
              description="Mira las inscripciones abiertas más abajo."
            />
          )}
        </Panel>

        <Panel title="Mis marcas">
          {results.docs.length > 0 ? (
            <ul className="divide-y divide-border">
              {results.docs.map((r) => {
                const ev = typeof r.event === 'object' ? r.event : null
                return (
                  <li key={r.id} className="flex items-center justify-between py-3">
                    <span className="font-medium">{ev?.title ?? 'Evento'}</span>
                    <span className="text-sm text-muted-foreground">
                      {r.position ? `${r.position}º · ` : ''}
                      <span className="font-mono">{r.mark ?? ''}</span>
                    </span>
                  </li>
                )
              })}
            </ul>
          ) : (
            <EmptyState icon={<MedalIcon className="size-5" />} title="Aún no hay marcas registradas" />
          )}
        </Panel>

        <Panel title="Inscripciones abiertas">
          {openEvents.docs.length > 0 ? (
            <ul className="flex flex-col gap-3">
              {openEvents.docs.map((e) => {
                const companions = companionsByEvent.get(e.id) ?? []
                return (
                  <li
                    key={e.id}
                    className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-border p-4"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{e.title}</p>
                      <p className="text-sm text-muted-foreground">{formatDateTime(e.date)}</p>
                      <EventCompanions eventTitle={e.title} names={companions} />
                    </div>
                    {registeredEventIds.has(e.id) ? (
                      <StatusBadge tone="success">
                        <CalendarCheckIcon className="size-3.5" /> Ya inscrito
                      </StatusBadge>
                    ) : (
                      <InscribeButton eventId={e.id} />
                    )}
                  </li>
                )
              })}
            </ul>
          ) : (
            <EmptyState icon={<CalendarCheckIcon className="size-5" />} title="No hay inscripciones abiertas ahora mismo" />
          )}
        </Panel>
      </div>
    </main>
  )
}
