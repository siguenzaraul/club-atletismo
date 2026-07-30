import React from 'react'
import { redirect } from 'next/navigation'
import { RegisterForm, type MembershipTypeOption } from '@/components/site/AuthForms'
import { getCurrentMember } from '@/actions/auth'
import { getClient } from '@/lib/payload'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Hazte socio | ABTR' }

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ evento?: string }>
}) {
  if (await getCurrentMember()) redirect('/socios')
  const { evento } = await searchParams

  const payload = await getClient()
  const typesRes = await payload.find({
    collection: 'membership-types',
    where: { and: [{ showOnWebsite: { equals: true } }, { active: { equals: true } }] },
    sort: 'order',
    limit: 50,
  })
  const membershipTypes: MembershipTypeOption[] = typesRes.docs.map((t) => ({
    id: t.id,
    name: t.name,
    requiresPayment: t.requiresPayment,
    amount: t.amount,
  }))

  return (
    <main className="mx-auto grid max-w-5xl gap-12 px-6 py-16 lg:grid-cols-[1fr_1.1fr]">
      <div>
        <h1 className="font-display text-4xl uppercase tracking-tight">Hazte socio</h1>
        <p className="mb-8 mt-2 text-abtr-ink/70">
          Únete al Club de corredores Albatera y accede a tu zona privada.
        </p>
        {membershipTypes.length > 0 && (
          <ul className="flex flex-col gap-3">
            {typesRes.docs.map((t) => (
              <li key={t.id} className="rounded-2xl border border-abtr-ink/10 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-display text-xl">{t.name}</span>
                  <span className="rounded-full bg-abtr-blue/10 px-3 py-1 text-sm font-bold text-abtr-blue">
                    {t.requiresPayment ? (t.amount ? `${t.amount} €` : 'De pago') : 'Gratis'}
                  </span>
                </div>
                {t.includes && (
                  <p className="mt-2 whitespace-pre-line text-sm text-abtr-ink/70">{t.includes}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="rounded-2xl border border-abtr-ink/10 p-6 sm:p-8">
        <RegisterForm eventSlug={evento} membershipTypes={membershipTypes} />
      </div>
    </main>
  )
}
