import React from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { RichText } from '@payloadcms/richtext-lexical/react'
import { getClient } from '@/lib/payload'
import { formatDate } from '@/lib/format'
import { MediaImage } from '@/components/site/MediaImage'
import type { Media } from '@/payload-types'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const payload = await getClient()
  const res = await payload.find({
    collection: 'posts',
    where: { slug: { equals: slug }, status: { equals: 'published' } },
    depth: 1,
    limit: 1,
  })
  const post = res.docs[0]
  if (!post) return { title: 'Noticia no encontrada | ABTR' }
  const description = post.excerpt ?? undefined
  const image = post.cover && typeof post.cover === 'object' ? (post.cover as Media).url : undefined
  return {
    title: `${post.title} | ABTR`,
    description,
    openGraph: { title: post.title, description, images: image ? [image] : undefined, type: 'article' },
  }
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const payload = await getClient()
  const res = await payload.find({
    collection: 'posts',
    where: { slug: { equals: slug }, status: { equals: 'published' } },
    limit: 1,
    depth: 1,
  })
  const post = res.docs[0]
  if (!post) notFound()

  const hasCover = post.cover && typeof post.cover === 'object'

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link href="/noticias" className="text-sm text-abtr-ink/60 hover:text-abtr-blue">
        ← Noticias
      </Link>
      <time className="mt-6 block text-sm font-semibold text-abtr-blue">
        {formatDate(post.publishedAt)}
      </time>
      <h1 className="mt-2 font-display text-4xl leading-tight tracking-tight sm:text-5xl">
        {post.title}
      </h1>
      {hasCover && (
        <MediaImage
          media={post.cover}
          alt={post.title}
          sizes="(max-width: 768px) 100vw, 768px"
          className="mt-8 h-auto w-full rounded-2xl object-cover"
        />
      )}
      {post.content && (
        <div className="prose prose-lg mt-10 max-w-none">
          <RichText data={post.content} />
        </div>
      )}
    </main>
  )
}
