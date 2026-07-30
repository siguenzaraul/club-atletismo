import React from 'react'

/** Compact ABTR mark for the admin nav: the four-colour club pattern. */
export function Icon() {
  const cells = ['#000000', '#009FE3', '#E30613', '#FFED00']
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 2,
        width: 26,
        height: 26,
      }}
      aria-label="ABTR"
    >
      {cells.map((c, i) => (
        <span key={i} style={{ background: c, borderRadius: 4 }} />
      ))}
    </div>
  )
}
