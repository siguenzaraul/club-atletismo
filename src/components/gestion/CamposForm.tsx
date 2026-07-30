'use client'

import React, { useActionState, useEffect, useId, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { saveCamposAction, type StaffResult } from '@/actions/gestion'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { NativeSelect } from '@/components/ui/native-select'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { SlidersHorizontalIcon } from 'lucide-react'

export type CampoField = {
  id: number
  label: string
  type: string
  value: string
  boolean: boolean
  options: string[]
}

export function CamposForm({ memberId, campos }: { memberId: number; campos: CampoField[] }) {
  const [state, action, pending] = useActionState<StaffResult, FormData>(saveCamposAction, { ok: false })
  const router = useRouter()
  const seen = useRef(state)

  useEffect(() => {
    if (state === seen.current) return
    seen.current = state
    if (state.ok && state.message) {
      toast.success(state.message)
      router.refresh()
    } else if (state.error) {
      toast.error(state.error)
    }
  }, [state, router])

  if (campos.length === 0) {
    return (
      <EmptyState
        icon={<SlidersHorizontalIcon className="size-5" />}
        title="Aún no hay campos personalizados"
        description="Créalos en el panel (Configuración → Campos del socio) y aparecerán aquí para cada persona."
      />
    )
  }

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="memberId" value={memberId} />
      {campos.map((c) => (
        <Campo key={c.id} campo={c} />
      ))}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending} aria-busy={pending} className="h-10 px-6">
          {pending ? 'Guardando…' : 'Guardar campos'}
        </Button>
      </div>
    </form>
  )
}

function Campo({ campo }: { campo: CampoField }) {
  const id = useId()
  const name = `attr_${campo.id}`

  if (campo.type === 'boolean') {
    return (
      <label
        htmlFor={id}
        className="flex items-center gap-3 rounded-lg border border-border p-3 sm:col-span-2"
      >
        <input id={id} name={name} type="checkbox" defaultChecked={campo.boolean} className="size-5 accent-primary" />
        <span className="text-sm font-medium text-foreground">{campo.label}</span>
      </label>
    )
  }

  return (
    <Field label={campo.label} htmlFor={id}>
      {campo.type === 'longtext' ? (
        <Textarea id={id} name={name} defaultValue={campo.value} rows={3} />
      ) : campo.type === 'select' ? (
        <NativeSelect id={id} name={name} defaultValue={campo.value}>
          <option value="">—</option>
          {campo.options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </NativeSelect>
      ) : (
        <Input
          id={id}
          name={name}
          type={campo.type === 'number' ? 'number' : campo.type === 'date' ? 'date' : 'text'}
          defaultValue={campo.value}
        />
      )}
    </Field>
  )
}
