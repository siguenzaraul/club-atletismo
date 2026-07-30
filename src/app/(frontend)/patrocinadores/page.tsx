import React from 'react'
import { getClient } from '@/lib/payload'
import { SponsorsBlock } from '@/components/site/SponsorsBlock'
import { SPONSOR_TIERS } from '@/collections/Sponsors'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Patrocinadores | ABTR' }

export default async function SponsorsPage() {
  const payload = await getClient()
  const sponsors = await payload.find({ collection: 'sponsors', depth: 1, limit: 200 })

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="font-display text-4xl uppercase tracking-tight sm:text-5xl">Patrocinadores</h1>
      <p className="mt-3 max-w-xl text-abtr-ink/60">
        Gracias a quienes hacen posible la ALBATERUN, los Social Runs y la vida del club.
      </p>

      <div className="mt-12 space-y-16">
        {SPONSOR_TIERS.map((tier) => {
          const docs = sponsors.docs.filter((s) => s.tier === tier.value)
          if (docs.length === 0) return null
          return (
            <div key={tier.value}>
              <SponsorsBlock sponsors={docs} title={tier.label} />
            </div>
          )
        })}
        {sponsors.docs.length === 0 && (
          <p className="text-abtr-ink/60">Aún no hay patrocinadores publicados.</p>
        )}
      </div>
    </main>
  )
}
