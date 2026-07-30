const SERIES_LABEL: Record<string, string> = {
  'carrera-principal': 'Carrera principal',
  'social-run': 'Social Run',
  club: 'Club',
  'carrera-externa': 'Carrera externa',
}

const SERIES_COLOR: Record<string, string> = {
  'carrera-principal': 'bg-abtr-red text-white',
  'social-run': 'bg-abtr-blue text-white',
  club: 'bg-abtr-yellow text-abtr-black',
  'carrera-externa': 'bg-abtr-black text-white ring-1 ring-white/30',
}

export const seriesLabel = (s: string): string => SERIES_LABEL[s] ?? s
export const seriesColor = (s: string): string =>
  SERIES_COLOR[s] ?? 'bg-abtr-black text-white'

export const formatDate = (value: string | null | undefined): string => {
  if (!value) return ''
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value))
}

export const formatDateTime = (value: string | null | undefined): string => {
  if (!value) return ''
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}
