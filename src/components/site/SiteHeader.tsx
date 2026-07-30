import React from 'react'
import Link from 'next/link'
import { Logo } from './Logo'
import { MobileNav } from './MobileNav'
import { NAV } from '@/lib/nav'
import { getCurrentStaff } from '@/actions/gestion'
import { getCurrentMember, logoutAction } from '@/actions/auth'
import { ThemeToggle } from '@/components/theme/ThemeToggle'

const cta = 'inline-flex h-10 items-center whitespace-nowrap rounded-full px-4 text-sm font-bold transition-opacity'

export async function SiteHeader() {
  const [staff, member] = await Promise.all([getCurrentStaff(), getCurrentMember()])
  const session = staff ? 'staff' : member ? 'member' : 'anon'

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Logo tagline="Club de Running Albatera" />
        <nav className="hidden items-center gap-5 xl:flex" aria-label="Principal">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-semibold whitespace-nowrap text-foreground/75 transition-colors hover:text-primary"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />

          {session === 'staff' && (
            <>
              <Link href="/gestion" className={`${cta} bg-primary text-primary-foreground hover:opacity-90`}>
                Gestión
              </Link>
              <form action={logoutAction}>
                <button className={`${cta} hidden border border-border text-foreground hover:bg-muted sm:inline-flex`}>
                  Cerrar sesión
                </button>
              </form>
            </>
          )}

          {session === 'member' && (
            <>
              <Link href="/socios" className={`${cta} bg-primary text-primary-foreground hover:opacity-90`}>
                Mi zona
              </Link>
              <form action={logoutAction}>
                <button className={`${cta} hidden border border-border text-foreground hover:bg-muted sm:inline-flex`}>
                  Cerrar sesión
                </button>
              </form>
            </>
          )}

          {session === 'anon' && (
            <>
              <Link
                href="/socios"
                className="hidden h-10 items-center whitespace-nowrap rounded-full px-4 text-sm font-semibold text-foreground/75 transition-colors hover:text-primary xl:inline-flex"
              >
                Acceso socios
              </Link>
              <Link href="/hazte-socio" className={`${cta} bg-abtr-red text-white hover:opacity-90`}>
                Hazte socio
              </Link>
            </>
          )}

          <MobileNav session={session} />
        </div>
      </div>
    </header>
  )
}
