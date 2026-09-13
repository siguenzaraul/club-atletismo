import React from 'react'
import { redirect } from 'next/navigation'
import { PackageIcon } from 'lucide-react'

import { getClient } from '@/lib/payload'
import { currentStaff } from '@/lib/session'
import { getCurrentSeason } from '@/lib/membership'
import { idOf } from '@/lib/equipment'
import { StockTable, type StockRow } from '@/components/gestion/StockTable'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Stock de equipación' }

export default async function StockPage() {
  const staff = await currentStaff()
  if (!staff) redirect('/admin/login?redirect=/gestion/stock')

  const payload = await getClient()
  const season = await getCurrentSeason(payload)

  const [categoriesRes, itemsRes, sizesRes, stockRes] = await Promise.all([
    payload.find({ collection: 'equipment-categories', sort: 'order', depth: 0, limit: 100, overrideAccess: true }),
    payload.find({ collection: 'equipment-items', where: { active: { equals: true } }, sort: 'order', depth: 0, limit: 200, overrideAccess: true }),
    payload.find({ collection: 'sizes', where: { active: { not_equals: false } }, sort: 'order', depth: 0, limit: 500, overrideAccess: true }),
    season
      ? payload.find({ collection: 'equipment-stock', where: { season: { equals: season.id } }, depth: 0, pagination: false, overrideAccess: true })
      : Promise.resolve({ docs: [] as { item?: unknown; size?: unknown; quantityTotal?: number | null; quantityDelivered?: number | null; quantityReserved?: number | null; quantityAvailable?: number | null }[] }),
  ])

  const categoryName = new Map(categoriesRes.docs.map((c) => [c.id, c.name]))
  const stockByKey = new Map(
    stockRes.docs.map((s) => [`${idOf(s.item)}:${idOf(s.size)}`, s]),
  )

  // Una fila por cada combinación artículo × talla de su escala: así el club ve también las
  // tallas de las que aún no ha comprado nada, que son justo las que hay que planificar.
  const rows: StockRow[] = []
  for (const item of itemsRes.docs) {
    const scaleId = idOf(item.sizeScale)
    for (const size of sizesRes.docs) {
      if (idOf(size.scale) !== scaleId) continue
      const stock = stockByKey.get(`${item.id}:${size.id}`)
      rows.push({
        itemId: item.id,
        itemName: item.name,
        categoryName: categoryName.get(idOf(item.category) ?? -1) ?? 'Otros',
        sizeId: size.id,
        sizeLabel: size.label,
        total: stock?.quantityTotal ?? 0,
        delivered: stock?.quantityDelivered ?? 0,
        reserved: stock?.quantityReserved ?? 0,
        available: stock?.quantityAvailable ?? 0,
      })
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <PageHeader
        title="Stock de equipación"
        description={
          season
            ? `Unidades por artículo y talla en la temporada ${season.name}.`
            : 'Unidades por artículo y talla.'
        }
        breadcrumbs={[{ label: 'Socios', href: '/gestion' }, { label: 'Stock' }]}
      />

      {!season && (
        <p
          role="alert"
          className="mt-6 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-semibold text-foreground"
        >
          No hay ninguna temporada marcada como actual, así que no se puede contar el stock.
          Márcala en Configuración → Temporadas.
        </p>
      )}

      <div className="mt-6">
        {rows.length > 0 ? (
          <StockTable rows={rows} editable={Boolean(season)} />
        ) : (
          <EmptyState
            icon={<PackageIcon className="size-5" />}
            title="Todavía no hay artículos con tallas"
            description="Crea artículos de equipación y asígnales una escala de tallas desde el panel."
          />
        )}
      </div>
    </main>
  )
}
