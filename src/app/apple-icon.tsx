import { ImageResponse } from 'next/og'

// iOS home-screen icon (PNG). Recreates the ABTR brand module with divs so it
// renders reliably in Satori. SVG apple-touch-icons are ignored by iOS Safari.
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

const C = { black: '#000000', blue: '#009fe3', red: '#e30613', yellow: '#ffed00' }
const CELL = 90 // size / 2

const box = (
  left: number,
  top: number,
  width: number,
  height: number,
  background: string,
  borderRadius = 0,
): React.CSSProperties => ({ position: 'absolute', left, top, width, height, background, borderRadius })

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ position: 'relative', display: 'flex', width: '100%', height: '100%' }}>
        {/* background cells */}
        <div style={box(0, 0, CELL, CELL, C.black)} />
        <div style={box(CELL, 0, CELL, CELL, C.blue)} />
        <div style={box(0, CELL, CELL, CELL, C.yellow)} />
        <div style={box(CELL, CELL, CELL, CELL, C.red)} />
        {/* top row: half circles opening downward */}
        <div style={{ ...box(0, CELL / 2, CELL, CELL / 2, C.blue), borderRadius: '0 0 999px 999px' }} />
        <div style={{ ...box(CELL, CELL / 2, CELL, CELL / 2, C.black), borderRadius: '0 0 999px 999px' }} />
        {/* bottom row: full circles */}
        <div style={box(0, CELL, CELL, CELL, C.red, 999)} />
        <div style={box(CELL, CELL, CELL, CELL, C.yellow, 999)} />
      </div>
    ),
    { ...size },
  )
}
