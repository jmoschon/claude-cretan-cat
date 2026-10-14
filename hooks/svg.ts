// The yard as SVG, for surfaces without a Raster (the desktop app): the
// same cells the terminal paints, cell for cell. Each cell is CELL_W by
// CELL_H, two pixels tall as in the terminal: a half block paints its two
// pixels, box-drawing lines are drawn as strokes so the bubbles join up, and
// any other glyph is text over its background. CLEAR is left transparent,
// the surface's own background, as the terminal's default is.

import { CLEAR } from './manousos'

export const CELL_W = 8
export const CELL_H = 16
// What an Svg element takes, in characters.
export const SVG_MOST = 131072

const luma = (c: number) => 0.299 * ((c >> 16) & 255) + 0.587 * ((c >> 8) & 255) + 0.114 * (c & 255)
// A pale mark over a pale sky inks dark, as the terminal's do over the wall.
const INK = 0x3c3e54
const hex = (c: number) => '#' + c.toString(16).padStart(6, '0')
const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Box-drawing glyphs: which sides of the cell each joins (up, right, down,
// left), and whether its corner is rounded.
const BOX: Record<string, { u?: 1; r?: 1; d?: 1; l?: 1; round?: 1 }> = {
  '─': { l: 1, r: 1 },
  '│': { u: 1, d: 1 },
  '╭': { r: 1, d: 1, round: 1 },
  '╮': { l: 1, d: 1, round: 1 },
  '╰': { u: 1, r: 1, round: 1 },
  '╯': { u: 1, l: 1, round: 1 },
  '┤': { u: 1, d: 1, l: 1 },
  '├': { u: 1, d: 1, r: 1 },
  '┬': { l: 1, r: 1, d: 1 },
  '┴': { l: 1, r: 1, u: 1 },
}

function boxPath(ch: string, x: number, y: number): string {
  const b = BOX[ch]!
  const cx = x + CELL_W / 2
  const cy = y + CELL_H / 2
  if (b.round) {
    // From the one side to the other, curving through the centre.
    const [ax, ay] = b.u ? [cx, y] : [cx, y + CELL_H]
    const [ex, ey] = b.l ? [x, cy] : [x + CELL_W, cy]
    return `M${ax} ${ay}Q${cx} ${cy} ${ex} ${ey}`
  }
  let d = ''
  if (b.l || b.r) d += `M${b.l ? x : cx} ${cy}H${b.r ? x + CELL_W : cx}`
  if (b.u || b.d) d += `M${cx} ${b.u ? y : cy}V${b.d ? y + CELL_H : cy}`
  return d
}

// `sky`: the color behind everything, where the terminal shows its own.
export function cellsToSvg(words: Uint32Array, cols: number, rows: number, sky?: number): string {
  const W = cols * CELL_W
  const H = rows * CELL_H
  const half = CELL_H / 2
  // Pixel rows (two a cell), each a list of colors (CLEAR: none).
  const pixels: number[][] = Array.from({ length: rows * 2 }, () => new Array<number>(cols).fill(CLEAR))
  const strokes = new Map<number, string>()
  const glyphs: { row: number; col: number; ch: string; fg: number }[] = []
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const at = (row * cols + col) * 3
      const ch = String.fromCodePoint(words[at]!)
      const fg = words[at + 1]!
      const bg = words[at + 2]!
      const [top, bottom] = ch === '▀' ? [fg, bg] : ch === '▄' ? [bg, fg] : [bg, bg]
      pixels[row * 2]![col] = top
      pixels[row * 2 + 1]![col] = bottom
      if (ch === '▀' || ch === '▄' || ch === ' ') continue
      if (fg === CLEAR) continue
      const behind = bg !== CLEAR ? bg : sky
      const ink = behind !== undefined && luma(behind) > 150 && luma(fg) > 180 ? INK : fg
      // A bubble's tail out over a pale sky inks dark too.
      if (BOX[ch]) strokes.set(ink, (strokes.get(ink) ?? '') + boxPath(ch, col * CELL_W, row * CELL_H))
      else glyphs.push({ row, col, ch, fg: ink })
    }
  }
  // Runs of one color along each pixel row, one path per color.
  const fills = new Map<number, string>()
  pixels.forEach((line, y) => {
    let col = 0
    while (col < cols) {
      const c = line[col]!
      let end = col + 1
      while (end < cols && line[end] === c) end++
      if (c !== CLEAR) fills.set(c, (fills.get(c) ?? '') + `M${col * CELL_W} ${y * half}h${(end - col) * CELL_W}v${half}h${-(end - col) * CELL_W}z`)
      col = end
    }
  })
  const out: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`,
    ...(sky === undefined ? [] : [`<rect width="${W}" height="${H}" fill="${hex(sky)}"/>`]),
    `<g shape-rendering="crispEdges">`,
  ]
  for (const [c, d] of fills) out.push(`<path fill="${hex(c)}" d="${d}"/>`)
  out.push(`</g><g fill="none" stroke-width="1.5" stroke-linecap="square">`)
  for (const [c, d] of strokes) out.push(`<path stroke="${hex(c)}" d="${d}"/>`)
  out.push(`</g><g font-family="ui-monospace,SFMono-Regular,Menlo,Consolas,monospace" font-size="13" text-anchor="middle">`)
  // Runs of glyphs of one color along a row, each glyph at its own cell.
  let i = 0
  while (i < glyphs.length) {
    const g = glyphs[i]!
    let j = i + 1
    while (j < glyphs.length && glyphs[j]!.row === g.row && glyphs[j]!.fg === g.fg && glyphs[j]!.col === glyphs[j - 1]!.col + 1) j++
    const run = glyphs.slice(i, j)
    const xs = run.map(r => r.col * CELL_W + CELL_W / 2).join(' ')
    out.push(`<text fill="${hex(g.fg)}" x="${xs}" y="${g.row * CELL_H + 12}">${escape(run.map(r => r.ch).join(''))}</text>`)
    i = j
  }
  out.push('</g></svg>')
  return out.join('')
}
