import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Cat, Coat, Mood } from '../types'
import { bashKind, isLanguage, LINES, saysFailed, shortTool, topicOf, type Language } from './lines'
import { COATS, drawCat, fit, PETTING_S, replyFits } from './manousos'

const NAME = 'Manousos'
const TICK_MS = 400
const CAPTION_WIDTH = 60
// A fresh mantinada every VERSE_TICKS ticks (~12s) while the cat works.
const VERSE_TICKS = 30

const cat = atom({ plugin: 'cretan-cat', key: 'cat' } as const, {
  mood: 'nap',
  frame: 0,
  tool: null,
  helpers: 0,
  verse: 0,
  asked: null,
  nudge: 0,
  sardines: 0,
  pettedAt: 0,
} as Cat)
const isHidden = atom({ plugin: 'cretan-cat', key: 'isHidden' } as const, false)
const coat = atom({ plugin: 'cretan-cat', key: 'coat' } as const, 'manousos' as Coat)
const isCoat = (v: unknown): v is Coat => typeof v === 'string' && v in COATS

// While Claude thinks, Clawd nudges Manousos about the topic, a new line
// every NUDGE_TICKS ticks (~8s). What he says is in the "language" setting.
const NUDGE_TICKS = 20
let language: Language = 'greek'
// The meow when the work is done or Claude waits for you ("sound" setting).
let isSoundOn = false
const MEOW = 'sounds/meow.wav'
// A tool running this long bores him to sleep.
const BORED_MS = 20_000
// How long a short reaction lasts: dancing, hissing, eating a sardine.
const FLASH_MS = 3_500

// The pixel-art yard (terminal only): a Raster repainted by blit between redraws,
// about 10 frames a second while he works and 3 while he naps.
const FRAME_MS = 100
const STAGE_MOST_COLS = 160
type Stage = {
  requestId: string | undefined
  cols: number
  rows: number
  mood: Mood
  coat: Coat
  said: string | undefined
  reply: string[] | undefined
  // Seconds on the clock when the mood began and when he was last petted
  // (0: never), and the helpers running.
  moodAt: number
  pettedAt: number
  kittens: number
}
const STAGE_START: Stage = {
  requestId: undefined,
  cols: 80,
  rows: 8,
  mood: 'nap',
  coat: 'manousos',
  said: undefined,
  reply: undefined,
  moodAt: 0,
  pettedAt: 0,
  kittens: 0,
}
const stage: Stage = { ...STAGE_START }
// Seconds, as the frame loop last read the clock; a redraw draws that moment.
let seconds = 0
const stageCols = (bodyColumns: number) => Math.min(STAGE_MOST_COLS, bodyColumns)
// He sings while Claude works and again, a fresh couplet, when it is done.
const isSinging = (mood: Mood) => mood === 'think' || mood === 'tool' || mood === 'happy'
// What he answers, by mood: a couplet while he sings, otherwise a short line.
function replyOf(c: Cat): string[] | undefined {
  if (isSinging(c.mood)) return MANTINADES[c.verse % MANTINADES.length]
  const lines = LINES[language]
  const short = { oops: lines.hiss, wait: lines.wait[1], dance: lines.green[1], hiss: lines.red[1], feast: lines.commit[1], bored: lines.bored[1] }
  return c.mood in short ? [short[c.mood as keyof typeof short]] : undefined
}

// The frame to draw at clock time `ms`: the stage, its times, and the local
// hour and month for the light and the season.
function sceneAt(ms: number) {
  const t = ms / 1000
  const local = new Date(ms)
  const petted = stage.pettedAt > 0 ? t - stage.pettedAt : undefined
  return { ...stage, t, since: t - stage.moodAt, petted, hour: local.getHours(), month: local.getMonth() }
}

// Each pose is drawn as a raw block (no backticks inside), cut into its 4 lines.
const pose = (block: string) => block.split('\n').slice(1, 5)

const ASLEEP = [
  pose(String.raw`
          z
   /\_/\_____  Z
  ( -.- )    \
   \_^_/(_)(__)~~`),
  pose(String.raw`
        Z
   /\_/\_____   z
  ( -.- )    \
   \_^_/(_)(__) ~`),
]
const LOAF = [
  pose(String.raw`
   /\_/\
  ( u.u )_____
  /  "  "     \~
 (_____________)`),
  pose(String.raw`
   /\_/\
  ( -.u )_____
  /  "  "     \ ~
 (_____________)`),
]

const BASE_POSES = {
  // Napping drifts between sleeping curled up and chilling as a loaf.
  nap: [...ASLEEP, ...ASLEEP, ...ASLEEP, ...LOAF, ...LOAF],
  think: [
    pose(String.raw`
         /\_/\   .oO
    ,~  ( o.o )
   (    /  ^ )
    \__(_)__(_)`),
    pose(String.raw`
         /\_/\  Oo.
   ~,   ( o.O )
    )   /  ^ )
   (___(_)__(_)`),
  ],
  // Crouch, wiggle, pounce.
  tool: [
    pose(String.raw`

   ~    /\_/\
    \__( O.O )
    (__)__(__)`),
    pose(String.raw`
        /\_/\    !
  ~\___( O.O )=o
     ( ___  /
      )_) )_)`),
  ],
  happy: [
    pose(String.raw`
    /\_/\   <3
   ( ^.^ )
   ==_Y_==
    (")(")~`),
    pose(String.raw`
    /\_/\  <3
   ( ^.^ )   <3
   ==_Y_==
    (")(") ~`),
  ],
  oops: [
    pose(String.raw`
     _/\/\_   /\_/\  !
    /      \ ( O_O )
  ~/  /""\  \/___/
   (_/    \_)`),
  ],
}
// The newer moods borrow the closest pose.
const POSES: Record<Mood, string[][]> = {
  ...BASE_POSES,
  wait: BASE_POSES.happy,
  dance: BASE_POSES.happy,
  hiss: BASE_POSES.oops,
  feast: BASE_POSES.happy,
  bored: BASE_POSES.nap,
}

// Pad every line to the widest pose so the walk offset stays even.
const CAT_WIDTH = Math.max(...Object.values(POSES).flat(2).map(l => l.length)) + 1
const FRAMES = Object.fromEntries(
  Object.entries(POSES).map(([mood, frames]) => [mood, frames.map(f => f.map(l => l.padEnd(CAT_WIDTH)))]),
) as Record<Mood, string[][]>

const CAPTION: Record<Mood, (c: Cat) => string> = {
  nap: () => `${NAME} is napping · /cat hides him · /cat ginger, tuxedo or manousos changes his coat`,
  think: () => `${NAME} is thinking it over`,
  tool: c => `${NAME} is on it: ${shortTool(c.tool ?? 'a tool')}`,
  happy: () => `${NAME} purrs: done!`,
  oops: () => `${NAME} got startled: something went wrong`,
  wait: c =>
    `${NAME} is waiting for you: ${
      c.tool === 'AskUserQuestion' ? "answer Claude's question" : c.tool === 'ExitPlanMode' ? "review Claude's plan" : `answer the ${shortTool(c.tool ?? 'permission')} prompt`
    }`,
  dance: () => `${NAME} dances: the tests passed`,
  hiss: () => `${NAME} hisses: the tests failed`,
  feast: c => `${NAME} got a sardine for the commit (${c.sardines} today)`,
  bored: c => `${NAME} dozed off: ${shortTool(c.tool ?? 'a tool')} is still running`,
}

// Cretan mantinades: fifteen-syllable rhyming couplets, sung while the cat works.
const MANTINADES: [string, string][] = [
  ['Στο πληκτρολόγιο κάθεται, τα bugs τα κυνηγάει,', 'κι όποιο ποντίκι βρει μπροστά, με μια πατιά το φάει.'],
  ['Σιγά σιγά ο κώδικας, σιγά και το πιθάρι,', 'ο βιαστικός ο γάτος μου ποτέ δεν πιάνει ψάρι.'],
  ['Ψάχνω στα logs σαν το βοσκό που χάθηκε τ\' αρνί του,', 'κι όταν το βρει, πώς χαίρεται σαν να \'βρε την ψυχή του.'],
  ['Ψηλά στον Ψηλορείτη μας χιονίζει και φυσάει,', 'κι ο γάτος μέσα στο ζεστό τον κώδικα κοιτάει.'],
  ['Μην κάνεις merge Παρασκευή, το λέει κι η γιαγιά μου,', 'γιατί το Σάββατο θα κλαις, θα λες «αχ, η καρδιά μου».'],
  ['Σκέφτεται ο Μανούσος μου, και μην τον ενοχλείτε,', 'θα φέρει μιαν απάντηση ψηλή σαν Ψηλορείτη.'],
  ['Η λύρα θέλει δοξάρι, κι ο γάτος θέλει χάδι,', 'κι ο κώδικας θέλει δουλειά τη μέρα και το βράδυ.'],
  ['Στις τρεις τη νύχτα μ’ έπιασε το on-call με τρομάρα,', 'κι εγώ στον ύπνο μου ζητώ ρακή και μια κιθάρα.'],
  ['Τα tests μου είναι κάπριτσα, σαν κοπελιά που αλλάζει,', 'κι εκεί που λες πως πέρασε, το build σε κατασφάζει.'],
  ['Έστειλα PR το πρωί κι ακόμα περιμένω,', 'τα γένια μου μακρύνανε, στον καφενέ πηγαίνω.'],
  ['Ρακή μου και ρακάκι μου, σε πίνω να ξεχάσω', 'το force push στο main που ’κανα, πριν τη δουλειά τη χάσω.'],
  ['Μια σύσκεψη, δυο σύσκεψεις, τρεις σύσκεψεις τη μέρα,', 'κι ο κώδικας μου κάθεται και χάσκει στον αέρα.'],
  ['Πάτησε ο Μανούσος μου στο πληκτρολόγιο πάνω,', 'κι έφτιαξε το bug που ’ψαχνα, κι εγώ τη δόξα χάνω.'],
  ['Το Datadog μας ακριβό, σαν τ’ ακριβό χρυσάφι,', 'κι οι logs που δεν διαβάζουμε σαπίζουνε στο ράφι.'],
  ['Σαν μεθυσμένος στο γλεντί, το pod πέφτει και βγαίνει,', 'κι ο Kubernetes το κοιτά και λέει πως υγιαίνει.'],
  ['Το Jira μου έχει tickets σαν τ’ ουρανού τ’ αστέρια,', 'κι εγώ τα κλείνω ένα ένα με δυο μονάχα χέρια.'],
  ['Στο laptop μου δουλεύει, ναι, το ορκίζομαι στη μάνα,', 'μα στην production έπεσε, και χτύπησε καμπάνα.'],
  ['Στο standup λέω «προχωρώ», το ίδιο κάθε μέρα,', 'κι ο ticket μου ’ναι In Progress ώσπου να βάλω βέρα.'],
  ['Βρίζω αυτόν που έγραψε τον κώδικα πριν χρόνια,', 'και το git blame με πρόδωσε, και πέφτουν τα κανόνια.'],
  ['Απ’ τον μπακάλη ζήτησα ρακή και δυο κουλούρια μόνο,', 'κι ήρθε πιο γρήγορα απ’ το build που περιμένω χρόνο.'],
  ['Δυο πράγματα ’ναι δύσκολα σε τούτη τη ζωή μας:', 'το cache και τα ονόματα, κι off-by-one στην αρχή μας.'],
  ['Έτρεξα DELETE χωρίς WHERE μες στην production βάση,', 'και τώρα ψάχνω το backup πριν η ομάδα με πιάσει.'],
]

// A shuffled deck: every couplet plays once before any repeats. The deck is
// seeded from the clock, since the sandbox's Math.random may start the same
// way each session.
let deck: number[] = []
let seed = 0
const random = () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), seed | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

async function nextVerse($: EngineInterface, current: number) {
  if (deck.length === 0) {
    seed ^= (await $.clock.now()) | 0
    deck = MANTINADES.map((_, i) => i)
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1))
      ;[deck[i], deck[j]] = [deck[j]!, deck[i]!]
    }
    // Don't open the new deck with the couplet that closed the last one.
    if (deck[deck.length - 1] === current) deck.unshift(deck.pop()!)
  }
  return deck.pop()!
}

const COLOR: Record<Mood, string> = {
  nap: 'gray',
  think: 'cyan',
  tool: 'yellow',
  happy: 'green',
  oops: 'red',
  wait: 'magenta',
  dance: 'green',
  hiss: 'red',
  feast: 'green',
  bored: 'gray',
}

// The cat paces back and forth while it works: a triangle wave across the pane.
const offset = (mood: Mood, frame: number, columns: number) => {
  if (mood !== 'think' && mood !== 'tool') return 0
  const span = Math.max(0, columns - CAT_WIDTH - CAPTION_WIDTH - 2)
  if (span === 0) return 0
  const step = frame % (span * 2)
  return step <= span ? step : span * 2 - step
}

let settle: { cancel: () => void } | null = null

// The cat is cosmetic: its work never holds up the event it rides on, and
// a failure in it is dropped.
const quietly = async (work: () => Promise<unknown>) => {
  try {
    await work()
  } catch {
    // Nothing to do: the event goes on without the cat.
  }
}

async function setMood($: EngineInterface, mood: Mood, tool: string | null = null) {
  settle?.cancel()
  settle = null
  flash?.cancel()
  flash = null
  current = mood
  const moodAt = (await $.clock.now()) / 1000
  const c = await update($, cat, cur => ({ ...cur, mood, tool }))
  // The frame loop draws from `stage`: move its bubbles with the mood, not a
  // redraw later.
  Object.assign(stage, { mood, moodAt, said: saidOf(c), reply: replyOf(c) })
}

// The mood now, and the timer ending a short reaction, if one is on.
let current: Mood = 'nap'
let flash: { cancel: () => void } | null = null

// A short reaction, then back to what Claude is doing.
async function react($: EngineInterface, mood: Mood) {
  if (!inTurn) return
  await setMood($, mood)
  // A reaction that came in meanwhile, or the turn ending, wins.
  if (!inTurn || current !== mood) return
  flash?.cancel()
  const mine = $.clock.after(FLASH_MS, () => {
    if (flash !== mine) return
    flash = null
    void resume($).catch(() => {})
  })
  flash = mine
}

// Back to waiting on you while a question or permission prompt is open,
// else to the tool still running, else to thinking; outside a turn, nothing.
function resume($: EngineInterface) {
  if (!inTurn) return Promise.resolve()
  const asking = waiting[waiting.length - 1]
  if (asking !== undefined) return setMood($, 'wait', asking)
  const still = running[running.length - 1]
  return still === undefined ? setMood($, 'think') : setMood($, 'tool', still)
}

// What is waiting on you: the tools whose permission prompt is open, and
// the questions and plans Claude has put to you, by tool name.
let waiting: string[] = []
const ASKS_YOU = new Set(['AskUserQuestion', 'ExitPlanMode'])
// Tools that wait on you or on helpers, not on work: never boring.
const NEVER_BORING = new Set([...ASKS_YOU, 'Agent', 'Task', 'Workflow'])
const drop = (list: string[], tool: string) => {
  const at = list.lastIndexOf(tool)
  if (at >= 0) list.splice(at, 1)
}

function meow($: EngineInterface) {
  if (isSoundOn) void $.audio.play({ asset: MEOW }).catch(() => {})
}

// The day's sardines, one per commit, kept across sessions: the count for
// the local date it was last counted on, and the count of all time.
type Tally = { day: string; today: number; total: number }
const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
async function tally($: EngineInterface): Promise<Tally> {
  const saved = (await $.store.get('sardines')) as Partial<Tally> | undefined
  const total = typeof saved?.total === 'number' ? saved.total : 0
  return { day: today(), today: saved?.day === today() && typeof saved.today === 'number' ? saved.today : 0, total }
}
async function eatSardine($: EngineInterface) {
  const was = await tally($)
  const now = { ...was, today: was.today + 1, total: was.total + 1 }
  await $.store.set('sardines', now)
  await update($, cat, c => ({ ...c, sardines: now.today }))
}

async function pet($: EngineInterface) {
  const ms = await $.clock.now()
  stage.pettedAt = ms / 1000
  await update($, cat, c => ({ ...c, pettedAt: ms }))
  // Redraw once the purring is over, so the caption lets go of it.
  $.clock.after(PETTING_S * 1000 + 50, () => void update($, cat, c => ({ ...c, frame: c.frame + 1 })).catch(() => {}))
  const pets = await $.store.get('pets')
  await $.store.set('pets', (typeof pets === 'number' ? pets : 0) + 1)
}

// Whether a main-thread turn is under way, and the tools it has running now
// (by name, the latest last): parallel tools finish in any order.
let inTurn = false
let running: string[] = []
// The calls of each tool still running, so a timer knows its own call.
let live: Record<string, Set<object>> = {}

// What Clawd is saying now, by mood.
function saidOf(c: Cat): string | undefined {
  const lines = LINES[language]
  if (c.mood === 'tool') return lines.tool(c.tool ?? '?')
  if (c.mood === 'happy') return lines.done
  if (c.mood === 'oops') return lines.oops
  if (c.mood === 'wait') return lines.wait[0]
  if (c.mood === 'dance') return lines.green[0]
  if (c.mood === 'hiss') return lines.red[0]
  if (c.mood === 'feast') return lines.commit[0]
  if (c.mood === 'bored') return lines.bored[0]
  if (c.mood !== 'think') return undefined
  if (!c.asked) return lines.vague[c.nudge % lines.vague.length]
  return lines.nudges[c.nudge % lines.nudges.length]!(c.asked)
}

export const register: Register = (on, options) => {
  language = isLanguage(options.language) ? options.language : 'greek'
  isSoundOn = options.sound === 'on'
  Object.assign(stage, STAGE_START)
  inTurn = false
  running = []
  waiting = []
  live = {}
  current = 'nap'
  flash = null
  settle = null
  deck = []

  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'cat', description: `Show or hide ${NAME}; /cat manousos, ginger or tuxedo changes his coat` })
    await quietly(async () => {
      const saved = await $.store.get('coat')
      if (isCoat(saved)) await update($, coat, () => saved)
      const { today: sardines } = await tally($)
      // A new session, or this module reloaded: no turn is known to be under
      // way, so he starts asleep rather than stuck in a mood from before.
      await update($, cat, c => ({ ...c, sardines, mood: 'nap' as Mood, tool: null }))
    })

    let ticks = 0
    $.clock.every(TICK_MS, () => {
      ticks += 1
      void (async () => {
        const c = await read($, cat)
        // Napping only needs a slow breath; skip most ticks to keep redraws cheap.
        if (c.mood === 'nap' && ticks % 4 !== 0) return
        const helpers =
          ticks % 5 === 0
            ? (await $.agent.list()).filter(a => a.status === 'running').length
            : c.helpers
        const working = c.mood === 'think' || c.mood === 'tool'
        const verse = working && ticks % VERSE_TICKS === 0 ? await nextVerse($, c.verse) : c.verse
        const nudge = c.mood === 'think' && ticks % NUDGE_TICKS === 0 ? c.nudge + 1 : c.nudge
        // The terminal's yard animates by blit; only the ASCII cat elsewhere
        // needs a redraw per frame, so skip one that would change nothing else.
        const isQuiet = helpers === c.helpers && verse === c.verse && nudge === c.nudge
        if (isQuiet && stage.requestId !== undefined) return
        await update($, cat, cur => ({ ...cur, frame: cur.frame + 1, helpers, verse, nudge }))
      })().catch(() => {})
    })

    let frames = 0
    $.clock.every(FRAME_MS, () => {
      frames += 1
      const { requestId, cols, rows, mood } = stage
      if (requestId === undefined || (mood === 'nap' && frames % 3 !== 0)) return
      void (async () => {
        seconds = (await $.clock.now()) / 1000
        const cells = drawCat(sceneAt(seconds * 1000))
        await $.ui.blit({ requestId, key: 'manousos', columns: cols, rows, cells })
      })().catch(() => {})
    })

    return next(e)
  })

  // /cat hides or shows him; /cat <coat> changes his coat, kept across sessions.
  on('command.run', { command: 'cat' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()
    if (arg === '') {
      const hidden = await update($, isHidden, h => !h)
      return { text: hidden ? `${NAME} went to hide under the sofa.` : `${NAME} is back.` }
    }
    if (arg === 'stats') {
      const { today: sardines, total } = await tally($)
      const pets = await $.store.get('pets')
      const s = (n: number) => (n === 1 ? '' : 's')
      const petted = typeof pets === 'number' ? pets : 0
      return { text: `${NAME} has had ${sardines} sardine${s(sardines)} today and ${total} in all, one per commit. He has been petted ${petted} time${s(petted)}.` }
    }
    if (isCoat(arg)) {
      await update($, coat, () => arg)
      await update($, isHidden, () => false)
      await $.store.set('coat', arg)
      return { text: `${NAME} is wearing his ${arg} coat now.` }
    }
    return {
      text: `Coats: ${Object.keys(COATS).join(', ')} (/cat <coat>). /cat stats: his sardines and pets. /cat alone hides or shows ${NAME}. Language and sound: /config, "Cretan cat".`,
    }
  })

  // Clawd picks up the prompt's topic; slash commands stay between you and him.
  on('prompt.submit', async ($, e, next) => {
    if (!e.text.trimStart().startsWith('/')) {
      const asked = topicOf(e.text) || null
      await update($, cat, c => ({ ...c, asked, nudge: c.nudge + 1 })).catch(() => {})
    }
    return next(e)
  })

  on('turn.start', async ($, e, next) => {
    inTurn = true
    running = []
    waiting = []
    live = {}
    await quietly(async () => {
      const verse = await nextVerse($, (await read($, cat)).verse)
      await update($, cat, c => ({ ...c, verse }))
      await setMood($, 'think')
    })
    return next(e)
  })

  // Cosmetic only: never await or throw here, so the cat can't block a tool call.
  // He reacts only to the main thread's own turn: not a subagent's tools, nor
  // a tool some plugin calls between turns. Tests make him dance or hiss, a
  // commit earns a sardine, and a long tool bores him to sleep.
  on('tool.call', ($, e, next) => {
    if (e.agentId !== undefined || !inTurn) return next(e)
    running.push(e.tool)
    // A question or a plan for you: he waits on you until it's answered.
    if (ASKS_YOU.has(e.tool)) waiting.push(e.tool)
    if (flash === null) void resume($).catch(() => {})
    // Boredom only for real work, and only while he is on it: not while he
    // waits on you, or for the same tool started again since.
    const call = {}
    const calls = (live[e.tool] ??= new Set())
    calls.add(call)
    const bore = NEVER_BORING.has(e.tool)
      ? undefined
      : $.clock.after(BORED_MS, () => {
          if (current === 'tool' && calls.has(call)) void setMood($, 'bored', e.tool).catch(() => {})
        })
    const done = () => {
      bore?.cancel()
      calls.delete(call)
      drop(running, e.tool)
      drop(waiting, e.tool)
    }
    // A run in the background reports at once, before any test has run.
    const kind = e.tool === 'Bash' && e.run_in_background !== true ? bashKind(e.command) : undefined
    const ran = next(e)
    void ran
      .then(
        async result => {
          done()
          if (!inTurn) return
          // Denied, or rejected at the prompt: nothing ran, nothing to react to.
          const didRun = result.deny === undefined && !/doesn't want to proceed|was rejected/i.test(result.text ?? '')
          if (kind && didRun) {
            // The exit code tells, when it is the command's own; piped on or
            // followed by more (`| tail`, `|| true`), the output has to.
            const hasFailed = result.isError === true || (!kind.isExitTold && saysFailed(result.text ?? ''))
            if (kind.kind === 'tests') return react($, hasFailed ? 'hiss' : 'dance')
            if (!hasFailed) {
              await quietly(() => eatSardine($))
              return react($, 'feast')
            }
          }
          // A reaction plays out; otherwise, back to what Claude is doing.
          if (flash === null) return resume($)
        },
        () => {
          done()
          if (flash === null) return resume($)
        },
      )
      .catch(() => {})
    return ran
  })

  // Claude stops to ask your permission: he sits up and looks at you, until
  // the call goes on (resume, above) or the turn ends.
  // Not awaited: the prompt is shown at once, the cat catches up.
  on('classic.PermissionRequest', ($, e, next) => {
    if (e.agent_id === undefined && inTurn) {
      waiting.push(e.tool_name)
      void setMood($, 'wait', e.tool_name).catch(() => {})
      meow($)
    }
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId !== undefined) return next(e)
    inTurn = false
    running = []
    waiting = []
    live = {}
    await quietly(async () => {
      // Stopped by you (Esc): no fuss, he just curls up again.
      if (e.reason === 'aborted') return setMood($, 'nap')
      const isDone = e.reason === 'answer'
      if (isDone) {
        const verse = await nextVerse($, (await read($, cat)).verse)
        await update($, cat, c => ({ ...c, verse }))
      }
      await setMood($, isDone ? 'happy' : 'oops')
      if (isDone) meow($)
      // Long enough to read the couplet before he curls up again.
      settle = $.clock.after(isDone ? 12000 : 5000, () => void setMood($, 'nap').catch(() => {}))
    })
    return next(e)
  })

  // The band above the prompt. In the terminal: the pixel-art yard, where Clawd
  // tells Manousos what to do and he answers in a bubble, and a caption
  // under it. Elsewhere: the ASCII cat with its caption beside it.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || (await read($, isHidden))) {
      stage.requestId = undefined
      return next(e)
    }

    const { Box, Text, Button } = $.ui.resolve(e)
    const c = await read($, cat)
    const reply = replyOf(c)
    const kittens = c.helpers > 0 ? ` · ${c.helpers} helper${c.helpers === 1 ? '' : 's'} ${'=^.^= '.repeat(Math.min(c.helpers, 5))}` : ''
    // The clock now (the frame loop's last reading, if the clock won't say).
    const now = await $.clock.now().catch(() => seconds * 1000)
    const isPetted = c.pettedAt > 0 && now - c.pettedAt < PETTING_S * 1000
    const caption = (isPetted ? `${NAME} purrs <3` : CAPTION[c.mood](c)) + kittens
    // Petting: a click on it, or p while the band has the focus.
    const petting = (
      <Button key="pet" plain hotkey="p" dimColor onPress={() => void pet($).catch(() => {})}>
        pet
      </Button>
    )

    // The yard, where it fits; on a small terminal, the ASCII cat below.
    const cols = stageCols(e.props.bodyColumns)
    const layout = e.surface === 'terminal' ? fit(cols, e.props.maxRows) : undefined
    if (layout && e.surface === 'terminal') {
      const { Raster } = $.ui.resolve(e)
      const said = saidOf(c)
      Object.assign(stage, {
        requestId: e.requestId,
        mood: c.mood,
        coat: await read($, coat),
        said,
        reply,
        cols,
        rows: layout.rows,
        kittens: c.helpers,
        pettedAt: c.pettedAt / 1000,
      })
      return (
        <Box flexDirection="column">
          <Raster key="manousos" columns={stage.cols} rows={stage.rows} cells={drawCat(sceneAt(now))} />
          {/* No room for Clawd's bubble: his words go under the yard. */}
          {layout.isSaidText && said !== undefined && (
            <Text key="said" wrap="truncate">
              {`Clawd: ${said}`}
            </Text>
          )}
          <Box key="under" flexDirection="row">
            {petting}
            <Text key="caption" dimColor wrap="truncate">
              {`  ${caption}`}
            </Text>
          </Box>
          {/* Too narrow for his bubble: he sings under the yard instead. */}
          {!replyFits(stage.cols) &&
            reply?.map((line, i) => (
              <Text key={`v${i}`} color="magenta" italic wrap="truncate">
                {line}
              </Text>
            ))}
        </Box>
      )
    }

    stage.requestId = undefined
    const frames = FRAMES[c.mood]
    const lines = frames[c.frame % frames.length] ?? frames[0] ?? []
    const pad = ' '.repeat(offset(c.mood, c.frame, e.props.bodyColumns))
    const verse = isSinging(c.mood) ? reply : undefined
    return (
      <Box flexDirection="row">
        <Box flexDirection="column">
          {lines.map((line, i) => (
            <Text key={`l${i}`} color={COLOR[c.mood]}>
              {pad + line}
            </Text>
          ))}
        </Box>
        <Box flexDirection="column" justifyContent="flex-end" marginLeft={1}>
          <Box key="under" flexDirection="row">
            {petting}
            <Text key="caption" dimColor wrap="truncate">
              {`  ${caption}`}
            </Text>
          </Box>
          {verse?.map((line, i) => (
            <Text key={`v${i}`} color="magenta" italic wrap="truncate">
              {line}
            </Text>
          ))}
        </Box>
      </Box>
    )
  })
}
