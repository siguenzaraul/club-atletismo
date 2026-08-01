import { postgresAdapter } from '@payloadcms/db-postgres'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { es } from '@payloadcms/translations/languages/es'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Members } from './collections/Members'
import { Sponsors } from './collections/Sponsors'
import { Events } from './collections/Events'
import { EventRegistrations } from './collections/EventRegistrations'
import { Results } from './collections/Results'
import { Team } from './collections/Team'
import { Posts } from './collections/Posts'
import { Seasons } from './collections/Seasons'
import { MembershipTypes } from './collections/MembershipTypes'
import { Memberships } from './collections/Memberships'
import { AttributeDefinitions } from './collections/AttributeDefinitions'
import { MemberAttributes } from './collections/MemberAttributes'
import { SizeScales } from './collections/SizeScales'
import { Sizes } from './collections/Sizes'
import { EquipmentItems } from './collections/EquipmentItems'
import { EquipmentStock } from './collections/EquipmentStock'
import { EquipmentDeliveries } from './collections/EquipmentDeliveries'
import { EquipmentPacks } from './collections/EquipmentPacks'
import { ContactMessages } from './collections/ContactMessages'
import { SiteSettings } from './globals/SiteSettings'
import { HomePage } from './globals/HomePage'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const databaseUri = process.env.DATABASE_URI || process.env.DATABASE_URL || ''
const usePostgres = databaseUri.startsWith('postgres')

// Fail loudly if the auth secret is missing: an empty secret silently breaks sessions in prod.
const secret = process.env.PAYLOAD_SECRET
if (!secret) {
  throw new Error(
    'Falta PAYLOAD_SECRET. Define un secreto fuerte en las variables de entorno antes de arrancar.',
  )
}

// Migrations live in src/migrations and must be committed before deploying to Postgres.
const migrationDir = path.resolve(dirname, 'migrations')

// SQLite for zero-config local dev; Postgres on Vercel (set DATABASE_URI to a postgres URL).
// The SQLite adapter is imported dynamically so its native `libsql` dependency is never
// required in production (Postgres), where it isn't bundled into the serverless function.
const db = usePostgres
  ? postgresAdapter({ migrationDir, pool: { connectionString: databaseUri } })
  : (await import('@payloadcms/db-sqlite')).sqliteAdapter({
      migrationDir,
      client: { url: databaseUri || 'file:./club-atletismo.db' },
    })

// Media goes to Vercel Blob in deploys; falls back to local disk when no token is set.
const blobToken = process.env.BLOB_READ_WRITE_TOKEN

export default buildConfig({
  admin: {
    user: Users.slug,
    // Spanish-friendly dates across the panel; Payload auto-detects the admin UI language.
    dateFormat: 'dd/MM/yyyy',
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: '· ABTR',
      description: 'Panel de gestión del Club de corredores Albatera',
    },
    components: {
      graphics: {
        Logo: '/components/admin/Logo#Logo',
        Icon: '/components/admin/Icon#Icon',
      },
      beforeDashboard: ['/components/admin/Welcome#Welcome'],
    },
  },
  collections: [
    Users,
    Members,
    Media,
    Posts,
    Events,
    EventRegistrations,
    Results,
    Team,
    Sponsors,
    Seasons,
    MembershipTypes,
    Memberships,
    AttributeDefinitions,
    MemberAttributes,
    SizeScales,
    Sizes,
    EquipmentItems,
    EquipmentStock,
    EquipmentDeliveries,
    EquipmentPacks,
    ContactMessages,
  ],
  globals: [HomePage, SiteSettings],
  editor: lexicalEditor(),
  // Panel de administración en español.
  i18n: { fallbackLanguage: 'es', supportedLanguages: { es } },
  secret,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db,
  sharp,
  localization: {
    locales: ['es'],
    fallback: true,
    defaultLocale: 'es',
  },
  plugins: [
    ...(blobToken
      ? [
          vercelBlobStorage({
            enabled: true,
            collections: { media: true },
            token: blobToken,
          }),
        ]
      : []),
  ],
})
