import React from 'react'
import { redirect } from 'next/navigation'
import { RegisterForm } from '@/components/site/AuthForms'
import { currentMember } from '@/lib/session'
import { getClient } from '@/lib/payload'
import { getRegistrationSettings } from '@/lib/registration-form'

export const dynamic = 'force-dynamic'
// El alta encadena bcrypt y varias consultas; sobre Neon en frío el default se queda corto.
export const maxDuration = 30
export const metadata = { title: 'Hazte socio' }

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ evento?: string }>
}) {
  if (await currentMember()) redirect('/socios')
  const { evento } = await searchParams

  const payload = await getClient()
  const [settings, typesRes, eventRes] = await Promise.all([
    getRegistrationSettings(payload),
    payload.find({
      collection: 'membership-types',
      where: { and: [{ showOnWebsite: { equals: true } }, { active: { equals: true } }] },
      sort: 'order',
      limit: 50,
    }),
    evento
      ? payload.find({
          collection: 'events',
          where: { slug: { equals: evento } },
          limit: 1,
          depth: 0,
        })
      : Promise.resolve({ docs: [] as { title?: string }[] }),
  ])
  const membershipTypes = settings.membershipTypes
  const eventTitle = eventRes.docs[0]?.title ?? null

  return (
    <main className="mx-auto grid max-w-5xl gap-12 px-6 py-16 lg:grid-cols-[1fr_1.1fr]">
      <div>
        <h1 className="font-display text-4xl uppercase tracking-tight">Hazte socio</h1>
        <p className="mb-8 mt-2 text-foreground/80">
          Únete al Club de Running Albatera y accede a tu zona privada.
        </p>
        {membershipTypes.length > 0 && (
          <ul className="flex flex-col gap-3">
            {typesRes.docs.map((t) => (
              <li key={t.id} className="rounded-2xl border border-border p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-display text-xl">{t.name}</span>
                  <span className="rounded-full bg-abtr-blue/10 px-3 py-1 text-sm font-bold text-abtr-blue">
                    {t.requiresPayment ? (t.amount ? `${t.amount} €` : 'De pago') : 'Gratis'}
                  </span>
                </div>
                {t.includes && (
                  <p className="mt-2 whitespace-pre-line text-sm text-foreground/80">{t.includes}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="rounded-2xl border border-border p-6 sm:p-8">
        <RegisterForm eventSlug={evento} eventTitle={eventTitle} settings={settings} />
      </div>
    </main>
  )
}
