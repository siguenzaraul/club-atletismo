'use client'

import React from 'react'

/** Último recurso: si falla el propio layout raíz, aquí no hay ni CSS ni providers. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          backgroundColor: '#000',
          color: '#fff',
          fontFamily: 'Archivo, Arial, Helvetica, sans-serif',
          textAlign: 'center',
          padding: '2rem',
        }}
      >
        <h1 style={{ fontSize: '2rem', margin: 0, textTransform: 'uppercase' }}>
          Algo se ha torcido
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.7)', maxWidth: '28rem' }}>
          No hemos podido cargar la web. Inténtalo de nuevo en unos segundos.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            border: 0,
            borderRadius: '999px',
            padding: '0.8rem 1.6rem',
            fontWeight: 700,
            color: '#fff',
            backgroundColor: '#e30613',
            cursor: 'pointer',
          }}
        >
          Reintentar
        </button>
        {error.digest && (
          <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>ref: {error.digest}</p>
        )}
      </body>
    </html>
  )
}
