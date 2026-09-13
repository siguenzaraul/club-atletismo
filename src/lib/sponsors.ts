/**
 * Patrocinadores: niveles, orden y las consultas de cada superficie de la web.
 *
 * Todo en un sitio porque estaba en cuatro: el pie miraba sólo `global`, la portada
 * `global OR clubSponsor` y la carrera sólo `mainRaceSponsor`, y la fusión con los
 * patrocinadores del evento estaba copiada literalmente en dos páginas.
 */

import type { Payload, Where } from 'payload'

import { VISIBLE_SPONSOR_TIERS } from '@/collections/Sponsors'
import type { Sponsor } from '@/payload-types'

export { VISIBLE_SPONSOR_TIERS }

export type VisibleSponsorTier = (typeof VISIBLE_SPONSOR_TIERS)[number]

/** Los dos niveles retirados siguen en el enum de Postgres; en la web se pliegan al vigente. */
const LEGACY_TIERS = { plata: 'oro', bronce: 'colaborador' } as const satisfies Record<
  'plata' | 'bronce',
  VisibleSponsorTier
>

export const displayTier = (tier: Sponsor['tier']): VisibleSponsorTier =>
  tier in LEGACY_TIERS ? LEGACY_TIERS[tier as keyof typeof LEGACY_TIERS] : (tier as VisibleSponsorTier)

const TIER_RANK: Record<VisibleSponsorTier, number> = {
  principal: 0,
  oro: 1,
  colaborador: 2,
}

export const isSponsorDoc = (s: Sponsor | number): s is Sponsor => typeof s === 'object'

/** `active` a NULL (fila anterior a que existiera el campo) cuenta como activo. */
export const isActiveSponsor = (s: Sponsor): boolean => s.active !== false

/** Nivel → orden manual → nombre. */
export const compareSponsors = (a: Sponsor, b: Sponsor): number =>
  TIER_RANK[displayTier(a.tier)] - TIER_RANK[displayTier(b.tier)] ||
  (a.order ?? 0) - (b.order ?? 0) ||
  a.name.localeCompare(b.name, 'es')

/**
 * Funde los patrocinadores propios de una carrera con los automáticos, deduplicando por id.
 * El documento del evento gana: viene de una consulta con más `depth` y puede estar más poblado.
 */
export const mergeEventSponsors = (
  eventSponsors: (Sponsor | number)[] | null | undefined,
  automatic: Sponsor[],
): Sponsor[] => {
  const byId = new Map<number, Sponsor>()
  for (const s of automatic) if (isActiveSponsor(s)) byId.set(s.id, s)
  for (const s of eventSponsors ?? []) {
    if (isSponsorDoc(s) && isActiveSponsor(s)) byId.set(s.id, s)
  }
  return Array.from(byId.values()).sort(compareSponsors)
}

// `not_equals: false` y no `equals: true`: defensivo por si alguna fila quedara a NULL.
const ACTIVE = { active: { not_equals: false } } as const

const find = async (payload: Payload, where: Where): Promise<Sponsor[]> => {
  const res = await payload.find({
    collection: 'sponsors',
    where: { and: [ACTIVE, where] },
    depth: 1,
    limit: 200,
  })
  return res.docs.sort(compareSponsors)
}

/** Pie de página: sólo los de «en toda la web». */
export const findFooterSponsors = (payload: Payload): Promise<Sponsor[]> =>
  find(payload, { global: { equals: true } })

/** Portada, bloque del club. */
export const findClubSponsors = (payload: Payload): Promise<Sponsor[]> =>
  find(payload, { or: [{ global: { equals: true } }, { clubSponsor: { equals: true } }] })

/**
 * Bloque de la carrera principal. Incluye los globales: «en toda la web» significa eso, y antes
 * era la única superficie donde no se cumplía.
 */
export const findRaceSponsors = (payload: Payload): Promise<Sponsor[]> =>
  find(payload, { or: [{ global: { equals: true } }, { mainRaceSponsor: { equals: true } }] })

/** Página /patrocinadores: todos los activos. */
export const findAllSponsors = async (payload: Payload): Promise<Sponsor[]> => {
  const res = await payload.find({ collection: 'sponsors', where: ACTIVE, depth: 1, limit: 200 })
  return res.docs.sort(compareSponsors)
}
