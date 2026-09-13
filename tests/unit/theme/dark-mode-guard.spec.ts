import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Guard estático contra la regresión de modo oscuro.
 *
 * El bug original fue por omisión: `prose` sin `dark:prose-invert` dejaba los títulos del
 * contenido del CMS en gris casi negro sobre fondo oscuro. Este test congela las dos reglas
 * de la convención documentada en DESIGN.md para que no vuelva a colarse.
 */

const ROOT = path.resolve(__dirname, '../../..')
const PUBLIC_DIRS = [path.join(ROOT, 'src/app/(frontend)'), path.join(ROOT, 'src/components/site')]

/** Saltarse una regla debe ser una decisión consciente, no un descuido. */
const ALLOWED_ABTR_INK: string[] = []

const walk = (dir: string): string[] => {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...walk(full))
    else if (full.endsWith('.tsx') || full.endsWith('.ts')) out.push(full)
  }
  return out
}

const publicFiles = PUBLIC_DIRS.flatMap(walk)
const rel = (f: string) => path.relative(ROOT, f)

describe('convención de color del sitio público', () => {
  it('encuentra ficheros que revisar', () => {
    expect(publicFiles.length).toBeGreaterThan(10)
  })

  it('todo `prose` va acompañado de `prose-abtr`', () => {
    const offenders: string[] = []
    for (const file of [...publicFiles, ...walk(path.join(ROOT, 'src/components'))]) {
      const source = readFileSync(file, 'utf8')
      source.split('\n').forEach((line, i) => {
        // Sólo la clase `prose` de tipografía, no `max-w-prose` ni `prose-abtr` en sí.
        if (!/(?<![\w-])prose(?![\w-])/.test(line)) return
        if (line.includes('prose-abtr')) return
        offenders.push(`${rel(file)}:${i + 1} → ${line.trim()}`)
      })
    }
    expect(
      offenders,
      'Usa `prose prose-abtr` para que el rich text del CMS funcione en modo oscuro.',
    ).toEqual([])
  })

  it('el sitio público no usa `abtr-ink` (no cumple AA y mezcla vocabularios)', () => {
    const offenders: string[] = []
    for (const file of publicFiles) {
      if (ALLOWED_ABTR_INK.includes(rel(file))) continue
      const source = readFileSync(file, 'utf8')
      source.split('\n').forEach((line, i) => {
        if (/-abtr-ink\b/.test(line)) offenders.push(`${rel(file)}:${i + 1} → ${line.trim()}`)
      })
    }
    expect(
      offenders,
      'Usa tokens semánticos: text-muted-foreground, text-foreground, border-border, bg-muted.',
    ).toEqual([])
  })

  it('las bandas de marca usan `band-ink`, no `bg-abtr-black text-white`', () => {
    const offenders: string[] = []
    for (const file of publicFiles) {
      const source = readFileSync(file, 'utf8')
      source.split('\n').forEach((line, i) => {
        // `(?<!:)` descarta los estados `hover:bg-abtr-black`, que no son bandas.
        if (/(?<!:)bg-abtr-black[^"'`]*(?<!:)\btext-white\b/.test(line)) {
          offenders.push(`${rel(file)}:${i + 1} → ${line.trim()}`)
        }
      })
    }
    expect(offenders, 'Usa la clase `band-ink`: añade la hairline que separa la banda en oscuro.').toEqual(
      [],
    )
  })
})
