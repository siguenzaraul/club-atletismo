'use client'

/**
 * Payload registers the Vercel Blob client handler in its admin config even
 * when `clientUploads` is disabled. Importing the package handler pulls Node
 * dependencies into the browser bundle, so this no-op satisfies the import
 * map while uploads continue through the configured server adapter.
 */
export function DisabledVercelBlobUploadHandler() {
  return null
}
