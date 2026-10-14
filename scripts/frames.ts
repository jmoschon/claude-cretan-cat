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

// Each beat: how long, and the scene apart from its time.
const beats: [number, Omit<Scene, 't' | 'cols' | 'rows'>][] = [
  [2, { mood: 'nap', coat: 'manousos' }],
  [5, { mood: 'think', coat: 'manousos', said: 'Πώς πάει το «checkout tests», Μανούσο;', reply: SONG }],
  [2.5, { mood: 'tool', coat: 'manousos', said: 'Μανούσο, τρέξε την εντολή!', reply: SONG }],
  [3, { mood: 'happy', coat: 'manousos', said: 'Μπράβο Μανούσο! Πάρε μια λιχουδιά.', reply: SONG }],
]

let t = 0
for (const [seconds, scene] of beats) {
  for (let i = 0; i < seconds * FPS; i++) {
    t += 1 / FPS
    console.log(JSON.stringify({ cols: COLS, rows: ROWS, cells: drawCat({ ...scene, t, cols: COLS, rows: ROWS }) }))
  }
}
