// The yard at high resolution ("resolution: high", a terminal that shows
// pictures): the same frame as manousos.ts plans it, painted as an RGBA
// picture HD_SCALE times as fine each way, the scenery drawn again at that
// density and the sprites from hd-sprites.ts (or their low-resolution
// pixels in blocks). The two bubbles (Clawd's, and his reply) stay text:
// cells laid over the picture, which move only when their words change.
// The marks by his head (z's, !, ?, sparkles, hearts) and the dotted line
// to his bubble move every frame, so they are drawn into the picture.

import type { Coat } from '../types'
import { clawdPixels } from './clawd'
import { HD_CLAWD, HD_COATS, HD_FIXED, HD_HAIRBAND, HD_KITTEN, HD_SARDINE, HD_SCALE, HD_SHADES, HD_SPRITES, HD_TOY, type HdGrid } from './hd-sprites'
import { drawFrame, hash, scale, SKY, TOY, TOY_COLORS, YARD, type Plan, type Rgb, type Scene } from './manousos'
import { COATS, HAIRBAND, HAIRBAND_COLORS, KITTEN, SARDINE, SARDINE_COLORS, SPRITES } from './sprites'

const S = HD_SCALE

// A rectangle of text cells to lay over the picture, at a cell of the yard:
// its cells as a Raster's words (cellsOf gives the Raster's base64).
export type Overlay = { col: number; row: number; columns: number; rows: number; words: Uint32Array }
export const cellsOf = (o: Overlay) => base64(new Uint8Array(o.words.buffer, o.words.byteOffset, o.words.byteLength))
// Whether two boxes hold the same cells.
export const sameWords = (a: Uint32Array | undefined, b: Uint32Array) => {
  if (a === undefined || a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

export type HdFrame = {
  // `width * height` RGBA pixels, clear where the terminal's own background
  // shows, as the low-resolution yard leaves it.
  rgba: Uint8Array
  width: number
  height: number
  overlays: Overlay[]
}

// A coat's colors for a high-resolution grid: its own letters, its shades,
// the fixed letters and the coat's own.
const paletteCache = new Map<Coat, Record<string, Rgb>>()
export function coatPalette(coat: Coat): Record<string, Rgb> {
  const cached = paletteCache.get(coat)
  if (cached) return cached
  const own = COATS[coat]
  const out: Record<string, Rgb> = { ...own }
  for (const [letter, [base, k]] of Object.entries(HD_SHADES)) {
    const c = own[base]
    if (c) out[letter] = scale(c, k)
  }
  Object.assign(out, HD_FIXED, HD_COATS[coat] ?? {})
  paletteCache.set(coat, out)
  return out
}

// Standard padded base64; the platform's own where it has one.
export function base64(bytes: Uint8Array): string {
  const native = (bytes as Uint8Array & { toBase64?: () => string }).toBase64
  if (typeof native === 'function') return native.call(bytes)
  const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  const out: string[] = []
  for (let i = 0; i < bytes.length; i += 3) {
    const v = (bytes[i]! << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0)
    out.push(B64[(v >> 18) & 63]! + B64[(v >> 12) & 63]! + (i + 1 < bytes.length ? B64[(v >> 6) & 63]! : '=') + (i + 2 < bytes.length ? B64[v & 63]! : '='))
  }
  return out.join('')
}

// The text cells of a frame, as rectangles: each row's runs of text, a run
// joined to the one under it when they span the same columns (a bubble is
// one rectangle).
export function overlaysOf(words: Uint32Array, isText: Uint8Array, cols: number, rows: number): Overlay[] {
  type Run = { col: number; row: number; columns: number; rows: number }
  const open: Run[] = []
  const done: Run[] = []
  for (let row = 0; row < rows; row++) {
    const runs: Run[] = []
    let col = 0
    while (col < cols) {
      if (!isText[row * cols + col]) {
        col++
        continue
      }
      let end = col + 1
      while (end < cols && isText[row * cols + end]) end++
      runs.push({ col, row, columns: end - col, rows: 1 })
      col = end
    }
    const next: Run[] = []
    for (const run of runs) {
      const above = open.find(o => o.col === run.col && o.columns === run.columns && o.row + o.rows === row)
      if (above) {
        above.rows += 1
        next.push(above)
      } else next.push(run)
    }
    for (const o of open) if (!next.includes(o)) done.push(o)
    open.length = 0
    open.push(...next)
  }
  done.push(...open)
  done.sort((a, b) => a.row - b.row || a.col - b.col)
  return done.map(r => {
    const part = new Uint32Array(r.columns * r.rows * 3)
    for (let y = 0; y < r.rows; y++) {
      const from = ((r.row + y) * cols + r.col) * 3
      part.set(words.subarray(from, from + r.columns * 3), y * r.columns * 3)
    }
    return { ...r, words: part }
  })
}

// One frame at high resolution: the picture and the text over it.
export function drawHd(scene: Scene): HdFrame {
  const { words, isBubble, plan } = drawFrame(scene)
  const { rgba, width, height } = paintHd(plan)
  return { rgba, width, height, overlays: overlaysOf(words, isBubble, scene.cols, scene.rows) }
}

// The marks' glyphs, three pixels by six, a cell's worth (stretched to fit
// a cell at another scale); '<' then '3' is drawn as one heart over both.
const GLYPHS: Record<string, readonly string[]> = {
  z: ['...', '...', '###', '.#.', '#..', '###'],
  Z: ['###', '..#', '.#.', '#..', '###', '...'],
  '!': ['.#.', '.#.', '.#.', '.#.', '...', '.#.'],
  '?': ['##.', '..#', '.#.', '.#.', '...', '.#.'],
  '*': ['...', '#.#', '.#.', '#.#', '...', '...'],
}
const HEART = ['.##.##', '######', '######', '.####.', '..##..', '......']
const DARK_INK: Rgb = [60, 62, 84]
const lumaOf = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b

// The still yard (sky left clear, mountains, sun or moon, wall, window,
// lawn) for one layout, light and season, kept for the frames after.
const STILL_MOST = 6
const stills = new Map<string, Uint8Array>()

// The picture alone, from a frame's plan.
export function paintHd(plan: Plan): { rgba: Uint8Array; width: number; height: number } {
  const width = plan.w * S
  const height = plan.h * S
  const rgba = new Uint8Array(width * height * 4)
  const set = (x: number, y: number, c: Rgb) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return
    const at = (y * width + x) * 4
    rgba[at] = c[0]
    rgba[at + 1] = c[1]
    rgba[at + 2] = c[2]
    rgba[at + 3] = 255
  }
  const rect = (x0: number, y0: number, x1: number, y1: number, c: Rgb) => {
    for (let y = Math.max(0, y0); y < Math.min(height, y1); y++) for (let x = Math.max(0, x0); x < Math.min(width, x1); x++) set(x, y, c)
  }
  // A grid of letters, its top-left at (x0, y0) in image pixels.
  const grid = (rows: readonly string[], x0: number, y0: number, colors: Readonly<Record<string, Rgb>>, isMirrored = false) => {
    const gw = rows[0]?.length ?? 0
    rows.forEach((line, gy) => {
      for (let gx = 0; gx < line.length; gx++) {
        const c = colors[line[gx]!]
        if (c) set(isMirrored ? x0 + gw - 1 - gx : x0 + gx, y0 + gy, c)
      }
    })
  }
  // A sprite: its high-resolution grid where there is one, standing where the
  // low-resolution one would (bottoms level, centered), else that one in blocks.
  const sprite = (low: readonly string[], hd: HdGrid | undefined, x: number, y: number, colors: Readonly<Record<string, Rgb>>, hdColors: Readonly<Record<string, Rgb>>, isMirrored = false) => {
    const lw = low[0]!.length
    if (hd && hd.rows.length > 0) {
      const gw = hd.rows[0]!.length
      const x0 = x * S + Math.round((lw * S - gw) / 2) + (isMirrored ? -(hd.dx ?? 0) : (hd.dx ?? 0))
      const y0 = (y + low.length) * S - hd.rows.length + (hd.dy ?? 0)
      grid(hd.rows, x0, y0, hdColors, isMirrored)
      return
    }
    low.forEach((line, sy) => {
      for (let sx = 0; sx < line.length; sx++) {
        const c = colors[line[sx]!]
        if (c) rect((x + (isMirrored ? lw - 1 - sx : sx)) * S, (y + sy) * S, (x + (isMirrored ? lw - 1 - sx : sx) + 1) * S, (y + sy + 1) * S, c)
      }
    })
  }

  const sky = SKY[plan.light]
  const { trimY, h, w, t } = plan
  const Y = YARD

  const key = [width, height, plan.light, plan.isWinter, trimY, plan.peak, plan.orb?.x, plan.orb?.y, plan.windowX].join()
  let still = stills.get(key)
  if (!still) {
    paintStill()
    still = rgba.slice()
    if (stills.size >= STILL_MOST) stills.delete(stills.keys().next().value!)
    stills.set(key, still)
  } else rgba.set(still)
  // Stars at night, where the sky still shows: a point and, fine enough, a
  // faint cross. They twinkle, so they are no part of the still yard.
  if (plan.light === 'night') {
    const star: Rgb = [214, 214, 236]
    const faint: Rgb = [120, 124, 160]
    const clear = (x: number, y: number) => x >= 0 && y >= 0 && x < width && y < height && rgba[(y * width + x) * 4 + 3] === 0
    for (let y = 0; y < trimY - 3; y++) {
      for (let x = 0; x < w; x++) {
        if (hash(x, y) < 0.012 && Math.floor(t * 1.5 + hash(y, x) * 9) % 9 !== 0) {
          const cx = x * S + (S >> 1)
          const cy = y * S + (S >> 1)
          if (!clear(cx, cy)) continue
          if (S >= 3) for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) if (clear(cx + dx, cy + dy)) set(cx + dx, cy + dy, faint)
          set(cx, cy, star)
        }
      }
    }
  }

  function paintStill() {
    // The sun, or the moon (a crescent: a disc less one to its right).
    if (plan.orb) {
      const cx = (plan.orb.x + 2) * S
      const cy = (plan.orb.y + 2) * S
      const r = 2 * S
      for (let y = cy - r; y < cy + r; y++) {
        for (let x = cx - r; x < cx + r; x++) {
          const dx = x + 0.5 - cx
          const dy = y + 0.5 - cy
          if (dx * dx + dy * dy > r * r) continue
          if (plan.light === 'night') {
            const ex = dx - r * 0.75
            const ey = dy + r * 0.2
            if (ex * ex + ey * ey < r * r * 0.7) continue
          }
          set(x, y, sky.light)
        }
      }
    }
    const snow = scale(YARD.SNOW, sky.dim)
    const [trim, wall, wallShade, lawnEdge, lawnDark, lawn] = [Y.TRIM, Y.WALL, Y.WALL_SHADE, Y.LAWN_EDGE, Y.LAWN_DARK, Y.LAWN].map(c => scale(c, sky.dim)) as [Rgb, Rgb, Rgb, Rgb, Rgb, Rgb]
    // The mountains, from the same curves as the yard's, at every image column.
    for (let X = 0; X < width; X++) {
      const x = (X + 0.5) / S - 0.5
      const height0 = 2.5 + 1.6 * Math.sin(x * 0.07 + 1) + 1.1 * Math.sin(x * 0.17) + Math.max(0, 7 - Math.abs(x - plan.peak) * 0.42)
      const far = Math.min(9, trimY - 3, height0)
      const near = 1.5 + 1.1 * Math.sin(x * 0.11 + 2) + 0.7 * Math.sin(x * 0.29)
      const isSnowy = plan.isWinter && height0 >= 6
      const farTop = Math.round((trimY - far) * S)
      const nearTop = Math.round((trimY - near) * S)
      const snowLine = farTop + Math.round(1.5 * S + Math.sin(X * 0.9) * 0.6 * S)
      for (let y = Math.max(0, farTop); y < trimY * S; y++) set(X, y, isSnowy && y < snowLine ? snow : sky.far)
      for (let y = Math.max(0, nearTop); y < trimY * S; y++) set(X, y, sky.near)
    }
    // The wall with its blue top, and the lawn, in the hour's light.
    const lawnY = (h - Y.LAWN_PX) * S
    rect(0, trimY * S, width, (trimY + 1) * S, trim)
    rect(0, (trimY + 1) * S, width, lawnY - S, wall)
    rect(0, lawnY - S, width, lawnY, wallShade)
    // A whitewashed wall's few cracks of shade along the courses.
    for (let X = 0; X < width; X++) for (let y = (trimY + 1) * S; y < lawnY - S; y++) if (hash(X * 0.31, y * 0.53) < 0.015) set(X, y, wallShade)
    for (let y = lawnY; y < height; y++) {
      for (let X = 0; X < width; X++) {
        const isEdge = y < lawnY + Math.max(1, S >> 1)
        // Blades: a darker pixel and the one above it, scattered.
        const isBlade = !isEdge && (hash(X * 0.71, Math.floor(y / 2) * 1.3) < 0.09 || hash(X * 0.71, Math.floor((y + 1) / 2) * 1.3) < 0.05)
        set(X, y, isEdge ? lawnEdge : isBlade ? lawnDark : lawn)
      }
    }
    // The window, framed in the trim's blue, a bar down the middle; lit after dark.
    {
      const isLit = plan.light === 'night' || plan.light === 'dusk'
      const x0 = plan.windowX * S
      const y0 = (trimY + 2) * S
      const frame = trim
      rect(x0 - 1, y0 - 1, x0 + 3 * S + 1, y0 + 2 * S + 1, frame)
      rect(x0, y0, x0 + 3 * S, y0 + 2 * S, isLit ? Y.LAMP : Y.GLASS)
      rect(x0 + Math.floor((3 * S) / 2), y0, x0 + Math.floor((3 * S) / 2) + 1, y0 + 2 * S, frame)
      if (!isLit) rect(x0 + 1, y0 + 1, x0 + 2, y0 + S, scale([150, 176, 206], sky.dim))
    }
  }

  const feet = plan.feet
  // A shadow on the lawn: the yard's two rows, its ends rounded off.
  const shade = scale(Y.SHADOW, sky.dim)
  const shadow = (x0: number, x1: number) => {
    const top = Math.max(feet, h - Y.LAWN_PX + 1) * S
    const bottom = Math.min(h, feet + 2) * S
    const left = x0 * S
    const right = (x1 + 1) * S
    for (let y = top; y < bottom; y++) {
      const k = (y + 0.5 - (top + bottom) / 2) / ((bottom - top) / 2)
      const inset = Math.round((1 - Math.sqrt(Math.max(0, 1 - k * k))) * S * 1.5)
      rect(left + inset, y, right - inset, y + 1, shade)
    }
  }

  const [clawdShadow, ...catShadows] = plan.shadows
  if (clawdShadow) shadow(...clawdShadow)
  // Clawd, unless the cat is alone in his square.
  const clawd = plan.clawd
  const hdClawd = clawd ? HD_CLAWD(clawd.look) : undefined
  if (clawd && hdClawd && hdClawd.rows.length > 0) {
    const gw = hdClawd.rows[0]!.length
    grid(hdClawd.rows, clawd.x * S + Math.round((14 * S - gw) / 2) + (hdClawd.dx ?? 0), (clawd.top + 8) * S - hdClawd.rows.length + (hdClawd.dy ?? 0), hdClawd.palette)
  } else if (clawd) {
    for (const p of clawdPixels({ ...clawd.look, scale: S })) set(clawd.x * S + p.x, clawd.top * S + p.y, p.c)
  }

  const cat = plan.cat
  if (plan.keyboard) {
    // Your keyboard: its case, and a row of keycaps peeking out from under her.
    const [x0, x1] = plan.keyboard
    rect(x0 * S, (feet - 1) * S, (x1 + 1) * S, (feet + 2) * S, Y.KEYBOARD)
    for (let X = x0 * S + 1; X + S - 1 <= (x1 + 1) * S - 1; X += S) rect(X, feet * S + 1, X + S - 1, (feet + 1) * S - 1, Y.KEYCAP)
  } else if (plan.cushion) {
    // His cushion: rounded at the ends, its seam along the bottom.
    const [x0, x1] = plan.cushion
    const top = feet * S
    const bottom = (feet + 2) * S
    for (let y = top; y < bottom; y++) {
      const k = (y + 0.5 - top) / (bottom - top)
      const inset = k < 0.35 ? Math.round((0.35 - k) * S * 3) : 0
      const isSeam = y >= bottom - Math.max(1, S >> 1)
      rect(x0 * S + inset, y, (x1 + 1) * S - inset, y + 1, isSeam ? Y.CUSHION_EDGE : Y.CUSHION)
      set(x0 * S + inset, y, Y.CUSHION_EDGE)
      set((x1 + 1) * S - inset - 1, y, Y.CUSHION_EDGE)
    }
  }
  for (const s of catShadows) shadow(...s)
  // The fishing toy's rod and string, under him: a line through the middles
  // of the yard pixels it crosses, the rod as thick as a yard pixel is.
  for (const [i, [x0, y0, x1, y1, c]] of (plan.toy?.lines ?? []).entries()) {
    const thick = plan.clawd && i === 0 ? Math.max(1, S - 1) : 1
    const [ax, ay, bx, by] = [x0 * S + (S >> 1), y0 * S + (S >> 1), x1 * S + (S >> 1), y1 * S + (S >> 1)]
    const steps = Math.max(Math.abs(bx - ax), Math.abs(by - ay), 1)
    for (let i = 0; i <= steps; i++) {
      const x = Math.round(ax + ((bx - ax) * i) / steps)
      const y = Math.round(ay + ((by - ay) * i) / steps)
      rect(x, y, x + thick, y + thick, c)
    }
  }
  sprite(SPRITES[cat.pose], HD_SPRITES[cat.pose], cat.x, cat.top, COATS[cat.coat], coatPalette(cat.coat), cat.isLeft)
  // The feather (or hairband), over him.
  if (plan.toy && plan.isFetching) sprite(HAIRBAND, HD_HAIRBAND, plan.toy.x, plan.toy.y, HAIRBAND_COLORS, HD_HAIRBAND?.palette ?? HAIRBAND_COLORS)
  else if (plan.toy) sprite(TOY, HD_TOY, plan.toy.x, plan.toy.y, TOY_COLORS, HD_TOY?.palette ?? TOY_COLORS)

  if (plan.sardine) sprite(SARDINE, HD_SARDINE, plan.sardine.x, plan.sardine.y, SARDINE_COLORS, HD_SARDINE?.palette ?? SARDINE_COLORS)
  for (const k of plan.kittens) sprite(KITTEN[k.frame], HD_KITTEN[k.frame], k.x, k.y, COATS[k.coat], coatPalette(k.coat), k.isMirrored)

  // A cell's ink: the color given, or dark where what is drawn there is
  // light, so a pale mark never vanishes into the wall.
  const cellW = S
  const cellH = 2 * S
  const inkAt = (col: number, row: number, color: Rgb): Rgb => {
    if (lumaOf(...color) <= 150) return color
    let n = 0
    let light = 0
    for (let y = row * cellH; y < (row + 1) * cellH && y < height; y++) {
      for (let x = col * cellW; x < (col + 1) * cellW && x < width; x++) {
        const at = (y * width + x) * 4
        if (rgba[at + 3] === 0) continue
        n++
        light += lumaOf(rgba[at]!, rgba[at + 1]!, rgba[at + 2]!)
      }
    }
    return n * 2 > cellW * cellH && light / n > 150 ? DARK_INK : color
  }
  // A bitmap stretched over a box of image pixels.
  const stamp = (bits: readonly string[], x0: number, y0: number, bw: number, bh: number, c: Rgb) => {
    for (let y = 0; y < bh; y++) {
      const line = bits[Math.floor((y * bits.length) / bh)]!
      for (let x = 0; x < bw; x++) if (line[Math.floor((x * line.length) / bw)] === '#') set(x0 + x, y0 + y, c)
    }
  }
  // The dotted line from him to his bubble: a dot every other pixel.
  if (plan.connector) {
    const { row, from, to, color } = plan.connector
    const y = row * cellH + S
    for (let col = from; col < to; col++) {
      const ink = inkAt(col, row, color)
      for (let x = col * cellW; x < (col + 1) * cellW; x += 1) if (x % 2 === 0) set(x, y, ink)
    }
  }
  const marks = plan.marks
  for (let i = 0; i < marks.length; i++) {
    const m = marks[i]!
    const next = marks[i + 1]
    if (m.char === '<' && next && next.char === '3' && next.row === m.row && next.col === m.col + 1) {
      stamp(HEART, m.col * cellW, m.row * cellH, 2 * cellW, cellH, m.color)
      i++
      continue
    }
    const bits = GLYPHS[m.char]
    if (bits) stamp(bits, m.col * cellW, m.row * cellH, cellW, cellH, inkAt(m.col, m.row, m.color))
  }
  return { rgba, width, height }
}
