'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { cancelRegistrationAction } from '@/actions/member'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

export function CancelRegistrationButton({
  registrationId,
  eventTitle,
}: {
  registrationId: number
  eventTitle: string
}) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button variant="outline" size="sm" className="h-9 rounded-full">
            Cancelar<span className="sr-only"> inscripción en {eventTitle}</span>
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Cancelar tu inscripción?</AlertDialogTitle>
          <AlertDialogDescription>
            Se cancelará tu plaza en «{eventTitle}». Podrás volver a inscribirte si sigue abierto.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Volver</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await cancelRegistrationAction(registrationId)
                if (res.ok) {
                  toast.success('Inscripción cancelada.')
                  setOpen(false)
                  router.refresh()
                } else {
                  toast.error(res.error ?? 'No se pudo cancelar.')
                }
              })
            }
          >
            Sí, cancelar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
