// Clawd, the little orange block who keeps Manousos company, as pixels.
//
// Original code written for this project; MIT licensed like the rest of the
// repository. He is built from a handful of rules (a body, four legs, two
// claws, two eyes) rather than stored bitmaps, so every pose, gaze and arm
// combination comes out of the same few lines.
//
// Layout at scale 1, in his 14x8 box (x right, y down), standing:
//
//   y0-1  body, narrow rows   x 2..11
//   y2-4  body, wide rows     x 1..12   (eyes sit on y2-3)
//   y5    body, narrow row    x 2..11
//   y6-7  legs                x 3, 5, 8, 10
//
// Claws hang on his sides at x 0 and x 13. Held out, a claw reaches one more
// pixel past his side, the way a hand pokes out of a sleeve.

type Rgb = [number, number, number]
export type { Rgb }
export type Pixel = { x: number; y: number; c: Rgb }

type ArmPose = 'up' | 'out' | 'down'

export type ClawdLook = {
  pose: 'stand' | 'walk' | 'jump' | 'sit'
  /** Walk frame, 0..3. */
  stride: number
  /** -1 left, 0 ahead, 1 right: where the eyes look and which way feet swing. */
  facing: number
  eyes: 'open' | 'closed' | 'wide'
  /** Eye offset in pixels, a glance. */
  look: { x: number; y: number }
  isBlinking: boolean
  color: Rgb
  eyeColor: Rgb
  /** Whole screen pixels per pixel: 1 gives 14x8, 2 gives 28x16. */
  scale: number
  arms: { left: ArmPose; right: ArmPose }
}

export const CLAWD_W = 14
export const CLAWD_H = 8
export const CLAWD_ORANGE: Rgb = [217, 119, 87]

export const LOOK: ClawdLook = {
  pose: 'stand',
  stride: 0,
  facing: 0,
  eyes: 'open',
  look: { x: 0, y: 0 },
  isBlinking: false,
  color: CLAWD_ORANGE,
  eyeColor: [42, 22, 16],
  scale: 1,
  arms: { left: 'down', right: 'down' },
}

// ---------------------------------------------------------------- shape

const BODY_LEFT = 1
const BODY_RIGHT = 12
const BODY_ROWS = 6
// Rows of the body pulled in by a pixel on each side: the rounded top and
// bottom.
const NARROW_ROWS = new Set([0, 1, 5])
const LEG_XS = [3, 5, 8, 10]
const LEG_LEN = 2
// The left eye's column when looking ahead; the right one is EYE_GAP further.
const EYE_X = 4
const EYE_GAP = 5
const EYE_TOP = 2

// Rows (relative to the top of the body) a claw covers, and how far out it
// reaches beyond its side column.
const ARM: Record<ArmPose, { rows: number[]; reach: number }> = {
  up: { rows: [1, 2], reach: 0 },
  out: { rows: [2], reach: 1 },
  down: { rows: [3, 4], reach: 0 },
}

type Cell = 'body' | 'eye'

// The legs for a pose: which columns, and how many rows each one shows.
function legs(look: ClawdLook): { x: number; len: number }[] {
  switch (look.pose) {
    case 'sit':
      return []
    case 'jump':
      // Tucked up under him mid-air: only the top of each leg shows.
      return LEG_XS.map(x => ({ x, len: 1 }))
    case 'walk': {
      // Two pairs (outer-left with inner-right, and the other two) take turns
      // lifting; a lifted foot swings a pixel the way he faces.
      const frame = ((Math.floor(look.stride) % 4) + 4) % 4
      const lifted = frame === 1 ? [0, 2] : frame === 3 ? [1, 3] : []
      const swing = Math.sign(look.facing)
      return LEG_XS.map((x, i) => (lifted.includes(i) ? { x: x + swing, len: 1 } : { x, len: LEG_LEN }))
    }
    default:
      return LEG_XS.map(x => ({ x, len: LEG_LEN }))
  }
}

// His pixels at scale 1, as a map from "x,y" to what is there.
function cells(look: ClawdLook): Map<string, { x: number; y: number; what: Cell }> {
  const out = new Map<string, { x: number; y: number; what: Cell }>()
  const put = (x: number, y: number, what: Cell) => out.set(`${x},${y}`, { x, y, what })

  // Sitting drops the body onto the ground; otherwise it rests on its legs.
  const top = look.pose === 'sit' ? LEG_LEN : 0

  for (let row = 0; row < BODY_ROWS; row++) {
    const inset = NARROW_ROWS.has(row) ? 1 : 0
    for (let x = BODY_LEFT + inset; x <= BODY_RIGHT - inset; x++) put(x, top + row, 'body')
  }

  for (const leg of legs(look)) {
    for (let i = 0; i < leg.len; i++) put(leg.x, top + BODY_ROWS + i, 'body')
  }

  const claw = (side: -1 | 1, pose: ArmPose) => {
    const edge = side < 0 ? BODY_LEFT - 1 : BODY_RIGHT + 1
    const { rows, reach } = ARM[pose]
    for (const row of rows) {
      for (let r = 0; r <= reach; r++) put(edge + side * r, top + row, 'body')
    }
  }
  claw(-1, look.arms.left)
  claw(1, look.arms.right)

  // Eyes: open is a 1x2 slit, wide a 2x2 square (opening toward his left),
  // closed (or a blink) a 2x1 line on the lower eye row, each stretching
  // outward toward its own side of his face.
  const shut = look.eyes === 'closed' || look.isBlinking
  const wide = !shut && look.eyes === 'wide'
  const facing = Math.sign(look.facing)
  const gx = Math.round(look.look.x)
  const gy = Math.round(look.look.y)
  for (const [base, outward] of [[EYE_X, -1], [EYE_X + EYE_GAP, 1]] as const) {
    const ex = base + facing + gx
    const ey = top + EYE_TOP + gy
    const xs = shut ? [ex, ex + outward] : wide ? [ex - 1, ex] : [ex]
    const ys = shut ? [ey + 1] : [ey, ey + 1]
    for (const x of xs) for (const y of ys) put(x, y, 'eye')
  }
  return out
}

/** Every opaque pixel of Clawd for a look, in his box scaled by look.scale. */
export function clawdPixels(look: ClawdLook): Pixel[] {
  const k = Math.max(1, Math.floor(look.scale))
  const px: Pixel[] = []
  for (const { x, y, what } of cells(look).values()) {
    const c = what === 'eye' ? look.eyeColor : look.color
    for (let dy = 0; dy < k; dy++) for (let dx = 0; dx < k; dx++) px.push({ x: x * k + dx, y: y * k + dy, c })
  }
  return px
}
