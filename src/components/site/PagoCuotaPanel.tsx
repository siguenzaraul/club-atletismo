'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CheckIcon, CopyIcon } from 'lucide-react'

import { reportPaymentAction } from '@/actions/member'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import { formatDate } from '@/lib/format'

type Props = {
  /** IBAN en grupos de cuatro: lo que se enseña. Se copia sin espacios. */
  formattedIban: string
  iban: string
  holder: string
  concept: string
  amount?: number | null
  notes?: string | null
  /** `active` = el club ya confirmó la cuota de la temporada. */
  status: 'active' | 'pending' | 'inactive'
  reportedAt?: string | null
  seasonName?: string | null
  /** Sin temporada abierta no hay cuota que avisar. */
  canReport: boolean
}

const euros = (amount: number): string =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount)

/** Fila copiable. El `navigator.clipboard` puede no existir (http, permisos): se degrada solo. */
function CopyRow({ label, value, display }: { label: string; value: string; display?: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      toast.success(`${label} copiado.`)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Tu navegador no ha dejado copiar. Selecciónalo a mano.')
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-2.5 last:border-0">
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-mono text-base font-semibold break-all">{display ?? value}</p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 shrink-0 rounded-full"
        onClick={copy}
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
        {copied ? 'Copiado' : 'Copiar'}
        <span className="sr-only"> {label}</span>
      </Button>
    </div>
  )
}

export function PagoCuotaPanel({
  formattedIban,
  iban,
  holder,
  concept,
  amount,
  notes,
  status,
  reportedAt,
  seasonName,
  canReport,
}: Props): React.JSX.Element {
  const [pending, startTransition] = useTransition()
  const [reported, setReported] = useState<string | null>(reportedAt ?? null)
  const router = useRouter()

  const paid = status === 'active'

  const report = () =>
    startTransition(async () => {
      const res = await reportPaymentAction()
      if (res.ok) {
        toast.success(res.message ?? 'Avisado.')
        setReported(new Date().toISOString())
        router.refresh()
      } else {
        toast.error(res.error ?? 'No hemos podido avisar al club.')
      }
    })

  return (
    <div className="flex flex-col gap-4">
      {paid ? (
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone="success">
            <CheckIcon /> Cuota al corriente
          </StatusBadge>
          <p className="text-sm text-muted-foreground">
            {seasonName ? `Temporada ${seasonName} confirmada. ` : ''}No tienes que hacer nada más.
          </p>
        </div>
      ) : (
        <p className="text-sm text-foreground/80">
          Tu cuota{seasonName ? ` de la temporada ${seasonName}` : ''} está{' '}
          <strong className="text-foreground">pendiente</strong>. Puedes pagarla por transferencia o
          ingreso a la cuenta del club:
        </p>
      )}

      <div className="rounded-xl border border-border bg-muted/40 px-4 py-1">
        <CopyRow label="IBAN" value={iban} display={formattedIban} />
        <CopyRow label="Titular" value={holder} />
        <CopyRow label="Concepto" value={concept} />
        {typeof amount === 'number' && (
          <div className="flex items-center justify-between gap-2 border-b border-border py-2.5 last:border-0">
            <p className="text-sm text-muted-foreground">Importe</p>
            <p className="font-mono text-base font-semibold">{euros(amount)}</p>
          </div>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        Pon ese concepto en la transferencia: es como el club identifica tu ingreso si pagas desde
        la cuenta de un familiar.
      </p>

      {notes && <p className="text-sm text-foreground/80">{notes}</p>}

      {!paid && (
        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
          {reported ? (
            <>
              <StatusBadge tone="info">
                <CheckIcon /> Aviso enviado
              </StatusBadge>
              <p className="text-sm text-muted-foreground">
                Nos avisaste el {formatDate(reported)}. El club lo confirmará en cuanto compruebe el
                ingreso.
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 rounded-full"
                disabled={pending || !canReport}
                onClick={report}
              >
                Volver a avisar
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                className="h-10 rounded-full"
                disabled={pending || !canReport}
                onClick={report}
              >
                Ya he hecho el ingreso
              </Button>
              <p className="text-sm text-muted-foreground">
                {canReport
                  ? 'Avisamos al club por correo para que lo compruebe y confirme tu cuota.'
                  : 'El club aún no ha abierto la temporada; escríbenos desde el formulario de contacto.'}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
