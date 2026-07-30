'use client'

import React, { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { inscribeAction } from '@/actions/auth'
import { Button } from '@/components/ui/button'

export function InscribeButton({ eventId }: { eventId: number }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const onClick = () =>
    startTransition(async () => {
      const res = await inscribeAction(eventId)
      if (res.ok) {
        toast.success('¡Inscrito!')
        router.refresh()
      } else {
        toast.error(res.error ?? 'No se pudo inscribir.')
      }
    })

  return (
    <Button onClick={onClick} disabled={pending} className="h-10 rounded-full px-5">
      {pending ? 'Inscribiendo…' : 'Inscribirme'}
    </Button>
  )
}
