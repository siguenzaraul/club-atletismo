'use client'

import React, { useActionState, useEffect, useId, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { saveDatosAction, type StaffResult } from '@/actions/gestion'
import { MEMBER_CATEGORIES } from '@/collections/Members'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Button } from '@/components/ui/button'

export function DatosForm({
  member,
}: {
  member: { id: number; name: string; phone: string; federationNumber: string; category: string }
}) {
  const [state, action, pending] = useActionState<StaffResult, FormData>(saveDatosAction, { ok: false })
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
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="memberId" value={member.id} />
      <Field label="Nombre completo" htmlFor={nameId}>
        <Input id={nameId} name="name" defaultValue={member.name} required />
      </Field>
      <Field label="Teléfono móvil" htmlFor={phoneId}>
        <Input id={phoneId} name="phone" type="tel" inputMode="tel" defaultValue={member.phone} required />
      </Field>
      <Field label="Nº de federación" htmlFor={fedId} optional>
        <Input id={fedId} name="federationNumber" defaultValue={member.federationNumber} />
      </Field>
      <Field label="Categoría deportiva" htmlFor={catId}>
        <NativeSelect id={catId} name="category" defaultValue={member.category}>
          {MEMBER_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending} aria-busy={pending} className="h-10 px-6">
          {pending ? 'Guardando…' : 'Guardar datos'}
        </Button>
      </div>
    </form>
  )
}
