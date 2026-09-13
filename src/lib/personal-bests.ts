import { formatMark } from './marks'

/**
 * Marcas personales. Se **derivan en lectura**, no se persisten: así una corrección del staff
 * en `results` se refleja al instante y no hacen falta hooks cruzados results → members.
 */

export type PersonalBestSource = 'manual' | 'result'

export type PersonalBest = {
  distanceMeters: number
  markSeconds: number
  mark: string
  date: string | null
  eventName: string | null
  source: PersonalBestSource
  resultId: number | null
}

/**
 * Una entrada por distancia: gana el menor `markSeconds`.
 * A igualdad gana la de `results`, que es verificable frente a la introducida a mano.
 * Ordena por distancia ascendente.
 */
export const mergePersonalBests = (
  manual: readonly PersonalBest[],
  fromResults: readonly PersonalBest[],
): PersonalBest[] => {
  const best = new Map<number, PersonalBest>()

  for (const pb of [...manual, ...fromResults]) {
    if (!Number.isFinite(pb.distanceMeters) || pb.distanceMeters <= 0) continue
    if (!Number.isFinite(pb.markSeconds) || pb.markSeconds <= 0) continue

    const current = best.get(pb.distanceMeters)
    if (!current) {
      best.set(pb.distanceMeters, pb)
      continue
    }
    if (pb.markSeconds < current.markSeconds) {
      best.set(pb.distanceMeters, pb)
    } else if (pb.markSeconds === current.markSeconds && pb.source === 'result') {
      best.set(pb.distanceMeters, pb)
    }
  }

  return [...best.values()].sort((a, b) => a.distanceMeters - b.distanceMeters)
}

/** Fila de `results` ya normalizada → marca personal candidata. */
export const personalBestFromResult = (r: {
  id: number
  distanceMeters?: number | null
  markSeconds?: number | null
  mark?: string | null
  event?: unknown
}): PersonalBest | null => {
  if (typeof r.distanceMeters !== 'number' || typeof r.markSeconds !== 'number') return null
  const event = r.event && typeof r.event === 'object' ? (r.event as { title?: string; date?: string }) : null
  return {
    distanceMeters: r.distanceMeters,
    markSeconds: r.markSeconds,
    mark: r.mark || formatMark(r.markSeconds),
    date: event?.date ?? null,
    eventName: event?.title ?? null,
    source: 'result',
    resultId: r.id,
  }
}

/** Fila del array `members.personalBests` → marca personal candidata. */
export const personalBestFromManual = (row: {
  distanceMeters?: number | null
  markSeconds?: number | null
  mark?: string | null
  date?: string | null
  eventName?: string | null
}): PersonalBest | null => {
  if (typeof row.distanceMeters !== 'number' || typeof row.markSeconds !== 'number') return null
  return {
    distanceMeters: row.distanceMeters,
    markSeconds: row.markSeconds,
    mark: row.mark || formatMark(row.markSeconds),
    date: row.date ?? null,
    eventName: row.eventName ?? null,
    source: 'manual',
    resultId: null,
  }
}
