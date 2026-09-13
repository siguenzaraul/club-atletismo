'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  UsersIcon,
  UploadIcon,
  ListChecksIcon,
  ExternalLinkIcon,
  PackageIcon,
  WrenchIcon,
} from 'lucide-react'

import { cn } from '@/lib/utils'

const LINKS = [
  {
    href: '/gestion',
    label: 'Socios',
    icon: UsersIcon,
    // Lista blanca, no negra: la ficha de socio es `/gestion/<id>` y siempre es numérica. Antes
    // era una lista de prefijos a excluir, así que cada sección nueva se marcaba como «Socios»
    // hasta que alguien se acordaba de añadirla.
    match: (p: string) => p === '/gestion' || /^\/gestion\/\d+$/.test(p),
  },
  { href: '/gestion/resumen', label: 'Resumen', icon: ListChecksIcon, match: (p: string) => p.startsWith('/gestion/resumen') },
  { href: '/gestion/stock', label: 'Stock', icon: PackageIcon, match: (p: string) => p.startsWith('/gestion/stock') },
  { href: '/gestion/importar-resultados', label: 'Importar resultados', icon: UploadIcon, match: (p: string) => p.startsWith('/gestion/importar') },
  { href: '/gestion/mantenimiento', label: 'Mantenimiento', icon: WrenchIcon, match: (p: string) => p.startsWith('/gestion/mantenimiento') },
]

export function StaffNav(): React.JSX.Element {
  const pathname = usePathname()

  return (
    <div className="sticky top-[61px] z-30 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-1 px-4 sm:px-6">
        {LINKS.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'inline-flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold transition-colors',
                active
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="size-4" /> {label}
            </Link>
          )
        })}
        <Link
          href="/"
          className="ml-auto inline-flex items-center gap-1.5 px-3 py-3 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Ver la web <ExternalLinkIcon className="size-3.5" />
        </Link>
      </div>
    </div>
  )
}
