import React from 'react'
import { Archivo } from 'next/font/google'
import './styles.css'
import { SiteHeader } from '@/components/site/SiteHeader'
import { SiteFooter } from '@/components/site/SiteFooter'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { JsonLd, organizationJsonLd } from '@/components/site/JsonLd'
import { Toaster } from '@/components/ui/sonner'
import { getClient } from '@/lib/payload'
import { SITE_URL } from '@/lib/site'

// Club-editable brand colours (Ajustes del sitio → Marca). Only valid hex is injected;
// overriding these CSS vars recolours the whole site and the shadcn tokens mapped to them.
const HEX = /^#[0-9a-fA-F]{3,8}$/

type SiteSettingsShape = {
  brandPrimary?: string | null
  brandSecondary?: string | null
  brandAccent?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  instagram?: string | null
  facebook?: string | null
  strava?: string | null
}

/** Un solo `findGlobal` por petición: alimenta a la vez los colores de marca y el JSON-LD. */
async function getSiteSettings(): Promise<SiteSettingsShape> {
  try {
    const payload = await getClient()
    return (await payload.findGlobal({ slug: 'site-settings', depth: 0 })) as SiteSettingsShape
  } catch {
    return {}
  }
}

function brandStyleFrom(s: SiteSettingsShape): React.CSSProperties {
  const style: Record<string, string> = {}
  if (s?.brandPrimary && HEX.test(s.brandPrimary)) style['--color-abtr-blue'] = s.brandPrimary
  if (s?.brandSecondary && HEX.test(s.brandSecondary)) style['--color-abtr-red'] = s.brandSecondary
  if (s?.brandAccent && HEX.test(s.brandAccent)) style['--color-abtr-yellow'] = s.brandAccent
  return style as React.CSSProperties
}

// Archivo brings the neutral neo-grotesque shapes used in the visual reference:
// double-storey "a", compact proportions and a cleaner, less geometric rhythm.
const sans = Archivo({
  subsets: ['latin'],
  variable: '--font-abtr-sans',
  display: 'swap',
})

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'ABTR — Club de Running Albatera',
    // Antes era '%s', un no-op que obligaba a repetir "| ABTR" a mano en cada página.
    template: '%s | ABTR',
  },
  description:
    'Club de atletismo de Albatera. Carrera ALBATERUN, Social Runs, eventos de club, resultados y zona de socios.',
  openGraph: {
    siteName: 'ABTR — Club de Running Albatera',
    locale: 'es_ES',
    type: 'website',
  },
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props
  const settings = await getSiteSettings()

  return (
    <html lang="es" suppressHydrationWarning className={sans.variable} style={brandStyleFrom(settings)}>
      <body className="flex min-h-screen flex-col">
        <JsonLd data={organizationJsonLd(settings)} />
        <ThemeProvider>
          {/* Con header sticky y 6 items de nav, sin esto cada navegación por teclado obliga
              a tabular todo el header antes de llegar al contenido. */}
          <a
            href="#contenido"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-abtr-blue focus:px-5 focus:py-3 focus:font-bold focus:text-white"
          >
            Saltar al contenido
          </a>
          <SiteHeader />
          <div id="contenido" className="flex-1 overflow-x-clip">
            {children}
          </div>
          <SiteFooter />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
