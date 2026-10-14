import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Cat, Coat, Mood } from '../types'
import { CATS, type Persona } from './cats'
import { bashKind, isLanguage, LINES, saysFailed, shortTool, topicOf, type Language } from './lines'
import { COATS, drawCat, fit, PETTING_S, replyFits } from './manousos'

// Who is in the yard, by the coat picked: Manousos, or Asturias.
let who: Persona = CATS.manousos
const name = () => who.name.latin
// What Clawd says, in the language setting, the way this cat is spoken to.
const linesOf = () => (who.dialects?.[language] ?? LINES[language])(who.name)
const TICK_MS = 400
const CAPTION_WIDTH = 60
// A fresh song every VERSE_TICKS ticks (~12s) while the cat works.
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
  isSwatted: false,
  isOnKeys: false,
} as Cat)
const isHidden = atom({ plugin: 'cretan-cat', key: 'isHidden' } as const, false)
const coat = atom({ plugin: 'cretan-cat', key: 'coat' } as const, 'manousos' as Coat)
const isCoat = (v: unknown): v is Coat => typeof v === 'string' && v in COATS
// A new cat brings a new songbook: the deck starts over.
const wear = (c: Coat) => {
  if (CATS[c] !== who) deck = []
  who = CATS[c]
}

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
  isSwatted: boolean
  isOnKeys: boolean
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
  isSwatted: false,
  isOnKeys: false,
  kittens: 0,
}
const stage: Stage = { ...STAGE_START }
// Seconds, as the frame loop last read the clock; a redraw draws that moment.
let seconds = 0
const stageCols = (bodyColumns: number) => Math.min(STAGE_MOST_COLS, bodyColumns)
// He sings while Claude works and again, a fresh couplet, when it is done.
const isSinging = (mood: Mood) => mood === 'think' || mood === 'tool' || mood === 'happy'
// What the cat answers, by mood: a song while singing, otherwise a short
// line, in the cat's own words if it has them.
function replyOf(c: Cat): string[] | undefined {
  if (c.isOnKeys && who.says) return [who.says.asks]
  if (isSinging(c.mood)) return who.songs[c.verse % who.songs.length]
  const lines = linesOf()
  const own = who.says
  if (own && (c.mood === 'slap' || c.mood === 'snub')) return [own[c.mood][c.nudge % own[c.mood].length]!]
  const short = {
    oops: own?.hiss ?? lines.hiss,
    wait: own?.wait ?? lines.wait[1],
    dance: own?.green ?? lines.green[1],
    hiss: own?.red ?? lines.red[1],
    feast: own?.commit ?? lines.commit[1],
    bored: own?.bored ?? lines.bored[1],
  }
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
  slap: [
    pose(String.raw`
    /\_/\   !
 o=( >.< )
   ==_Y_==
    (")(")~`),
    pose(String.raw`
 o  /\_/\   !
  \( >.< )
   ==_Y_==
    (")(")~`),
  ],
  snub: [
    pose(String.raw`
    /\_/\
   ( -.- )  hmpf
   ==_Y_==
    (")(")~`),
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
  nap: () => `${name()} is napping · /cat hide hides ${who.him} · /cat ginger, tuxedo or manousos changes the cat`,
  think: () => `${name()} is thinking it over`,
  tool: c => `${name()} is on it: ${shortTool(c.tool ?? 'a tool')}`,
  happy: () => `${name()} purrs: done!`,
  oops: () => `${name()} got startled: something went wrong`,
  wait: c =>
    `${name()} is waiting for you: ${
      c.tool === 'AskUserQuestion' ? "answer Claude's question" : c.tool === 'ExitPlanMode' ? "review Claude's plan" : `answer the ${shortTool(c.tool ?? 'permission')} prompt`
    }`,
  dance: () => `${name()} dances: the tests passed`,
  hiss: () => `${name()} hisses: the tests failed`,
  feast: c => `${name()} got a sardine for ${fedFor === 'commit' ? 'the commit' : 'the work'} (${c.sardines} today)`,
  bored: c => `${name()} dozed off: ${shortTool(c.tool ?? 'a tool')} is still running`,
  slap: () => `${name()} slapped Clawd for nagging`,
  snub: () => `${name()} is ignoring Clawd`,
}

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
    deck = who.songs.map((_, i) => i)
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
  slap: 'red',
  snub: 'gray',
}

// Outside the terminal the ASCII cat wears his coat's color while calm; a
// reaction (done, startled, waiting, tests, a sardine) shows in its own.
const COAT_TINT: Record<Coat, string> = { manousos: '#967a6a', ginger: '#e88c3e', tuxedo: '#c4c4ca' }
const isCalm = (mood: Mood) => mood === 'nap' || mood === 'think' || mood === 'tool' || mood === 'bored'

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

// Sets the mood, and moves the frame loop's bubbles with it (not a redraw
// later). It ends the wait for the nap after a turn; a short reaction is
// ended by its callers (stopFlash), so that a reaction can set its own mood.
// Setting the mood he is already in changes nothing (a yawn plays once).
async function setMood($: EngineInterface, mood: Mood, tool: string | null = null) {
  settle?.cancel()
  settle = null
  if (current === mood && currentTool === tool) return
  const [was, wasTool] = [current, currentTool]
  current = mood
  currentTool = tool
  try {
    const moodAt = (await $.clock.now()) / 1000
    const c = await update($, cat, cur => ({ ...cur, mood, tool }))
    Object.assign(stage, { mood, moodAt, said: saidOf(c), reply: replyOf(c) })
  } catch (error) {
    // Not shown after all: the next try at this mood must not be skipped.
    if (current === mood && currentTool === tool) [current, currentTool] = [was, wasTool]
    throw error
  }
}

// The mood now, and what it's about; the timer ending a short reaction.
let current: Mood = 'nap'
let currentTool: string | null = null
let flash: { cancel: () => void } | null = null
const stopFlash = () => {
  flash?.cancel()
  flash = null
}

// The main thread's tool calls under way in this turn, each with its
// arguments, whether it waits on you (a question, a plan, an open
// permission prompt) and whether it has run long enough to bore him.
type Call = { tool: string; input: Record<string, unknown>; turn: number; isWaiting: boolean; isBored: boolean }
let calls: Call[] = []
let turn = 0
let inTurn = false
// Whether this turn ran a tool, and whether a sardine already came of it;
// what the last sardine was for.
let didWork = false
let isFed = false
let fedFor: 'commit' | 'work' = 'commit'
const lastOf = (list: Call[], test: (c: Call) => boolean) => {
  for (let i = list.length - 1; i >= 0; i--) if (test(list[i]!)) return list[i]
  return undefined
}
const isLive = (call: Call) => call.turn === turn && calls.includes(call)

// What he does follows from the calls: waiting on you while anything waits
// on you; else on the latest call (asleep, if it bored him); else thinking.
// Outside a turn, or while a short reaction plays, nothing changes.
function resume($: EngineInterface) {
  if (!inTurn || flash !== null) return Promise.resolve()
  const asking = lastOf(calls, c => c.isWaiting)
  if (asking) return setMood($, 'wait', asking.tool)
  const latest = calls[calls.length - 1]
  if (!latest) return setMood($, 'think')
  return setMood($, latest.isBored ? 'bored' : 'tool', latest.tool)
}

// A short reaction, then back to what Claude is doing. While something
// waits on you, waiting wins and the reaction is skipped. The reaction is
// claimed before its mood is set, so nothing resumes over it meanwhile.
async function react($: EngineInterface, mood: Mood) {
  if (!inTurn || calls.some(c => c.isWaiting)) return resume($)
  stopFlash()
  const claim = { cancel: () => {} }
  flash = claim
  try {
    await setMood($, mood)
  } catch {
    // The reaction didn't show: let go of it, so he can resume.
    if (flash === claim) flash = null
    return resume($)
  }
  if (flash !== claim) return
  let timer: { cancel: () => void } | null = null
  const mine = { cancel: () => timer?.cancel() }
  timer = $.clock.after(FLASH_MS, () => {
    if (flash !== mine) return
    flash = null
    void resume($).catch(() => {})
  })
  flash = mine
}

// Questions and plans put to you; tools that wait on you or on helpers, not
// on work, which never bore him. A permission prompt shows a moment after
// it is asked for, unless a settings hook answers it first.
const ASKS_YOU = new Set(['AskUserQuestion', 'ExitPlanMode'])
const NEVER_BORING = new Set([...ASKS_YOU, 'Agent', 'Task', 'Workflow'])
const PROMPT_DELAY_MS = 300

function meow($: EngineInterface) {
  if (isSoundOn) void $.audio.play({ asset: MEOW }).catch(() => {})
}

// The day's sardines, one per commit or per finished turn that did some
// work (not both for the same turn), kept across sessions: the count for
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
// One at a time, so two commits finishing together both count.
let eating: Promise<unknown> = Promise.resolve()
function eatSardine($: EngineInterface) {
  eating = eating
    .then(async () => {
      const was = await tally($)
      const now = { ...was, today: was.today + 1, total: was.total + 1 }
      await $.store.set('sardines', now)
      await update($, cat, c => ({ ...c, sardines: now.today }))
    })
    .catch(() => {})
  return eating
}

// Pets the cat; whether it earned a swat instead of a purr.
async function pet($: EngineInterface): Promise<boolean> {
  const ms = await $.clock.now()
  // A cat with a temper may swat the hand that pets her, unless she was on
  // your keyboard asking for exactly that: then she purrs and gets off it.
  const wasOnKeys = (await read($, cat)).isOnKeys
  const isSwatted = !wasOnKeys && who.says !== undefined && random() < who.temper.slap
  Object.assign(stage, { pettedAt: ms / 1000, isSwatted, isOnKeys: false })
  await update($, cat, c => ({ ...c, pettedAt: ms, isSwatted, isOnKeys: false }))
  // Redraw once the purring is over, so the caption lets go of it.
  $.clock.after(PETTING_S * 1000 + 50, () => void update($, cat, c => ({ ...c, frame: c.frame + 1 })).catch(() => {}))
  const pets = await $.store.get('pets')
  await $.store.set('pets', (typeof pets === 'number' ? pets : 0) + 1)
  return isSwatted
}

// What a finished Bash call's output says: you rejected it at the prompt;
// it went to the background (it has not finished); a commit went in.
const REJECTED = /^\s*(?:The user doesn't want to proceed|User rejected|.{0,60}tool use was rejected)/i
const BACKGROUND = /running in (?:the )?background|moved to (?:the )?background|backgrounded/i
const COMMITTED = /^\[[^\]\n]+ [0-9a-f]{7,}\]/m

// What Clawd is saying now, by mood.
function saidOf(c: Cat): string | undefined {
  const lines = linesOf()
  if (c.isOnKeys && who.says) return who.says.typed[c.nudge % who.says.typed.length]
  if (c.mood === 'slap') return lines.slapped
  if (c.mood === 'snub') return lines.snubbed
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
  calls = []
  didWork = false
  isFed = false
  current = 'nap'
  currentTool = null
  flash = null
  settle = null
  deck = []
  who = CATS.manousos

  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'cat', description: 'Show or hide the cat (/cat hide, /cat show), /cat pet; /cat manousos, tuxedo, or ginger (Asturias) changes the cat' })
    await quietly(async () => {
      const saved = await $.store.get('coat')
      if (isCoat(saved)) {
        await update($, coat, () => saved)
        wear(saved)
      }
      // Hidden stays hidden across sessions, as the coat does.
      if ((await $.store.get('isHidden')) === true) await update($, isHidden, () => true)
      const { today: sardines } = await tally($)
      // A new session, or this module reloaded: no turn is known to be under
      // way, so he starts asleep rather than stuck in a mood from before.
      inTurn = false
      calls = []
      stopFlash()
      current = 'nap'
      currentTool = null
      stage.mood = 'nap'
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
        // A nudge too many: a cat with a temper may slap Clawd, or snub him.
        if (nudge !== c.nudge && who.says !== undefined) {
          const roll = random()
          const temper = roll < who.temper.slap ? 'slap' : roll < who.temper.slap + who.temper.snub ? 'snub' : undefined
          if (temper) {
            await update($, cat, cur => ({ ...cur, nudge }))
            return react($, temper)
          }
        }
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

  // /cat hides or shows the cat (or /cat hide, /cat show), kept across
  // sessions; /cat pet pets it; /cat <coat> changes the cat, kept across
  // sessions (/cat asturias is the ginger coat).
  on('command.run', { command: 'cat' }, async ($, e) => {
    const typed = e.args.trim().toLowerCase()
    const arg = typed === 'asturias' ? 'ginger' : typed
    if (arg === '' || arg === 'hide' || arg === 'show') {
      const hidden = await update($, isHidden, h => (arg === '' ? !h : arg === 'hide'))
      await $.store.set('isHidden', hidden)
      return { text: hidden ? `${name()} went to hide under the sofa, until /cat show.` : `${name()} is back.` }
    }
    if (arg === 'pet') {
      if (await read($, isHidden)) return { text: `${name()} is under the sofa: /cat show brings ${who.him} back to be petted.` }
      const isSwatted = await pet($)
      return { text: isSwatted ? `${name()} swats your hand: ${who.says?.swat ?? ''}` : `${name()} closes ${who.his} eyes and purrs.` }
    }
    if (arg === 'stats') {
      const { today: sardines, total } = await tally($)
      const pets = await $.store.get('pets')
      const s = (n: number) => (n === 1 ? '' : 's')
      const petted = typeof pets === 'number' ? pets : 0
      const He = who.he[0]!.toUpperCase() + who.he.slice(1)
      return { text: `${name()} has had ${sardines} sardine${s(sardines)} today and ${total} in all, one per finished task or commit. ${He} has been petted ${petted} time${s(petted)}.` }
    }
    if (isCoat(arg)) {
      await update($, coat, () => arg)
      await update($, isHidden, () => false)
      await $.store.set('isHidden', false)
      await $.store.set('coat', arg)
      wear(arg)
      // She's no coat of his: she lets you know she's here.
      const says = who.says
      return { text: says ? `${name()} is here now. ${says.wait}` : `${name()} is wearing his ${arg} coat now.` }
    }
    const help = `Coats: ${Object.keys(COATS).join(', ')} (/cat <coat>; ginger is Asturias). /cat pet pets ${who.him} (or press pet under the yard). /cat stats: sardines and pets. /cat hide and /cat show (or /cat alone, to toggle) put ${name()} away and back. Language and sound: /config, "Cretan cat".`
    // /cat help asks for this; anything else is a slip, and says so.
    return { text: arg === 'help' ? help : `${name()} doesn't know "/cat ${typed}". ${help}` }
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
    turn += 1
    inTurn = true
    calls = []
    didWork = false
    isFed = false
    stopFlash()
    await quietly(async () => {
      const verse = await nextVerse($, (await read($, cat)).verse)
      // Some days she gets to your keyboard before Claude does.
      const isOnKeys = who.says !== undefined && random() < who.temper.keys
      await update($, cat, c => ({ ...c, verse, isOnKeys: c.isOnKeys || isOnKeys }))
      await setMood($, 'think')
    })
    return next(e)
  })

  // Cosmetic only: never await or throw here, so the cat can't block a tool call.
  // He reacts only to the main thread's own turn: not a subagent's tools, nor
  // a tool some plugin calls between turns, nor a call left over from a turn
  // that ended. Tests make him dance or hiss, a commit earns a sardine, and a
  // long tool bores him to sleep.
  on('tool.call', ($, e, next) => {
    if (e.agentId !== undefined || !inTurn) return next(e)
    const call: Call = { tool: e.tool, input: e as unknown as Record<string, unknown>, turn, isWaiting: ASKS_YOU.has(e.tool), isBored: false }
    calls.push(call)
    didWork = true
    void resume($).catch(() => {})
    if (call.isWaiting) meow($)
    const bore = NEVER_BORING.has(e.tool)
      ? undefined
      : $.clock.after(BORED_MS, () => {
          if (!isLive(call) || call.isWaiting) return
          call.isBored = true
          void resume($).catch(() => {})
        })
    // A run in the background reports at once, before any test has run.
    let kind: ReturnType<typeof bashKind>
    try {
      kind = e.tool === 'Bash' && e.run_in_background !== true ? bashKind(e.command) : undefined
    } catch {
      kind = undefined
    }
    const settled = () => {
      bore?.cancel()
      const isMine = isLive(call)
      if (isMine) calls = calls.filter(c => c !== call)
      return isMine
    }
    const ran = next(e)
    void ran
      .then(
        async result => {
          if (!settled()) return
          const text = result.text ?? ''
          // Denied, rejected at the prompt, or sent to the background: no
          // test has run and nothing went in yet.
          const didFinish = result.deny === undefined && !REJECTED.test(text) && !BACKGROUND.test(text.slice(0, 300))
          if (kind && didFinish) {
            if (kind.kind === 'tests') {
              // The exit code tells, when it is the command's own; piped on
              // or followed by more (`| tail`, `|| true`), the output has to.
              const hasFailed = result.isError === true || (!kind.isExitTold && saysFailed(text))
              return react($, hasFailed ? 'hiss' : 'dance')
            }
            // A commit went in if git says so ("[main abc1234] ..."), or if
            // its own exit code says so.
            if (COMMITTED.test(text) || (kind.isExitTold && result.isError !== true)) {
              isFed = true
              fedFor = 'commit'
              await eatSardine($)
              return react($, 'feast')
            }
          }
          return resume($)
        },
        () => (settled() ? resume($) : undefined),
      )
      .catch(() => {})
    return ran
  })

  // Claude Code asks your permission for a call: a moment later, unless a
  // settings hook answered it, he sits up and looks at you, until the call
  // goes on. Not awaited: the prompt is never held up by the cat.
  on('classic.PermissionRequest', ($, e, next) => {
    const answer = next(e)
    if (e.agent_id !== undefined || !inTurn) return answer
    const input = (typeof e.tool_input === 'object' && e.tool_input !== null ? e.tool_input : {}) as Record<string, unknown>
    const isSame = (c: Call) => c.tool === e.tool_name && Object.keys(input).every(k => JSON.stringify(c.input[k]) === JSON.stringify(input[k]))
    const call = lastOf(calls, c => isSame(c) && !c.isWaiting) ?? lastOf(calls, c => c.tool === e.tool_name)
    // Questions and plans already wait on you.
    if (!call || ASKS_YOU.has(call.tool)) return answer
    let isAnswered = false
    void Promise.resolve(answer)
      .then(result => {
        if ((result as { decision?: unknown } | undefined)?.decision === undefined) return
        isAnswered = true
        if (call.isWaiting) {
          call.isWaiting = false
          void resume($).catch(() => {})
        }
      })
      .catch(() => {})
    $.clock.after(PROMPT_DELAY_MS, () => {
      if (isAnswered || !isLive(call)) return
      call.isWaiting = true
      stopFlash()
      void resume($).catch(() => {})
      meow($)
    })
    return answer
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId !== undefined) return next(e)
    inTurn = false
    calls = []
    stopFlash()
    await quietly(async () => {
      // Stopped by you (Esc): no fuss, he just curls up again.
      if (e.reason === 'aborted') return setMood($, 'nap')
      const isDone = e.reason === 'answer'
      if (isDone) {
        const verse = await nextVerse($, (await read($, cat)).verse)
        await update($, cat, c => ({ ...c, verse }))
      }
      // A new turn may have begun while this one wrapped up: it wins.
      const ended = turn
      if (inTurn) return
      const wrapUp = async () => {
        // If that can't be shown, he goes back to sleep rather than stay at work.
        await setMood($, isDone ? 'happy' : 'oops').catch(() => setMood($, 'nap'))
        if (isDone) meow($)
        // Long enough to read the couplet before he curls up again, unless a
        // new turn has begun by then.
        if (inTurn || turn !== ended) return
        settle = $.clock.after(isDone ? 12000 : 5000, () => {
          if (!inTurn && turn === ended) void setMood($, 'nap').catch(() => {})
        })
      }
      // Work done, and no commit fed him for it: a sardine first, then the song.
      if (!isDone || !didWork || isFed) return wrapUp()
      isFed = true
      fedFor = 'work'
      await eatSardine($)
      if (inTurn || turn !== ended) return
      await setMood($, 'feast').catch(() => {})
      settle = $.clock.after(FLASH_MS, () => {
        if (!inTurn && turn === ended) void wrapUp().catch(() => {})
      })
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
    const kittens = c.helpers > 0 ? ` · ${c.helpers} helper${c.helpers === 1 ? '' : 's'} ${'=^.^= '.repeat(Math.min(c.helpers, 4))}` : ''
    // The clock now (the frame loop's last reading, if the clock won't say).
    const now = await $.clock.now().catch(() => seconds * 1000)
    const isPetted = c.pettedAt > 0 && now - c.pettedAt < PETTING_S * 1000
    const petted = c.isSwatted ? `${name()} swatted your hand: ${who.says?.swat ?? ''}` : `${name()} purrs <3`
    const onKeys = `${name()} is on your keyboard: pet ${who.him} (p) to get it back`
    const caption = (isPetted ? petted : c.isOnKeys ? onKeys : CAPTION[c.mood](c)) + kittens
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
        isSwatted: c.isSwatted,
        isOnKeys: c.isOnKeys,
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
    const tint = isCalm(c.mood) ? COAT_TINT[await read($, coat)] : COLOR[c.mood]
    const frames = FRAMES[c.mood]
    const lines = frames[c.frame % frames.length] ?? frames[0] ?? []
    const pad = ' '.repeat(offset(c.mood, c.frame, e.props.bodyColumns))
    const verse = isSinging(c.mood) ? reply : undefined
    return (
      <Box flexDirection="row">
        <Box flexDirection="column">
          {lines.map((line, i) => (
            <Text key={`l${i}`} color={tint}>
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
