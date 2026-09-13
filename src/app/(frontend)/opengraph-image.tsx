import { ImageResponse } from 'next/og'

// Previsualización por defecto al compartir en redes. El público llega sobre todo desde ahí,
// y hasta ahora cualquier página sin portada propia se compartía sin imagen.
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'ABTR — Club de Running Albatera'

const C = { black: '#000000', blue: '#009fe3', red: '#e30613', yellow: '#ffed00' }
const CELL = 110

const box = (
  left: number,
  top: number,
  width: number,
  height: number,
  background: string,
  borderRadius: number | string = 0,
): React.CSSProperties => ({ position: 'absolute', left, top, width, height, background, borderRadius })

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: '100%',
          height: '100%',
          background: C.black,
          padding: 72,
          fontFamily: 'Arial, Helvetica, sans-serif',
        }}
      >
        {/* Emblema 2×2 de marca, recreado con divs para que Satori lo renderice fiable. */}
        <div style={{ position: 'relative', display: 'flex', width: CELL * 2, height: CELL * 2 }}>
          <div style={box(0, 0, CELL, CELL, C.black)} />
          <div style={box(CELL, 0, CELL, CELL, C.blue)} />
          <div style={box(0, CELL, CELL, CELL, C.yellow)} />
          <div style={box(CELL, CELL, CELL, CELL, C.red)} />
          <div style={box(0, CELL / 2, CELL, CELL / 2, C.blue, '0 0 999px 999px')} />
          <div style={box(CELL, CELL / 2, CELL, CELL / 2, C.black, '0 0 999px 999px')} />
          <div style={box(0, CELL, CELL, CELL, C.red, 999)} />
          <div style={box(CELL, CELL, CELL, CELL, C.yellow, 999)} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', width: 96, height: 8, background: C.yellow, marginBottom: 28 }} />
          <div
            style={{
              display: 'flex',
              fontSize: 104,
              fontWeight: 800,
              color: '#ffffff',
              letterSpacing: '-0.03em',
              lineHeight: 1,
            }}
          >
            ABTR
          </div>
          <div style={{ display: 'flex', fontSize: 40, color: 'rgba(255,255,255,0.72)', marginTop: 16 }}>
            Club de Running Albatera
          </div>
        </div>
      </div>
    ),
    { ...size },
  )
}
