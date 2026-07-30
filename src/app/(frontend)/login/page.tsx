import React from 'react'
import { redirect } from 'next/navigation'
import { LoginForm } from '@/components/site/AuthForms'
import { getCurrentMember } from '@/actions/auth'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Acceso socios | ABTR' }

export default async function LoginPage() {
  if (await getCurrentMember()) redirect('/socios')
  return (
    <main className="mx-auto flex max-w-md flex-col px-6 py-20">
      <h1 className="font-display text-4xl uppercase tracking-tight">Acceso socios</h1>
      <p className="mb-8 mt-2 text-abtr-ink/60">Entra en tu zona privada.</p>
      <LoginForm />
    </main>
  )
}
