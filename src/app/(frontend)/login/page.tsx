import React from 'react'
import { redirect } from 'next/navigation'
import { LoginForm } from '@/components/site/AuthForms'
import { currentMember, currentStaff } from '@/lib/session'
import { LOGIN_LANDING } from '@/lib/login'

export const dynamic = 'force-dynamic'
// El alta encadena bcrypt y varias consultas; sobre Neon en frío el default se queda corto.
export const maxDuration = 30
export const metadata = { title: 'Acceso' }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ alta?: string }>
}) {
  // El staff también entra por aquí, así que hay que sacarlo a su sitio: `/socios` exige un
  // socio y lo devolvería a esta misma página.
  if (await currentStaff()) redirect(LOGIN_LANDING.users)
  if (await currentMember()) redirect(LOGIN_LANDING.members)
  const { alta } = await searchParams
  return (
    <main className="mx-auto flex max-w-md flex-col px-6 py-20">
      <h1 className="font-display text-4xl uppercase tracking-tight">Acceso</h1>
      <p className="mb-8 mt-2 text-muted-foreground">
        Entra en tu zona privada. Si gestionas el club, usa aquí tus credenciales de siempre.
      </p>
      {/* El alta creó la cuenta pero no pudo abrir la sesión: se le dice que ya existe en vez
          de devolverlo al formulario de registro, donde chocaría con el email duplicado. */}
      {alta === 'ok' && (
        <p
          role="status"
          className="mb-6 rounded-xl border border-abtr-blue/40 bg-abtr-blue/10 px-4 py-3 text-sm text-foreground/80"
        >
          <strong className="text-foreground">Tu cuenta ya está creada.</strong> Entra con tu email
          y la contraseña que acabas de elegir.
        </p>
      )}
      <LoginForm />
    </main>
  )
}
