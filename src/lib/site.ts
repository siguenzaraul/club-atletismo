/** Absolute site URL, used for canonical links, sitemap, OG and metadata. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SERVER_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:3000')
).replace(/\/$/, '')

export const SITE_NAME = 'ABTR — Club de corredores Albatera'
