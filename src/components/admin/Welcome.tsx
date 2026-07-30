import React from 'react'
import Link from 'next/link'

const linkStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 16px',
  borderRadius: 10,
  fontWeight: 700,
  fontSize: 14,
  textDecoration: 'none',
}

/** Quick-start panel above the admin dashboard, pointing staff at the day-to-day tools. */
export function Welcome() {
  return (
    <div
      style={{
        marginBottom: 28,
        padding: '22px 24px',
        borderRadius: 14,
        border: '1px solid var(--theme-elevation-150)',
        background: 'var(--theme-elevation-50)',
      }}
    >
      <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Bienvenido al panel del club</h2>
      <p style={{ margin: '6px 0 16px', color: 'var(--theme-elevation-600)', maxWidth: '60ch' }}>
        Aquí configuras todo. Para el día a día (socios, cuotas, equipación y resultados) usa el área de
        gestión, más sencilla.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        <Link href="/gestion" style={{ ...linkStyle, background: '#009FE3', color: '#fff' }}>
          Gestión de socios
        </Link>
        <Link
          href="/gestion/importar-resultados"
          style={{ ...linkStyle, background: 'var(--theme-elevation-100)', color: 'var(--theme-text)' }}
        >
          Importar resultados
        </Link>
        <Link
          href="/"
          style={{ ...linkStyle, background: 'transparent', color: 'var(--theme-text)', fontWeight: 600 }}
        >
          Ver la web pública →
        </Link>
      </div>
    </div>
  )
}
