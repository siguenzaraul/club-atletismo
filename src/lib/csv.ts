export type CsvTable = { headers: string[]; rows: Record<string, string>[] }

/** Escape one CSV cell: quote it when it contains the delimiter, quotes or newlines. */
const escapeCell = (value: string, delim: string): string => {
  const needsQuotes = value.includes(delim) || value.includes('"') || /[\n\r]/.test(value)
  const escaped = value.replace(/"/g, '""')
  return needsQuotes ? `"${escaped}"` : escaped
}

/**
 * Serialize rows to CSV text. Uses ';' by default so it opens directly in
 * Spanish Excel. Values are read from each row by header key (missing → empty).
 */
export const toCsv = (
  headers: string[],
  rows: Record<string, string | number | null | undefined>[],
  delim = ';',
): string => {
  const headerLine = headers.map((h) => escapeCell(h, delim)).join(delim)
  const body = rows.map((row) =>
    headers.map((h) => escapeCell(String(row[h] ?? ''), delim)).join(delim),
  )
  return [headerLine, ...body].join('\r\n')
}

/** Split one CSV line respecting double-quoted fields. */
const splitLine = (line: string, delim: string): string[] => {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i++
        } else inQuotes = false
      } else cur += ch
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === delim) {
      out.push(cur)
      cur = ''
    } else cur += ch
  }
  out.push(cur)
  return out.map((c) => c.trim())
}

/**
 * Parse CSV text with a header row. Auto-detects comma or semicolon delimiter,
 * strips a BOM, and ignores blank lines. Header keys are lower-cased and trimmed.
 */
export const parseCsv = (text: string): CsvTable => {
  const clean = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n')
  const lines = clean.split('\n').filter((l) => l.trim() !== '')
  if (lines.length === 0) return { headers: [], rows: [] }

  const delim = (lines[0].match(/;/g)?.length ?? 0) > (lines[0].match(/,/g)?.length ?? 0) ? ';' : ','
  const headers = splitLine(lines[0], delim).map((h) => h.toLowerCase())
  const rows: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i++) {
    const cells = splitLine(lines[i], delim)
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      row[h] = cells[idx] ?? ''
    })
    rows.push(row)
  }
  return { headers, rows }
}
