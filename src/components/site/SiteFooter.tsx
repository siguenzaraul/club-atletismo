import React from 'react'
import Link from 'next/link'
import { getClient } from '@/lib/payload'
import { Logo } from './Logo'
import { SponsorsBlock } from './SponsorsBlock'
import { findFooterSponsors } from '@/lib/sponsors'

export async function SiteFooter() {
  const payload = await getClient()
  const [settings, globalSponsors] = await Promise.all([
    payload.findGlobal({ slug: 'site-settings' }),
    findFooterSponsors(payload),
  ])

  return (
    <footer className="band-ink">
      <div className="mx-auto max-w-6xl px-6 py-16">
        {globalSponsors.length > 0 && (
          <div className="mb-16 border-b border-white/10 pb-16">
            <SponsorsBlock sponsors={globalSponsors} title="Con el apoyo de" dark />
          </div>
        )}
        <div className="flex flex-col justify-between gap-10 md:flex-row">
          <div className="max-w-xs">
            <Logo dark />
            <p className="mt-4 text-sm text-white/60">
              {settings.address ?? 'Albatera, Alicante'}
            </p>
          </div>
          <nav className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm" aria-label="Pie">
            <Link href="/eventos" className="text-white/70 hover:text-white">Eventos</Link>
            <Link href="/resultados" className="text-white/70 hover:text-white">Resultados</Link>
            <Link href="/equipo" className="text-white/70 hover:text-white">Equipo</Link>
            <Link href="/noticias" className="text-white/70 hover:text-white">Noticias</Link>
            <Link href="/hazte-socio" className="text-white/70 hover:text-white">Hazte socio</Link>
          </nav>
          <div className="text-sm text-white/70">
            {settings.email && (
              <a href={`mailto:${settings.email}`} className="block hover:text-white">
                {settings.email}
              </a>
            )}
            {settings.phone && <span className="block">{settings.phone}</span>}
            {settings.instagram && (
              <a href={settings.instagram} className="mt-2 block hover:text-white" target="_blank" rel="noopener noreferrer">
                Instagram
              </a>
            )}
          </div>
        </div>
        <p className="mt-12 text-xs text-white/60">
          © {new Date().getFullYear()} ABTR — Club de Running Albatera.
        </p>
      </div>
    </footer>
  )
}
