import React from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { UploadIcon, DownloadIcon } from 'lucide-react'

import { getCurrentStaff } from '@/actions/gestion'
import { getClient } from '@/lib/payload'
import { MEMBER_CATEGORIES } from '@/collections/Members'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { MembersTable, type MemberRow } from '@/components/gestion/MembersTable'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Gestión de socios | ABTR' }

const categoryLabel = (v?: string | null) => MEMBER_CATEGORIES.find((c) => c.value === v)?.label ?? '—'
const toStatus = (v?: string | null): MemberRow['status'] =>
  v === 'active' ? 'active' : v === 'inactive' ? 'inactive' : 'pending'

export default async function GestionListPage() {
  const staff = await getCurrentStaff()
  if (!staff) redirect('/admin/login?redirect=/gestion')

  const payload = await getClient()
  const members = await payload.find({
    collection: 'members',
    sort: 'name',
    limit: 1000,
    depth: 0,
    overrideAccess: true,
  })

  const rows: MemberRow[] = members.docs.map((m) => ({
    id: m.id,
    name: m.name ?? 'Sin nombre',
    email: m.email ?? '',
    categoryLabel: categoryLabel(m.category),
    status: toStatus(m.membershipStatus),
  }))

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <PageHeader
        title="Socios"
        description="Elige un socio para gestionar todo lo suyo, o busca y filtra la lista."
        actions={
          <div className="flex flex-wrap gap-2">
            {/* Real anchor: this is a CSV download endpoint, not a page navigation. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <Button variant="outline" render={<a href="/gestion/export" download />} className="h-10">
              <DownloadIcon /> Exportar CSV
            </Button>
            <Button render={<Link href="/gestion/importar-resultados" />} className="h-10">
              <UploadIcon /> Importar resultados
            </Button>
          </div>
        }
      />
      <div className="mt-6">
        <MembersTable rows={rows} />
      </div>
    </main>
  )
}
