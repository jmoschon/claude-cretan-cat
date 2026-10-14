// The high-resolution demo ("resolution: high"): a short scripted scene
// painted by hooks/hd.ts, printed as JSON lines, one frame each:
// { width, height, rgba, cols, rows, overlays }. The picture is the yard at
// HD_SCALE times the cells' pixels; the overlays are the text cells laid
// over it (the bubbles). Feed it to scripts/gif-hd.py to make docs/demo.gif.
//
//   npx tsx scripts/frames-hd.ts > /tmp/frames-hd.jsonl
//   python3 scripts/gif-hd.py /tmp/frames-hd.jsonl docs/demo.gif

import { base64, cellsOf, drawHd } from '../hooks/hd'
import type { Scene } from '../hooks/manousos'
import { SONGS } from '../hooks/songs'

const COLS = 110
const ROWS = 11
const FPS = 10
const BUGS = SONGS.greek[0]!
const PSILORITIS = SONGS.greek[5]!

// Each beat: how long, and the scene apart from its times. An October day
// from late morning to night, a helper running while he thinks.
const DAY = { coat: 'manousos', hour: 11, month: 9 } as const
const beats: [number, Omit<Scene, 't' | 'since' | 'cols' | 'rows'>][] = [
  [2.4, { ...DAY, mood: 'think', kittens: 1, said: 'Πώς πάει το «checkout tests», Μανούσο;', reply: [...BUGS] }],
  [1.4, { ...DAY, mood: 'tool', said: 'Μανούσο, τρέξε την εντολή!', reply: [...BUGS] }],
  [1.6, { ...DAY, mood: 'dance', said: 'Πράσινα τα tests, Μανούσο!', reply: ['Ζήτω! Χορεύω!'] }],
  [2.4, { ...DAY, mood: 'feast', said: 'Ορίστε μια σαρδέλα, Μανούσο!', reply: ['Ννιάμ! Ευχαριστώ!'] }],
  [2.2, { ...DAY, hour: 19, mood: 'happy', said: 'Μπράβο Μανούσο! Τελειώσαμε.', reply: [...PSILORITIS] }],
  [1.4, { ...DAY, hour: 23, mood: 'nap' }],
]

let t = 0
for (const [seconds, scene] of beats) {
  for (let i = 0; i < Math.round(seconds * FPS); i++) {
    t += 1 / FPS
    const frame = drawHd({ ...scene, t, since: i / FPS, cols: COLS, rows: ROWS })
    console.log(JSON.stringify({ cols: COLS, rows: ROWS, width: frame.width, height: frame.height, rgba: base64(frame.rgba), overlays: frame.overlays.map(o => ({ col: o.col, row: o.row, columns: o.columns, rows: o.rows, cells: cellsOf(o) })) }))
  }
}
