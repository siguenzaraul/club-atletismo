import React from 'react'
import { redirect } from 'next/navigation'
import { currentMember } from '@/lib/session'
import { getClient } from '@/lib/payload'
import { ProfileForm, type EditableAttribute } from '@/components/site/ProfileForm'
import { PublicProfileForm } from '@/components/site/PublicProfileForm'
import { PageHeader } from '@/components/ui/page-header'
import { valueFieldFor, type AttributeType } from '@/lib/attributes'
import type { MemberAttribute } from '@/payload-types'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Mi perfil' }

export default async function ProfilePage() {
  const member = await currentMember()
  if (!member) redirect('/login')
  const payload = await getClient()

  const [defsRes, attrsRes] = await Promise.all([
    payload.find({
      collection: 'attribute-definitions',
      where: { and: [{ active: { equals: true } }, { editableByMember: { equals: true } }] },
      sort: 'order',
      limit: 200,
    }),
    payload.find({
      collection: 'member-attributes',
      where: { member: { equals: member.id } },
      limit: 200,
      overrideAccess: true,
    }),
  ])

  const byDef = new Map<number, MemberAttribute>()
  for (const a of attrsRes.docs) {
    const defId = typeof a.definition === 'object' ? a.definition?.id : a.definition
    if (defId) byDef.set(defId, a)
  }

  const editableAttributes: EditableAttribute[] = defsRes.docs.map((def) => {
    const type = def.type as AttributeType
    const attr = byDef.get(def.id)
    const rawField = valueFieldFor(type)
    const raw = attr ? (attr as unknown as Record<string, unknown>)[rawField] : null
    return {
      id: def.id,
      label: def.label,
      type,
      value: type === 'boolean' ? '' : raw != null ? String(raw) : '',
      boolean: type === 'boolean' ? Boolean(raw) : false,
    }
  })

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Mi perfil"
        description="Actualiza tus datos. Para cambiar tu email, escríbenos."
        breadcrumbs={[{ label: 'Zona de socio', href: '/socios' }, { label: 'Mi perfil' }]}
      />
      <div className="mt-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <ProfileForm
          defaults={{
            name: member.name ?? '',
            phone: member.phone ?? '',
            federationNumber: member.federationNumber ?? '',
            category: member.category ?? 'popular',
          }}
          editableAttributes={editableAttributes}
        />
      </div>

      <section className="mt-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h2 className="font-display text-2xl tracking-wide">Ficha pública de atleta</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Opcional. Por defecto tu ficha es privada y no aparece en ningún sitio.
        </p>
        <div className="mt-5">
          <PublicProfileForm
            slug={member.slug ?? null}
            defaults={{
              publicProfile: member.publicProfile ?? false,
              publicBio: member.publicBio ?? '',
              personalBests: (member.personalBests ?? []).map((b) => ({
                distanceMeters: b.distanceMeters,
                mark: b.mark,
                date: b.date,
                eventName: b.eventName,
              })),
            }}
          />
        </div>
      </section>
    </main>
  )
}
