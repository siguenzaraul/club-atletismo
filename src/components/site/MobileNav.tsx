'use client'

import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV } from '@/lib/nav'
import { logoutAction } from '@/actions/auth'

type Session = 'member' | 'staff' | 'anon'

/**
 * Accessible mobile navigation drawer. Hidden on xl+ where the inline nav shows.
 * The overlay is portaled to <body> so the header's backdrop-filter doesn't trap
 * the fixed positioning. Handles Escape, focus, scroll lock, and closes on route change.
 */
export function MobileNav({ session = 'anon' }: { session?: Session }) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => setMounted(true), [])

  // Close whenever navigation happens.
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return
    const trigger = buttonRef.current
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    // Move focus into the panel for keyboard/screen-reader users.
    panelRef.current?.querySelector<HTMLElement>('a, button')?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      trigger?.focus()
    }
  }, [open])

  return (
    <div className="xl:hidden">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
        className="flex size-11 items-center justify-center rounded-full text-foreground hover:bg-muted"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          {open ? (
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          ) : (
            <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          )}
        </svg>
      </button>

      {mounted &&
        open &&
        createPortal(
          <div className="fixed inset-0 z-50 xl:hidden" role="dialog" aria-modal="true" aria-label="Menú principal">
            <button
              type="button"
              tabIndex={-1}
              aria-hidden="true"
              onClick={() => setOpen(false)}
              className="absolute inset-0 bg-abtr-black/60"
            />
            <div
              ref={panelRef}
              id="mobile-nav-panel"
              className="absolute inset-y-0 right-0 flex w-[82%] max-w-sm flex-col gap-1 overflow-y-auto bg-background p-6 shadow-2xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="font-display text-xl uppercase tracking-tight">Menú</span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Cerrar menú"
                  className="flex size-11 items-center justify-center rounded-full hover:bg-muted"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-xl px-4 py-3 text-lg font-semibold text-foreground hover:bg-muted"
                >
                  {item.label}
                </Link>
              ))}
              <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
                {session === 'staff' && (
                  <>
                    <Link
                      href="/gestion"
                      className="rounded-full bg-primary px-4 py-3 text-center text-base font-bold text-primary-foreground hover:opacity-90"
                    >
                      Gestión de socios
                    </Link>
                    <form action={logoutAction}>
                      <button className="w-full rounded-full border border-border px-4 py-3 text-center text-base font-semibold hover:bg-muted">
                        Cerrar sesión
                      </button>
                    </form>
                  </>
                )}
                {session === 'member' && (
                  <>
                    <Link
                      href="/socios"
                      className="rounded-full bg-primary px-4 py-3 text-center text-base font-bold text-primary-foreground hover:opacity-90"
                    >
                      Mi zona de socio
                    </Link>
                    <Link
                      href="/socios/perfil"
                      className="rounded-full px-4 py-3 text-center text-base font-semibold text-foreground hover:bg-muted"
                    >
                      Editar mi perfil
                    </Link>
                    <form action={logoutAction}>
                      <button className="w-full rounded-full border border-border px-4 py-3 text-center text-base font-semibold hover:bg-muted">
                        Cerrar sesión
                      </button>
                    </form>
                  </>
                )}
                {session === 'anon' && (
                  <>
                    <Link
                      href="/socios"
                      className="rounded-full px-4 py-3 text-center text-base font-semibold text-foreground hover:bg-muted"
                    >
                      Acceso socios
                    </Link>
                    <Link
                      href="/hazte-socio"
                      className="rounded-full bg-abtr-red px-4 py-3 text-center text-base font-bold text-white hover:opacity-90"
                    >
                      Hazte socio
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
