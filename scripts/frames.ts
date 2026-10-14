// Renders a short scripted scene with the plugin's own drawing code and
// prints it as JSON lines, one frame each: { cols, rows, cells }. Feed it
// to scripts/gif.py to make docs/demo.gif.
//
//   npx tsx scripts/frames.ts > /tmp/frames.jsonl
//   python3 scripts/gif.py /tmp/frames.jsonl docs/demo.gif

import { drawCat, type Scene } from '../hooks/manousos'

const COLS = 110
const ROWS = 11
const FPS = 10
const SONG = ['Σκέφτεται ο Μανούσος μου, και μην τον ενοχλείτε,', 'θα φέρει μιαν απάντηση ψηλή σαν Ψηλορείτη.']

// Each beat: how long, and the scene apart from its times. A morning in
// October, two helpers running for part of it.
const DAY = { coat: 'manousos', hour: 10, month: 9 } as const
const beats: [number, Omit<Scene, 't' | 'since' | 'cols' | 'rows'>][] = [
  [2, { ...DAY, mood: 'nap', hour: 23 }],
  [4, { ...DAY, mood: 'think', kittens: 2, said: 'Πώς πάει το «checkout tests», Μανούσο;', reply: SONG }],
  [2, { ...DAY, mood: 'tool', said: 'Μανούσο, τρέξε την εντολή!', reply: SONG }],
  [2.5, { ...DAY, mood: 'wait', said: 'Ψιτ! Περιμένουμε εσένα!', reply: ['Μιάου! Περιμένω εσένα.'] }],
  [2.5, { ...DAY, mood: 'dance', said: 'Πράσινα τα tests, Μανούσο!', reply: ['Ζήτω! Χορεύω!'] }],
  [3, { ...DAY, mood: 'feast', said: 'Ορίστε μια σαρδέλα, Μανούσο!', reply: ['Ννιάμ! Ευχαριστώ!'] }],
  [3, { ...DAY, mood: 'happy', said: 'Μπράβο Μανούσο! Πάρε μια λιχουδιά.', reply: SONG }],
]

let t = 0
for (const [seconds, scene] of beats) {
  for (let i = 0; i < seconds * FPS; i++) {
    t += 1 / FPS
    console.log(JSON.stringify({ cols: COLS, rows: ROWS, cells: drawCat({ ...scene, t, since: i / FPS, cols: COLS, rows: ROWS }) }))
  }
}
