// Generates the PWA icons (no image dependencies): a mountain on a dark tile.
// Run `npm run icons` after changing colours; the PNGs in public/ are committed.
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'

const BG = [24, 28, 38]
const PEAK = [255, 140, 56]
const SNOW = [245, 247, 250]

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc32 = (buf) => {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
const chunk = (type, data) => {
  const body = Buffer.concat([Buffer.from(type), data])
  const out = Buffer.alloc(body.length + 8)
  out.writeUInt32BE(data.length, 0)
  body.copy(out, 4)
  out.writeUInt32BE(crc32(body), body.length + 4)
  return out
}

// `scale` shrinks the artwork towards the centre (maskable icons need a safe zone).
function png(size, scale) {
  const raw = Buffer.alloc((size * 3 + 1) * size)
  const inTriangle = (x, y, [ax, ay], [bx, by], [cx, cy]) => {
    const d = (bx - ax) * (cy - ay) - (cx - ax) * (by - ay)
    const u = ((x - ax) * (cy - ay) - (cx - ax) * (y - ay)) / d
    const v = ((bx - ax) * (y - ay) - (x - ax) * (by - ay)) / d
    return u >= 0 && v >= 0 && u + v <= 1
  }
  const p = (fx, fy) => [size * (0.5 + (fx - 0.5) * scale), size * (0.5 + (fy - 0.5) * scale)]
  const big = [p(0.1, 0.78), p(0.5, 0.2), p(0.9, 0.78)]
  const snow = [p(0.5, 0.2), p(0.4, 0.36), p(0.6, 0.36)]
  for (let y = 0; y < size; y++) {
    const row = y * (size * 3 + 1)
    raw[row] = 0
    for (let x = 0; x < size; x++) {
      const color = inTriangle(x + 0.5, y + 0.5, ...snow)
        ? SNOW
        : inTriangle(x + 0.5, y + 0.5, ...big)
          ? PEAK
          : BG
      raw.set(color, row + 1 + x * 3)
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 2
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const out = (name, size, scale) => writeFileSync(new URL(`../public/${name}`, import.meta.url), png(size, scale))
out('pwa-192x192.png', 192, 1)
out('pwa-512x512.png', 512, 1)
out('pwa-maskable-512x512.png', 512, 0.7)
out('apple-touch-icon.png', 180, 1)
console.log('icons written to public/')
