import React from 'react'
import { getClient } from '@/lib/payload'
import { ContactForm } from '@/components/site/ContactForm'
import { BrandPattern } from '@/components/BrandPattern'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Contacto | ABTR',
  description: 'Ponte en contacto con el Club de corredores Albatera.',
}

export default async function ContactPage() {
  const payload = await getClient()
  const settings = await payload.findGlobal({ slug: 'site-settings' })

  return (
    <main>
      <section className="bg-abtr-black py-16 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6">
          <div>
            <h1 className="font-display text-4xl uppercase tracking-tight sm:text-5xl">Hablamos</h1>
            <p className="mt-2 max-w-md text-white/70">
              ¿Dudas sobre inscripciones, socios o patrocinio? Escríbenos.
            </p>
          </div>
          <div className="hidden sm:block">
            <BrandPattern size={110} decorative />
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-12 px-6 py-16 md:grid-cols-[1fr_1.2fr]">
        <div className="flex flex-col gap-4">
          {settings.email && (
            <a href={`mailto:${settings.email}`} className="rounded-2xl border border-abtr-ink/10 p-4 hover:border-abtr-blue">
              <p className="text-sm text-abtr-ink/60">Email</p>
              <p className="font-semibold">{settings.email}</p>
            </a>
          )}
          {settings.phone && (
            <a href={`tel:${settings.phone.replace(/\s/g, '')}`} className="rounded-2xl border border-abtr-ink/10 p-4 hover:border-abtr-blue">
              <p className="text-sm text-abtr-ink/60">Teléfono</p>
              <p className="font-semibold">{settings.phone}</p>
            </a>
          )}
          {settings.address && (
            <div className="rounded-2xl border border-abtr-ink/10 p-4">
              <p className="text-sm text-abtr-ink/60">Dirección</p>
              <p className="font-semibold">{settings.address}</p>
            </div>
          )}
        </div>
        <div className="rounded-2xl border border-abtr-ink/10 p-6 sm:p-8">
          <ContactForm />
        </div>
      </section>
    </main>
  )
}
