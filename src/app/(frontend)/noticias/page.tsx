import React from 'react'
import Link from 'next/link'
import { getClient } from '@/lib/payload'
import { formatDate } from '@/lib/format'
import type { Media } from '@/payload-types'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Noticias | ABTR' }

export default async function NewsPage() {
  const payload = await getClient()
  const posts = await payload.find({
    collection: 'posts',
    where: { status: { equals: 'published' } },
    sort: '-publishedAt',
    limit: 50,
    depth: 1,
  })

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="font-display text-4xl uppercase tracking-tight sm:text-5xl">Noticias</h1>

      {posts.docs.length > 0 ? (
        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {posts.docs.map((p) => {
            const cover = p.cover && typeof p.cover === 'object' ? (p.cover as Media).url : null
            return (
              <Link
                key={p.id}
                href={`/noticias/${p.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-abtr-ink/10 transition hover:shadow-lg"
              >
                <div className="aspect-[16/10] bg-abtr-ink/5">
                  {cover && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={cover}
                      alt={p.title}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-2 p-5">
                  <time className="text-sm font-semibold text-abtr-blue">{formatDate(p.publishedAt)}</time>
                  <h2 className="font-display text-xl leading-tight">{p.title}</h2>
                  {p.excerpt && <p className="text-sm text-abtr-ink/60">{p.excerpt}</p>}
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        <p className="mt-10 text-abtr-ink/60">Aún no hay noticias publicadas.</p>
      )}
    </main>
  )
}
