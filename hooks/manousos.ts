// The yard above the prompt, in pixel art: Clawd, the Claude Code mascot,
// tells Manousos, a hand-drawn cat, what to do, and Manousos answers in a
// speech bubble. Pixels are two to a terminal cell (half blocks), so every
// edge is crisp in any font. drawCat returns a Raster's `cells`.

import type { Coat, Mood } from '../types'
import { CLAWD_H, CLAWD_ORANGE, CLAWD_W, clawdPixels, LOOK, type ClawdLook } from './clawd'
import { CAT_H, COATS, SPRITES, type Pose } from './sprites'

export { COATS }

type Rgb = [number, number, number]
const same = (a: Rgb, b: Rgb) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2]
const luma = (c: Rgb) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]

// The yard: sky (the terminal's own color), a whitewashed wall with a blue
// top, and a lawn. Heights in pixels, counted up from the bottom.
const LAWN: Rgb = [112, 164, 84]
const LAWN_DARK: Rgb = [98, 148, 74]
const LAWN_EDGE: Rgb = [134, 184, 100]
const SHADOW: Rgb = [80, 124, 64]
const WALL: Rgb = [236, 230, 218]
const WALL_SHADE: Rgb = [214, 206, 192]
const TRIM: Rgb = [60, 112, 180]
const CUSHION: Rgb = [172, 188, 208]
const CUSHION_EDGE: Rgb = [120, 138, 166]
const LAWN_PX = 4
const WALL_PX = 4
// Feet stand on this pixel row, counted up from the bottom.
const FEET_UP = 1

// ---------------------------------------------------------------- layout

export type Scene = {
  mood: Mood
  coat: Coat
  // Seconds.
  t: number
  cols: number
  rows: number
  // What Clawd tells Manousos, and what Manousos says or sings back.
  said?: string
  reply?: string[]
}

// Rows Clawd's bubble takes above the yard, when it fits.
const TOP_ROWS = 3
const YARD_ROWS = 8
// Where Clawd stands, where the cat's room starts, and the reply bubble.
const CLAWD_X = 3
const CAT_FROM = 21
const REPLY_MOST = 58
const REPLY_LEAST = 22
const CAT_ROOM = 34

// Whether a reply bubble fits beside the cat at this width.
export const replyFits = (cols: number) => Math.min(REPLY_MOST, cols - CAT_FROM - CAT_ROOM - 6) >= REPLY_LEAST

// Narrower than this, Clawd and the cat don't both fit.
const MIN_COLS = 50

// What the band can show in the room it has, under it a caption line (and
// the couplet as text when its bubble doesn't fit): the whole strip with
// Clawd's bubble on top; or the yard alone, Clawd's words then a text line
// too; or, with less room than that, nothing, and the ASCII cat instead.
export function fit(cols: number, maxRows: number): { rows: number; isSaidText: boolean } | undefined {
  if (cols < MIN_COLS) return undefined
  const under = 1 + (replyFits(cols) ? 0 : 2)
  if (maxRows - under >= YARD_ROWS + TOP_ROWS) return { rows: YARD_ROWS + TOP_ROWS, isSaidText: false }
  if (maxRows - under - 1 >= YARD_ROWS) return { rows: YARD_ROWS, isSaidText: true }
  return undefined
}

// Text as the Raster can draw it: one single-width character a cell. Marks
// that combine or take no room are dropped; a character too wide (emoji,
// CJK) or outside the basic plane becomes '?'.
const WIDE: [number, number][] = [
  [0x1100, 0x115f], [0x2329, 0x232a], [0x231a, 0x231b], [0x23e9, 0x23f3], [0x2600, 0x27bf], [0x2b00, 0x2bff],
  [0x2e80, 0xa4cf], [0xac00, 0xd7a3], [0xf900, 0xfaff], [0xfe10, 0xfe19], [0xfe30, 0xfe6f], [0xff00, 0xff60], [0xffe0, 0xffe6],
]
export function clean(text: string): string {
  let out = ''
  for (const ch of text.normalize('NFC')) {
    if (/[\p{M}\p{Cf}\p{Cc}\p{Zl}\p{Zp}]/u.test(ch)) continue
    const cp = ch.codePointAt(0) ?? 0x3f
    out += cp > 0xffff || WIDE.some(([lo, hi]) => cp >= lo && cp <= hi) ? '?' : /\s/.test(ch) ? ' ' : ch
  }
  return out
}

// ---------------------------------------------------------------- Manousos

type Cat = { pose: Pose; x: number; lift: number; isLeft: boolean }

// Where he is and how he stands, for a mood at time t, in a room of pixels.
function catAt(mood: Mood, t: number, from: number, to: number): Cat {
  const width = SPRITES.walkA[0]!.length
  const middle = Math.round((from + to - width) / 2)
  switch (mood) {
    case 'nap':
      return { pose: 'sleep', x: middle, lift: 0, isLeft: false }
    case 'think': {
      // Pacing to and fro, a step every few pixels.
      const span = Math.max(0, to - from - width)
      const speed = 7
      const lap = span > 0 ? (2 * span) / speed : 1
      const k = (t % lap) / lap
      const isLeft = k >= 0.5
      const x = from + Math.round(span > 0 ? (k < 0.5 ? 2 * k : 2 - 2 * k) * span : 0)
      return { pose: Math.floor(t * 4) % 2 === 0 ? 'walkA' : 'walkB', x, lift: 0, isLeft }
    }
    case 'tool': {
      // Crouch, wiggle, then a little pounce (as high as the strip allows).
      const k = (t * 1.2) % 1
      if (k > 0.75) return { pose: 'walkB', x: middle + 2, lift: Math.round(Math.sin(((k - 0.75) / 0.25) * Math.PI) * 3), isLeft: false }
      return { pose: 'crouch', x: middle + (Math.floor(t * 10) % 2), lift: 0, isLeft: false }
    }
    case 'happy':
      return { pose: Math.floor(t * 2.5) % 2 === 0 ? 'sitA' : 'sitB', x: middle + 3, lift: 0, isLeft: false }
    case 'oops':
      return { pose: 'startled', x: middle + (Math.floor(t * 16) % 2), lift: 0, isLeft: false }
  }
}

// ---------------------------------------------------------------- Clawd

// How Clawd stands for a mood: talking (an arm waving at the cat) while
// Claude works, cheering when it is done, dozing while Manousos naps.
function clawdLook(mood: Mood, t: number, isTalking: boolean): { look: ClawdLook; lift: number } {
  const base: ClawdLook = { ...LOOK, color: CLAWD_ORANGE, facing: 1, isBlinking: Math.sin(t * 1.1) > 0.96 }
  if (mood === 'nap') return { look: { ...base, pose: 'sit', eyes: 'closed', facing: 0, arms: { left: 'down', right: 'down' } }, lift: 0 }
  if (mood === 'happy') {
    const lift = Math.round(Math.max(0, Math.sin(t * 7)) * 2)
    return { look: { ...base, pose: lift > 0 ? 'jump' : 'stand', arms: { left: 'up', right: 'up' } }, lift }
  }
  if (mood === 'oops') return { look: { ...base, eyes: 'wide', arms: { left: 'up', right: 'up' } }, lift: 0 }
  const wave = isTalking && Math.floor(t * 2.5) % 2 === 0
  return { look: { ...base, arms: { left: 'down', right: wave ? 'up' : 'out' } }, lift: 0 }
}

// ---------------------------------------------------------------- bubbles

// Words wrapped to a width, at most `most` lines (the last one cut with ...).
function wrap(lines: string[], width: number, most: number): string[] {
  const out: string[] = []
  for (const line of lines) {
    let cur = ''
    for (const word of line.split(/\s+/)) {
      if (cur === '') cur = word
      else if ([...cur].length + 1 + [...word].length <= width) cur += ' ' + word
      else {
        out.push(cur)
        cur = word
      }
    }
    if (cur !== '') out.push(cur)
  }
  const cut = out.map(l => ([...l].length > width ? [...l].slice(0, width - 3).join('') + '...' : l))
  if (cut.length > most) {
    cut.length = most
    cut[most - 1] = [...cut[most - 1]!].slice(0, width - 3).join('') + '...'
  }
  return cut
}

// ---------------------------------------------------------------- drawing

const CLEAR = 0x01000000
const pack = (c: Rgb) => (Math.round(c[0]) << 16) | (Math.round(c[1]) << 8) | Math.round(c[2])

function encode(words: Uint32Array) {
  const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  const bytes = new Uint8Array(words.buffer)
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const v = (bytes[i]! << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0)
    out += B64[(v >> 18) & 63]! + B64[(v >> 12) & 63]!
    out += i + 1 < bytes.length ? B64[(v >> 6) & 63]! : '='
    out += i + 2 < bytes.length ? B64[v & 63]! : '='
  }
  return out
}

// One frame of the yard, Clawd, Manousos and their bubbles.
export function drawCat(scene: Scene): string {
  const { mood, t, cols, rows } = scene
  const top = rows >= YARD_ROWS + TOP_ROWS ? TOP_ROWS : 0
  const w = cols
  // The pixels cover the whole strip, so a pounce can rise above the yard.
  const h = rows * 2
  const px: (Rgb | undefined)[] = new Array(w * h)
  const set = (x: number, y: number, c: Rgb) => {
    if (x >= 0 && y >= 0 && x < w && y < h) px[y * w + x] = c
  }

  // The yard.
  for (let x = 0; x < w; x++) {
    set(x, h - LAWN_PX - WALL_PX - 1, TRIM)
    for (let y = h - LAWN_PX - WALL_PX; y < h - LAWN_PX; y++) set(x, y, y === h - LAWN_PX - 1 ? WALL_SHADE : WALL)
    for (let y = h - LAWN_PX; y < h; y++) {
      // A light top edge, then lawn with a scatter of darker tufts.
      const tuft = ((x * 73 + y * 151) % 29) % 9 === 0 && y > h - LAWN_PX
      set(x, y, y === h - LAWN_PX ? LAWN_EDGE : tuft ? LAWN_DARK : LAWN)
    }
  }
  const feet = h - 1 - FEET_UP
  const shadow = (x0: number, x1: number) => {
    for (let x = x0; x <= x1; x++) for (const y of [feet, feet + 1]) if (y < h && y > h - LAWN_PX) set(x, y, SHADOW)
  }

  // The reply bubble's place decides the cat's room.
  const replyInner = Math.min(REPLY_MOST, cols - CAT_FROM - CAT_ROOM - 6)
  const hasReply = scene.reply !== undefined && scene.reply.length > 0 && replyInner >= REPLY_LEAST
  const replyLines = hasReply ? wrap(scene.reply!.map(clean), replyInner, rows - 2) : []
  const replyWidth = hasReply ? Math.max(...replyLines.map(l => [...l].length)) + 2 : 0
  const bx = cols - replyWidth - 3
  const catTo = hasReply ? bx - 3 : Math.min(cols - 1, CAT_FROM + CAT_ROOM + 10)

  // Clawd, on the left.
  const said = clean(scene.said ?? '')
  const clawd = clawdLook(mood, t, said !== '')
  const clawdTop = feet + 1 - CLAWD_H - clawd.lift
  shadow(CLAWD_X + 1, CLAWD_X + CLAWD_W - 2)
  for (const p of clawdPixels(clawd.look)) set(CLAWD_X + p.x, clawdTop + p.y, p.c)

  // Manousos, in his room.
  const C = COATS[scene.coat]
  const cat = catAt(mood, t, CAT_FROM, catTo)
  const sprite = SPRITES[cat.pose]
  const spriteW = sprite[0]!.length
  // Never over Clawd, never off the right edge; never above the strip.
  cat.x = Math.max(CAT_FROM, Math.min(cols - spriteW, cat.x))
  const catTop = feet + 1 - CAT_H - Math.min(cat.lift, feet + 1 - CAT_H)
  if (mood === 'nap') {
    // His cushion, the pale blue of the bedsheet in the photo.
    for (let x = cat.x - 1; x <= cat.x + spriteW - 3; x++) {
      const isEnd = x === cat.x - 1 || x === cat.x + spriteW - 3
      set(x, feet, isEnd ? CUSHION_EDGE : CUSHION)
      set(x, feet + 1, CUSHION_EDGE)
    }
  } else shadow(cat.x + 3, cat.x + spriteW - 4)
  sprite.forEach((line, sy) => {
    ;[...line].forEach((ch, sx) => {
      const c = C[ch]
      if (c) set(cat.isLeft ? cat.x + spriteW - 1 - sx : cat.x + sx, catTop + sy - (mood === 'nap' ? 1 : 0), c)
    })
  })

  // Cells from pixels, two pixels a cell.
  const words = new Uint32Array(cols * rows * 3)
  for (let i = 0; i < cols * rows; i++) {
    words[i * 3] = 0x20
    words[i * 3 + 1] = CLEAR
    words[i * 3 + 2] = CLEAR
  }
  const put = (col: number, row: number, char: string, color: Rgb | number, back: Rgb | number = CLEAR) => {
    if (col < 0 || col >= cols || row < 0 || row >= rows) return
    const at = (row * cols + col) * 3
    words[at] = char.codePointAt(0) ?? 0x20
    words[at + 1] = typeof color === 'number' ? color : pack(color)
    words[at + 2] = typeof back === 'number' ? back : pack(back)
  }
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const up = px[row * 2 * w + col]
      const down = px[(row * 2 + 1) * w + col]
      if (up && down) put(col, row, same(up, down) ? ' ' : '▀', up, down)
      else if (up) put(col, row, '▀', up)
      else if (down) put(col, row, '▄', down)
    }
  }
  const text = (col: number, row: number, str: string, color: Rgb, back?: Rgb) => [...str].forEach((ch, i) => put(col + i, row, ch, color, back))
  // A glyph over whatever is drawn there, keeping the color behind it; on a
  // light background it inks dark, so it never vanishes into the wall.
  const over = (col: number, row: number, char: string, color: Rgb) => {
    if (col < 0 || col >= cols || row < 0 || row >= rows) return
    const at = (row * cols + col) * 3
    const back = words[at + 2] !== CLEAR ? words[at + 2]! : words[at] !== 0x20 ? words[at + 1]! : CLEAR
    const behind: Rgb = [(back >> 16) & 255, (back >> 8) & 255, back & 255]
    const ink = back !== CLEAR && luma(behind) > 150 && luma(color) > 150 ? ([60, 62, 84] as Rgb) : color
    put(col, row, char, ink, back)
  }

  // Little marks by his head: z's, a startle, a heart. (He faces right in
  // every mood that has them.)
  const headCol = cat.x + spriteW - 4
  const headRow = Math.floor(catTop / 2)
  if (mood === 'nap') {
    for (let i = 0; i < 3; i++) {
      const q = (t * 0.5 + i / 3) % 1
      over(cat.x + spriteW + Math.round(q * 6), Math.max(0, headRow + 3 - Math.round(q * 4)), q > 0.6 ? 'Z' : 'z', [Math.round(150 + 80 * (1 - q)), Math.round(160 + 70 * (1 - q)), 240])
    }
  } else if (mood === 'tool') {
    if (Math.floor(t * 2) % 2 === 0) over(headCol + 2, Math.max(0, headRow), '!', [255, 210, 80])
  } else if (mood === 'oops') {
    over(headCol + 2, Math.max(0, headRow - 1), '!', [255, 90, 90])
  } else if (mood === 'happy') {
    text(cat.x + spriteW - 2, Math.max(0, headRow - 1), '<3', [255, 110, 150])
  }

  const edge: Rgb = [196, 198, 214]
  const panel: Rgb = [32, 33, 44]
  // Clawd's words: a one-line bubble above him, its tail on him.
  if (top > 0 && said !== '') {
    const line = wrap([said], Math.max(10, catTo - 6), 1)[0] ?? ''
    const width = [...line].length + 2
    text(1, 0, '╭' + '─'.repeat(width) + '╮', edge, panel)
    text(1, 1, '│ ' + ' '.repeat(width - 1) + '│', edge, panel)
    text(3, 1, line, [238, 238, 246], panel)
    text(1, 2, '╰' + '─'.repeat(width) + '╯', edge, panel)
    put(Math.min(width, CLAWD_X + CLAWD_W / 2), 2, '┬', edge, panel)
  }

  // Manousos' reply in a bubble on the right, a dotted line from him to it.
  if (hasReply) {
    const height = replyLines.length + 2
    const by = Math.max(0, Math.floor((rows - height) / 2))
    const ink: Rgb = [246, 186, 230]
    text(bx, by, '╭' + '─'.repeat(replyWidth) + '╮', edge, panel)
    replyLines.forEach((l, i) => {
      text(bx, by + 1 + i, '│ ' + ' '.repeat(replyWidth - 1) + '│', edge, panel)
      text(bx + 2, by + 1 + i, l, ink, panel)
    })
    text(bx, by + height - 1, '╰' + '─'.repeat(replyWidth) + '╯', edge, panel)
    // At his mouth's height, from just past his right-most pixel.
    const row = Math.min(by + height - 2, Math.max(by + 1, Math.floor((catTop + 6) / 2)))
    for (let col = Math.min(cat.x + spriteW + 1, bx - 1); col < bx; col++) over(col, row, '·', edge)
    put(bx, row, '┤', edge, panel)
  }
  return encode(words)
}
