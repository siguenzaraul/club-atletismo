import React from 'react'
import Image from 'next/image'
import type { Media } from '@/payload-types'

type MediaImageProps = {
  media: number | Media | null | undefined
  alt?: string
  className?: string
  sizes?: string
  /** Fill the parent (which must be positioned). Otherwise width/height are required. */
  fill?: boolean
  width?: number
  height?: number
  priority?: boolean
}

/**
 * Renders a Payload upload with next/image. Falls back to null when the relation
 * isn't populated (depth 0) or the file is missing, so callers can show a placeholder.
 */
export function MediaImage({
  media,
  alt,
  className,
  sizes,
  fill,
  width,
  height,
  priority,
}: MediaImageProps) {
  if (!media || typeof media !== 'object') return null
  const url = media.url
  if (!url) return null
  const resolvedAlt = alt ?? media.alt ?? ''

  if (fill) {
    return <Image src={url} alt={resolvedAlt} fill className={className} sizes={sizes} priority={priority} />
  }
  return (
    <Image
      src={url}
      alt={resolvedAlt}
      width={width ?? media.width ?? 800}
      height={height ?? media.height ?? 600}
      className={className}
      sizes={sizes}
      priority={priority}
    />
  )
}
