import React from 'react'
import { SITE_NAME, SITE_URL } from '@/lib/site'

/**
 * Datos estructurados. Los rich results de eventos son especialmente valiosos para una carrera
 * popular: Google muestra fecha, lugar y enlace de inscripción directamente en la búsqueda.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }): React.JSX.Element {
  return (
    <script
      type="application/ld+json"
      // El objeto lo construimos nosotros, nunca viene de texto libre del usuario sin escapar.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  )
}

export const organizationJsonLd = (settings?: {
  email?: string | null
  phone?: string | null
  address?: string | null
  instagram?: string | null
  facebook?: string | null
  strava?: string | null
}): Record<string, unknown> => ({
  '@context': 'https://schema.org',
  '@type': 'SportsOrganization',
  name: SITE_NAME,
  alternateName: 'ABTR',
  url: SITE_URL,
  sport: 'Running',
  ...(settings?.email ? { email: settings.email } : {}),
  ...(settings?.phone ? { telephone: settings.phone } : {}),
  ...(settings?.address
    ? { address: { '@type': 'PostalAddress', streetAddress: settings.address, addressLocality: 'Albatera', addressRegion: 'Alicante', addressCountry: 'ES' } }
    : { address: { '@type': 'PostalAddress', addressLocality: 'Albatera', addressRegion: 'Alicante', addressCountry: 'ES' } }),
  sameAs: [settings?.instagram, settings?.facebook, settings?.strava].filter(Boolean),
})

export const sportsEventJsonLd = (event: {
  title: string
  slug?: string | null
  date?: string | null
  location?: string | null
  registrationOpen?: boolean | null
  imageUrl?: string | null
}): Record<string, unknown> => ({
  '@context': 'https://schema.org',
  '@type': 'SportsEvent',
  name: event.title,
  ...(event.date ? { startDate: event.date } : {}),
  eventStatus: 'https://schema.org/EventScheduled',
  eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
  location: {
    '@type': 'Place',
    name: event.location || 'Albatera',
    address: {
      '@type': 'PostalAddress',
      ...(event.location ? { streetAddress: event.location } : {}),
      addressLocality: 'Albatera',
      addressRegion: 'Alicante',
      addressCountry: 'ES',
    },
  },
  organizer: { '@type': 'SportsOrganization', name: SITE_NAME, url: SITE_URL },
  ...(event.imageUrl ? { image: [new URL(event.imageUrl, SITE_URL).toString()] } : {}),
  ...(event.slug ? { url: `${SITE_URL}/eventos/${event.slug}` } : {}),
  ...(event.registrationOpen && event.slug
    ? {
        offers: {
          '@type': 'Offer',
          url: `${SITE_URL}/eventos/${event.slug}`,
          availability: 'https://schema.org/InStock',
        },
      }
    : {}),
})
