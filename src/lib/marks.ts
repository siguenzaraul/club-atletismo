/**
 * Normalización de marcas de carrera. `results.mark` es texto libre escrito por el club
 * ("38:20", "00:42:15", "1.23.45"), así que hace falta un canónico en segundos para poder
 * ordenar, comparar y calcular marcas personales.
 */

const MAX_SECONDS = 86_400 // 24 h: por encima es un error de tecleo, no una marca.

/**
 * Convierte una marca de texto libre a segundos enteros.
 * Nunca lanza: devuelve `null` para cualquier entrada que no sea inequívocamente un tiempo
 * ("DNF", "—", vacío, "38:75"). Eso permite llamarlo desde hooks sin envolver en try/catch.
 */
export const parseMarkToSeconds = (raw: string | null | undefined): number | null => {
  if (typeof raw !== 'string') return null

  // Quita espacios y los sufijos habituales de cronos ("1h 23' 45\"").
  let s = raw.trim().replace(/\s+/g, '').replace(/[h'"]/gi, ':').replace(/:+$/, '')
  if (!s) return null

  // Desambiguar `.` y `,`:
  // - Con `:` presente, un separador decimal final son décimas ("38:20.4").
  // - Sin `:`, son separadores de campo ("1.23.45" → 1:23:45, "38.20" → 38:20).
  //   El caso ambiguo "38.20" se resuelve como 38m20s, que es lo que produce el 100 %
  //   de los cronos de carrera popular.
  if (s.includes(':')) {
    s = s.replace(/[.,]\d+$/, '')
  } else {
    s = s.replace(/[.,]/g, ':')
  }

  const parts = s.split(':')
  if (parts.length !== 2 && parts.length !== 3) return null
  if (!parts.every((p) => /^\d+$/.test(p))) return null

  const nums = parts.map(Number)
  const [h, m, sec] = parts.length === 3 ? nums : [0, nums[0], nums[1]]

  if (sec >= 60) return null
  if (parts.length === 3 && m >= 60) return null

  const total = h * 3600 + m * 60 + sec
  if (total <= 0 || total > MAX_SECONDS) return null
  return total
}

/** Inversa de `parseMarkToSeconds`: `h:mm:ss` si hay horas, `mm:ss` si no. */
export const formatMark = (seconds: number | null | undefined): string => {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) return '—'
  const total = Math.round(seconds)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

/** Ritmo medio en min/km, p. ej. "4:12 /km". */
export const formatPace = (seconds: number, meters: number): string => {
  if (!Number.isFinite(seconds) || !Number.isFinite(meters) || seconds <= 0 || meters <= 0) {
    return '—'
  }
  const perKm = Math.round((seconds / meters) * 1000)
  const m = Math.floor(perKm / 60)
  const s = perKm % 60
  return `${m}:${String(s).padStart(2, '0')} /km`
}
