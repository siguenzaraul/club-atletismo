import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

export default function robots(): MetadataRoute.Robots {
  // Previews y ramas no deben competir con producción en el índice.
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production') {
    return { rules: { userAgent: '*', disallow: '/' } }
  }

  return {
    rules: {
      userAgent: '*',
      // `/api/media/file/` es donde Payload sirve los uploads: bloquearlo desindexa
      // todas las imágenes y rompe las previsualizaciones al compartir.
      allow: ['/', '/api/media/file/'],
      disallow: ['/admin', '/api/', '/socios', '/gestion'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
