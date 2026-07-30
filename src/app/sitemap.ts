import type { MetadataRoute } from 'next'
import { getClient } from '@/lib/payload'
import { SITE_URL } from '@/lib/site'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const payload = await getClient()

  const staticRoutes = [
    '',
    '/eventos',
    '/resultados',
    '/equipo',
    '/noticias',
    '/patrocinadores',
    '/contacto',
    '/hazte-socio',
  ].map((path) => ({ url: `${SITE_URL}${path}`, changeFrequency: 'weekly' as const, priority: path === '' ? 1 : 0.7 }))

  const [events, posts] = await Promise.all([
    payload.find({ collection: 'events', limit: 500, depth: 0 }),
    payload.find({ collection: 'posts', where: { status: { equals: 'published' } }, limit: 500, depth: 0 }),
  ])

  const eventRoutes = events.docs
    .filter((e) => e.slug)
    .map((e) => ({ url: `${SITE_URL}/eventos/${e.slug}`, lastModified: e.updatedAt, changeFrequency: 'weekly' as const, priority: 0.6 }))

  const postRoutes = posts.docs
    .filter((p) => p.slug)
    .map((p) => ({ url: `${SITE_URL}/noticias/${p.slug}`, lastModified: p.updatedAt, changeFrequency: 'monthly' as const, priority: 0.5 }))

  return [...staticRoutes, ...eventRoutes, ...postRoutes]
}
