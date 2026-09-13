import type { Payload } from 'payload'

import type { Media, Member } from '@/payload-types'
import {
  mergePersonalBests,
  personalBestFromManual,
  personalBestFromResult,
  type PersonalBest,
} from './personal-bests'

/**
 * Superficie pública de `members`.
 *
 * El access de la colección NO se toca (`read: adminOrOwn('id')`): abrirlo expondría
 * /api/members y /api/graphql al anónimo, que podría paginar y **filtrar por campos que no se
 * devuelven** (`?where[phone][like]=…` funciona como oráculo aunque el campo no se serialice).
 * En una colección con teléfonos, emails y datos de menores eso es desproporcionado.
 *
 * En su lugar: proyección deny-by-default. Esta constante es la ÚNICA superficie pública, y
 * ampliarla exige editarla a propósito. El `select` de Payload recorta a nivel de query, así
 * que `phone`, `email`, `federationNumber`, `hash` y `salt` ni se leen de la base de datos.
 */
export const PUBLIC_ATHLETE_SELECT = {
  name: true,
  slug: true,
  photo: true,
  category: true,
  publicBio: true,
  publicProfile: true,
  personalBests: true,
} as const

export type PublicAthlete = {
  id: number
  name: string
  slug: string
  photo: Media | null
  category: string | null
  bio: string | null
  bests: PersonalBest[]
}

type RawAthlete = Pick<Member, 'id' | 'name' | 'slug' | 'photo' | 'category' | 'publicBio' | 'personalBests'>

/** Nunca devuelve el documento crudo: así ningún Server Component puede filtrar de más. */
const toPublicAthlete = (doc: RawAthlete, bests: PersonalBest[]): PublicAthlete => ({
  id: doc.id,
  name: doc.name,
  slug: doc.slug ?? '',
  photo: doc.photo && typeof doc.photo === 'object' ? (doc.photo as Media) : null,
  category: doc.category ?? null,
  bio: doc.publicBio ?? null,
  bests,
})

const manualBests = (doc: RawAthlete): PersonalBest[] =>
  (doc.personalBests ?? []).map(personalBestFromManual).filter((b): b is PersonalBest => b !== null)

/** Marcas derivadas de los resultados normalizados del socio. */
const resultBests = async (payload: Payload, memberId: number): Promise<PersonalBest[]> => {
  const results = await payload
    .find({
      collection: 'results',
      where: {
        and: [
          { member: { equals: memberId } },
          { distanceMeters: { exists: true } },
          { markSeconds: { exists: true } },
        ],
      },
      sort: 'markSeconds',
      depth: 1,
      limit: 500,
      overrideAccess: true,
    })
    .catch(() => null)

  return (results?.docs ?? [])
    .map((r) => personalBestFromResult(r as Parameters<typeof personalBestFromResult>[0]))
    .filter((b): b is PersonalBest => b !== null)
}

export const listPublicAthletes = async (payload: Payload): Promise<PublicAthlete[]> => {
  const res = await payload
    .find({
      collection: 'members',
      where: { and: [{ publicProfile: { equals: true } }, { slug: { exists: true } }] },
      select: PUBLIC_ATHLETE_SELECT,
      sort: 'name',
      depth: 1,
      limit: 500,
      overrideAccess: true,
    })
    .catch(() => null)

  const docs = (res?.docs ?? []) as RawAthlete[]

  return Promise.all(
    docs.map(async (doc) =>
      toPublicAthlete(doc, mergePersonalBests(manualBests(doc), await resultBests(payload, doc.id))),
    ),
  )
}

export const getPublicAthleteBySlug = async (
  payload: Payload,
  slug: string,
): Promise<PublicAthlete | null> => {
  if (!slug) return null

  const res = await payload
    .find({
      collection: 'members',
      where: { and: [{ slug: { equals: slug } }, { publicProfile: { equals: true } }] },
      select: PUBLIC_ATHLETE_SELECT,
      depth: 1,
      limit: 1,
      overrideAccess: true,
    })
    .catch(() => null)

  const doc = res?.docs?.[0] as RawAthlete | undefined
  if (!doc) return null

  return toPublicAthlete(
    doc,
    mergePersonalBests(manualBests(doc), await resultBests(payload, doc.id)),
  )
}
