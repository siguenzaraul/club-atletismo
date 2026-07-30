import React from 'react'
import { Archivo } from 'next/font/google'
import './styles.css'
import { SiteHeader } from '@/components/site/SiteHeader'
import { SiteFooter } from '@/components/site/SiteFooter'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { Toaster } from '@/components/ui/sonner'
import { getClient } from '@/lib/payload'
import { SITE_URL } from '@/lib/site'

// Club-editable brand colours (Ajustes del sitio → Marca). Only valid hex is injected;
// overriding these CSS vars recolours the whole site and the shadcn tokens mapped to them.
const HEX = /^#[0-9a-fA-F]{3,8}$/
async function getBrandStyle(): Promise<React.CSSProperties> {
  try {
    const payload = await getClient()
    const s = (await payload.findGlobal({ slug: 'site-settings', depth: 0 })) as {
      brandPrimary?: string | null
      brandSecondary?: string | null
      brandAccent?: string | null
    }
    const style: Record<string, string> = {}
    if (s?.brandPrimary && HEX.test(s.brandPrimary)) style['--color-abtr-blue'] = s.brandPrimary
    if (s?.brandSecondary && HEX.test(s.brandSecondary)) style['--color-abtr-red'] = s.brandSecondary
    if (s?.brandAccent && HEX.test(s.brandAccent)) style['--color-abtr-yellow'] = s.brandAccent
    return style as React.CSSProperties
  } catch {
    return {}
  }
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
    default: 'ABTR — Club de corredores Albatera',
    template: '%s',
  },
  description:
    'Club de atletismo de Albatera. Carrera ALBATERUN, Social Runs, eventos de club, resultados y zona de socios.',
  openGraph: {
    siteName: 'ABTR — Club de corredores Albatera',
    locale: 'es_ES',
    type: 'website',
  },
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props
  const brandStyle = await getBrandStyle()

  return (
    <html lang="es" suppressHydrationWarning className={sans.variable} style={brandStyle}>
      <body className="flex min-h-screen flex-col">
        <ThemeProvider>
          <SiteHeader />
          <div className="flex-1">{children}</div>
          <SiteFooter />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
