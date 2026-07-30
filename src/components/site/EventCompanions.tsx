'use client'

import React, { useMemo, useState } from 'react'
import { SearchIcon, UsersRoundIcon } from 'lucide-react'

import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

const PREVIEW_LIMIT = 3

const initialsFor = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0]?.charAt(0) ?? ''
  const last = parts.length > 1 ? parts.at(-1)?.charAt(0) ?? '' : ''
  return `${first}${last}`.toLocaleUpperCase('es')
}

const normalizeForSearch = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')

export function EventCompanions({
  eventTitle,
  names,
}: {
  eventTitle: string
  names: string[]
}): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const preview = names.slice(0, PREVIEW_LIMIT)
  const remaining = names.length - preview.length
  const filteredNames = useMemo(() => {
    const normalizedQuery = normalizeForSearch(query.trim())
    if (!normalizedQuery) return names
    return names.filter((name) => normalizeForSearch(name).includes(normalizedQuery))
  }, [names, query])

  if (names.length === 0) {
    return (
      <div className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
        <UsersRoundIcon className="mt-0.5 size-4 shrink-0 text-primary" />
        <p>Aún no se ha apuntado ningún compañero.</p>
      </div>
    )
  }

  const summary =
    names.length === 1 ? 'Va 1 compañero' : `Van ${names.length} compañeros`
  const previewText =
    remaining > 0 ? `${preview.join(', ')} y ${remaining} más` : preview.join(', ')

  return (
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <AvatarGroup aria-hidden>
        {preview.map((name) => (
          <Avatar key={name} size="sm">
            <AvatarFallback className="bg-primary/12 font-semibold text-primary">
              {initialsFor(name)}
            </AvatarFallback>
          </Avatar>
        ))}
        {remaining > 0 && (
          <AvatarGroupCount className="bg-muted font-semibold text-foreground">
            +{remaining}
          </AvatarGroupCount>
        )}
      </AvatarGroup>

      <div className="min-w-0 flex-1 text-sm">
        <p className="font-medium text-foreground">{summary}</p>
        <p className="truncate text-muted-foreground" title={previewText}>
          {previewText}
        </p>
      </div>

      {names.length > PREVIEW_LIMIT && (
        <Dialog
          open={open}
          onOpenChange={(nextOpen) => {
            setOpen(nextOpen)
            if (!nextOpen) setQuery('')
          }}
        >
          <DialogTrigger
            render={
              <Button variant="outline" size="sm" className="h-9 rounded-full">
                Ver los {names.length}
              </Button>
            }
          />
          <DialogContent className="flex max-h-[min(85vh,42rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
            <DialogHeader className="border-b border-border p-5 pr-12">
              <DialogTitle className="text-lg">Compañeros que van</DialogTitle>
              <DialogDescription>
                {eventTitle} · {summary}
              </DialogDescription>
            </DialogHeader>

            <div className="border-b border-border p-4">
              <div className="relative">
                <SearchIcon
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar compañero…"
                  aria-label="Buscar compañero"
                  className="h-10 pl-9"
                />
              </div>
            </div>

            <div className="min-h-0 overflow-y-auto p-2">
              {filteredNames.length > 0 ? (
                <ul aria-label="Compañeros inscritos" className="divide-y divide-border">
                  {filteredNames.map((name) => (
                    <li key={name} className="flex min-h-11 items-center gap-3 px-2 py-2">
                      <Avatar>
                        <AvatarFallback className="bg-primary/12 font-semibold text-primary">
                          {initialsFor(name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="min-w-0 truncate font-medium">{name}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p role="status" className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No hay compañeros que coincidan con la búsqueda.
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
