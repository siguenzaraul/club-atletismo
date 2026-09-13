import React from 'react'
import { getClient } from '@/lib/payload'
import { SponsorsBlock } from '@/components/site/SponsorsBlock'
import { SPONSOR_TIERS } from '@/collections/Sponsors'
import { VISIBLE_SPONSOR_TIERS, displayTier, findAllSponsors } from '@/lib/sponsors'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Patrocinadores' }

export default async function SponsorsPage() {
  const payload = await getClient()
  const sponsors = await findAllSponsors(payload)
  // Etiqueta de cada nivel visible, tomada de la propia definición del campo.
  const tierLabel = (value: string) =>
    SPONSOR_TIERS.find((t) => t.value === value)?.label ?? value

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="font-display text-4xl uppercase tracking-tight sm:text-5xl">Patrocinadores</h1>
      <p className="mt-3 max-w-xl text-muted-foreground">
        Gracias a quienes hacen posible la ALBATERUN, los Social Runs y la vida del club.
      </p>

      <div className="mt-12 space-y-16">
        {/* Tres secciones, no cinco: los niveles retirados se pliegan al vigente. */}
        {VISIBLE_SPONSOR_TIERS.map((tier) => {
          const docs = sponsors.filter((s) => displayTier(s.tier) === tier)
          if (docs.length === 0) return null
          return (
            <div key={tier}>
              <SponsorsBlock sponsors={docs} title={tierLabel(tier)} />
            </div>
          )
        })}
        {sponsors.length === 0 && (
          <p className="text-muted-foreground">Aún no hay patrocinadores publicados.</p>
        )}
      </div>
    </main>
  )
}
