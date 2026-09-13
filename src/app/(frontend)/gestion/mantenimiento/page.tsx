import React from 'react'
import { redirect } from 'next/navigation'
import { currentStaff } from '@/lib/session'
import { BackfillResultsPanel } from '@/components/gestion/BackfillResultsPanel'
import { BackfillMembershipsPanel } from '@/components/gestion/BackfillMembershipsPanel'
import { SembrarTallasPanel } from '@/components/gestion/SembrarTallasPanel'
import { PageHeader } from '@/components/ui/page-header'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Mantenimiento' }

export default async function MaintenancePage() {
  const staff = await currentStaff()
  if (!staff) redirect('/admin/login?redirect=/gestion/mantenimiento')

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <PageHeader
        title="Mantenimiento"
        description="Tareas puntuales sobre los datos del club."
        breadcrumbs={[{ label: 'Socios', href: '/gestion' }, { label: 'Mantenimiento' }]}
      />
      <section className="mt-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h2 className="font-display text-2xl tracking-wide">Normalizar resultados antiguos</h2>
        <div className="mt-4">
          <BackfillResultsPanel />
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h2 className="font-display text-2xl tracking-wide">Cuotas sin abrir</h2>
        <div className="mt-4">
          <BackfillMembershipsPanel />
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h2 className="font-display text-2xl tracking-wide">Tallas estándar</h2>
        <div className="mt-4">
          <SembrarTallasPanel />
        </div>
      </section>
    </main>
  )
}
