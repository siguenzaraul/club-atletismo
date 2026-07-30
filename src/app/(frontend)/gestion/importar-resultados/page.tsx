import React from 'react'
import { redirect } from 'next/navigation'
import { getCurrentStaff } from '@/actions/gestion'
import { getClient } from '@/lib/payload'
import { ImportResultsForm } from '@/components/gestion/ImportResultsForm'
import { PageHeader } from '@/components/ui/page-header'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Importar resultados | ABTR' }

export default async function ImportResultsPage() {
  const staff = await getCurrentStaff()
  if (!staff) redirect('/admin/login?redirect=/gestion/importar-resultados')

  const payload = await getClient()
  const events = await payload.find({ collection: 'events', sort: '-date', limit: 200, depth: 0, overrideAccess: true })

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <PageHeader
        title="Importar resultados"
        description="Sube el CSV de una carrera. Cada corredor con email de socio se enlaza automáticamente."
        breadcrumbs={[{ label: 'Socios', href: '/gestion' }, { label: 'Importar resultados' }]}
      />
      <div className="mt-6">
        <ImportResultsForm events={events.docs.map((e) => ({ id: e.id, title: e.title }))} />
      </div>
    </main>
  )
}
