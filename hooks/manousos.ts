// The yard above the prompt, in pixel art: Clawd, the Claude Code mascot,
// tells Manousos, a hand-drawn cat, what to do, and Manousos answers in a
// speech bubble. Behind them Psiloritis, under the sun or the moon as the
// clock says; in front, a kitten for each helper Claude has running. Pixels
// are two to a terminal cell (half blocks), so every edge is crisp in any
// font. drawCat returns a Raster's `cells`.

import type { Coat, Mood } from '../types'
import { CLAWD_H, CLAWD_ORANGE, CLAWD_W, clawdPixels, LOOK, type ClawdLook } from './clawd'
import { CAT_H, COATS, KITTEN, SARDINE, SARDINE_COLORS, SPRITES, type Pose } from './sprites'

export { COATS }

type Rgb = [number, number, number]
const same = (a: Rgb, b: Rgb) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2]
const luma = (c: Rgb) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]
const scale = (c: Rgb, k: number): Rgb => [Math.round(c[0] * k), Math.round(c[1] * k), Math.round(c[2] * k)]
const hash = (x: number, y: number) => {
  const v = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453
  return v - Math.floor(v)
}

// The yard: sky (the terminal's own color), Psiloritis, a whitewashed wall
// with a blue top and a window, and a lawn. Heights in pixels.
const LAWN: Rgb = [112, 164, 84]
const LAWN_DARK: Rgb = [98, 148, 74]
const LAWN_EDGE: Rgb = [134, 184, 100]
const SHADOW: Rgb = [80, 124, 64]
const WALL: Rgb = [236, 230, 218]
const WALL_SHADE: Rgb = [214, 206, 192]
const TRIM: Rgb = [60, 112, 180]
const GLASS: Rgb = [92, 122, 160]
const LAMP: Rgb = [255, 210, 120]
const SNOW: Rgb = [238, 242, 250]
const CUSHION: Rgb = [172, 188, 208]
const CUSHION_EDGE: Rgb = [120, 138, 166]
const KEYBOARD: Rgb = [58, 60, 70]
const KEYCAP: Rgb = [150, 154, 168]
const KEYBOARD_PX = 3
const LAWN_PX = 4
const WALL_PX = 4
// Feet stand on this pixel row, counted up from the bottom.
const FEET_UP = 1

// The time of day, from the local hour, and what it does to the colors.
type Daylight = 'dawn' | 'day' | 'dusk' | 'night'
const daylightAt = (hour: number): Daylight => (hour >= 21 || hour < 6 ? 'night' : hour < 8 ? 'dawn' : hour < 18 ? 'day' : 'dusk')
const SKY: Record<Daylight, { far: Rgb; near: Rgb; light: Rgb; dim: number }> = {
  dawn: { far: [176, 150, 184], near: [140, 120, 160], light: [255, 176, 96], dim: 0.9 },
  day: { far: [150, 172, 204], near: [118, 144, 182], light: [255, 220, 96], dim: 1 },
  dusk: { far: [156, 112, 146], near: [120, 86, 124], light: [255, 140, 72], dim: 0.82 },
  night: { far: [56, 62, 92], near: [42, 48, 74], light: [236, 232, 200], dim: 0.55 },
}
// The sky itself, where a surface has no background of its own to show
// (the desktop's SVG yard): the terminal leaves it to the terminal's.
const SKY_FILL: Record<Daylight, Rgb> = { dawn: [244, 212, 196], day: [206, 226, 244], dusk: [236, 168, 132], night: [22, 26, 44] }
export const skyAt = (hour: number): number => {
  const [r, g, b] = SKY_FILL[daylightAt(hour)]
  return (r << 16) | (g << 8) | b
}
// Snow on the peaks from December to March (months 0-based).
const isWinter = (month: number) => month === 11 || month <= 2

// ---------------------------------------------------------------- layout

export type Scene = {
  mood: Mood
  coat: Coat
  // Seconds, and seconds since the mood began.
  t: number
  since?: number
  cols: number
  rows: number
  // What Clawd tells Manousos, and what Manousos says or sings back.
  said?: string
  reply?: string[]
  // The local hour (0-23) and month (0-11): the light and the season.
  hour?: number
  month?: number
  // Helpers Claude has running: a kitten each, up to four.
  kittens?: number
  // Seconds since he was petted, while it still shows, and whether the pet
  // earned a swat instead.
  petted?: number
  isSwatted?: boolean
  // Asleep on a keyboard in the middle of the yard, whatever the mood.
  isOnKeys?: boolean
  // The cat alone in a small square of yard: no Clawd, no bubbles.
  isSolo?: boolean
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
const MOST_KITTENS = 4
// How long petting shows, and how long the sardine is in the air.
export const PETTING_S = 3
const TOSS_S = 1.2
// The fishing toy: a feather on a string, swinging over his head.
const TOY = ['.y.', 'pyp', 'ppp', '.p.']
const TOY_COLORS: Record<string, Rgb> = { y: [255, 214, 90], p: [236, 104, 160] }
const STRING: Rgb = [206, 206, 220]
const ROD: Rgb = [128, 84, 52]
const TOY_SWING = 1.6
// Where the toy's middle swings to at time t, in the cat's room.
const toyX = (t: number, from: number, to: number) => {
  const width = SPRITES.walkA[0]!.length
  const left = from + width / 2
  const right = to - width / 2
  return Math.round((left + right) / 2 + (Math.sin(t * TOY_SWING) * Math.max(0, right - left)) / 2)
}
// How long a slap's swiping lasts before she sits back, glaring.
const SWIPE_S = 1.5

// Whether a reply bubble fits beside the cat at this width.
export const replyFits = (cols: number) => Math.min(REPLY_MOST, cols - CAT_FROM - CAT_ROOM - 6) >= REPLY_LEAST

// Narrower than this, Clawd and the cat don't both fit.
const MIN_COLS = 50

// The square of yard the cat has to himself (/cat small, /cat dock): wide
// enough for his widest pose, as many pixels tall as it is wide where the
// rows allow, and never so short that the wall and lawn crowd him out.
const SOLO_LEAST_COLS = 30
const SOLO_MOST_COLS = 40
const SOLO_LEAST_ROWS = 9
export function soloFit(cols: number, maxRows: number): { cols: number; rows: number } | undefined {
  if (cols < SOLO_LEAST_COLS) return undefined
  const width = Math.min(SOLO_MOST_COLS, cols)
  const rows = Math.min(Math.ceil(width / 2), maxRows)
  return rows >= SOLO_LEAST_ROWS ? { cols: width, rows } : undefined
}

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

// Where he is and how he stands, for a mood at time t (`since` into it), in
// a room of pixels.
function catAt(mood: Mood, t: number, since: number, from: number, to: number): Cat {
  const width = SPRITES.walkA[0]!.length
  const middle = Math.round((from + to - width) / 2)
  const seated = middle + 3
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
      return { pose: Math.floor(t * 2.5) % 2 === 0 ? 'sitA' : 'sitB', x: seated, lift: 0, isLeft: false }
    case 'oops':
    case 'hiss':
      return { pose: 'startled', x: middle + (Math.floor(t * 16) % 2), lift: 0, isLeft: false }
    case 'wait':
      // Sitting up, looking at you.
      return { pose: 'sitA', x: seated, lift: 0, isLeft: false }
    case 'dance': {
      // Hop, turn, hop.
      const beat = Math.floor(t * 4)
      return { pose: beat % 2 === 0 ? 'sitA' : 'sitB', x: seated, lift: beat % 2 === 0 ? 2 : 0, isLeft: Math.floor(t * 2) % 2 === 1 }
    }
    case 'feast':
      // Waiting for the sardine, then eating it, eyes shut.
      return { pose: since < TOSS_S ? 'sitA' : 'purr', x: seated, lift: 0, isLeft: false }
    case 'bored':
      // A big yawn, then asleep where he stands.
      return { pose: since < 2.5 ? 'yawn' : 'sleep', x: since < 2.5 ? seated : middle, lift: 0, isLeft: false }
    case 'slap':
      // Right up to Clawd, swiping, then sitting back to glare at him.
      if (since < SWIPE_S) return { pose: Math.floor(since * 7) % 2 === 0 ? 'slapA' : 'slapB', x: from, lift: 0, isLeft: false }
      return { pose: 'sitA', x: from + 2, lift: 0, isLeft: false }
    case 'play': {
      // A beat behind the toy, leaping at it and swiping, then crouching.
      const lift = Math.round(Math.max(0, Math.sin(t * 5)) * 4)
      const pose = lift > 0 ? (Math.floor(t * 6) % 2 === 0 ? 'slapA' : 'slapB') : 'crouch'
      return { pose, x: toyX(t - 0.25, from, to) - Math.round(width / 2), lift, isLeft: Math.cos((t - 0.25) * TOY_SWING) < 0 }
    }
    case 'snub':
      // Off to the far side, eyes shut, as if he weren't there.
      return { pose: 'purr', x: to - SPRITES.purr[0]!.length, lift: 0, isLeft: false }
  }
}

// ---------------------------------------------------------------- Clawd

// How Clawd stands for a mood: talking (an arm waving at the cat) while
// Claude works, waving at you while you're needed, cheering when it is done,
// dozing while Manousos naps.
function clawdLook(mood: Mood, t: number, since: number, isTalking: boolean): { look: ClawdLook; lift: number; dx?: number } {
  const base: ClawdLook = { ...LOOK, color: CLAWD_ORANGE, facing: 1, isBlinking: Math.sin(t * 1.1) > 0.96 }
  const wave = Math.floor(t * 2.5) % 2 === 0
  switch (mood) {
    case 'nap':
      return { look: { ...base, pose: 'sit', eyes: 'closed', facing: 0, arms: { left: 'down', right: 'down' } }, lift: 0 }
    case 'happy':
    case 'dance': {
      const lift = Math.round(Math.max(0, Math.sin(t * 7)) * 2)
      return { look: { ...base, pose: lift > 0 ? 'jump' : 'stand', arms: { left: 'up', right: 'up' } }, lift }
    }
    case 'oops':
    case 'hiss':
      return { look: { ...base, eyes: 'wide', arms: { left: 'up', right: 'up' } }, lift: 0 }
    case 'wait':
      // Facing you, both arms waving.
      return { look: { ...base, facing: 0, arms: { left: wave ? 'up' : 'out', right: wave ? 'out' : 'up' } }, lift: 0 }
    case 'slap':
      // Knocked back by the swipe, arms up.
      return { look: { ...base, eyes: 'wide', facing: 1, arms: { left: 'up', right: 'up' } }, lift: 0, dx: since < SWIPE_S && Math.floor(since * 7) % 2 === 1 ? -2 : -1 }
    case 'play':
      // Holding up the rod.
      return { look: { ...base, arms: { left: 'down', right: 'up' } }, lift: 0 }
    case 'feast':
      // The toss: arm up, then out as the sardine leaves.
      return { look: { ...base, arms: { left: 'down', right: since < 0.25 ? 'up' : 'out' } }, lift: 0 }
    default:
      return { look: { ...base, arms: { left: 'down', right: isTalking && wave ? 'up' : 'out' } }, lift: 0 }
  }
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

export const CLEAR = 0x01000000
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

// One frame of the yard, Clawd, Manousos, the kittens and the bubbles, as a
// Raster's cells (the terminal's).
export function drawCat(scene: Scene): string {
  return encode(drawCells(scene))
}

// The same frame as cells: per cell its code point, foreground and
// background (CLEAR: the surface's own), three words a cell, row-major.
export function drawCells(scene: Scene): Uint32Array {
  const { mood, t, cols, rows } = scene
  const since = scene.since ?? t
  const light = daylightAt(scene.hour ?? 12)
  const sky = SKY[light]
  const isSolo = scene.isSolo === true
  const catFrom = isSolo ? 1 : CAT_FROM
  const top = !isSolo && rows >= YARD_ROWS + TOP_ROWS ? TOP_ROWS : 0
  const w = cols
  // The pixels cover the whole strip, so a pounce can rise above the yard.
  const h = rows * 2
  const px: (Rgb | undefined)[] = new Array(w * h)
  const set = (x: number, y: number, c: Rgb) => {
    if (x >= 0 && y >= 0 && x < w && y < h) px[y * w + x] = c
  }
  const blit = (rowsOf: readonly string[], x0: number, y0: number, colors: Record<string, Rgb>, isMirrored = false) => {
    const width = rowsOf[0]!.length
    rowsOf.forEach((line, sy) => {
      ;[...line].forEach((ch, sx) => {
        const c = colors[ch]
        if (c) set(isMirrored ? x0 + width - 1 - sx : x0 + sx, y0 + sy, c)
      })
    })
  }

  // The reply bubble's place decides the cat's room.
  const replyInner = Math.min(REPLY_MOST, cols - CAT_FROM - CAT_ROOM - 6)
  const hasReply = !isSolo && scene.reply !== undefined && scene.reply.length > 0 && replyInner >= REPLY_LEAST
  const replyLines = hasReply ? wrap(scene.reply!.map(clean), replyInner, rows - 2) : []
  const replyWidth = hasReply ? Math.max(...replyLines.map(l => [...l].length)) + 2 : 0
  const bx = cols - replyWidth - 3
  const catTo = isSolo ? cols - 1 : hasReply ? bx - 3 : Math.min(cols - 1, CAT_FROM + CAT_ROOM + 10)

  // The sky: stars at night, then the sun or the moon, then the mountains
  // in front of them, Psiloritis the tallest, snow-capped in winter.
  const trimY = h - LAWN_PX - WALL_PX - 1
  if (light === 'night') {
    for (let y = 0; y < trimY - 3; y++) {
      for (let x = 0; x < w; x++) {
        if (hash(x, y) < 0.012 && Math.floor(t * 1.5 + hash(y, x) * 9) % 9 !== 0) set(x, y, [214, 214, 236])
      }
    }
  }
  // High by day and night, low behind the mountains at dawn and dusk; past
  // the end of Clawd's bubble, and with no reply bubble, far right, clear
  // of a sleeper's z's.
  const saidEnd = top > 0 && scene.said ? Math.min([...clean(scene.said)].length, catTo - 6) + 5 : 0
  const orbX = hasReply ? Math.max(CAT_FROM, saidEnd + 1, catTo - 8) : isSolo ? cols - 6 : cols - 10
  const orbY = light === 'day' || light === 'night' ? 1 : Math.max(1, trimY - 6)
  const isOrbShown = orbX + 4 < (hasReply ? bx - 1 : cols)
  for (const [dx, dy] of isOrbShown ? ([[1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [3, 1], [0, 2], [1, 2], [2, 2], [3, 2], [1, 3], [2, 3]] as const) : []) {
    // The moon is a crescent: its right side is dark.
    if (light === 'night' && dx >= 2 && dy >= 1 && dy <= 2) continue
    set(orbX + dx, orbY + dy, sky.light)
  }
  const peak = Math.round(cols * 0.58)
  const winter = isWinter(scene.month ?? 6)
  for (let x = 0; x < w; x++) {
    // Never taller than the sky they stand in, less a strip for the stars;
    // the snow is on Psiloritis, its top two pixels however short the strip.
    const height = 2.5 + 1.6 * Math.sin(x * 0.07 + 1) + 1.1 * Math.sin(x * 0.17) + Math.max(0, 7 - Math.abs(x - peak) * 0.42)
    const far = Math.round(Math.min(9, trimY - 3, height))
    const near = Math.round(1.5 + 1.1 * Math.sin(x * 0.11 + 2) + 0.7 * Math.sin(x * 0.29))
    const isSnowy = winter && height >= 6
    for (let k = 1; k <= far; k++) set(x, trimY - k, isSnowy && k > far - 2 ? scale(SNOW, sky.dim) : sky.far)
    for (let k = 1; k <= near; k++) set(x, trimY - k, sky.near)
  }

  // The wall, its window (lit at night) and the lawn, in the hour's light.
  for (let x = 0; x < w; x++) {
    set(x, trimY, scale(TRIM, sky.dim))
    for (let y = trimY + 1; y < h - LAWN_PX; y++) set(x, y, scale(y === h - LAWN_PX - 1 ? WALL_SHADE : WALL, sky.dim))
    for (let y = h - LAWN_PX; y < h; y++) {
      // A light top edge, then lawn with a scatter of darker tufts.
      const tuft = ((x * 73 + y * 151) % 29) % 9 === 0 && y > h - LAWN_PX
      set(x, y, scale(y === h - LAWN_PX ? LAWN_EDGE : tuft ? LAWN_DARK : LAWN, sky.dim))
    }
  }
  // The window sits at the right of the cat's room, clear of the bubble.
  const windowX = Math.max(catFrom, Math.min(cols - 4, catTo - 5))
  for (let x = windowX; x < windowX + 3; x++) for (let y = trimY + 2; y < trimY + 4; y++) set(x, y, light === 'night' || light === 'dusk' ? LAMP : GLASS)

  const feet = h - 1 - FEET_UP
  const shadow = (x0: number, x1: number) => {
    for (let x = x0; x <= x1; x++) for (const y of [feet, feet + 1]) if (y < h && y > h - LAWN_PX) set(x, y, scale(SHADOW, sky.dim))
  }

  // Clawd, on the left; alone, the cat has the yard to himself.
  const said = isSolo ? '' : clean(scene.said ?? '')
  const clawd = clawdLook(mood, t, since, said !== '')
  const clawdTop = feet + 1 - CLAWD_H - clawd.lift
  const clawdX = CLAWD_X + (clawd.dx ?? 0)
  if (!isSolo) {
    shadow(CLAWD_X + 1, CLAWD_X + CLAWD_W - 2)
    for (const p of clawdPixels(clawd.look)) set(clawdX + p.x, clawdTop + p.y, p.c)
  }

  // Manousos, in his room. Petted, he stops to purr (asleep, he purrs on).
  const C = COATS[scene.coat]
  const isPetted = scene.petted !== undefined && scene.petted < PETTING_S
  const isSwatting = isPetted && scene.isSwatted === true
  const cat = scene.isOnKeys ? { ...catAt('nap', t, since, catFrom, catTo) } : catAt(mood, t, since, catFrom, catTo)
  if (isSwatting) Object.assign(cat, { pose: Math.floor((scene.petted ?? 0) * 7) % 2 === 0 ? 'slapA' : 'slapB', lift: 0, isLeft: false })
  else if (isPetted && cat.pose !== 'sleep') Object.assign(cat, { pose: 'purr', lift: 0, isLeft: false, x: cat.x + (cat.pose.startsWith('sit') ? 0 : 3) })
  const sprite = SPRITES[cat.pose]
  const spriteW = sprite[0]!.length
  // Never over Clawd, never off the right edge; never above the strip.
  cat.x = Math.max(catFrom, Math.min(cols - spriteW, cat.x))
  const isAsleep = cat.pose === 'sleep'
  const onKeys = scene.isOnKeys === true && !isPetted
  const catTop = feet + 1 - CAT_H - Math.min(cat.lift, feet + 1 - CAT_H) - (isAsleep ? 1 : 0) - (onKeys ? KEYBOARD_PX - 1 : 0)
  if (scene.isOnKeys) {
    // Your keyboard, a row of keycaps peeking out from under her.
    for (let x = cat.x - 2; x <= cat.x + spriteW; x++) {
      for (let k = 0; k < KEYBOARD_PX; k++) set(x, feet + 1 - k, k === 1 && x % 2 === 0 ? KEYCAP : KEYBOARD)
    }
  } else if (mood === 'nap') {
    // His cushion, the pale blue of the bedsheet in the photo.
    for (let x = cat.x - 1; x <= cat.x + spriteW - 3; x++) {
      const isEnd = x === cat.x - 1 || x === cat.x + spriteW - 3
      set(x, feet, isEnd ? CUSHION_EDGE : CUSHION)
      set(x, feet + 1, CUSHION_EDGE)
    }
  } else shadow(cat.x + 3, cat.x + spriteW - 4)
  // The fishing toy: its string from the rod's tip (Clawd holds the rod; alone,
  // it comes from above), drawn under him, the feather over him.
  const line = (x0: number, y0: number, x1: number, y1: number, c: Rgb) => {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1)
    for (let i = 0; i <= steps; i++) set(Math.round(x0 + ((x1 - x0) * i) / steps), Math.round(y0 + ((y1 - y0) * i) / steps), c)
  }
  const toy = mood === 'play' ? { x: toyX(t, catFrom, catTo) - 1, y: Math.max(2, feet + 1 - CAT_H - 6 + Math.round(Math.sin(t * 5 + 1) * 1.5)) } : undefined
  if (toy) {
    // The tip trails the swing, so the string leans.
    const tipX = toy.x + 1 - Math.round(Math.cos(t * TOY_SWING) * 3)
    if (!isSolo) line(clawdX + CLAWD_W - 1, clawdTop + 1, tipX, 0, ROD)
    line(tipX, 0, toy.x + 1, toy.y, STRING)
  }
  blit(sprite, cat.x, catTop, C, cat.isLeft)
  if (toy) blit(TOY, toy.x, toy.y, TOY_COLORS)

  // The sardine a commit earns, tossed from Clawd's claw to his mouth.
  if (mood === 'feast' && since < TOSS_S) {
    const k = since / TOSS_S
    // Alone, the sardine falls in from the top left.
    const fromX = isSolo ? 0 : clawdX + CLAWD_W + 1
    const fromY = isSolo ? 0 : clawdTop
    const toX = cat.x + 6
    const toY = catTop + 5
    blit(SARDINE, Math.round(fromX + (toX - fromX) * k), Math.round(fromY + (toY - fromY) * k - Math.sin(k * Math.PI) * 7), SARDINE_COLORS)
  }

  // The kittens, running back and forth along the front of the lawn.
  const kittens = Math.min(MOST_KITTENS, Math.max(0, Math.floor(scene.kittens ?? 0)))
  const kittenCoats: Coat[] = ['ginger', 'tuxedo', 'manousos', 'ginger']
  for (let i = 0; i < kittens; i++) {
    const kw = KITTEN.a[0]!.length
    const span = Math.max(1, w - kw - 2)
    const speed = 9 + i * 3
    const lap = (2 * span) / speed
    const k = ((t + i * 1.7) % lap) / lap
    const isRight = k < 0.5
    const x = 1 + Math.round((isRight ? 2 * k : 2 - 2 * k) * span)
    // The sprite faces left; running right, it is mirrored.
    blit(Math.floor(t * 8 + i) % 2 === 0 ? KITTEN.a : KITTEN.b, x, h - KITTEN.a.length, COATS[kittenCoats[i]!], isRight)
  }

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

  // Little marks by his head: z's, a startle, a question, sparkles, hearts.
  const headCol = cat.x + spriteW - 4
  const headRow = Math.floor(catTop / 2)
  const pink: Rgb = [255, 110, 150]
  if (isAsleep) {
    for (let i = 0; i < 3; i++) {
      const q = (t * 0.5 + i / 3) % 1
      over(cat.x + spriteW + Math.round(q * 6), Math.max(0, headRow + 3 - Math.round(q * 4)), q > 0.6 ? 'Z' : 'z', [Math.round(150 + 80 * (1 - q)), Math.round(160 + 70 * (1 - q)), 240])
    }
  } else if (mood === 'tool') {
    if (Math.floor(t * 2) % 2 === 0) over(headCol + 2, Math.max(0, headRow), '!', [255, 210, 80])
  } else if (mood === 'slap') {
    // Stars where the paw lands, while it swipes.
    if (since < SWIPE_S && !isSolo) over(clawdX + CLAWD_W - 1, Math.max(0, Math.floor(clawdTop / 2) + Math.floor(since * 7) % 2), '*', [255, 230, 120])
    over(headCol + 2, Math.max(0, headRow - 1), '!', [255, 90, 90])
  } else if (mood === 'oops' || mood === 'hiss') {
    over(headCol + 2, Math.max(0, headRow - 1), '!', [255, 90, 90])
  } else if (mood === 'wait') {
    if (Math.floor(t * 2) % 2 === 0) over(headCol + 1, Math.max(0, headRow - 1), '?', [255, 220, 120])
  } else if (mood === 'dance') {
    for (let i = 0; i < 3; i++) if (hash(i, Math.floor(t * 6)) > 0.4) over(cat.x - 2 + Math.round(hash(Math.floor(t * 6), i) * (spriteW + 4)), Math.max(0, headRow - 1 + i), '*', [255, 230, 120])
  } else if (mood === 'happy' && !isPetted) {
    text(cat.x + spriteW - 2, Math.max(0, headRow - 1), '<3', pink)
  }
  if (isSwatting) over(cat.x + 1, Math.max(0, headRow), '!', [255, 90, 90])
  else if (isPetted) {
    for (let i = 0; i < 2; i++) {
      const q = ((scene.petted ?? 0) / PETTING_S + i * 0.45) % 1
      text(cat.x + 4 + i * 9, Math.max(0, headRow + 1 - Math.round(q * 3)), '<3', pink)
    }
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
  return words
}
