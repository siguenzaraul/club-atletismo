import React from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ListChecksIcon } from 'lucide-react'

import { getCurrentStaff } from '@/actions/gestion'
import { getClient } from '@/lib/payload'
import { getSelectFieldSummaries } from '@/lib/attributes'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { SelectFieldSummaryCard } from '@/components/gestion/SelectFieldSummaryCard'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Resumen del club | ABTR' }

export default async function ResumenPage() {
  const staff = await getCurrentStaff()
  if (!staff) redirect('/admin/login?redirect=/gestion/resumen')

  const payload = await getClient()
  const { fields } = await getSelectFieldSummaries(payload)

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <PageHeader
        title="Resumen"
        description="Cuántos socios hay por cada opción de tus campos de lista (tallas, categorías…) para planificar compras y pedidos."
      />

      {fields.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={<ListChecksIcon className="size-5" />}
            title="Aún no hay campos de lista"
            description="Crea un campo del socio de tipo “Lista de opciones” (por ejemplo, Talla de camiseta) y aquí verás el recuento por opción."
            action={
              <Button render={<Link href="/admin/collections/attribute-definitions/create" />}>
                Crear un campo
              </Button>
            }
          />
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-5">
          {fields.map((field) => (
            <SelectFieldSummaryCard key={field.definitionId} field={field} />
          ))}
        </div>
      )}
    </main>
  )
}
