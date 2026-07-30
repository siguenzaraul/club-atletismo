'use client'

import React, { useActionState, useEffect, useId, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { updateProfileAction, type ActionResult } from '@/actions/member'
import { MEMBER_CATEGORIES } from '@/collections/Members'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { NativeSelect } from '@/components/ui/native-select'
import { Button } from '@/components/ui/button'

export type EditableAttribute = {
  id: number
  label: string
  type: string
  value: string
  boolean: boolean
}

export function ProfileForm({
  defaults,
  editableAttributes,
}: {
  defaults: { name: string; phone: string; federationNumber: string; category: string }
  editableAttributes: EditableAttribute[]
}) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(updateProfileAction, { ok: false })
  const router = useRouter()
  const nameId = useId()
  const phoneId = useId()
  const fedId = useId()
  const catId = useId()
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

  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="Nombre completo" htmlFor={nameId}>
        <Input id={nameId} name="name" required autoComplete="name" defaultValue={defaults.name} />
      </Field>
      <Field label="Teléfono móvil" htmlFor={phoneId}>
        <Input id={phoneId} name="phone" type="tel" inputMode="tel" autoComplete="tel" defaultValue={defaults.phone} required />
      </Field>
      <Field label="Nº de federación" htmlFor={fedId} optional>
        <Input id={fedId} name="federationNumber" defaultValue={defaults.federationNumber} />
      </Field>
      <Field label="Categoría deportiva" htmlFor={catId}>
        <NativeSelect id={catId} name="category" defaultValue={defaults.category}>
          {MEMBER_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </NativeSelect>
      </Field>

      {editableAttributes.length > 0 && (
        <fieldset className="mt-2 flex flex-col gap-4 border-t border-border pt-4">
          <legend className="font-display text-lg tracking-wide">Otros datos</legend>
          {editableAttributes.map((a) => (
            <AttributeField key={a.id} attr={a} />
          ))}
        </fieldset>
      )}

      <Button type="submit" disabled={pending} aria-busy={pending} className="mt-2 h-11 w-full">
        {pending ? 'Guardando…' : 'Guardar cambios'}
      </Button>
    </form>
  )
}

function AttributeField({ attr }: { attr: EditableAttribute }) {
  const id = useId()
  const name = `attr_${attr.id}`
  if (attr.type === 'boolean') {
    return (
      <label htmlFor={id} className="flex items-center gap-3 rounded-lg border border-border p-3">
        <input id={id} name={name} type="checkbox" defaultChecked={attr.boolean} className="size-5 accent-primary" />
        <span className="text-sm font-medium text-foreground">{attr.label}</span>
      </label>
    )
  }
  return (
    <Field label={attr.label} htmlFor={id}>
      {attr.type === 'longtext' ? (
        <Textarea id={id} name={name} defaultValue={attr.value} rows={3} />
      ) : (
        <Input
          id={id}
          name={name}
          type={attr.type === 'number' ? 'number' : attr.type === 'date' ? 'date' : 'text'}
          defaultValue={attr.value}
        />
      )}
    </Field>
  )
}
