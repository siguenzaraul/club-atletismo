import type { MetadataRoute } from 'next'
import { getClient } from '@/lib/payload'
import { listPublicAthletes } from '@/lib/public-athletes'
import { SITE_URL } from '@/lib/site'

// Se regenera cada hora: si no, un socio que publica su ficha no aparecería en el sitemap
// hasta el siguiente despliegue, porque Next lo prerenderiza en el build.
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const payload = await getClient()

  const staticRoutes = [
    '',
    '/eventos',
    '/resultados',
    '/equipo',
    '/atletas',
    '/noticias',
    '/patrocinadores',
    '/contacto',
    '/hazte-socio',
  ].map((path) => ({ url: `${SITE_URL}${path}`, changeFrequency: 'weekly' as const, priority: path === '' ? 1 : 0.7 }))

  const [events, posts, athletes] = await Promise.all([
    payload.find({ collection: 'events', limit: 500, depth: 0 }),
    payload.find({ collection: 'posts', where: { status: { equals: 'published' } }, limit: 500, depth: 0 }),
    // Se reutiliza la proyección con lista blanca: nunca un `find` ad hoc sobre `members`.
    listPublicAthletes(payload),
  ])

  const athleteRoutes = athletes
    .filter((a) => a.slug)
    .map((a) => ({ url: `${SITE_URL}/atletas/${a.slug}`, changeFrequency: 'monthly' as const, priority: 0.4 }))

  const eventRoutes = events.docs
    .filter((e) => e.slug)
    .map((e) => ({ url: `${SITE_URL}/eventos/${e.slug}`, lastModified: e.updatedAt, changeFrequency: 'weekly' as const, priority: 0.6 }))

  const postRoutes = posts.docs
    .filter((p) => p.slug)
    .map((p) => ({ url: `${SITE_URL}/noticias/${p.slug}`, lastModified: p.updatedAt, changeFrequency: 'monthly' as const, priority: 0.5 }))

  return [...staticRoutes, ...eventRoutes, ...postRoutes, ...athleteRoutes]
}
