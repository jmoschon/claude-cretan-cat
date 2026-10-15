import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, RenderNode } from 'claude-code'

import type { Cat, Coat, Mood, Place } from '../types'
import { bashKind, languageOf, LANGUAGES, LINES, NAME_MOST, catNameOf, saysFailed, shortTool, topicOf, type Language, type Name } from './lines'
import { COATS, drawCat, drawCells, fit, PETTING_S, replyFits, skyAt, soloFit, type Scene } from './manousos'
import { base64, cellsOf, drawHd, sameWords, type Overlay } from './hd'
import { cellsToSvg, SVG_MOST } from './svg'
import { isSongLanguage, SONG_LANGUAGES, SONGS, type SongLanguage } from './songs'
import { AI_VERSE, aiNudge, aiPrompt, aiRetort, aiShrug, aiSong, aiStatsLine, aiTurnEnd, aiTurnStart, DAILY_CAP, factsOf, forgetAi, noteCommit, notePet, noteTest, noteTool, resetAi, stopAi, takeAiSong, type AiSetup } from './ai'

// The cat's name ("name" setting, Manousos unless you pick one), what it
// sings ("songs"), and whether it has a temper ("temper").
let catName: Name = catNameOf(undefined)
const name = () => catName.latin
let songLanguage: SongLanguage = 'greek'
const songs = () => SONGS[songLanguage]
let isTempered = false
// With a temper: the chance a nudge from Clawd earns a slap, or a snub; that
// a pet earns a swat; and that a turn starts with the cat on your keyboard.
const TEMPER = { slap: 0.3, snub: 0.3, keys: 0.2, refuse: 0.35 }
// What it types, lying on your keyboard, into Clawd's bubble.
// What Clawd says, and the cat's short replies, in the "language" setting.
const linesOf = () => LINES[language](catName)

// The settings /cat can change. A /cat command writes the /config row where
// it can; where it can't, it keeps the value in the store, with the /config
// value it was set over. Whichever changed last wins: a /config value that
// has changed since replaces the command's.
const FIELDS = ['name', 'coat', 'language', 'songs', 'temper', 'sound', 'resolution', 'place', 'hints', 'ai'] as const
type Field = (typeof FIELDS)[number]
type Override = { value: string; over: unknown }
let fromConfig: Partial<Record<Field, unknown>> = {}
function apply(field: Field, value: unknown) {
  if (field === 'name') catName = catNameOf(value)
  if (field === 'language') language = languageOf(value) ?? 'greek'
  if (field === 'songs') {
    const next = isSongLanguage(value) ? value : 'greek'
    if (next !== songLanguage) deck = []
    songLanguage = next
  }
  if (field === 'temper') isTempered = value === 'on'
  if (field === 'sound') isSoundOn = value === 'on'
  if (field === 'resolution') resolution = value === 'high' ? 'high' : 'low'
  if (field === 'coat') wears = isCoat(value) ? value : 'manousos'
  if (field === 'place') lives = isPlace(value) ? value : 'band'
  if (field === 'hints') hasHints = value !== 'off'
  // Songs and lines written for each prompt (ai.ts); they were written for
  // the old name, languages and temper, so a change to those forgets them.
  if (field === 'ai') isAiOn = value === 'on'
  if (AI_FIELDS.has(field)) forgetAi()
}
let isAiOn = false
const AI_FIELDS: ReadonlySet<Field> = new Set(['name', 'language', 'songs', 'temper', 'ai'])
const aiSetup = (): AiSetup => ({ name: catName, language, songs: songLanguage, isTempered })
// How finely the yard is drawn ("resolution" setting): low, two pixels a
// cell; high, a picture (hd.ts) where the terminal shows pictures.
type Resolution = 'low' | 'high'
let resolution: Resolution = 'low'
// Whether this terminal shows pictures: kitty or Ghostty, not under a
// multiplexer (tmux, screen, Zellij pass no pictures through), an editor's
// terminal (VS Code, Neovim, Emacs) or ssh, as the environment says; and
// whether it refused one all the same, which holds for the session (until
// /cat resolution high asks again).
let picturesShow: boolean | undefined
let picturesRefused = false
// Why the yard last drew in cells though the resolution is high; what /cat config says.
let hdWhy = 'not drawn yet'
let envSeen = ''
let refusals = 0
async function showsPictures($: EngineInterface): Promise<boolean> {
  if (picturesShow !== undefined) return picturesShow
  try {
    const [tmux, sty, zellij, term, program, kitty, ghostty, nvim, emacs, sshConnection, sshTty] = await Promise.all([
      $.env.get('TMUX'),
      $.env.get('STY'),
      $.env.get('ZELLIJ'),
      $.env.get('TERM'),
      $.env.get('TERM_PROGRAM'),
      $.env.get('KITTY_WINDOW_ID'),
      $.env.get('GHOSTTY_RESOURCES_DIR'),
      $.env.get('NVIM'),
      $.env.get('INSIDE_EMACS'),
      $.env.get('SSH_CONNECTION'),
      $.env.get('SSH_TTY'),
    ])
    const isMultiplexed = !!tmux || !!sty || zellij !== undefined || /^(screen|tmux)/.test(term ?? '') || program === 'tmux'
    const isHosted = nvim !== undefined || emacs !== undefined || program === 'vscode' || !!sshConnection || !!sshTty
    const isKittyProgram = /^(kitty|ghostty)$/i.test(program ?? '')
    // kitty's and Ghostty's own variables leak into what runs inside them, so
    // they count only where no other program says it is the terminal.
    const isKittyLike = term === 'xterm-kitty' || term === 'xterm-ghostty' || isKittyProgram || ((program === undefined || isKittyProgram) && (!!kitty || !!ghostty))
    picturesShow = !isMultiplexed && !isHosted && isKittyLike
    envSeen = [
      `TERM=${term ?? '-'} TERM_PROGRAM=${program ?? '-'}`,
      ...([['GHOSTTY', ghostty], ['KITTY', kitty], ['TMUX', tmux], ['SCREEN', sty], ['ZELLIJ', zellij], ['NVIM', nvim], ['EMACS', emacs], ['SSH', sshConnection ?? sshTty]] as const).filter(([, v]) => v !== undefined).map(([k]) => k),
    ].join(' ')
  } catch {
    picturesShow = false
  }
  return picturesShow
}
// A picture blit refused because the terminal draws the picture's alt, or
// refused for the picture itself (a bad source, a file it cannot read) this
// many times running: back to cells for the session. A refusal for where it
// went (not mounted yet, another size, no surface) is no word on pictures.
const MOST_REFUSALS = 3
const DRAWS_ALT = /\balt\b|placeholder/i
const ABOUT_PLACE = /not mounted|mounted|another size|size|not this plugin|plugin's|no-surface|no surface/i
const ABOUT_PICTURE = /source|decode|read|file|image|picture/i
// Sent at the first frame after a drawing, whatever the picture: no hash is this.
const UNSENT = -1
// At high resolution the yard is repainted every HD_EVERY frames (five a
// second), and only what changed: the picture, a text box, or, when the
// text moved, the whole band once.
const HD_EVERY = 2
const sigOf = (overlays: Overlay[]) => overlays.map(o => `${o.col},${o.row},${o.columns},${o.rows}`).join(' ')
// The most columns an Image takes.
const IMAGE_MOST_COLS = 255
const pictureHash = (rgba: Uint8Array) => {
  const words = new Uint32Array(rgba.buffer, rgba.byteOffset, rgba.byteLength >> 2)
  let h = 0x811c9dc5
  for (let i = 0; i < words.length; i++) h = Math.imul(h ^ words[i]!, 0x01000193)
  return h >>> 0
}
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
// His coat ("coat" setting) and where he lives ("place": the wide yard in
// the band, a small square there, or a pane of his own).
let wears: Coat = 'manousos'
const isCoat = (v: unknown): v is Coat => typeof v === 'string' && Object.hasOwn(COATS, v)
let lives: Place = 'band'
const isPlace = (v: unknown): v is Place => v === 'band' || v === 'small' || v === 'dock'
// The cat's own pane (/cat dock), and the columns it asks the dock for.
const PANE = 'cat'
const DOCK_COLS = 34
// The small square in the band: as wide as his widest pose allows, about as
// tall as the wide yard.
const SMALL_COLS = 30
const SMALL_ROWS = 12

// While Claude thinks, Clawd nudges the cat about the topic, a new line
// every NUDGE_TICKS ticks (~8s). What he says is in the "language" setting.
const NUDGE_TICKS = 20
let language: Language = 'greek'
// His voice ("sound" setting): a happy "mrrp!" when the work is done or a
// sardine comes, a "mew?" when Claude waits for you, a purr when petted, a
// hiss at red tests or with a swat (scripts/sounds.py makes them).
let isSoundOn = false
type Sound = 'happy' | 'mew' | 'purr' | 'hiss' | 'bell'
// At most one sound in SOUND_GAP_MS, the first of a burst: done and a
// sardine back to back make one sound.
const SOUND_GAP_MS = 2_000
let soundAt = -Infinity
let isSounding = false
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
  // The cat alone in his square (/cat small, /cat dock).
  isSolo: boolean
  // At high resolution: where the text boxes are, the picture last sent (by
  // its hash) and each box's cells, as drawn or last blitted.
  hd: { sig: string; picture: number; texts: Uint32Array[] } | undefined
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
  isSolo: false,
  hd: undefined,
}
const stage: Stage = { ...STAGE_START }
// Seconds, as the frame loop last read the clock; a redraw draws that moment.
let seconds = 0
const stageCols = (bodyColumns: number) => Math.min(STAGE_MOST_COLS, bodyColumns)
// He sings while Claude works and again, a fresh couplet, when it is done.
const isSinging = (mood: Mood) => mood === 'think' || mood === 'tool' || mood === 'happy'
// She shows on your keyboard only while nothing needs you: napping,
// thinking, on a tool or dozing. Waiting on you, a failure, tests, a sardine
// or the work being done always show over her.
const KEYS_SHOW = new Set<Mood>(['nap', 'think', 'tool', 'bored'])
const showsKeys = (isOnKeys: boolean, mood: Mood) => isOnKeys && isTempered && KEYS_SHOW.has(mood)

// What the cat answers, by mood: a song while singing, otherwise a short
// line in the "language" setting.
function replyOf(c: Cat): string[] | undefined {
  const lines = linesOf()
  // On your keyboard: what it wants to get off it.
  if (showsKeys(c.isOnKeys, c.mood)) return [lines.asks]
  if (isSinging(c.mood)) return aiSong(c.verse) ?? songs()[Math.max(0, c.verse) % songs().length]
  if (c.mood === 'slap') return [aiRetort(c.nudge) ?? lines.retort[c.nudge % lines.retort.length]!]
  if (c.mood === 'snub' || c.mood === 'sulk' || c.mood === 'butt') return [aiShrug(c.nudge) ?? lines.shrug[c.nudge % lines.shrug.length]!]
  const short = {
    oops: lines.hiss,
    wait: lines.wait[1],
    dance: lines.green[1],
    hiss: lines.red[1],
    feast: lines.commit[1],
    bored: lines.bored[1],
  }
  return c.mood in short ? [short[c.mood as keyof typeof short]] : undefined
}

// The frame to draw at clock time `ms`: the stage, its times, and the local
// hour and month for the light and the season.
function sceneAt(ms: number) {
  const t = ms / 1000
  const local = new Date(ms)
  const petted = stage.pettedAt > 0 ? t - stage.pettedAt : undefined
  const isOnKeys = showsKeys(stage.isOnKeys, stage.mood)
  return { ...stage, isOnKeys, t, since: t - stage.moodAt, petted, hour: local.getHours(), month: local.getMonth() }
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
  play: BASE_POSES.slap,
  sulk: BASE_POSES.snub,
  butt: BASE_POSES.snub,
}

// Pad every line to the widest pose so the walk offset stays even.
const CAT_WIDTH = Math.max(...Object.values(POSES).flat(2).map(l => l.length)) + 1
const FRAMES = Object.fromEntries(
  Object.entries(POSES).map(([mood, frames]) => [mood, frames.map(f => f.map(l => l.padEnd(CAT_WIDTH)))]),
) as Record<Mood, string[][]>

// Whether the napping caption carries the /cat tips ("hints" setting).
let hasHints = true
const CAPTION: Record<Mood, (c: Cat) => string> = {
  nap: () => `${name()} is napping${hasHints ? ' · /cat help · /cat hide · /cat asturias, jamona or manousos swaps the cat' : ''}`,
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
  feast: c => (fedFor === 'treat' ? `${name()} got a treat from you` : `${name()} got a sardine for ${fedFor === 'commit' ? 'the commit' : 'the work'} (${c.sardines} today)`),
  bored: c => `${name()} dozed off: ${shortTool(c.tool ?? 'a tool')} is still running`,
  slap: () => `${name()} slapped Clawd for nagging`,
  snub: () => `${name()} is ignoring Clawd`,
  play: () => `${name()} is chasing the fishing toy`,
  sulk: () => `${name()} doesn't feel like playing`,
  butt: () => `${name()} turned around: all you get is the butt`,
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
  // A song written for this turn's prompt goes first, once.
  if (takeAiSong()) return AI_VERSE
  if (deck.length === 0) {
    seed ^= (await $.clock.now()) | 0
    deck = songs().map((_, i) => i)
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
  play: 'cyan',
  sulk: 'gray',
  butt: 'red',
}

// Outside the terminal the ASCII cat wears his coat's color while calm; a
// reaction (done, startled, waiting, tests, a sardine) shows in its own.
const COAT_TINT: Record<Coat, string> = { manousos: '#967a6a', ginger: '#e88c3e', tuxedo: '#c4c4ca', tabby: '#a8a296' }
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
let fedFor: 'commit' | 'work' | 'treat' = 'commit'
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

function sound($: EngineInterface, which: Sound) {
  // The mew tells you Claude is waiting: it always plays, whatever just did.
  const isUrgent = which === 'mew'
  if (!isSoundOn || (isSounding && !isUrgent)) return
  isSounding = true
  void (async () => {
    const now = await $.clock.now()
    if (!isUrgent && now - soundAt < SOUND_GAP_MS) return
    soundAt = now
    void $.audio.play({ asset: `sounds/${which}.wav` }).catch(() => {})
  })()
    .catch(() => {})
    .finally(() => {
      isSounding = false
    })
}

// The day's sardines, one per commit or per finished turn that did some
// work (not both for the same turn), kept across sessions: the count for
// the local date it was last counted on, and the count of all time.
// Sardines: today's, all of them, the best day, and the last week's, day by day.
type Tally = { day: string; today: number; total: number; best: number; bestDay: string; days: Record<string, number> }
const dateOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const today = () => dateOf(new Date())
// The last seven days, oldest first, today last.
const lastWeek = () =>
  Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d
  })
async function tally($: EngineInterface): Promise<Tally> {
  const saved = (await $.store.get('sardines')) as Partial<Tally> | undefined
  const total = typeof saved?.total === 'number' ? saved.total : 0
  const todays = saved?.day === today() && typeof saved.today === 'number' ? saved.today : 0
  const days = { ...(typeof saved?.days === 'object' && saved.days !== null ? saved.days : {}) }
  // Kept from before days were counted: the last day it ate is still known.
  if (typeof saved?.day === 'string' && typeof saved.today === 'number' && days[saved.day] === undefined) days[saved.day] = saved.today
  const best = typeof saved?.best === 'number' ? saved.best : Math.max(0, ...Object.values(days))
  const bestDay = typeof saved?.bestDay === 'string' ? saved.bestDay : (Object.entries(days).find(([, n]) => n === best)?.[0] ?? '')
  return { day: today(), today: todays, total, best, bestDay, days }
}
// One at a time, so two commits finishing together both count.
let eating: Promise<unknown> = Promise.resolve()
function eatSardine($: EngineInterface) {
  eating = eating
    .then(async () => {
      const was = await tally($)
      const eaten = was.today + 1
      // Only the last week is drawn, so only the last week is kept.
      const week = new Set(lastWeek().map(dateOf))
      const days = Object.fromEntries(Object.entries({ ...was.days, [was.day]: eaten }).filter(([d]) => week.has(d)))
      const isBest = eaten > was.best
      const now = { ...was, today: eaten, total: was.total + 1, days, best: isBest ? eaten : was.best, bestDay: isBest ? was.day : was.bestDay }
      await $.store.set('sardines', now)
      await update($, cat, c => ({ ...c, sardines: now.today }))
    })
    .catch(() => {})
  return eating
}

// /cat stats, drawn: fish for today, a belly, the week as bars, a rank.
const RANKS: [number, string][] = [
  [0, 'Kitten, no sardine yet'],
  [1, 'Village kitten'],
  [10, 'Courtyard cat'],
  [30, 'Harbour cat of Chania'],
  [100, 'Sardine pirate'],
  [300, 'Captain of the fishing boats'],
  [1000, 'Lord of Psiloritis'],
]
const BELLY: [number, string][] = [
  [0, 'empty, staring at you'],
  [1, 'peckish'],
  [3, 'content'],
  [6, 'round'],
  [10, 'stuffed, purring'],
]
const BELLY_FULL = 10
const BARS = ' ▁▂▃▄▅▆▇█'
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
function statsText(cat: string, t: Tally, pets: number, swats: number): string {
  const s = (n: number) => (n === 1 ? '' : 's')
  const atLeast = <T,>(steps: [number, T][], n: number) => steps.filter(([from]) => n >= from).at(-1)![1]
  const fish = t.today === 0 ? '·' : '🐟'.repeat(Math.min(t.today, BELLY_FULL)) + (t.today > BELLY_FULL ? ` +${t.today - BELLY_FULL}` : '')
  const full = Math.min(t.today, BELLY_FULL)
  const belly = `${'█'.repeat(full)}${'░'.repeat(BELLY_FULL - full)} ${atLeast(BELLY, t.today)}`
  const rank = atLeast(RANKS, t.total)
  const next = RANKS.find(([from]) => from > t.total)
  const week = lastWeek()
  const counts = week.map(d => t.days[dateOf(d)] ?? 0)
  const top = Math.max(1, ...counts)
  const bars = counts.map(n => (n === 0 ? '  ' : BARS[Math.max(1, Math.round((n / top) * 8))]!.repeat(2))).join(' ')
  const labels = week.map(d => WEEKDAYS[d.getDay()]).join(' ')
  const best = t.best === 0 ? '' : ` · best day ${t.best}${t.bestDay === t.day ? ' (today!)' : ` (${t.bestDay})`}`
  const rows: [string, string][] = [
    ['today', `${fish}  ${t.today} sardine${s(t.today)}`],
    ['belly', belly],
    ['in all', `${t.total} sardine${s(t.total)}${best}`],
    ['petted', `${pets} time${s(pets)} ♥${swats > 0 ? ` · swatted you ${swats} time${s(swats)}` : ''}`],
    ['rank', `${rank}${next ? ` (${next[1]} at ${next[0]})` : ''}`],
  ]
  const width = Math.max(...rows.map(([k]) => k.length), 'this week'.length)
  const line = (k: string, v: string) => `  ${k.padEnd(width)}  ${v}`
  return [
    `${cat}'s stats`,
    '',
    ...rows.map(([k, v]) => line(k, v)),
    '',
    line('this week', bars.trimEnd() === '' ? '(nothing yet)' : bars),
    ...(bars.trimEnd() === '' ? [] : [line('', labels)]),
    '',
    'One sardine per commit, or per finished task that used tools.',
  ].join('\n')
}

// Pets the cat; whether it earned a swat instead of a purr.
async function pet($: EngineInterface): Promise<boolean> {
  const ms = await $.clock.now()
  // A cat with a temper may swat the hand that pets it, unless it was on
  // your keyboard asking for exactly that: then it purrs and gets off it.
  const wasOnKeys = (await read($, cat)).isOnKeys
  const isSwatted = !wasOnKeys && isTempered && random() < TEMPER.slap
  sound($, isSwatted ? 'hiss' : 'purr')
  Object.assign(stage, { pettedAt: ms / 1000, isSwatted, isOnKeys: false })
  await update($, cat, c => ({ ...c, pettedAt: ms, isSwatted, isOnKeys: false }))
  // Redraw once the purring is over, so the caption lets go of it.
  $.clock.after(PETTING_S * 1000 + 50, () => void update($, cat, c => ({ ...c, frame: c.frame + 1 })).catch(() => {}))
  const pets = await $.store.get('pets')
  await $.store.set('pets', (typeof pets === 'number' ? pets : 0) + 1)
  await notePet($)
  if (isSwatted) {
    const swats = await $.store.get('swats')
    await $.store.set('swats', (typeof swats === 'number' ? swats : 0) + 1)
  }
  return isSwatted
}

// A moment you give him from the band or /cat: in a turn, a short reaction;
// outside one, the mood for `ms`, then back to his nap.
async function treatTo($: EngineInterface, mood: Mood, ms: number) {
  if (inTurn) return react($, mood)
  await setMood($, mood)
  settle = $.clock.after(ms, () => {
    if (!inTurn) void setMood($, 'nap').catch(() => {})
  })
}
const PLAY_MS = 4_500

// The fishing toy: its bell jingles as it comes out and again mid-chase,
// and he purrs when he gives up on it. With a temper, now and then he won't:
// he curls up away from it, or turns around and shows you the butt.
async function play($: EngineInterface): Promise<Mood> {
  if (isTempered && random() < TEMPER.refuse) {
    const mood: Mood = random() < 0.5 ? 'butt' : 'sulk'
    await treatTo($, mood, FLASH_MS)
    return mood
  }
  sound($, 'bell')
  await treatTo($, 'play', PLAY_MS)
  const ms = inTurn ? FLASH_MS : PLAY_MS
  if (!inTurn) $.clock.after(ms / 2, () => sound($, 'bell'))
  $.clock.after(ms, () => sound($, 'purr'))
  return 'play'
}

// A treat from you: the sardine toss. It isn't one of the day's sardines,
// which are earned by the work.
async function treat($: EngineInterface) {
  fedFor = 'treat'
  sound($, 'happy')
  const treats = await $.store.get('treats')
  await $.store.set('treats', (typeof treats === 'number' ? treats : 0) + 1)
  return treatTo($, 'feast', FLASH_MS)
}

// What a finished Bash call's output says: you rejected it at the prompt;
// it went to the background (it has not finished); a commit went in.
const REJECTED = /^\s*(?:The user doesn't want to proceed|User rejected|.{0,60}tool use was rejected)/i
const BACKGROUND = /running in (?:the )?background|moved to (?:the )?background|backgrounded/i
const COMMITTED = /^\[[^\]\n]+ [0-9a-f]{7,}\]/m

// What Clawd is saying now, by mood.
function saidOf(c: Cat): string | undefined {
  const lines = linesOf()
  if (showsKeys(c.isOnKeys, c.mood)) return lines.offKeys
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
  return aiNudge(c.nudge) ?? lines.nudges[c.nudge % lines.nudges.length]!(c.asked)
}

// Opens the cat's pane: docked beside the transcript in the fullscreen
// layout, above the prompt otherwise. Where nothing draws panes (headless),
// opening and closing it do nothing.
const openPane = ($: EngineInterface) => $.ui.open({ id: PANE, title: name(), columns: DOCK_COLS }).catch(() => undefined)
const closePane = ($: EngineInterface) => $.ui.close({ id: PANE }).catch(() => {})
// The pane's Raster, while it draws one, for the frame loop to let go of on close.
let paneRequestId: string | undefined
const isDocked = async ($: EngineInterface) => (await $.ui.panes()).some(p => p.id === PANE && p.isPlaced)

// Out from under the sofa, into the place he lives.
async function reveal($: EngineInterface) {
  await update($, isHidden, () => false)
  await $.store.set('isHidden', false)
  if (lives === 'dock') await openPane($)
}

// What the caption under the cat says now: petted, on your keyboard, or his
// mood, and the helpers; and the clock it was read at.
async function captionOf($: EngineInterface, c: Cat) {
  const kittens = c.helpers > 0 ? ` · ${c.helpers} helper${c.helpers === 1 ? '' : 's'} ${'=^.^= '.repeat(Math.min(c.helpers, 4))}` : ''
  // The clock now (the frame loop's last reading, if the clock won't say).
  const now = await $.clock.now().catch(() => seconds * 1000)
  const isPetted = c.pettedAt > 0 && now - c.pettedAt < PETTING_S * 1000
  const petted = c.isSwatted ? `${name()} swatted your hand: ${linesOf().swat}` : `${name()} purrs <3`
  const onKeys = `${name()} is on your keyboard: pet (p) to get it back`
  return { caption: (isPetted ? petted : showsKeys(c.isOnKeys, c.mood) ? onKeys : CAPTION[c.mood](c)) + kittens, now }
}

// Points the frame loop at the Raster just drawn (none for an SVG) and
// returns the scene to draw now.
async function stageUp($: EngineInterface, c: Cat, now: number, requestId: string | undefined, cols: number, rows: number, isSolo: boolean): Promise<Scene> {
  Object.assign(stage, {
    requestId,
    mood: c.mood,
    coat: wears,
    said: saidOf(c),
    reply: replyOf(c),
    cols,
    rows,
    kittens: c.helpers,
    pettedAt: c.pettedAt / 1000,
    isSwatted: c.isSwatted,
    isOnKeys: c.isOnKeys,
    isSolo,
  })
  return sceneAt(now)
}

// The yard as the surface draws it, and points the frame loop at it: at high
// resolution where the terminal shows pictures, an Image with its text laid
// over it as Rasters; else a Raster in the terminal, repainted by blit;
// elsewhere the same cells as an SVG, redrawn as the cat's state changes;
// undefined where a surface draws neither.
async function yardOf($: EngineInterface, surface: string, table: ReturnType<EngineInterface['ui']['resolve']>, scene: Scene, alt: string): Promise<RenderNode | undefined> {
  const isTerminal = surface === 'terminal'
  stage.hd = undefined
  refusals = 0
  const isWide = scene.cols > IMAGE_MOST_COLS
  const canPicture = 'Image' in table && 'Raster' in table
  const isHd = isTerminal && resolution === 'high' && !picturesRefused && !isWide && canPicture && (await showsPictures($))
  if (resolution === 'high') {
    if (isHd) hdWhy = ''
    else if (!isTerminal) hdWhy = 'Svg' in table ? `the ${surface} draws an SVG` : `the ${surface} draws the ASCII cat`
    else if (isWide) hdWhy = `the band is wider than a picture can be (${IMAGE_MOST_COLS} columns)`
    else if (picturesRefused) hdWhy = hdWhy || 'the terminal refused the picture'
    else if (!('Image' in table)) hdWhy = 'this terminal surface has no Image element'
    else hdWhy = `pictures not detected (${envSeen})`
  }
  if (isHd && 'Image' in table && 'Raster' in table) {
    const { Box, Image, Raster } = table
    const frame = drawHd(scene)
    stage.hd = { sig: sigOf(frame.overlays), picture: UNSENT, texts: frame.overlays.map(o => o.words) }
    return (
      <Box key="yard" width={scene.cols} height={scene.rows}>
        <Image key="manousos" source={{ rgba: base64(frame.rgba), width: frame.width, height: frame.height }} columns={scene.cols} rows={scene.rows} alt={alt} />
        {frame.overlays.map((o, i) => (
          <Box key={`at${i}`} position="absolute" top={o.row} left={o.col}>
            <Raster key={`text${i}`} columns={o.columns} rows={o.rows} cells={cellsOf(o)} />
          </Box>
        ))}
      </Box>
    )
  }
  if (isTerminal && 'Raster' in table) {
    const { Raster } = table
    return <Raster key="manousos" columns={scene.cols} rows={scene.rows} cells={drawCat(scene)} />
  }
  if ('Svg' in table) {
    const { Svg } = table
    const source = cellsToSvg(drawCells(scene), scene.cols, scene.rows, skyAt(scene.hour ?? 12))
    if (source.length <= SVG_MOST) return <Svg key="manousos" source={source} alt={alt} />
  }
  return undefined
}

// Every /cat command and alias, for the one a typo is closest to.
const COMMANDS = [
  ...['help', 'hide', 'show', 'pet', 'treat', 'play', 'fetch', 'stats', 'config', 'settings', 'hints'],
  ...['name', 'coat', 'language', 'lang', 'songs', 'temper', 'sound', 'resolution', 'ai'],
  ...['band', 'small', 'dock', 'asturias', 'jamona', 'reset', ...Object.keys(COATS)],
]
// The commands that take something after them (/cat name Luna).
const TAKES_VALUE = new Set(['name', 'coat', 'language', 'lang', 'songs', 'temper', 'sound', 'resolution', 'ai', 'hints'])
// How many letters to add, drop or change to turn a into b.
function editDistance(a: string, b: string) {
  let row = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const next = [i]
    for (let j = 1; j <= b.length; j++) next[j] = Math.min(row[j]! + 1, next[j - 1]! + 1, row[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1))
    row = next
  }
  return row[b.length]!
}
// The command `typed` is a slip for: at most two letters off, and fewer
// than it has letters (so "ok" is no "dock"); the first of the closest.
function closest(typed: string): string | undefined {
  let best: { command: string; distance: number } | undefined
  for (const command of COMMANDS) {
    const distance = editDistance(typed, command)
    if (distance <= 2 && distance < typed.length && (best === undefined || distance < best.distance)) best = { command, distance }
  }
  return best?.command
}

// Changes settings: kept in the store first, so they show now and hold even
// if writing /config reloads the plugin midway; then written to their
// /config rows where the plugin can see them. A row locked, or a write
// refused, keeps its /config value. Says what couldn't change.
// `stored` runs once the store holds the changes, before any /config write.
async function changeSettings($: EngineInterface, changes: Partial<Record<Field, string>>, stored?: () => Promise<unknown>): Promise<string[]> {
  const rows = await $.config.list().catch(() => [])
  const rowOf = (field: Field) => rows.find(r => r.key === `cretan-cat.${field}` || (r.provider.plugin === 'cretan-cat' && r.key.endsWith(`.${field}`)))
  const refused: string[] = []
  const fields = (Object.keys(changes) as Field[]).filter(field => {
    const locked = rowOf(field)?.isLocked === true
    if (locked) refused.push(`the ${field} is locked in /config`)
    return !locked
  })
  const overrides = ((await $.store.get('settings')) ?? {}) as Partial<Record<Field, Override>>
  for (const field of fields) {
    overrides[field] = { value: changes[field]!, over: fromConfig[field] }
    apply(field, changes[field])
  }
  await $.store.set('settings', overrides)
  await stored?.()
  for (const field of fields) {
    const row = rowOf(field)
    if (!row) continue
    const { deny } = (await $.config.set({ key: row.key, value: changes[field]! })) as { deny?: string }
    if (deny === undefined) continue
    refused.push(`the ${field}: ${deny}`)
    delete overrides[field]
    apply(field, fromConfig[field])
    await $.store.set('settings', overrides)
  }
  const c = await update($, cat, cur => ({ ...cur, frame: cur.frame + 1 }))
  Object.assign(stage, { said: saidOf(c), reply: replyOf(c) })
  return refused
}

// Up to 1.10 the coat, where he lives and the tips were kept in the store
// alone. Each moves to its setting once, its /config row written where it
// can be (a locked row keeps its value), so a cat in the ginger coat keeps it.
const LEGACY: Record<'coat' | 'place' | 'hints', (saved: unknown) => string | undefined> = {
  coat: saved => (isCoat(saved) ? saved : undefined),
  place: saved => (isPlace(saved) ? saved : undefined),
  hints: saved => (saved === true ? 'on' : saved === false ? 'off' : undefined),
}
async function migrate($: EngineInterface) {
  const changes: Partial<Record<Field, string>> = {}
  const found: string[] = []
  for (const [key, of] of Object.entries(LEGACY) as [keyof typeof LEGACY, (saved: unknown) => string | undefined][]) {
    const saved = await $.store.get(key)
    if (saved === undefined || saved === null) continue
    found.push(key)
    const to = of(saved)
    if (to !== undefined && to !== fromConfig[key]) changes[key] = to
  }
  if (found.length === 0) return
  // The old keys go once the settings hold their values, before /config is
  // written (which may reload the plugin), so this runs only once.
  const forget = () => Promise.all(found.map(key => $.store.delete(key).catch(() => $.store.set(key, null))))
  if (Object.keys(changes).length === 0) await forget()
  else await changeSettings($, changes, forget)
}

export const register: Register = (on, options) => {
  soundAt = -Infinity
  isSounding = false
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
  picturesShow = undefined
  picturesRefused = false
  refusals = 0
  hdWhy = 'not drawn yet'
  envSeen = ''
  resetAi()
  fromConfig = Object.fromEntries(FIELDS.map(field => [field, options[field]]))
  for (const field of FIELDS) apply(field, fromConfig[field])

  on('session.start', async ($, e, next) => {
    // Seed the dice now, not at the first song: unseeded, they roll the same
    // way every session (her first pets were always swats).
    await quietly(async () => {
      seed ^= (await $.clock.now()) | 0
    })
    await $.command.register({ name: 'cat', description: `${name()}, the cat above the prompt: /cat help for name, coat, languages, temper, pet, hide and show` })
    await quietly(async () => {
      // What /cat set where /config couldn't be written, unless /config has
      // changed since.
      const overrides = ((await $.store.get('settings')) ?? {}) as Partial<Record<Field, Override>>
      for (const field of FIELDS) {
        const o = overrides[field]
        if (o && o.over === fromConfig[field]) apply(field, o.value)
        else {
          apply(field, fromConfig[field])
          delete overrides[field]
        }
      }
      await $.store.set('settings', overrides)
      await migrate($)
      // Hidden stays hidden across sessions.
      if ((await $.store.get('isHidden')) === true) await update($, isHidden, () => true)
      // Docked, his pane opens again; moved out of it under /config, it closes.
      if (lives === 'dock' && !(await read($, isHidden))) void openPane($)
      else if (lives !== 'dock' && (await $.ui.panes().catch(() => [])).some(p => p.id === PANE)) void closePane($)
      const { today: sardines } = await tally($)
      // A new session, or this module reloaded: no turn is known to be under
      // way, so he starts asleep rather than stuck in a mood from before, and
      // off your keyboard.
      inTurn = false
      calls = []
      stopFlash()
      current = 'nap'
      currentTool = null
      stage.mood = 'nap'
      stage.isOnKeys = false
      await update($, cat, c => ({ ...c, sardines, mood: 'nap' as Mood, tool: null, isOnKeys: false }))
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
        if (nudge !== c.nudge && isTempered) {
          const roll = random()
          const temper = roll < TEMPER.slap ? 'slap' : roll < TEMPER.slap + TEMPER.snub ? 'snub' : undefined
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
      const { requestId, cols, rows, mood, hd } = stage
      if (requestId === undefined || (mood === 'nap' && frames % 3 !== 0)) return
      if (hd !== undefined && frames % HD_EVERY !== 0 && mood !== 'nap') return
      void (async () => {
        seconds = (await $.clock.now()) / 1000
        if (hd === undefined) {
          const cells = drawCat(sceneAt(seconds * 1000))
          await $.ui.blit({ requestId, key: 'manousos', columns: cols, rows, cells })
          return
        }
        const frame = drawHd(sceneAt(seconds * 1000))
        // The picture first, always on the first frame after a drawing, so a
        // terminal that won't show it says so at once.
        const picture = pictureHash(frame.rgba)
        if (picture !== hd.picture) {
          const source = { rgba: base64(frame.rgba), width: frame.width, height: frame.height }
          const { deny } = await $.ui.blit({ requestId, key: 'manousos', columns: cols, rows, source })
          if (deny === undefined) {
            hd.picture = picture
            refusals = 0
          } else if (DRAWS_ALT.test(deny) || (!ABOUT_PLACE.test(deny) && ABOUT_PICTURE.test(deny) && ++refusals >= MOST_REFUSALS)) {
            // This terminal won't show the picture: cells from now on.
            picturesRefused = true
            hdWhy = `the terminal refused the picture: ${deny}`
            stage.hd = undefined
            $.ui.invalidate('ui.render')
            return
          }
        }
        // A bubble came, went or changed its size: the band is drawn again, once.
        if (sigOf(frame.overlays) !== hd.sig) {
          hd.sig = ''
          $.ui.invalidate('ui.render')
          return
        }
        await Promise.all(
          frame.overlays.map((o, i) => {
            if (sameWords(hd.texts[i], o.words)) return undefined
            hd.texts[i] = o.words
            return $.ui.blit({ requestId, key: `text${i}`, columns: o.columns, rows: o.rows, cells: cellsOf(o) })
          }),
        )
      })().catch(() => {})
    })

    return next(e)
  })

  // /cat hides or shows the cat (or /cat hide, /cat show), kept across
  // sessions; /cat pet pets it; /cat <coat> changes its coat, kept across
  // sessions. /cat name, /cat language, /cat songs and /cat temper change
  // the settings of the same names, the rows /config shows.
  on('command.run', { command: 'cat' }, async ($, e) => {
    const raw = e.args.trim()
    const typed = raw.toLowerCase()
    const [arg = '', ...rest] = typed.split(/\s+/)
    const value = rest.join(' ')
    // One row a line, its columns lined up, so it reads as a list.
    const table = (rows: [string, string][]) => {
      const width = Math.max(...rows.map(([left]) => left.length))
      return rows.map(([left, right]) => `  ${left.padEnd(width)}  ${right}`).join('\n')
    }
    const setting = async (field: Field, to: string, done: string) => {
      const refused = await changeSettings($, { [field]: to })
      return { text: refused.length === 0 ? done : `Couldn't change ${refused.join('; ')}` }
    }
    // A whole cat at once: its coat and its settings. Out from under the sofa
    // first: writing the /config rows may reload the plugin before this
    // command gets any further.
    const becomes = async (settings: Partial<Record<Field, string>>, done: string) => {
      await reveal($)
      const refused = await changeSettings($, settings)
      return { text: refused.length === 0 ? done : `${done} Couldn't change ${refused.join('; ')}` }
    }
    if (arg === 'asturias' && value === '') {
      return becomes({ coat: 'ginger', name: 'Asturias', language: 'spanish', songs: 'spanish', temper: 'on' }, 'Asturias is here now. ¿Qué querés? (/cat manousos brings Manousos back)')
    }
    if (arg === 'jamona' && value === '') {
      return becomes({ coat: 'tabby', name: 'Jamona', language: 'british', songs: 'british', temper: 'off' }, 'Jamona is here now. Splendid, shall we begin? (/cat manousos brings Manousos back)')
    }
    if ((arg === 'manousos' || arg === 'reset') && value === '') {
      return becomes({ coat: 'manousos', name: 'Manousos', language: 'greek', songs: 'greek', temper: 'off' }, 'Manousos is back, as he came: Greek, mantinades, no temper.')
    }
    // Where he lives, and out from under the sofa if he was hiding there.
    if (isPlace(arg) && value === '') {
      const to: Place = arg
      const [wasHidden, was] = [await read($, isHidden), lives]
      if (to !== 'dock') await closePane($)
      await update($, isHidden, () => false)
      await $.store.set('isHidden', false)
      const refused = await changeSettings($, { place: to })
      if (lives === 'dock') await openPane($)
      const out = wasHidden ? `${name()} came out from under the sofa` : ''
      if (refused.length > 0) return { text: `${out === '' ? "Couldn't" : `${out}, but couldn't`} change ${refused.join('; ')}` }
      const and = out === '' ? name() : `${out} and`
      if (to === 'band') return { text: !wasHidden && was === 'band' ? `${name()} already has the whole yard.` : `${and} has the whole yard again.` }
      if (to === 'small') return { text: `${and} curled up in a small square. /cat dock moves it into a pane on the side; /cat band gives back the whole yard.` }
      const where = e.presentation.isFullscreen ? 'docked on the right; drag its edge to resize it' : 'above the prompt (it docks on the right in the fullscreen layout)'
      return { text: `${and} moved into a pane of its own, ${where}. Closing the pane, or /cat band, brings it back to the yard.` }
    }
    if (arg === '' || arg === 'hide' || arg === 'show') {
      if (value !== '') return { text: `/cat ${arg} takes nothing after it.` }
      const hidden = await update($, isHidden, h => (arg === '' ? !h : arg === 'hide'))
      await $.store.set('isHidden', hidden)
      if (hidden) await closePane($)
      else if (lives === 'dock') await openPane($)
      return { text: hidden ? `${name()} went to hide under the sofa, until /cat show.` : `${name()} is back.` }
    }
    if (arg === 'pet') {
      if (await read($, isHidden)) return { text: `${name()} is under the sofa: /cat show brings the cat back to be petted.` }
      const isSwatted = await pet($)
      return { text: isSwatted ? `${name()} swats your hand: ${linesOf().swat}` : `${name()} purrs, eyes closed.` }
    }
    if (arg === 'hints') {
      if (value !== 'on' && value !== 'off') return { text: `Hints are ${hasHints ? 'on' : 'off'}. /cat hints on or off shows or hides the /cat tips under the napping cat.` }
      return setting('hints', value, value === 'on' ? 'The /cat tips are back under the napping cat.' : `Just "${name()} is napping" from now on. /cat hints on brings the tips back.`)
    }
    if ((arg === 'treat' || arg === 'play') && value === '') {
      if (await read($, isHidden)) return { text: `${name()} is under the sofa: /cat show brings the cat back first.` }
      if (arg === 'treat') {
        await treat($)
        return { text: `${name()} catches the sardine and eats it whole.` }
      }
      const did = await play($)
      if (did === 'butt') return { text: `You dangle the fishing toy. ${name()} turns around and shows you the butt.` }
      if (did === 'sulk') return { text: `You dangle the fishing toy. ${name()} curls up and looks the other way.` }
      return { text: `You dangle the fishing toy, and ${name()} goes after it.` }
    }
    if (arg === 'fetch' && value === '') {
      if (await read($, isHidden)) return { text: `${name()} is under the sofa: /cat show brings the cat back first.` }
      if (catName.latin !== 'Jamona') return { text: `${name()} stares at the hairband, unimpressed. Only Jamona fetches those.` }
      sound($, 'bell')
      await treatTo($, 'play', PLAY_MS)
      const ms = inTurn ? FLASH_MS : PLAY_MS
      if (!inTurn) $.clock.after(ms / 2, () => sound($, 'bell'))
      $.clock.after(ms, () => sound($, 'happy'))
      return { text: `You throw the hairband. ¡Dale, dale! Jamona sprints after it and brings it back, tail high. ¡Otra vez, tirala de nuevo!` }
    }
    if (arg === 'stats') {
      const count = (v: unknown) => (typeof v === 'number' ? v : 0)
      const text = statsText(name(), await tally($), count(await $.store.get('pets')), count(await $.store.get('swats')))
      const aiLine = await aiStatsLine($, isAiOn)
      return { text: aiLine === undefined ? text : `${text}\n${aiLine}` }
    }
    if (arg === 'name') {
      // As you typed it, capitals and all; empty, the name it has now.
      const given = raw.slice(raw.search(/\s/) + 1).trim()
      if (rest.length === 0) return { text: `The cat is called ${name()}. /cat name <name> renames it (up to ${NAME_MOST} characters); /cat name Manousos goes back.` }
      if ([...given].length > NAME_MOST) return { text: `That name is too long: up to ${NAME_MOST} characters.` }
      const to = catNameOf(given).latin
      return setting('name', to, `The cat is called ${to} now.`)
    }
    if (arg === 'language' || arg === 'lang') {
      const to = languageOf(value)
      if (!to) return { text: `Clawd speaks ${language}. /cat language ${LANGUAGES.join(', ')} changes it.` }
      return setting('language', to, `Clawd speaks ${to} now.`)
    }
    if (arg === 'songs') {
      const to = isSongLanguage(value) ? value : undefined
      if (!to) return { text: `${name()} sings in ${songLanguage}. /cat songs ${SONG_LANGUAGES.join(', ')} changes it.` }
      return setting('songs', to, `${name()} sings in ${to} now.`)
    }
    if (arg === 'temper') {
      if (value !== 'on' && value !== 'off') return { text: `Temper is ${isTempered ? 'on' : 'off'}. /cat temper on or off changes it.` }
      return setting('temper', value, value === 'on' ? `${name()} has a temper now: nag and it bites back.` : `${name()} is calm again.`)
    }
    if (arg === 'sound') {
      if (value !== 'on' && value !== 'off') return { text: `Sound is ${isSoundOn ? 'on' : 'off'}. /cat sound on or off changes it (it plays on macOS only).` }
      const done = value === 'on' ? `${name()} has a voice now: a happy mrrp when the work is done, a mew when Claude waits for you, a purr when petted.` : `${name()} is quiet again.`
      const said = await setting('sound', value, done)
      if (value === 'on') sound($, 'happy')
      return said
    }
    if (arg === 'ai') {
      if (value !== 'on' && value !== 'off') return { text: `AI songs and lines are ${isAiOn ? 'on' : 'off'}. /cat ai on or off changes it: one small Haiku call a turn, sending only the topic words.` }
      return setting(
        'ai',
        value,
        value === 'on'
          ? `AI songs and lines are on: one small Haiku call a turn (at most ${DAILY_CAP} a day) writes ${name()}'s song and Clawd's nudges. Only the prompt's topic words, cleaned of anything secret, and these settings are sent.`
          : `AI songs and lines are off: the built-in ones, and no model calls.`,
      )
    }
    if (arg === 'resolution') {
      // Asked for again: a terminal that refused a picture gets another try.
      if (value === 'high') {
        picturesRefused = false
        refusals = 0
      }
      if (value !== 'high' && value !== 'low') return { text: `The yard is drawn at ${resolution} resolution. /cat resolution high or low changes it.` }
      return setting(
        'resolution',
        value,
        value === 'high'
          ? `The yard is drawn at high resolution now, where the terminal shows pictures (kitty, Ghostty; not under tmux); elsewhere it stays in cells.`
          : `The yard is drawn in cells again, two pixels a cell.`,
      )
    }
    if ((arg === 'config' || arg === 'settings') && value === '') {
      const rows: [string, string][] = [
        ['name', name()],
        ['coat', wears],
        ['language', language],
        ['songs', songLanguage],
        ['temper', isTempered ? 'on' : 'off'],
        ['sound', isSoundOn ? 'on' : 'off'],
        ['place', lives],
        ['hints', hasHints ? 'on' : 'off'],
        // (ai before resolution, whose row is last: it can run long.)
        ['ai', isAiOn ? 'on' : 'off'],
        ['resolution', resolution === 'high' ? (hdWhy === '' ? 'high (pictures)' : `high, in cells: ${hdWhy}`) : resolution],
      ]
      return { text: `${name()}'s settings\n\n${table(rows)}\n\n/cat help says how to change them; they are under /config, "Cretan cat", too.` }
    }
    // /cat coat <coat>, or a coat alone, ginger, tuxedo or tabby (/cat manousos is the whole cat).
    const look = arg === 'coat' ? value : value === '' ? arg : ''
    if (arg === 'coat' || isCoat(look)) {
      if (!isCoat(look)) return { text: `${name()} is wearing the ${wears} coat. /cat coat ${Object.keys(COATS).join(', ')} changes it.` }
      await reveal($)
      return setting('coat', look, `${name()} is wearing the ${look} coat now.`)
    }
    const help = [
      `${name()}, the cat above the prompt`,
      '',
      table([
        ['/cat name <name>', `what the cat is called (${name()} now)`],
        ['/cat coat <coat>', `the coat: ${Object.keys(COATS).join(', ')} (${wears} now); /cat ginger, tuxedo or tabby too`],
        ['/cat language <language>', `what Clawd speaks: ${LANGUAGES.join(', ')} (${language} now); /cat lang too`],
        ['/cat songs <language>', `what ${name()} sings: ${SONG_LANGUAGES.join(', ')} (${songLanguage} now)`],
        ['/cat temper on|off', `whether ${name()} slaps Clawd, swats you, sits on your keyboard (${isTempered ? 'on' : 'off'} now)`],
        ['/cat sound on|off', `whether ${name()} mrrps, mews, purrs and hisses, on macOS (${isSoundOn ? 'on' : 'off'} now)`],
        ['/cat resolution high|low', `the yard as a fine picture where the terminal shows them (kitty, Ghostty), or in cells (${resolution} now)`],
        ['/cat ai on|off', `songs and nudges written for each prompt: one small Haiku call a turn, only the topic words sent (${isAiOn ? 'on' : 'off'} now)`],
        ['/cat asturias', 'Asturias: ginger, rioplatense Spanish, coplas and a temper'],
        ['/cat jamona', 'Jamona: grey tabby, posh British, prog rock couplets, sweet and cuddly'],
        ['/cat manousos', 'Manousos as he came: brown, Greek, mantinades, no temper (/cat reset too)'],
        ['/cat pet', 'pet the cat (or press pet under the yard)'],
        ['/cat treat', 'toss the cat a sardine (or press treat)'],
        ['/cat play', 'dangle the fishing toy (or press play)'],
        ['/cat fetch', 'throw a hairband for Jamona to fetch (only she plays this game)'],
        ['/cat stats', 'sardines and pets'],
        ['/cat config', 'every setting and what it is now (/cat settings too)'],
        ['/cat hide|show', 'hide the cat, or bring it back (/cat alone toggles)'],
        ['/cat hints on|off', `the /cat tips under the napping cat (${hasHints ? 'on' : 'off'} now)`],
        ['/cat band', `the whole yard above the prompt (${lives} now)`],
        ['/cat small', 'the cat alone in a small square at the right, above the prompt'],
        ['/cat dock', 'the cat in a pane of its own, docked on the right'],
        ['/cat help', 'this list'],
      ]),
      '',
      'The same settings are under /config, "Cretan cat".',
    ].join('\n')
    if (arg === 'help' && value === '') return { text: help }
    // A slip of the keys: the command it is closest to, if one is close.
    const meant = closest(arg)
    if (meant === undefined) return { text: `${name()} doesn't know "/cat ${raw}".\n\n${help}` }
    // What came after it, only for a command that takes something.
    const after = meant === arg || !TAKES_VALUE.has(meant) ? '' : raw.slice(arg.length).trimEnd()
    return { text: `${name()} doesn't know "/cat ${raw}". Did you mean /cat ${meant}${after}?\n\n/cat help lists everything ${name()} does.` }
  })

  // Clawd picks up the prompt's topic; slash commands stay between you and him.
  on('prompt.submit', async ($, e, next) => {
    if (!e.text.trimStart().startsWith('/')) {
      const asked = topicOf(e.text) || null
      await update($, cat, c => ({ ...c, asked, nudge: c.nudge + 1 })).catch(() => {})
      // A real prompt: its turn may have its words written (ai.ts).
      // Only what the person typed at the prompt, between turns: never a
      // channel, a peer, another plugin, a notification or a delivery into
      // a running turn.
      if (e.command === undefined && e.isMeta !== true && e.origin?.kind === 'composer' && e.turnId === undefined) aiPrompt(e.text)
    }
    return next(e)
  })

  on('turn.start', async ($, e, next) => {
    // One model call for the turn, when the "ai" setting is on (ai.ts).
    if (e.agentId === undefined) {
      // A reply that lands once the turn is over is the closing song, if
      // the cat is still at it (the sardine, then the song).
      const onLate = async () => {
        const c = await read($, cat)
        if (inTurn || (c.mood !== 'happy' && c.mood !== 'feast') || !takeAiSong()) return
        const sung = await update($, cat, cur => ({ ...cur, verse: AI_VERSE, frame: cur.frame + 1 }))
        Object.assign(stage, { said: saidOf(sung), reply: replyOf(sung) })
      }
      // What happened so far, as counts (ai.ts says which): petted or
      // swatted in the last ten minutes, today's sardines.
      const facts = async () => {
        const c = await read($, cat)
        const isRecent = c.pettedAt > 0 && (await $.clock.now()) - c.pettedAt < 600_000
        return factsOf($, { sardinesToday: c.sardines, petted: !isRecent ? 'no' : c.isSwatted ? 'swatted' : 'petted' })
      }
      aiTurnStart($, e.turnId, isAiOn, aiSetup(), async () => (await read($, cat)).nudge, onLate, facts, line => $.ui.log(line, { to: 'debug' }))
    }
    turn += 1
    inTurn = true
    calls = []
    didWork = false
    isFed = false
    stopFlash()
    await quietly(async () => {
      const verse = await nextVerse($, (await read($, cat)).verse)
      // Some turns it gets to your keyboard before Claude does.
      const isOnKeys = isTempered && random() < TEMPER.keys
      await update($, cat, c => ({ ...c, verse, isOnKeys }))
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
    noteTool(e.tool)
    didWork = true
    void resume($).catch(() => {})
    if (call.isWaiting) sound($, 'mew')
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
              if (hasFailed) sound($, 'hiss')
              await noteTest($, hasFailed).catch(() => {})
              return react($, hasFailed ? 'hiss' : 'dance')
            }
            // A commit went in if git says so ("[main abc1234] ..."), or if
            // its own exit code says so.
            if (COMMITTED.test(text) || (kind.isExitTold && result.isError !== true)) {
              isFed = true
              fedFor = 'commit'
              noteCommit()
              sound($, 'happy')
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
      sound($, 'mew')
    })
    return answer
  })

  // The session ends: a song still being written is cut (ai.ts).
  on('session.end', ($, e, next) => {
    stopAi()
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId !== undefined) return next(e)
    aiTurnEnd(e.reason, e.durationMs)
    inTurn = false
    calls = []
    stopFlash()
    await quietly(async () => {
      // The work over, the cat gets off your keyboard by itself.
      stage.isOnKeys = false
      await update($, cat, c => (c.isOnKeys ? { ...c, isOnKeys: false } : c))
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
        if (isDone) sound($, 'happy')
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
  // under it; /cat small, the cat alone in a square, the caption beside it.
  // Elsewhere: the same as SVG, or the ASCII cat with its caption beside it.
  // Docked in his own pane, the band is left empty, unless the pane waits
  // undrawn (a terminal too narrow): then he stays in the band, small.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || (await read($, isHidden))) {
      stage.requestId = undefined
      stage.hd = undefined
      return next(e)
    }
    const where = lives
    if (where === 'dock' && (await isDocked($).catch(() => false))) return next(e)

    const table = $.ui.resolve(e)
    const { Box, Text, Button } = table
    const c = await read($, cat)
    const reply = replyOf(c)
    const { caption, now } = await captionOf($, c)
    // Petting: a click on it, or p while the band has the focus.
    const petting = (
      <Button key="pet" plain hotkey="p" dimColor onPress={() => void pet($).catch(() => {})}>
        pet
      </Button>
    )
    const treating = (
      <Button key="treat" plain hotkey="t" dimColor onPress={() => void treat($).catch(() => {})}>
        treat
      </Button>
    )
    const playing = (
      <Button key="play" plain hotkey="y" dimColor onPress={() => void play($).catch(() => {})}>
        play
      </Button>
    )
    const isTerminal = e.surface === 'terminal'
    const requestId = isTerminal ? e.requestId : undefined
    const verse = isSinging(c.mood) ? reply : undefined

    // The small square at the right, its caption and couplet beside it.
    const solo = where === 'band' ? undefined : soloFit(Math.min(SMALL_COLS, e.props.bodyColumns), Math.min(SMALL_ROWS, e.props.maxRows))
    if (solo) {
      const scene = await stageUp($, c, now, requestId, solo.cols, solo.rows, true)
      const yard = await yardOf($, e.surface, table, scene, `${name()} in the yard: ${caption}`)
      if (yard !== undefined) {
        return (
          <Box flexDirection="row" justifyContent="flex-end">
            <Box key="beside" flexDirection="column" justifyContent="flex-end" alignItems="flex-end" flexShrink={1} marginRight={1}>
              <Box key="under" flexDirection="row" gap={2}>
                {petting}
                {treating}
                {playing}
                <Text key="caption" dimColor wrap="truncate">
                  {caption}
                </Text>
              </Box>
              {verse?.map((line, i) => (
                <Text key={`v${i}`} color="magenta" italic wrap="truncate">
                  {line}
                </Text>
              ))}
            </Box>
            {yard}
          </Box>
        )
      }
    }

    // The yard, where it fits; where it doesn't (or a surface draws neither),
    // the ASCII cat below.
    const cols = stageCols(e.props.bodyColumns)
    const layout = where === 'band' && (isTerminal || 'Svg' in table) ? fit(cols, e.props.maxRows) : undefined
    const scene = layout ? await stageUp($, c, now, requestId, cols, layout.rows, false) : undefined
    const yard = scene ? await yardOf($, e.surface, table, scene, `Clawd and ${name()} in the yard: ${caption}`) : undefined
    if (layout && yard !== undefined) {
      const said = stage.said
      return (
        <Box flexDirection="column">
          {yard}
          {/* No room for Clawd's bubble: his words go under the yard. */}
          {layout.isSaidText && said !== undefined && (
            <Text key="said" wrap="truncate">
              {`Clawd: ${said}`}
            </Text>
          )}
          <Box key="under" flexDirection="row" gap={2}>
            {petting}
            {treating}
            {playing}
            <Text key="caption" dimColor wrap="truncate">
              {caption}
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
    stage.hd = undefined
    const tint = isCalm(c.mood) ? COAT_TINT[wears] : COLOR[c.mood]
    const frames = FRAMES[c.mood]
    const lines = frames[c.frame % frames.length] ?? frames[0] ?? []
    const pad = ' '.repeat(offset(c.mood, c.frame, e.props.bodyColumns))
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
          <Box key="under" flexDirection="row" gap={2}>
            {petting}
            {treating}
            {playing}
            <Text key="caption" dimColor wrap="truncate">
              {caption}
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

  // His own pane (/cat dock): the square of yard on top, and under it, with
  // the room a side column has, Clawd's words, the caption and the couplet.
  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const table = $.ui.resolve(e)
    const { Box, Text, Button } = table
    const c = await read($, cat)
    const reply = replyOf(c)
    const { caption, now } = await captionOf($, c)
    const isTerminal = e.surface === 'terminal'
    // Leave rows under the square for the words, where the pane is short.
    const solo = soloFit(e.props.bodyColumns, Math.max(0, e.props.scroll.bodyRows - 6))
    paneRequestId = isTerminal ? e.requestId : undefined
    const scene = solo ? await stageUp($, c, now, paneRequestId, solo.cols, solo.rows, true) : undefined
    const yard = scene ? await yardOf($, e.surface, table, scene, `${name()} in the yard: ${caption}`) : undefined
    if (yard === undefined && stage.requestId === e.requestId) stage.requestId = undefined
    const said = saidOf(c)
    const verse = isSinging(c.mood) ? reply : undefined
    return (
      <Box flexDirection="column">
        {yard ?? (
          <Text key="ascii" color={isCalm(c.mood) ? COAT_TINT[wears] : COLOR[c.mood]}>
            {(FRAMES[c.mood][c.frame % FRAMES[c.mood].length] ?? []).join('\n')}
          </Text>
        )}
        <Box key="buttons" flexDirection="row" gap={2}>
          <Button key="pet" plain hotkey="p" dimColor onPress={() => void pet($).catch(() => {})}>
            pet
          </Button>
          <Button key="treat" plain hotkey="t" dimColor onPress={() => void treat($).catch(() => {})}>
            treat
          </Button>
          <Button key="play" plain hotkey="y" dimColor onPress={() => void play($).catch(() => {})}>
            play
          </Button>
        </Box>
        <Text key="caption" dimColor wrap="wrap">
          {caption}
        </Text>
        {said !== undefined && (
          <Text key="said" wrap="wrap">
            {`Clawd: ${said}`}
          </Text>
        )}
        {verse?.map((line, i) => (
          <Text key={`v${i}`} color="magenta" italic wrap="wrap">
            {line}
          </Text>
        ))}
      </Box>
    )
  })

  // Closed by hand, the pane gives him back to the band he came from.
  on('ui.close', async ($, e, next) => {
    if (e.id !== PANE) return next(e)
    if (paneRequestId !== undefined && stage.requestId === paneRequestId) {
      stage.requestId = undefined
      stage.hd = undefined
    }
    if (e.origin.kind === 'person') {
      await quietly(() => changeSettings($, { place: 'band' }))
    }
    return next(e)
  })
}
