import React from 'react'

/** ABTR lockup shown on the admin login screen and nav header. */
export function Logo() {
  const cells = ['#000000', '#009FE3', '#E30613', '#FFED00']
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, width: 44, height: 44 }}
        aria-hidden
      >
        {cells.map((c, i) => (
          <span key={i} style={{ background: c, borderRadius: 6 }} />
        ))}
      </div>
      <div style={{ lineHeight: 1.1 }}>
        <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '0.02em' }}>ABTR</div>
        <div style={{ fontSize: 12, opacity: 0.6, fontWeight: 600 }}>Club de corredores Albatera</div>
      </div>
    </div>
  )
}
