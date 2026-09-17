'use client'

import React, { useActionState, useId, useState } from 'react'
import { PlusIcon, Trash2Icon } from 'lucide-react'

import { updatePublicProfileAction, type ActionResult } from '@/actions/member'
import { STANDARD_DISTANCES, distanceLabel } from '@/lib/distances'
import { Button } from '@/components/ui/button'
import { publicFieldClass, publicSubmitClass } from './PublicField'

export type PersonalBestRow = {
  distanceMeters?: number | null
  mark?: string | null
  date?: string | null
  eventName?: string | null
}

const initial: ActionResult = { ok: false }

// Mismo campo que el resto de formularios públicos (alta, login, perfil): esta rejilla tenía su
// propia caja más pequeña y la página mezclaba dos densidades distintas.
const inputClass = publicFieldClass

let nextKey = 0
const withKeys = (rows: PersonalBestRow[]) => rows.map((row) => ({ key: nextKey++, row }))

export function PublicProfileForm({
  defaults,
  slug,
}: {
  defaults: { publicProfile: boolean; publicBio: string; personalBests: PersonalBestRow[] }
  slug: string | null
}) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(
    updatePublicProfileAction,
    initial,
  )
  const [isPublic, setIsPublic] = useState(defaults.publicProfile)
  const [rows, setRows] = useState(() =>
    withKeys(defaults.personalBests.length > 0 ? defaults.personalBests : [{}]),
  )
  const publishId = useId()
  const bioId = useId()

  const addRow = () => setRows((r) => [...r, { key: nextKey++, row: {} }])
  const removeRow = (key: number) => setRows((r) => (r.length === 1 ? r : r.filter((x) => x.key !== key)))

  return (
    <form action={action} className="flex flex-col gap-6">
      <label
        htmlFor={publishId}
        className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4"
      >
        <input
          id={publishId}
          name="publicProfile"
          type="checkbox"
          value="yes"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
          className="mt-0.5 size-5 shrink-0 accent-abtr-blue"
        />
        <span className="text-sm leading-relaxed text-foreground/80">
          <strong className="text-foreground">Publicar mi ficha de atleta.</strong> Se harán
          públicos tu <strong>nombre, foto, categoría, biografía y marcas</strong> en{' '}
          <code className="rounded bg-muted px-1">/atletas</code>. Tu email, teléfono y nº de
          federación <strong>no se publican nunca</strong>. Puedes desactivarlo cuando quieras.
        </span>
      </label>

      {isPublic && slug && (
        <p className="text-sm text-muted-foreground">
          Tu ficha está en{' '}
          <a href={`/atletas/${slug}`} className="font-semibold text-abtr-blue hover:underline">
            /atletas/{slug}
          </a>
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor={bioId} className="text-sm font-semibold text-foreground">
          Sobre mí
        </label>
        <textarea
          id={bioId}
          name="publicBio"
          rows={3}
          maxLength={500}
          defaultValue={defaults.publicBio}
          placeholder="Corro desde 2019, mi objetivo es bajar de 3h en maratón…"
          className={inputClass}
        />
        <p className="text-sm text-muted-foreground">Máximo 500 caracteres.</p>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-semibold text-foreground">Mis marcas</legend>
        <p className="text-sm text-muted-foreground">
          Añade aquí las marcas de carreras ajenas al club. Las de nuestras pruebas se calculan
          solas a partir de los resultados, y siempre se muestra la mejor de las dos.
        </p>

        {rows.map(({ key, row }, i) => (
          <div key={key} className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
            <div className="flex flex-col gap-1">
              <label htmlFor={`pb-${key}-d`} className="text-xs font-semibold text-muted-foreground">
                Distancia
              </label>
              <input
                id={`pb-${key}-d`}
                name={`pb_${i}_distancia`}
                list="abtr-distancias"
                // Etiqueta («10K»), no los metros crudos: se guarda en metros y al volver
                // el socio se encontraba un «10000» en una caja que pedía «10K».
                defaultValue={row.distanceMeters ? distanceLabel(row.distanceMeters) : ''}
                placeholder="10K"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor={`pb-${key}-m`} className="text-xs font-semibold text-muted-foreground">
                Marca
              </label>
              <input
                id={`pb-${key}-m`}
                name={`pb_${i}_marca`}
                defaultValue={row.mark ?? ''}
                placeholder="42:15"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor={`pb-${key}-f`} className="text-xs font-semibold text-muted-foreground">
                Fecha
              </label>
              <input
                id={`pb-${key}-f`}
                name={`pb_${i}_fecha`}
                type="date"
                defaultValue={row.date ? row.date.slice(0, 10) : ''}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1 sm:col-span-3">
              <label htmlFor={`pb-${key}-c`} className="text-xs font-semibold text-muted-foreground">
                Carrera
              </label>
              <input
                id={`pb-${key}-c`}
                name={`pb_${i}_carrera`}
                defaultValue={row.eventName ?? ''}
                placeholder="Media Maratón de Elche"
                className={inputClass}
              />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeRow(key)}
                aria-label={`Quitar la marca ${i + 1}`}
                disabled={rows.length === 1}
              >
                <Trash2Icon className="size-4" aria-hidden />
              </Button>
            </div>
          </div>
        ))}

        <datalist id="abtr-distancias">
          {STANDARD_DISTANCES.map((d) => (
            <option key={d.slug} value={d.label} />
          ))}
        </datalist>

        <Button type="button" variant="outline" size="sm" onClick={addRow} className="self-start">
          <PlusIcon className="size-4" aria-hidden /> Añadir marca
        </Button>
      </fieldset>

      {state.error && (
        <p role="alert" className="text-sm font-semibold text-destructive">
          {state.error}
        </p>
      )}
      {state.ok && state.message && (
        <p role="status" className="text-sm font-semibold text-abtr-blue">
          {state.message}
        </p>
      )}

      <button type="submit" disabled={pending} aria-busy={pending} className={publicSubmitClass}>
        {pending ? 'Guardando…' : 'Guardar ficha pública'}
      </button>
    </form>
  )
}
