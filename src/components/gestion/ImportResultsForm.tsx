'use client'

import React, { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { DownloadIcon, UploadIcon } from 'lucide-react'

import { importResultsAction, type ImportResult } from '@/actions/gestion'
import { Field } from '@/components/ui/field'
import { NativeSelect } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const TEMPLATE = `dorsal,posicion,nombre,email,categoria,marca
101,1,Raúl Sigüenza,raul@abtr.run,senior,00:38:20
102,2,María López,,master,00:41:05
103,3,Juan Ruiz,juan@abtr.run,popular,00:44:12`

export function ImportResultsForm({ events }: { events: { id: number; title: string }[] }) {
  const [eventId, setEventId] = useState('')
  const [csv, setCsv] = useState('')
  const [result, setResult] = useState<ImportResult | null>(null)
  const [busy, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const run = (dryRun: boolean) =>
    startTransition(async () => {
      const res = await importResultsAction(Number(eventId), csv, dryRun)
      setResult(res)
      if (res.error) toast.error(res.error)
      else if (!dryRun && res.ok) {
        toast.success(`Importados ${res.summary.creados} resultados (${res.summary.enlazados} enlazados).`)
        router.refresh()
      }
    })

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setCsv(await file.text())
  }

  const downloadTemplate = () => {
    const blob = new Blob(['﻿' + TEMPLATE], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'plantilla-resultados-abtr.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const imported = result && !result.dryRun && result.ok

  return (
    <div className="flex flex-col gap-5">
      <Field label="Carrera / evento" htmlFor="ev" className="max-w-md">
        <NativeSelect id="ev" value={eventId} onChange={(e) => setEventId(e.target.value)}>
          <option value="">Elige un evento…</option>
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.title}
            </option>
          ))}
        </NativeSelect>
      </Field>

      <div className="rounded-xl border border-border bg-muted/40 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold">Formato del CSV</p>
          <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
            <DownloadIcon /> Descargar plantilla
          </Button>
        </div>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-foreground p-3 text-xs text-background">{TEMPLATE}</pre>
        <p className="mt-2 text-sm text-muted-foreground">
          El <strong>email</strong> es opcional; si coincide con un socio, se enlaza solo. La categoría acepta el
          valor (senior) o la etiqueta (Senior).
        </p>
      </div>

      <Field label="Pega el CSV o sube un archivo" htmlFor="csv">
        <Textarea
          id="csv"
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          rows={8}
          placeholder="dorsal,posicion,nombre,email,categoria,marca…"
          className="font-mono text-sm"
        />
      </Field>
      <div>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          onChange={onFile}
          className="hidden"
        />
        <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
          <UploadIcon /> Subir archivo .csv
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={busy || !eventId || !csv.trim()}
          onClick={() => run(true)}
          className="h-10 px-5"
        >
          {busy ? 'Procesando…' : 'Previsualizar'}
        </Button>
        {result && result.ok && result.dryRun && result.rows.length > 0 && (
          <Button type="button" disabled={busy} onClick={() => run(false)} className="h-10 px-6">
            Importar {result.rows.filter((r) => !r.error).length} resultados
          </Button>
        )}
      </div>

      {result?.ok && (
        <div className="rounded-xl border border-border p-4">
          <p className="font-medium">
            {imported ? (
              <span className="text-[var(--tone-success-fg)]">
                Importados {result.summary.creados} resultados ({result.summary.enlazados} enlazados a socios).
              </span>
            ) : (
              <>
                {result.summary.total} filas · {result.summary.enlazados} se enlazarán a un socio ·{' '}
                {result.summary.sinEnlazar} como texto ·{' '}
                <span className={result.summary.errores ? 'text-destructive' : undefined}>
                  {result.summary.errores} con error
                </span>
              </>
            )}
          </p>
          {!imported && result.rows.length > 0 && (
            <div className="mt-3 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dorsal</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Marca</TableHead>
                    <TableHead>Socio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.rows.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono">{r.dorsal || '—'}</TableCell>
                      <TableCell className="font-medium">{r.nombre}</TableCell>
                      <TableCell className="font-mono">{r.marca || '—'}</TableCell>
                      <TableCell>
                        {r.error ? (
                          <span className="text-sm text-destructive">{r.error}</span>
                        ) : r.matchedMemberName ? (
                          <StatusBadge tone="info">{r.matchedMemberName}</StatusBadge>
                        ) : (
                          <span className="text-sm text-muted-foreground">sin enlazar</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
