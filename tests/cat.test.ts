import { describe, expect, mock, test } from 'claude-code/testing'

import { topicOf } from '../hooks/lines'
import { DAILY_CAP, FACT_WORDS, factsOf, greekSongProblem, isNearCopy, MARKED_MANTINADES, MARKED_REWRITE, NEAR_COPY, parseReply, rhymeOf, sanitiseTopic, syllableMarks, syllables, systemPrompt, unmarked, type AiSetup } from '../hooks/ai'
import { SONGS } from '../hooks/songs'
import { drawHd } from '../hooks/hd'
import { HD_SCALE } from '../hooks/hd-sprites'
import { COATS, drawCat, drawCells, skyAt, type Scene } from '../hooks/manousos'
import { cellsToSvg, SVG_MOST } from '../hooks/svg'

const BAND = { component: 'AbovePrompt' } as const
const PROPS = { hasSurvey: false, isWorking: false, maxRows: 20, bodyColumns: 120 } as never
// What /cat keeps for a setting in the store, where no /config row was written.
const kept = (saved: Record<string, unknown>, field: string) => (saved.settings as Record<string, { value: unknown }> | undefined)?.[field]?.value

describe('cretan-cat', () => {
  test('naps above the prompt until Claude starts working', async $ => {
    for (const surface of ['terminal', 'desktop'] as const) {
      const ui = await $.ui.mount({ plugin: 'cretan-cat', surface, ...BAND, props: PROPS })
      expect(await ui.find({ type: 'Text', text: /napping/ })).toBeDefined()
      // The caption tells you how to hide him and change his coat.
      expect(await ui.find({ type: 'Text', text: /\/cat asturias or manousos swaps the cat/ })).toBeDefined()
      expect(await ui.find({ type: 'Text', text: /γάτος|κώδικα|Μανούσος/ })).toBeUndefined()
      await ui.unmount()
    }
  })

  test('draws the pixel-art yard: a Raster in the terminal, the same yard as SVG on the desktop', async $ => {
    const term = await $.ui.mount({ plugin: 'cretan-cat', surface: 'terminal', ...BAND, props: PROPS })
    expect(await term.find({ type: 'Raster' })).toBeDefined()
    await term.unmount()
    const desk = await $.ui.mount({ plugin: 'cretan-cat', surface: 'desktop', ...BAND, props: PROPS })
    expect(await desk.find({ type: 'Raster' })).toBeUndefined()
    const svg = (await desk.find({ type: 'Svg' })) as { props: { source: string; alt: string } } | undefined
    expect(svg?.props.source).toMatch(/^<svg [^>]*viewBox="0 0 960 \d+">/)
    expect(svg?.props.alt).toMatch(/Clawd and Manousos in the yard: Manousos is napping/)
    // Under the yard, as in the terminal: the pet button and the caption.
    expect(await desk.find({ type: 'Text', text: /napping/ })).toBeDefined()
    await desk.unmount()
  })

  test('the desktop yard carries what the terminal yard says, and the coat', async ($, on) => {
    const { clock } = setUp(on)
    on('prompt.submit', async (_$, e) => ({ text: e.text }) as never)
    await $.prompt.submit({ text: 'fix the failing checkout tests' } as never)
    await $.turn.start({ turnId: 't1' } as never)
    await clock.settle()
    const source = async () => {
      const ui = await $.ui.mount({ plugin: 'cretan-cat', surface: 'desktop', ...BAND, props: PROPS })
      const svg = (await ui.find({ type: 'Svg' })) as unknown as { props: { source: string } }
      await ui.unmount()
      return svg.props.source
    }
    const manousos = await source()
    // Clawd's nudge in his bubble, glyph by glyph, as the terminal draws it.
    const term = await $.ui.mount({ plugin: 'cretan-cat', surface: 'terminal', ...BAND, props: PROPS })
    const raster = (await term.find({ type: 'Raster' })) as unknown as { props: { cells: string } }
    await term.unmount()
    expect(cellsText(raster.props.cells)).toContain('checkout tests')
    expect(manousos.replace(/<[^>]+>/g, '')).toContain('checkout')
    await cmd($, 'ginger')
    expect(await source()).not.toBe(manousos)
  })

  test('too narrow for the yard: the ASCII cat, on the desktop too', async $ => {
    const narrow = { hasSurvey: false, isWorking: false, maxRows: 20, bodyColumns: 40 } as never
    const desk = await $.ui.mount({ plugin: 'cretan-cat', surface: 'desktop', ...BAND, props: narrow })
    expect(await desk.find({ type: 'Svg' })).toBeUndefined()
    expect(await desk.find({ type: 'Text', text: /\/\\_\/\\/ })).toBeDefined()
    await desk.unmount()
  })

  test('the SVG yard: the busiest scene fits an Svg, text is escaped, the sky follows the hour', () => {
    const busy: Parameters<typeof drawCells>[0] = {
      mood: 'think', t: 3, since: 3, cols: 160, rows: 11, coat: 'manousos', hour: 12, month: 0, kittens: 4,
      said: 'Πώς πάει το «a & b <c>», Μανούσο;',
      reply: ['Στο πληκτρολόγιο κάθομαι, τα bugs τα κυνηγάω,', 'κι όποιο ποντίκι βρω μπροστά, με μια πατιά το φάω.'],
    }
    const svg = cellsToSvg(drawCells(busy), 160, 11, skyAt(12))
    expect(svg.length).toBeLessThan(SVG_MOST / 4)
    expect(svg).toContain('&amp;')
    expect(svg).toContain('&lt;c&gt;')
    expect(svg).not.toMatch(/>[^<]*<c>/)
    expect(svg).toContain('πληκτρολόγιο')
    const night = cellsToSvg(drawCells({ ...busy, hour: 23 }), 160, 11, skyAt(23))
    expect(night).toContain('fill="#161a2c"')
    expect(svg).toContain('fill="#cee2f4"')
    // Every cell of a half block is two pixels: nothing drawn outside the box.
    expect(svg).not.toMatch(/M1280 /)
  })

  test('/cat <coat> changes his coat and keeps it; anything else lists the coats', async ($, on) => {
    const saved: Record<string, unknown> = {}
    on('store.get', async (_$, e) => ({ value: saved[e.key] }))
    on('store.set', async (_$, e) => {
      saved[e.key] = e.value
      return { value: undefined }
    })
    const run = (args: string) =>
      $.command.run({ command: 'cat', args, origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 100 } } as never)
    expect((await run('tuxedo')).text).toMatch(/Manousos is wearing the tuxedo coat/)
    expect(kept(saved, 'coat')).toBe('tuxedo')
    expect((await run('ginger')).text).toMatch(/Manousos is wearing the ginger coat/)
    expect(kept(saved, 'coat')).toBe('ginger')
    expect((await run('zebra')).text).toMatch(/manousos, ginger, tuxedo/)
  })

  test('alone in his square, the cat has the yard to himself: no Clawd, no bubbles', () => {
    const scene: Scene = { mood: 'think', coat: 'ginger', t: 3, cols: 34, rows: 17, said: 'go on', reply: ['a song'], hour: 12, isSolo: true }
    const cells = drawCells(scene)
    const orange = (217 << 16) | (119 << 8) | 87
    const colors = new Set<number>()
    for (let i = 0; i < cells.length; i += 3) colors.add(cells[i + 1]!).add(cells[i + 2]!)
    expect(colors.has(orange)).toBe(false)
    expect(cellsText(drawCat(scene))).not.toMatch(/go on|a song|╭/)
    // The same scene in the wide yard has Clawd in it.
    const wide = drawCells({ ...scene, cols: 120, rows: 11, isSolo: false })
    const wideColors = new Set<number>()
    for (let i = 0; i < wide.length; i += 3) wideColors.add(wide[i + 1]!).add(wide[i + 2]!)
    expect(wideColors.has(orange)).toBe(true)
  })

  test('/cat small puts him in a small square in the band; /cat band gives back the yard', async ($, on) => {
    const saved: Record<string, unknown> = {}
    on('store.get', async (_$, e) => ({ value: saved[e.key] }))
    on('store.set', async (_$, e) => {
      saved[e.key] = e.value
      return { value: undefined }
    })
    const run = async (args: string) =>
      (await $.command.run({ command: 'cat', args, origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 100 } } as never)).text
    expect(await run('small')).toMatch(/small square/)
    expect(kept(saved, 'place')).toBe('small')
    const small = await $.ui.mount({ plugin: 'cretan-cat', surface: 'terminal', ...BAND, props: PROPS })
    const raster = (await small.find({ type: 'Raster' })) as { props: { columns: number; rows: number } } | undefined
    expect(raster?.props.columns).toBe(30)
    expect(raster?.props.rows).toBe(12)
    expect(await small.find({ type: 'Text', text: /napping/ })).toBeDefined()
    await small.unmount()
    expect(await run('band')).toMatch(/whole yard/)
    expect(kept(saved, 'place')).toBe('band')
    const wide = await $.ui.mount({ plugin: 'cretan-cat', surface: 'terminal', ...BAND, props: PROPS })
    expect(((await wide.find({ type: 'Raster' })) as { props: { columns: number } } | undefined)?.props.columns).toBe(120)
    await wide.unmount()
  })

  test('/cat dock opens his own pane and leaves the band; /cat band brings him back', async ($, on) => {
    const saved: Record<string, unknown> = {}
    on('store.get', async (_$, e) => ({ value: saved[e.key] }))
    on('store.set', async (_$, e) => {
      saved[e.key] = e.value
      return { value: undefined }
    })
    // The surface's panes: open ids, placed at once.
    const panes = new Set<string>()
    on('ui.open', async (_$, e) => {
      panes.add(e.id)
      return { value: { isPlaced: true } } as never
    })
    on('ui.close', async (_$, e) => {
      panes.delete(e.id)
      return { value: undefined } as never
    })
    on('ui.panes', async () => ({ value: [...panes].map(id => ({ id, title: id, isShown: true, isFocused: false, isPlaced: true })) }) as never)
    on('ui.render', () => ({ type: 'Text', children: ['engine'] }) as never)
    const run = async (args: string) =>
      (await $.command.run({ command: 'cat', args, origin: { kind: 'composer' }, presentation: { isFullscreen: true, columns: 200 } } as never)).text
    expect(await run('dock')).toMatch(/pane of its own, docked on the right/)
    expect(kept(saved, 'place')).toBe('dock')
    expect(panes.has('cat')).toBe(true)
    // Docked and placed, the band is left to the engine.
    const band = await $.ui.mount({ plugin: 'cretan-cat', surface: 'terminal', ...BAND, props: PROPS })
    expect(await band.find({ type: 'Raster' })).toBeUndefined()
    await band.unmount()
    // /cat band closes the pane and brings him back.
    expect(await run('band')).toMatch(/whole yard/)
    expect(panes.has('cat')).toBe(false)
  })

  test('/cat help lists what he does; anything else says it is unknown, then helps', async ($, on) => {
    on('store.get', async () => ({ value: undefined }))
    on('store.set', async () => ({ value: undefined }))
    const run = async (args: string) =>
      (await $.command.run({ command: 'cat', args, origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 100 } } as never)).text
    const help = await run('help')
    expect(help).toMatch(/manousos, ginger, tuxedo/)
    expect(help).toMatch(/\/cat pet/)
    expect(help).not.toMatch(/doesn't know/)
    // A list, one command a line, not one long run of text.
    expect(help!.split('\n').filter(l => l.trimStart().startsWith('/cat')).length).toBeGreaterThanOrEqual(10)
    const slip = await run('patt')
    expect(slip).toMatch(/doesn't know "\/cat patt"/)
    expect(slip).toMatch(/\/cat pet/)
    // /cat config: each setting on its own line, with what it is now.
    const config = await run('config')
    expect(config).toMatch(/^ {2}name +Manousos$/m)
    expect(config).toMatch(/^ {2}language +greek$/m)
    expect(config).toMatch(/^ {2}temper +off$/m)
    expect(config).toMatch(/^ {2}sound +off$/m)
  })

  test('/cat stats draws stats kept before days were counted, swats included', async ($, on) => {
    const d = new Date()
    const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const store: Record<string, unknown> = { sardines: { day, today: 33, total: 33 }, pets: 30, swats: 9 }
    on('store.get', async (_$, e) => ({ value: store[(e as { key: string }).key] }))
    on('store.set', async () => ({ value: undefined }))
    const stats = (await $.command.run({ command: 'cat', args: 'stats', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 100 } } as never)).text!
    expect(stats).toMatch(/today +(🐟){10} \+23  33 sardines/)
    expect(stats).toMatch(/belly +█{10} stuffed, purring/)
    expect(stats).toMatch(/in all +33 sardines · best day 33 \(today!\)/)
    expect(stats).toMatch(/petted +30 times ♥ · swatted you 9 times/)
    expect(stats).toMatch(/rank +Harbour cat of Chania \(Sardine pirate at 100\)/)
    expect(stats).toMatch(/this week +.*██$/m)
  })

  test('/cat pet pets him from the prompt; hidden, he waits to come back first', async ($, on) => {
    const saved: Record<string, unknown> = {}
    on('store.get', async (_$, e) => ({ value: saved[e.key] }))
    on('store.set', async (_$, e) => {
      saved[e.key] = e.value
      return { value: undefined }
    })
    const clock = mock.clock(on, { now: 1_700_000_000_000 })
    const run = async (args: string) =>
      (await $.command.run({ command: 'cat', args, origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 100 } } as never)).text
    expect(await run('pet')).toMatch(/purrs/)
    await clock.settle()
    expect(saved.pets).toBe(1)
    const ui = await $.ui.mount({ plugin: 'cretan-cat', surface: 'desktop', ...BAND, props: PROPS })
    expect(await ui.find({ type: 'Text', text: /purrs <3/ })).toBeDefined()
    await ui.unmount()
    await run('hide')
    expect(await run('pet')).toMatch(/\/cat show/)
    expect(saved.pets).toBe(1)
    expect(await run('stats')).toMatch(/petted +1 time ♥/)
  })

  test('hidden stays hidden in the next session; /cat show or a coat brings him back', async ($, on) => {
    mock.clock(on, { now: 1_700_000_000_000 })
    on('command.register', async () => ({ value: undefined }) as never)
    on('session.start', async (_$, e) => ({ cwd: e.cwd }) as never)
    // Hidden, the band hands the drawing to the engine: here, nothing.
    on('ui.render', () => ({ type: 'Text', children: ['engine'] }) as never)
    const saved: Record<string, unknown> = {}
    on('store.get', async (_$, e) => ({ value: saved[e.key] }))
    on('store.set', async (_$, e) => {
      saved[e.key] = e.value
      return { value: undefined }
    })
    const run = (args: string) =>
      $.command.run({ command: 'cat', args, origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 100 } } as never)
    await run('hide')
    expect(saved.isHidden).toBe(true)
    await run('show')
    expect(saved.isHidden).toBe(false)
    await run('')
    expect(saved.isHidden).toBe(true)
    await run('ginger')
    expect(saved.isHidden).toBe(false)
    // A new session finds him where you left him.
    saved.isHidden = true
    await run('show')
    saved.isHidden = true
    await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true } as never)
    const ui = await $.ui.mount({ plugin: 'cretan-cat', surface: 'terminal', ...BAND, props: PROPS })
    expect(await ui.find({ type: 'Raster' })).toBeUndefined()
    expect(await ui.find({ type: 'Text', text: /napping/ })).toBeUndefined()
    await ui.unmount()
  })

  test('the ASCII cat wears his coat; a reaction keeps its color', async ($, on) => {
    const { clock } = setUp(on)
    const narrow = { hasSurvey: false, isWorking: false, maxRows: 20, bodyColumns: 40 } as never
    const tintOf = async () => {
      const ui = await $.ui.mount({ plugin: 'cretan-cat', surface: 'desktop', ...BAND, props: narrow })
      const line = (await ui.find({ type: 'Text', text: /\/\\_\/\\/ })) as { props: { color?: string } } | undefined
      await ui.unmount()
      return line?.props.color
    }
    expect(await tintOf()).toBe('#967a6a')
    await $.command.run({ command: 'cat', args: 'ginger', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 100 } } as never)
    expect(await tintOf()).toBe('#e88c3e')
    await $.turn.start({ turnId: 't1' } as never)
    await $.turn.complete({ turnId: 't1', reason: 'answer', answer: 'ok', durationMs: 1, isAborted: false } as never)
    await clock.settle()
    expect(await tintOf()).toBe('green')
  })

  test('/cat hide and /cat show are explicit; bare /cat toggles', async ($, on) => {
    on('store.get', async () => ({ value: undefined }))
    on('store.set', async () => ({ value: undefined }))
    const run = async (args: string) =>
      (await $.command.run({ command: 'cat', args, origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 100 } } as never)).text
    expect(await run('hide')).toMatch(/under the sofa/)
    expect(await run('HIDE ')).toMatch(/under the sofa/)
    expect(await run('show')).toMatch(/is back/)
    expect(await run('show')).toMatch(/is back/)
    expect(await run('')).toMatch(/under the sofa/)
    expect(await run('')).toMatch(/is back/)
  })

  test('Clawd nudges Manousos about the prompt\'s topic, not the prompt itself', async ($, on) => {
    on('prompt.submit', async (_$, e) => ({ text: e.text }) as never)
    mock.clock(on, { now: 1_700_000_000_000 })
    on('turn.start', async (_$, e) => ({ turnId: (e as { turnId: string }).turnId }) as never)
    await $.prompt.submit({ text: 'fix the failing checkout tests' } as never)
    await $.turn.start({ turnId: 't1' } as never)
    const ui = await $.ui.mount({ plugin: 'cretan-cat', surface: 'terminal', ...BAND, props: PROPS })
    const raster = (await ui.find({ type: 'Raster' })) as { props: { cells: string } } | undefined
    const text = cellsText(raster?.props.cells ?? '')
    expect(text).toContain('«failing checkout tests»')
    expect(text).not.toContain('fix the failing')
    await ui.unmount()
  })

  test('pressing Esc sends him back to his nap, not startled', async ($, on) => {
    mock.clock(on, { now: 1_700_000_000_000 })
    on('turn.start', async (_$, e) => ({ turnId: (e as { turnId: string }).turnId }) as never)
    on('turn.complete', async (_$, e) => ({ text: (e as { answer: string }).answer }) as never)
    await $.turn.start({ turnId: 't1' } as never)
    await $.turn.complete({ turnId: 't1', reason: 'aborted', answer: '', durationMs: 1, isAborted: true } as never)
    const ui = await $.ui.mount({ plugin: 'cretan-cat', surface: 'terminal', ...BAND, props: PROPS })
    expect(await ui.find({ type: 'Text', text: /napping/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /startled/ })).toBeUndefined()
    await ui.unmount()
  })

  test('when the work is done he sings a mantinada in his bubble', async ($, on) => {
    const clock = mock.clock(on, { now: 1_700_000_000_000 })
    on('turn.start', async (_$, e) => ({ turnId: (e as { turnId: string }).turnId }) as never)
    on('turn.complete', async (_$, e) => ({ text: (e as { answer: string }).answer }) as never)
    await $.turn.start({ turnId: 't1' } as never)
    await $.turn.complete({ turnId: 't1', reason: 'answer', answer: 'ok', durationMs: 1, isAborted: false } as never)
    const ui = await $.ui.mount({ plugin: 'cretan-cat', surface: 'terminal', ...BAND, props: PROPS })
    const raster = (await ui.find({ type: 'Raster' })) as { props: { cells: string } } | undefined
    const text = cellsText(raster?.props.cells ?? '')
    expect(text).toContain('Μπράβο Μανούσο')
    // Greek couplet lines are long and rhyme with commas: at least one shows.
    expect(text).toMatch(/[α-ω]{3,}.*[α-ω]{3,}/)
    expect(await ui.find({ type: 'Text', text: /purrs: done/ })).toBeDefined()
    await ui.unmount()
    // Twelve seconds to read it, then he curls up again.
    await clock.advance(12_001)
    const later = await $.ui.mount({ plugin: 'cretan-cat', surface: 'terminal', ...BAND, props: PROPS })
    expect(await later.find({ type: 'Text', text: /napping/ })).toBeDefined()
    await later.unmount()
  })

  for (const [language, nudge] of [
    ['english', '"failing checkout tests"'],
    ['spanish', '«failing checkout tests»'],
  ] as const) {
    test(`with language ${language}, Clawd speaks it; the mantinada stays Greek`, { options: { language } }, async ($, on) => {
      mock.clock(on, { now: 1_700_000_000_000 })
      on('prompt.submit', async (_$, e) => ({ text: e.text }) as never)
      on('turn.start', async (_$, e) => ({ turnId: (e as { turnId: string }).turnId }) as never)
      await $.prompt.submit({ text: 'fix the failing checkout tests' } as never)
      await $.turn.start({ turnId: 't1' } as never)
      const ui = await $.ui.mount({ plugin: 'cretan-cat', surface: 'terminal', ...BAND, props: PROPS })
      const raster = (await ui.find({ type: 'Raster' })) as { props: { cells: string } } | undefined
      const text = cellsText(raster?.props.cells ?? '')
      expect(text).toContain(nudge)
      expect(text).toContain('Manousos')
      expect(text).not.toContain('Μανούσο,')
      expect(text).toMatch(/[α-ω]{4,}/)
      await ui.unmount()
    })
  }

  test('a prompt with emoji, CJK or combining marks never breaks the yard', async ($, on) => {
    mock.clock(on, { now: 1_700_000_000_000 })
    on('prompt.submit', async (_$, e) => ({ text: e.text }) as never)
    on('turn.start', async (_$, e) => ({ turnId: (e as { turnId: string }).turnId }) as never)
    await $.prompt.submit({ text: 'fix the 🐛 in 日本語 cafe\u0301 zero\u200bwidth parser' } as never)
    await $.turn.start({ turnId: 't1' } as never)
    const ui = await $.ui.mount({ plugin: 'cretan-cat', surface: 'terminal', ...BAND, props: PROPS })
    const raster = (await ui.find({ type: 'Raster' })) as { props: { cells: string } } | undefined
    expect(raster).toBeDefined()
    expect(cellsText(raster?.props.cells ?? '')).toContain('parser')
    await ui.unmount()
  })

  test('too little room: the ASCII cat; a short band: Clawd speaks under the yard', async ($, on) => {
    mock.clock(on, { now: 1_700_000_000_000 })
    on('turn.start', async (_$, e) => ({ turnId: (e as { turnId: string }).turnId }) as never)
    await $.turn.start({ turnId: 't1' } as never)
    for (const props of [
      { hasSurvey: false, isWorking: true, maxRows: 6, bodyColumns: 120 },
      { hasSurvey: false, isWorking: true, maxRows: 20, bodyColumns: 40 },
    ]) {
      const ui = await $.ui.mount({ plugin: 'cretan-cat', surface: 'terminal', ...BAND, props: props as never })
      expect(await ui.find({ type: 'Raster' })).toBeUndefined()
      expect(await ui.find({ type: 'Text', text: /thinking/ })).toBeDefined()
      await ui.unmount()
    }
    const short = await $.ui.mount({ plugin: 'cretan-cat', surface: 'terminal', ...BAND, props: { hasSurvey: false, isWorking: true, maxRows: 10, bodyColumns: 120 } as never })
    expect(await short.find({ type: 'Raster' })).toBeDefined()
    expect(await short.find({ type: 'Text', text: /^Clawd: / })).toBeDefined()
    await short.unmount()
  })

  test('parallel tools: he stays on the one still running, then thinks', async ($, on) => {
    const clock = mock.clock(on, { now: 1_700_000_000_000 })
    on('turn.start', async (_$, e) => ({ turnId: (e as { turnId: string }).turnId }) as never)
    const done: Record<string, () => void> = {}
    on('tool.call', (_$, e) => new Promise(resolve => (done[e.tool] = () => resolve({ result: 'ok' } as never))) as never)
    await $.turn.start({ turnId: 't1' } as never)
    const bash = $.tool.call({ tool: 'Bash', command: 'sleep 1' } as never)
    const read = $.tool.call({ tool: 'Read', file_path: '/tmp/x' } as never)
    await clock.settle()
    const shows = async (caption: RegExp) => {
      const ui = await $.ui.mount({ plugin: 'cretan-cat', surface: 'terminal', ...BAND, props: PROPS })
      const found = await ui.find({ type: 'Text', text: caption })
      await ui.unmount()
      return found !== undefined
    }
    expect(await shows(/on it: Read/)).toBe(true)
    done.Read!()
    await read
    await clock.settle()
    expect(await shows(/on it: Bash/)).toBe(true)
    done.Bash!()
    await bash
    await clock.settle()
    expect(await shows(/thinking it over/)).toBe(true)
  })

  test('Esc while a tool runs: he naps, and the tool finishing later does not wake him', async ($, on) => {
    const clock = mock.clock(on, { now: 1_700_000_000_000 })
    on('turn.start', async (_$, e) => ({ turnId: (e as { turnId: string }).turnId }) as never)
    on('turn.complete', async (_$, e) => ({ text: (e as { answer: string }).answer }) as never)
    let finish = () => {}
    on('tool.call', () => new Promise(resolve => (finish = () => resolve({ result: 'ok' } as never))) as never)
    await $.turn.start({ turnId: 't1' } as never)
    const bash = $.tool.call({ tool: 'Bash', command: 'sleep 9' } as never)
    await clock.settle()
    await $.turn.complete({ turnId: 't1', reason: 'aborted', answer: '', durationMs: 1, isAborted: true } as never)
    finish()
    await bash
    const ui = await $.ui.mount({ plugin: 'cretan-cat', surface: 'terminal', ...BAND, props: PROPS })
    expect(await ui.find({ type: 'Text', text: /napping/ })).toBeDefined()
    await ui.unmount()
  })

  // A turn under way whose tool calls wait for the test to finish them.
  // `prompt`: what settings hooks answer a permission prompt with (nothing:
  // it is shown to you).
  const setUp = (on: any, prompt: object = {}) => {
    const clock = mock.clock(on, { now: 1_700_000_000_000 })
    const saved: Record<string, unknown> = {}
    on('store.get', async (_$: unknown, e: { key: string }) => ({ value: saved[e.key] }))
    on('store.set', async (_$: unknown, e: { key: string; value: unknown }) => {
      saved[e.key] = e.value
      return { value: undefined }
    })
    on('turn.start', async (_$: unknown, e: { turnId: string }) => ({ turnId: e.turnId }))
    on('turn.complete', async (_$: unknown, e: { answer: string }) => ({ text: e.answer }))
    on('classic.PermissionRequest', async () => prompt)
    const pending: Record<string, ((result: object) => void)[]> = {}
    on('tool.call', (_$: unknown, e: { tool: string }) => new Promise(resolve => (pending[e.tool] ??= []).push(resolve)))
    const finish = async (tool: string, result: object = { result: 'ok' }) => {
      pending[tool]?.shift()?.(result)
      await clock.settle()
    }
    return { clock, saved, finish }
  }
  const caption = async ($: any, text: RegExp) => {
    const ui = await $.ui.mount({ plugin: 'cretan-cat', surface: 'terminal', ...BAND, props: PROPS })
    const found = await ui.find({ type: 'Text', text })
    await ui.unmount()
    return found !== undefined
  }

  test('a permission prompt: he waits for you, then gets back to it', async ($, on) => {
    const { clock, finish } = setUp(on)
    await $.turn.start({ turnId: 't1' } as never)
    const bash = $.tool.call({ tool: 'Bash', command: 'rm -rf build' } as never)
    await clock.settle()
    await $.classic.PermissionRequest({ tool_name: 'Bash', tool_input: { command: 'rm -rf build' } } as never)
    await clock.advance(400)
    expect(await caption($, /waiting for you: answer the Bash prompt/)).toBe(true)
    await finish('Bash')
    await bash
    expect(await caption($, /thinking it over/)).toBe(true)
  })

  test("a subagent's permission prompt does not stop him", async ($, on) => {
    const { clock } = setUp(on)
    await $.turn.start({ turnId: 't1' } as never)
    await clock.settle()
    await $.classic.PermissionRequest({ tool_name: 'Bash', tool_input: {}, agent_id: 'a1' } as never)
    expect(await caption($, /thinking it over/)).toBe(true)
  })

  test('green tests: he dances; red tests: he hisses; then back to thinking', async ($, on) => {
    const { clock, finish } = setUp(on)
    await $.turn.start({ turnId: 't1' } as never)
    const green = $.tool.call({ tool: 'Bash', command: 'npm test' } as never)
    await clock.settle()
    await finish('Bash')
    await green
    expect(await caption($, /dances: the tests passed/)).toBe(true)
    await clock.advance(4_000)
    expect(await caption($, /thinking it over/)).toBe(true)
    const red = $.tool.call({ tool: 'Bash', command: 'pytest -q' } as never)
    await clock.settle()
    await finish('Bash', { result: 'FAILED', isError: true })
    await red
    expect(await caption($, /hisses: the tests failed/)).toBe(true)
  })

  test('a commit earns a sardine, counted for the day in /cat stats', async ($, on) => {
    const { clock, saved, finish } = setUp(on)
    await $.turn.start({ turnId: 't1' } as never)
    for (let i = 0; i < 2; i++) {
      const commit = $.tool.call({ tool: 'Bash', command: 'git commit -m "x"' } as never)
      await clock.settle()
      await finish('Bash')
      await commit
    }
    expect(await caption($, /got a sardine for the commit \(2 today\)/)).toBe(true)
    expect((saved.sardines as { today: number; total: number }).total).toBe(2)
    const failed = $.tool.call({ tool: 'Bash', command: 'git commit -m "y"' } as never)
    await clock.settle()
    await finish('Bash', { result: 'nothing to commit', isError: true })
    await failed
    const stats = await $.command.run({ command: 'cat', args: 'stats', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 100 } } as never)
    expect(stats.text).toMatch(/today +🐟🐟  2 sardines/)
    expect(stats.text).toMatch(/belly +██░{8} peckish/)
    expect(stats.text).toMatch(/in all +2 sardines · best day 2 \(today!\)/)
    expect(stats.text).toMatch(/rank +Village kitten \(Courtyard cat at 10\)/)
    // The week as bars, today's the tallest, over the days' names.
    const week = stats.text!.split('\n').findIndex(l => l.includes('this week'))
    expect(stats.text!.split('\n')[week]).toMatch(/██$/)
    expect(stats.text!.split('\n')[week + 1]).toMatch(/(Su|Mo|Tu|We|Th|Fr|Sa)$/)
  })

  test('finished work earns a sardine, then the song; a chat, Esc or a commit turn earns no extra', async ($, on) => {
    const { clock, saved, finish } = setUp(on)
    const done = { reason: 'answer', answer: 'ok', durationMs: 1, isAborted: false }
    const sardines = () => (saved.sardines as { today: number } | undefined)?.today ?? 0
    // A reply without tools: no sardine.
    await $.turn.start({ turnId: 't1' } as never)
    await $.turn.complete({ turnId: 't1', ...done } as never)
    expect(sardines()).toBe(0)
    // A turn that ran a tool: a sardine, then he purrs and sings.
    await $.turn.start({ turnId: 't2' } as never)
    const read = $.tool.call({ tool: 'Read', file_path: 'x' } as never)
    await clock.settle()
    await finish('Read')
    await read
    await $.turn.complete({ turnId: 't2', ...done } as never)
    expect(sardines()).toBe(1)
    expect(await caption($, /got a sardine for the work \(1 today\)/)).toBe(true)
    await clock.advance(3_501)
    expect(await caption($, /purrs: done/)).toBe(true)
    // Stopped with Esc after a tool: no sardine.
    await $.turn.start({ turnId: 't3' } as never)
    const grep = $.tool.call({ tool: 'Grep', pattern: 'x' } as never)
    await clock.settle()
    await finish('Grep')
    await grep
    await $.turn.complete({ turnId: 't3', reason: 'aborted', answer: '', durationMs: 1, isAborted: true } as never)
    expect(sardines()).toBe(1)
    // A commit feeds him; the turn ending doesn't feed him twice.
    await $.turn.start({ turnId: 't4' } as never)
    const commit = $.tool.call({ tool: 'Bash', command: 'git commit -m x' } as never)
    await clock.settle()
    await finish('Bash')
    await commit
    await $.turn.complete({ turnId: 't4', ...done } as never)
    expect(sardines()).toBe(2)
  })

  test('a long tool bores him to sleep; it ending wakes him', async ($, on) => {
    const { clock, finish } = setUp(on)
    await $.turn.start({ turnId: 't1' } as never)
    const build = $.tool.call({ tool: 'Bash', command: 'make build' } as never)
    await clock.settle()
    await clock.advance(19_000)
    expect(await caption($, /on it: Bash/)).toBe(true)
    await clock.advance(2_000)
    expect(await caption($, /dozed off: Bash is still running/)).toBe(true)
    await finish('Bash')
    await build
    expect(await caption($, /thinking it over/)).toBe(true)
  })

  test('petting: the pet button makes him purr, and counts', async ($, on) => {
    const { clock, saved } = setUp(on)
    await clock.settle()
    const ui = await $.ui.mount({ plugin: 'cretan-cat', surface: 'terminal', ...BAND, props: PROPS })
    await ui.press({ key: 'pet' })
    await clock.settle()
    expect(saved.pets).toBe(1)
    await ui.unmount()
  })

  test('a treat: the treat button tosses him a sardine, apart from the work sardines', async ($, on) => {
    const { clock, saved } = setUp(on)
    await clock.settle()
    const ui = await $.ui.mount({ plugin: 'cretan-cat', surface: 'terminal', ...BAND, props: PROPS })
    await ui.press({ key: 'treat' })
    await clock.settle()
    expect(saved.treats).toBe(1)
    expect(await ui.find({ type: 'Text', text: /got a treat from you/ })).toBeDefined()
    expect(saved.sardines).toBeUndefined()
    // Then back to his nap.
    await clock.advance(4_000)
    expect(await ui.find({ type: 'Text', text: /napping/ })).toBeDefined()
    await ui.unmount()
  })

  test('play: the fishing toy dangles over him while he chases it, then he naps', async ($, on) => {
    const { clock } = setUp(on)
    await clock.settle()
    const ui = await $.ui.mount({ plugin: 'cretan-cat', surface: 'terminal', ...BAND, props: PROPS })
    await ui.press({ key: 'play' })
    await clock.settle()
    expect(await ui.find({ type: 'Text', text: /chasing the fishing toy/ })).toBeDefined()
    await clock.advance(7_000)
    expect(await ui.find({ type: 'Text', text: /napping/ })).toBeDefined()
    await ui.unmount()
    // The feather's pink is in the yard, alone or with Clawd holding the rod.
    const pink = (236 << 16) | (104 << 8) | 160
    const rod = (128 << 16) | (84 << 8) | 52
    const colorsOf = (cells: Uint32Array) => {
      const seen = new Set<number>()
      for (let i = 0; i < cells.length; i += 3) seen.add(cells[i + 1]!).add(cells[i + 2]!)
      return seen
    }
    for (const t of [0, 1.3, 2.9]) {
      const wide = colorsOf(drawCells({ mood: 'play', coat: 'ginger', t, cols: 120, rows: 11, hour: 12 }))
      expect(wide.has(pink)).toBe(true)
      expect(wide.has(rod)).toBe(true)
      const solo = colorsOf(drawCells({ mood: 'play', coat: 'ginger', t, cols: 30, rows: 12, hour: 12, isSolo: true }))
      expect(solo.has(pink)).toBe(true)
      expect(solo.has(rod)).toBe(false)
    }
  })

  test('/cat sound on: a mrrp to say so, and sounds from then on; off, quiet', async ($, on) => {
    const { clock, saved } = setUp(on)
    const played = listen(on)
    const run = async (args: string) =>
      (await $.command.run({ command: 'cat', args, origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 100 } } as never)).text
    expect(await run('sound')).toMatch(/Sound is off/)
    expect(await run('sound on')).toMatch(/has a voice now/)
    expect((saved.settings as Record<string, { value: string } | undefined>).sound?.value).toBe('on')
    await clock.settle()
    expect(played).toContain('sounds/happy.wav')
    expect(await run('sound off')).toMatch(/quiet again/)
    expect(await run('config')).toMatch(/^ {2}sound +off$/m)
  })

  test('play with sound on: the bell on the toy jingles, twice, then he purrs', { options: { sound: 'on' } }, async ($, on) => {
    const { clock } = setUp(on)
    const played = listen(on)
    await clock.settle()
    const ui = await $.ui.mount({ plugin: 'cretan-cat', surface: 'terminal', ...BAND, props: PROPS })
    await ui.press({ key: 'play' })
    await clock.settle()
    expect(played).toEqual(['sounds/bell.wav'])
    await clock.advance(7_000)
    expect(played).toEqual(['sounds/bell.wav', 'sounds/bell.wav', 'sounds/purr.wav'])
    await ui.unmount()
  })

  for (const temper of ['off', 'on'] as const) {
    test(`temper ${temper}: play ${temper === 'on' ? 'is turned down now and then, with a sulk or the butt' : 'is always a chase'}`, { options: { temper } }, async ($, on) => {
      const { clock } = setUp(on)
      await clock.settle()
      const seen = new Set<string>()
      for (let i = 0; i < 30; i++) {
        const said = (await $.command.run({ command: 'cat', args: 'play', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 100 } } as never)).text!
        seen.add(/shows you the butt/.test(said) ? 'butt' : /looks the other way/.test(said) ? 'sulk' : 'play')
        await clock.advance(7_000)
      }
      expect([...seen].sort()).toEqual(temper === 'on' ? ['butt', 'play', 'sulk'] : ['play'])
    })
  }

  test('high resolution has its own art for the butt and the feather, not blocks', () => {
    const scene = { coat: 'ginger', t: 1.3, since: 1.3, cols: 110, rows: 11, hour: 12 } as const
    // The HD feather's light spine and the HD back's rim light are colors the
    // low-resolution blocks never use.
    const has = (rgba: Uint8Array, [r, g, b]: number[]) => {
      for (let i = 0; i < rgba.length; i += 4) if (rgba[i] === r && rgba[i + 1] === g && rgba[i + 2] === b && rgba[i + 3] === 255) return true
      return false
    }
    expect(has(drawHd({ ...scene, mood: 'play' }).rgba, [250, 160, 200])).toBe(true)
    expect(has(drawHd({ ...scene, mood: 'butt' }).rgba, [252, 208, 152])).toBe(true)
  })

  test('the butt: drawn from behind, tail up, the pink under it', () => {
    const pink = (232 << 16) | (120 << 8) | 140
    const cells = drawCells({ mood: 'butt', coat: 'ginger', t: 1, cols: 120, rows: 11, hour: 12 })
    let hasPink = false
    for (let i = 0; i < cells.length; i += 3) if (cells[i + 1] === pink || cells[i + 2] === pink) hasPink = true
    expect(hasPink).toBe(true)
  })

  test('/cat hints off: just "napping", no tips; on brings them back, kept', async ($, on) => {
    const { saved } = setUp(on)
    const run = async (args: string) =>
      (await $.command.run({ command: 'cat', args, origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 100 } } as never)).text
    expect(await run('hints off')).toMatch(/Just "Manousos is napping"/)
    expect(kept(saved, 'hints')).toBe('off')
    const ui = await $.ui.mount({ plugin: 'cretan-cat', surface: 'terminal', ...BAND, props: PROPS })
    expect(await ui.find({ type: 'Text', text: /napping/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /\/cat help/ })).toBeUndefined()
    await run('hints on')
    await ui.redraw()
    expect(await ui.find({ type: 'Text', text: /\/cat help · \/cat hide/ })).toBeDefined()
    await ui.unmount()
    expect(await run('hints')).toMatch(/Hints are on/)
  })

  // What $.audio.play was asked to play, asset by asset.
  const listen = (on: any) => {
    const played: string[] = []
    on('audio.play', async (_$: unknown, e: { clip: { asset?: string } }) => {
      played.push(e.clip.asset ?? '?')
      return { value: undefined }
    })
    return played
  }
  const done = { reason: 'answer', answer: 'ok', durationMs: 1, isAborted: false }

  test('sound off (the default): no sound, whatever happens', async ($, on) => {
    const { clock, finish } = setUp(on)
    const played = listen(on)
    await $.turn.start({ turnId: 't1' } as never)
    const ask = $.tool.call({ tool: 'AskUserQuestion', questions: [] } as never)
    await clock.settle()
    await finish('AskUserQuestion')
    await ask
    await clock.advance(3_000)
    const red = $.tool.call({ tool: 'Bash', command: 'pytest -q' } as never)
    await clock.settle()
    await finish('Bash', { result: 'FAILED', isError: true })
    await red
    await clock.advance(3_000)
    await cmd($, 'pet')
    await clock.advance(3_000)
    await $.turn.complete({ turnId: 't1', ...done } as never)
    await clock.advance(20_000)
    expect(played).toEqual([])
  })

  test('sound on: a happy trill when the work is done', { options: { sound: 'on' } }, async ($, on) => {
    const { clock } = setUp(on)
    const played = listen(on)
    await $.turn.start({ turnId: 't1' } as never)
    await $.turn.complete({ turnId: 't1', ...done } as never)
    await clock.settle()
    expect(played).toEqual(['sounds/happy.wav'])
  })

  test('sound on: a mew when Claude waits for you, a question or a permission prompt', { options: { sound: 'on' } }, async ($, on) => {
    const { clock, finish } = setUp(on)
    const played = listen(on)
    await $.turn.start({ turnId: 't1' } as never)
    const ask = $.tool.call({ tool: 'AskUserQuestion', questions: [] } as never)
    await clock.settle()
    expect(played).toEqual(['sounds/mew.wav'])
    await finish('AskUserQuestion')
    await ask
    await clock.advance(3_000)
    const bash = $.tool.call({ tool: 'Bash', command: 'rm -rf build' } as never)
    await clock.settle()
    await $.classic.PermissionRequest({ tool_name: 'Bash', tool_input: { command: 'rm -rf build' } } as never)
    await clock.advance(400)
    expect(played).toEqual(['sounds/mew.wav', 'sounds/mew.wav'])
    await finish('Bash')
    await bash
  })

  test('sound on: red tests make him hiss, green ones make no sound', { options: { sound: 'on' } }, async ($, on) => {
    const { clock, finish } = setUp(on)
    const played = listen(on)
    await $.turn.start({ turnId: 't1' } as never)
    const green = $.tool.call({ tool: 'Bash', command: 'npm test' } as never)
    await clock.settle()
    await finish('Bash')
    await green
    expect(played).toEqual([])
    await clock.advance(4_000)
    const red = $.tool.call({ tool: 'Bash', command: 'pytest -q' } as never)
    await clock.settle()
    await finish('Bash', { result: 'FAILED', isError: true })
    await red
    expect(played).toEqual(['sounds/hiss.wav'])
  })

  test('sound on: petted, he purrs, from /cat pet and the pet button', { options: { sound: 'on' } }, async ($, on) => {
    const { clock } = setUp(on)
    const played = listen(on)
    expect(await cmd($, 'pet')).toMatch(/purrs/)
    await clock.settle()
    expect(played).toEqual(['sounds/purr.wav'])
    await clock.advance(3_000)
    const ui = await $.ui.mount({ plugin: 'cretan-cat', surface: 'terminal', ...BAND, props: PROPS })
    await ui.press({ key: 'pet' })
    await clock.settle()
    await ui.unmount()
    expect(played).toEqual(['sounds/purr.wav', 'sounds/purr.wav'])
  })

  test('sound on, with a temper: a swat comes with a hiss, a purr with a purr', { options: { sound: 'on', temper: 'on' } }, async ($, on) => {
    const { clock } = setUp(on)
    const played = listen(on)
    const heard = new Set<string>()
    for (let i = 0; i < 30 && heard.size < 2; i++) {
      const text = await cmd($, 'pet')
      await clock.settle()
      const last = played[played.length - 1]
      expect(last).toBe(/swats your hand/.test(text) ? 'sounds/hiss.wav' : 'sounds/purr.wav')
      heard.add(last!)
      await clock.advance(3_000)
    }
    expect([...heard].sort()).toEqual(['sounds/hiss.wav', 'sounds/purr.wav'])
  })

  test('sound on: a sardine for a commit, then done: one sound, not two; never two at once', { options: { sound: 'on' } }, async ($, on) => {
    const { clock, finish } = setUp(on)
    const played = listen(on)
    await $.turn.start({ turnId: 't1' } as never)
    const commit = $.tool.call({ tool: 'Bash', command: 'git commit -m x' } as never)
    await clock.settle()
    await finish('Bash')
    await commit
    await $.turn.complete({ turnId: 't1', ...done } as never)
    await clock.settle()
    expect(played).toEqual(['sounds/happy.wav'])
    // A burst of pets: one purr. Two seconds later he can purr again.
    await Promise.all([cmd($, 'pet'), cmd($, 'pet'), cmd($, 'pet')])
    await clock.settle()
    expect(played).toEqual(['sounds/happy.wav'])
    await clock.advance(2_000)
    await Promise.all([cmd($, 'pet'), cmd($, 'pet')])
    await clock.settle()
    expect(played).toEqual(['sounds/happy.wav', 'sounds/purr.wav'])
  })

  test('sound on: the mew that calls you is never held back by a sound just before', { options: { sound: 'on' } }, async ($, on) => {
    const { clock, finish } = setUp(on)
    const played = listen(on)
    await $.turn.start({ turnId: 't1' } as never)
    const commit = $.tool.call({ tool: 'Bash', command: 'git commit -m x' } as never)
    await clock.settle()
    await finish('Bash')
    await commit
    // Under a second later, a question for you: the mew still plays.
    const ask = $.tool.call({ tool: 'AskUserQuestion', questions: [] } as never)
    await clock.settle()
    expect(played).toEqual(['sounds/happy.wav', 'sounds/mew.wav'])
    await finish('AskUserQuestion')
    await ask
  })

  test('waiting on you holds while another tool finishes, and boredom waits too', async ($, on) => {
    const { clock, finish } = setUp(on)
    await $.turn.start({ turnId: 't1' } as never)
    const bash = $.tool.call({ tool: 'Bash', command: 'make deploy' } as never)
    const read = $.tool.call({ tool: 'Read', file_path: '/tmp/x' } as never)
    await clock.settle()
    await $.classic.PermissionRequest({ tool_name: 'Bash', tool_input: {} } as never)
    await clock.advance(400)
    await finish('Read')
    await read
    expect(await caption($, /waiting for you: answer the Bash prompt/)).toBe(true)
    await clock.advance(25_000)
    expect(await caption($, /waiting for you/)).toBe(true)
    await finish('Bash')
    await bash
    expect(await caption($, /thinking it over/)).toBe(true)
  })

  test("a question for you (AskUserQuestion) makes him wait, and doesn't bore him", async ($, on) => {
    const { clock, finish } = setUp(on)
    await $.turn.start({ turnId: 't1' } as never)
    const ask = $.tool.call({ tool: 'AskUserQuestion', questions: [] } as never)
    await clock.settle()
    await clock.advance(30_000)
    expect(await caption($, /waiting for you: answer Claude's question/)).toBe(true)
    await finish('AskUserQuestion')
    await ask
    expect(await caption($, /thinking it over/)).toBe(true)
  })

  test('a denied test run is no failure; a background one no success', async ($, on) => {
    const { clock, finish } = setUp(on)
    await $.turn.start({ turnId: 't1' } as never)
    const denied = $.tool.call({ tool: 'Bash', command: 'npm test' } as never)
    await clock.settle()
    await finish('Bash', { deny: 'not now' })
    await denied
    expect(await caption($, /thinking it over/)).toBe(true)
    const background = $.tool.call({ tool: 'Bash', command: 'npm test', run_in_background: true } as never)
    await clock.settle()
    await finish('Bash', { result: 'Command running in background' })
    await background
    expect(await caption($, /thinking it over/)).toBe(true)
  })

  test('failing tests piped to tail still make him hiss; passing ones that mention FAIL do not', async ($, on) => {
    const { clock, finish } = setUp(on)
    await $.turn.start({ turnId: 't1' } as never)
    const piped = $.tool.call({ tool: 'Bash', command: 'npm test 2>&1 | tail -20' } as never)
    await clock.settle()
    await finish('Bash', { result: 'x', text: 'Tests: 2 failed, 40 passed' })
    await piped
    expect(await caption($, /hisses: the tests failed/)).toBe(true)
    await clock.advance(4_000)
    const green = $.tool.call({ tool: 'Bash', command: 'npm test' } as never)
    await clock.settle()
    await finish('Bash', { result: 'x', text: '✓ handles the FAIL state\nTests: 41 passed' })
    await green
    expect(await caption($, /dances: the tests passed/)).toBe(true)
  })

  test('two reactions at once, or a turn ending mid-reaction, never leave him stuck', async ($, on) => {
    const { clock, finish } = setUp(on)
    await $.turn.start({ turnId: 't1' } as never)
    const tests = $.tool.call({ tool: 'Bash', command: 'npm test' } as never)
    const commit = $.tool.call({ tool: 'Bash', command: 'git commit -m x' } as never)
    await clock.settle()
    await finish('Bash')
    await finish('Bash')
    await Promise.all([tests, commit])
    await clock.advance(4_000)
    expect(await caption($, /thinking it over/)).toBe(true)
    const again = $.tool.call({ tool: 'Bash', command: 'git commit -m y' } as never)
    await clock.settle()
    await finish('Bash')
    await again
    await $.turn.complete({ turnId: 't1', reason: 'answer', answer: 'ok', durationMs: 1, isAborted: false } as never)
    await clock.settle()
    expect(await caption($, /purrs: done/)).toBe(true)
    await clock.advance(13_000)
    expect(await caption($, /napping/)).toBe(true)
  })

  test('petting wears off after a few seconds, off the yard too', async ($, on) => {
    const { clock } = setUp(on)
    await clock.settle()
    const desk = await $.ui.mount({ plugin: 'cretan-cat', surface: 'desktop', ...BAND, props: PROPS })
    await desk.press({ key: 'pet' })
    await clock.settle()
    await desk.unmount()
    const during = await $.ui.mount({ plugin: 'cretan-cat', surface: 'desktop', ...BAND, props: PROPS })
    expect(await during.find({ type: 'Text', text: /purrs <3/ })).toBeDefined()
    await during.unmount()
    await clock.advance(4_000)
    const after = await $.ui.mount({ plugin: 'cretan-cat', surface: 'desktop', ...BAND, props: PROPS })
    expect(await after.find({ type: 'Text', text: /purrs <3/ })).toBeUndefined()
    await after.unmount()
  })

  test('a plan approved through a permission prompt ends the wait', async ($, on) => {
    const { clock, finish } = setUp(on)
    await $.turn.start({ turnId: 't1' } as never)
    const plan = $.tool.call({ tool: 'ExitPlanMode', plan: 'x' } as never)
    await clock.settle()
    await $.classic.PermissionRequest({ tool_name: 'ExitPlanMode', tool_input: { plan: 'x' } } as never)
    await clock.advance(400)
    expect(await caption($, /waiting for you: review Claude's plan/)).toBe(true)
    await finish('ExitPlanMode')
    await plan
    expect(await caption($, /thinking it over/)).toBe(true)
  })

  test('two calls of one tool: the one at a prompt keeps him waiting when the other ends', async ($, on) => {
    const { clock, finish } = setUp(on)
    await $.turn.start({ turnId: 't1' } as never)
    const allowed = $.tool.call({ tool: 'WebFetch', url: 'https://a.example' } as never)
    const asked = $.tool.call({ tool: 'WebFetch', url: 'https://b.example' } as never)
    await clock.settle()
    await $.classic.PermissionRequest({ tool_name: 'WebFetch', tool_input: { url: 'https://b.example' } } as never)
    await clock.advance(400)
    await finish('WebFetch')
    await allowed
    expect(await caption($, /waiting for you: answer the WebFetch prompt/)).toBe(true)
    await finish('WebFetch')
    await asked
    expect(await caption($, /thinking it over/)).toBe(true)
  })

  test('a prompt a settings hook answers never shows: no wait', async ($, on) => {
    const { clock, finish } = setUp(on, { decision: { behavior: 'allow' } })
    await $.turn.start({ turnId: 't1' } as never)
    const bash = $.tool.call({ tool: 'Bash', command: 'ls' } as never)
    await clock.settle()
    await $.classic.PermissionRequest({ tool_name: 'Bash', tool_input: { command: 'ls' } } as never)
    await clock.advance(400)
    expect(await caption($, /on it: Bash/)).toBe(true)
    await finish('Bash')
    await bash
  })

  test('a reaction and another tool ending in the same moment: the reaction still plays', async ($, on) => {
    const { clock, finish } = setUp(on)
    await $.turn.start({ turnId: 't1' } as never)
    const tests = $.tool.call({ tool: 'Bash', command: 'npm test' } as never)
    const read = $.tool.call({ tool: 'Read', file_path: '/tmp/x' } as never)
    await clock.settle()
    await Promise.all([finish('Bash'), finish('Read')])
    await Promise.all([tests, read])
    await clock.settle()
    expect(await caption($, /dances: the tests passed/)).toBe(true)
  })

  test('dozing off survives other tools coming and going', async ($, on) => {
    const { clock, finish } = setUp(on)
    await $.turn.start({ turnId: 't1' } as never)
    const build = $.tool.call({ tool: 'Bash', command: 'make build' } as never)
    await clock.settle()
    await clock.advance(21_000)
    const read = $.tool.call({ tool: 'Read', file_path: '/tmp/x' } as never)
    await clock.settle()
    await finish('Read')
    await read
    expect(await caption($, /dozed off: Bash is still running/)).toBe(true)
    await finish('Bash')
    await build
  })

  test('a call left over from an aborted turn does nothing in the next', async ($, on) => {
    const { clock, finish } = setUp(on)
    await $.turn.start({ turnId: 't1' } as never)
    const old = $.tool.call({ tool: 'Bash', command: 'pytest' } as never)
    await clock.settle()
    await $.turn.complete({ turnId: 't1', reason: 'aborted', answer: '', durationMs: 1, isAborted: true } as never)
    await $.turn.start({ turnId: 't2' } as never)
    const fresh = $.tool.call({ tool: 'Bash', command: 'make build' } as never)
    await clock.settle()
    await finish('Bash', { result: 'x', isError: true, text: '3 failed' })
    await old
    expect(await caption($, /on it: Bash/)).toBe(true)
    await finish('Bash')
    await fresh
  })

  test("a commit's own exit code: `|| true` needs git's word; a failed push keeps the sardine", async ($, on) => {
    const { clock, saved, finish } = setUp(on)
    await $.turn.start({ turnId: 't1' } as never)
    const failed = $.tool.call({ tool: 'Bash', command: 'git commit -m x || true' } as never)
    await clock.settle()
    await finish('Bash', { result: 'x', text: 'nothing to commit, working tree clean' })
    await failed
    expect(saved.sardines).toBeUndefined()
    const pushed = $.tool.call({ tool: 'Bash', command: 'git add -A && git commit -m x && git push' } as never)
    await clock.settle()
    await finish('Bash', { result: 'x', isError: true, text: '[main 1a2b3c4] x\n 1 file changed\nerror: failed to push some refs' })
    await pushed
    expect((saved.sardines as { today: number }).today).toBe(1)
  })

  test('`npm test 2>&1` trusts its own exit code: passing output that says FAIL still dances', async ($, on) => {
    const { clock, finish } = setUp(on)
    await $.turn.start({ turnId: 't1' } as never)
    const run = $.tool.call({ tool: 'Bash', command: 'npm test 2>&1' } as never)
    await clock.settle()
    await finish('Bash', { result: 'x', text: '✓ handles the FAIL state\nTests: 41 passed' })
    await run
    expect(await caption($, /dances: the tests passed/)).toBe(true)
  })

  test('a turn ending as the next begins: the new turn wins, no nap in the middle of it', async ($, on) => {
    const { clock } = setUp(on)
    await $.turn.start({ turnId: 't1' } as never)
    await clock.settle()
    const ending = $.turn.complete({ turnId: 't1', reason: 'answer', answer: 'ok', durationMs: 1, isAborted: false } as never)
    const starting = $.turn.start({ turnId: 't2' } as never)
    await Promise.all([ending, starting])
    await clock.advance(13_000)
    expect(await caption($, /thinking it over/)).toBe(true)
  })

  const yardText = async ($: any) => {
    const ui = await $.ui.mount({ plugin: 'cretan-cat', surface: 'terminal', ...BAND, props: PROPS })
    const raster = (await ui.find({ type: 'Raster' })) as { props: { cells: string } } | undefined
    await ui.unmount()
    return cellsText(raster?.props.cells ?? '')
  }
  const cmd = async ($: any, args: string) =>
    (await $.command.run({ command: 'cat', args, origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 100 } } as never)).text as string

  test('/cat name, language, songs and temper write the /config rows where there are some', async ($, on) => {
    const writes: [string, unknown][] = []
    let deny: string | undefined
    const row = (field: string) => ({ key: `cretan-cat.${field}`, label: field, kind: 'text', value: '', provider: { plugin: 'cretan-cat', tier: 'user' }, isLocked: false })
    on('config.list', async () => ({ value: ['name', 'language', 'songs', 'temper'].map(row) }) as never)
    on('config.set', async (_$, e) => {
      writes.push([e.key, e.value])
      return (deny === undefined ? { value: e.value } : { deny }) as never
    })
    on('store.get', async () => ({ value: undefined }))
    on('store.set', async () => ({ value: undefined }))
    expect(await cmd($, 'name')).toMatch(/called Manousos/)
    expect(await cmd($, 'name Luna Bella')).toMatch(/called Luna Bella now/)
    expect(await cmd($, 'name ' + 'x'.repeat(21))).toMatch(/too long/)
    // The old name still works, and means spanish.
    expect(await cmd($, 'language rioplatense')).toMatch(/speaks spanish now/)
    expect(await cmd($, 'lang klingon')).toMatch(/greek, english, spanish changes it/)
    expect(await cmd($, 'songs english')).toMatch(/sings in english now/)
    expect(await cmd($, 'songs')).toMatch(/greek, english, spanish changes it/)
    expect(await cmd($, 'temper on')).toMatch(/has a temper now/)
    expect(writes).toEqual([
      ['cretan-cat.name', 'Luna Bella'],
      ['cretan-cat.language', 'spanish'],
      ['cretan-cat.songs', 'english'],
      ['cretan-cat.temper', 'on'],
    ])
    deny = 'set by your organization'
    expect(await cmd($, 'temper off')).toMatch(/Couldn't change the temper: set by your organization/)
  })

  test('with no /config row to write, /cat keeps the setting itself, until /config changes', async ($, on) => {
    const { clock, saved } = setUp(on)
    on('config.list', async () => ({ value: [] }) as never)
    on('command.register', async () => ({ value: undefined }) as never)
    on('session.start', async (_$, e) => ({ cwd: e.cwd }) as never)
    expect(await cmd($, 'name Luna')).toMatch(/called Luna now/)
    expect(await caption($, /Luna is napping/)).toBe(true)
    expect(saved.settings).toEqual({ name: { value: 'Luna', over: 'Manousos' } })
    // A new session keeps it, as /config still holds what it was set over.
    await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true } as never)
    await clock.settle()
    expect(await caption($, /Luna is napping/)).toBe(true)
    // Set over a /config value that has changed since: /config wins.
    saved.settings = { name: { value: 'Luna', over: 'Felix' } }
    await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true } as never)
    await clock.settle()
    expect(await caption($, /Manousos is napping/)).toBe(true)
    expect(saved.settings).toEqual({})
  })

  test('a name of your own: in the caption, and in what Clawd says, Greek too', { options: { name: 'Luna' } }, async ($, on) => {
    const { clock } = setUp(on)
    expect(await caption($, /Luna is napping/)).toBe(true)
    await $.turn.start({ turnId: 't1' } as never)
    await clock.settle()
    const text = await yardText($)
    expect(text).toContain('Luna')
    expect(text).not.toContain('Μανούσο')
    expect(await cmd($, 'stats')).toMatch(/^Luna's stats/)
  })

  for (const [songs, sung] of [
    ['english', /\b(the|and|my)\b.*\b(the|and|my)\b/],
    ['spanish', /\b(que|el|la|me|y)\b.*\b(que|el|la|me|y)\b/],
  ] as const) {
    test(`songs ${songs}, Clawd in Greek: each keeps its own language`, { options: { songs } }, async ($, on) => {
      const { clock } = setUp(on)
      await $.turn.start({ turnId: 't1' } as never)
      await $.turn.complete({ turnId: 't1', reason: 'answer', answer: 'ok', durationMs: 1, isAborted: false } as never)
      await clock.settle()
      const text = await yardText($)
      expect(text).toContain('Μπράβο Μανούσο')
      expect(text).toMatch(sung)
    })
  }

  test('/cat asturias brings her back whole; /cat reset brings Manousos back as he came', async ($, on) => {
    const { clock, saved, finish } = setUp(on)
    on('config.list', async () => ({ value: [] }) as never)
    expect(await cmd($, 'asturias')).toMatch(/^Asturias is here now\. ¿Qué querés\? \(\/cat manousos brings Manousos back\)$/)
    expect(saved.settings).toEqual({
      coat: { value: 'ginger', over: 'manousos' },
      name: { value: 'Asturias', over: 'Manousos' },
      language: { value: 'spanish', over: 'greek' },
      songs: { value: 'spanish', over: 'greek' },
      temper: { value: 'on', over: 'off' },
    })
    expect(await caption($, /Asturias is napping/)).toBe(true)
    expect(await cmd($, 'temper')).toMatch(/Temper is on/)
    // Her own answers: waiting on you, and her coplas when the work is done.
    await $.turn.start({ turnId: 't1' } as never)
    const bash = $.tool.call({ tool: 'Bash', command: 'rm -rf build' } as never)
    await clock.settle()
    await $.classic.PermissionRequest({ tool_name: 'Bash', tool_input: { command: 'rm -rf build' } } as never)
    await clock.advance(400)
    expect(await caption($, /Asturias is waiting for you/)).toBe(true)
    expect(await yardText($)).toContain('¿Qué querés?')
    await finish('Bash')
    await bash
    await $.turn.complete({ turnId: 't1', reason: 'answer', answer: 'ok', durationMs: 1, isAborted: false } as never)
    await clock.advance(3_600)
    const sung = await yardText($)
    expect(sung).toMatch(/Bien ahí, Asturias/)
    expect(sung).toMatch(/\b(que|el|la|me|y)\b.*\b(que|el|la|me|y)\b/)
    // And back.
    expect(await cmd($, 'reset')).toMatch(/Manousos is back/)
    expect(kept(saved, 'coat')).toBe('manousos')
    expect(await cmd($, 'temper')).toMatch(/Temper is off/)
    expect(await cmd($, 'songs')).toMatch(/sings in greek/)
    await clock.advance(13_000)
    expect(await caption($, /Manousos is napping/)).toBe(true)
  })

  test('/cat asturias saves her coat before any /config write (a write may reload the plugin); /cat manousos is him whole', async ($, on) => {
    const saved: Record<string, unknown> = {}
    const coatAtWrite: unknown[] = []
    const row = (field: string) => ({ key: `cretan-cat.${field}`, label: field, kind: 'text', value: '', provider: { plugin: 'cretan-cat', tier: 'user' }, isLocked: false })
    on('config.list', async () => ({ value: ['name', 'coat', 'language', 'songs', 'temper'].map(row) }) as never)
    on('config.set', async (_$, e) => {
      coatAtWrite.push(kept(saved, 'coat'))
      return { value: e.value } as never
    })
    on('store.get', async (_$, e) => ({ value: saved[e.key] }))
    on('store.set', async (_$, e) => {
      saved[e.key] = e.value
      return { value: undefined }
    })
    await cmd($, 'asturias')
    expect(coatAtWrite.length).toBeGreaterThan(0)
    expect(coatAtWrite.every(c => c === 'ginger')).toBe(true)
    expect(await cmd($, 'manousos')).toMatch(/Manousos is back/)
    expect(kept(saved, 'coat')).toBe('manousos')
    expect(await cmd($, 'temper')).toMatch(/Temper is off/)
    // A coat alone: /cat coat manousos keeps her Asturias.
    await cmd($, 'asturias')
    expect(await cmd($, 'coat manousos')).toMatch(/Asturias is wearing the manousos coat/)
    expect(await cmd($, 'coat')).toMatch(/\/cat coat manousos, ginger, tuxedo/)
  })

  test('/cat asturias writes the /config rows, and leaves a locked one alone', async ($, on) => {
    const writes: [string, unknown][] = []
    const row = (field: string) => ({ key: `cretan-cat.${field}`, label: field, kind: 'text', value: '', provider: { plugin: 'cretan-cat', tier: 'user' }, isLocked: field === 'temper' })
    on('config.list', async () => ({ value: ['name', 'language', 'songs', 'temper'].map(row) }) as never)
    on('config.set', async (_$, e) => {
      writes.push([e.key, e.value])
      return { value: e.value } as never
    })
    const saved: Record<string, unknown> = {}
    on('store.get', async (_$, e) => ({ value: saved[e.key] }))
    on('store.set', async (_$, e) => {
      saved[e.key] = e.value
      return { value: undefined }
    })
    expect(await cmd($, 'asturias')).toMatch(/Couldn't change the temper is locked in \/config/)
    expect(writes).toEqual([
      ['cretan-cat.name', 'Asturias'],
      ['cretan-cat.language', 'spanish'],
      ['cretan-cat.songs', 'spanish'],
    ])
    expect(await cmd($, 'temper')).toMatch(/Temper is off/)
    expect((saved.settings as Record<string, unknown>).temper).toBeUndefined()
  })

  test('in Greek, Clawd calls Asturias Αστούριας', { options: { name: 'asturias' } }, async ($, on) => {
    const { clock } = setUp(on)
    await $.turn.start({ turnId: 't1' } as never)
    await clock.settle()
    expect(await yardText($)).toContain('Αστούριας')
    expect(await caption($, /Asturias is thinking/)).toBe(true)
  })

  test('language spanish: Clawd says it the Buenos Aires way', { options: { language: 'spanish' } }, async ($, on) => {
    const { clock } = setUp(on)
    await $.turn.start({ turnId: 't1' } as never)
    await clock.settle()
    expect(await yardText($)).toMatch(/a laburar|Qué hacés ahí|Dale Manousos/)
  })

  test('kept by /cat under the old name, rioplatense is spanish', async ($, on) => {
    const { saved } = setUp(on)
    saved.settings = { language: { value: 'rioplatense', over: 'greek' } }
    on('session.start', async (_$: unknown, e: { cwd: string }) => ({ cwd: e.cwd }) as never)
    on('command.register', async () => ({ value: undefined }) as never)
    on('agent.list', async () => ({ value: [] }) as never)
    await $.session.start({ cwd: '/tmp' } as never)
    expect(await cmd($, 'language')).toMatch(/Clawd speaks spanish/)
  })

  // Nudges come while Claude thinks; with a temper, some earn a slap or a snub.
  const tempers = async ($: any, on: any) => {
    const { clock } = setUp(on)
    on('session.start', async (_$: unknown, e: { cwd: string }) => ({ cwd: e.cwd }) as never)
    on('command.register', async () => ({ value: undefined }) as never)
    on('agent.list', async () => ({ value: [] }) as never)
    await $.session.start({ cwd: '/tmp' } as never)
    await $.turn.start({ turnId: 't1' } as never)
    await clock.settle()
    const seen = new Set<string>()
    for (let i = 0; i < 30; i++) {
      await clock.advance(2_000)
      if (await caption($, /slapped Clawd/)) seen.add('slap')
      if (await caption($, /ignoring Clawd/)) seen.add('snub')
    }
    return { seen, clock }
  }

  test('temper off (the default): nudges never earn a slap or a snub', async ($, on) => {
    expect((await tempers($, on)).seen.size).toBe(0)
  })

  test('temper on: nag the cat and it slaps Clawd or ignores him, then gets back to work', { options: { temper: 'on' } }, async ($, on) => {
    const { seen, clock } = await tempers($, on)
    expect(seen.has('slap')).toBe(true)
    expect(seen.has('snub')).toBe(true)
    await clock.advance(4_000)
    expect(await caption($, /thinking it over|slapped|ignoring/)).toBe(true)
  })

  // Turns until the cat is on your keyboard, or twenty of them; the turn it
  // is on the keys is left running.
  const untilOnKeys = async ($: any, clock: any) => {
    for (let i = 0; i < 20; i++) {
      await $.turn.start({ turnId: `k${i}` } as never)
      await clock.settle()
      if (await caption($, /on your keyboard/)) return `k${i}`
      await $.turn.complete({ turnId: `k${i}`, reason: 'answer', answer: '', durationMs: 1, isAborted: false } as never)
      await clock.advance(13_000)
    }
    return undefined
  }

  test('temper off: the cat never lies on your keyboard', async ($, on) => {
    const { clock } = setUp(on)
    expect(await untilOnKeys($, clock)).toBeUndefined()
  })

  test('temper on: some turns it lies on your keyboard, until petted or the turn ends', { options: { temper: 'on' } }, async ($, on) => {
    const { clock } = setUp(on)
    const turn = await untilOnKeys($, clock)
    expect(turn).toBeDefined()
    // Clawd tells it to get off; the cat asks for cuddles, no gibberish.
    const yard = await yardText($)
    expect(yard).toContain('Μανούσο, κατέβα από το πληκτρολόγιο!')
    expect(yard).not.toMatch(/asdfj|ñññ|qwww|gggg/)
    expect(yard).toContain('Και τα χάδια μου;')
    const ui = await $.ui.mount({ plugin: 'cretan-cat', surface: 'terminal', ...BAND, props: PROPS })
    await ui.press({ key: 'pet' })
    await clock.settle()
    await ui.unmount()
    expect(await caption($, /Manousos purrs <3/)).toBe(true)
    expect(await caption($, /on your keyboard/)).toBe(false)
    // Unpetted, it gets off by itself when the work is done: idle, it naps.
    await $.turn.complete({ turnId: turn, reason: 'answer', answer: '', durationMs: 1, isAborted: false } as never)
    const again = await untilOnKeys($, clock)
    expect(again).toBeDefined()
    await $.turn.complete({ turnId: again, reason: 'answer', answer: '', durationMs: 1, isAborted: false } as never)
    await clock.advance(13_000)
    expect(await caption($, /on your keyboard/)).toBe(false)
    expect(await caption($, /Manousos is napping/)).toBe(true)
  })

  test('on your keyboard, the cat still gets up when Claude needs you', { options: { temper: 'on' } }, async ($, on) => {
    const { clock, finish } = setUp(on)
    expect(await untilOnKeys($, clock)).toBeDefined()
    const bash = $.tool.call({ tool: 'Bash', command: 'rm -rf build' } as never)
    await clock.settle()
    await $.classic.PermissionRequest({ tool_name: 'Bash', tool_input: { command: 'rm -rf build' } } as never)
    await clock.advance(400)
    expect(await caption($, /waiting for you: answer the Bash prompt/)).toBe(true)
    expect(await yardText($)).not.toContain('Και τα χάδια μου;')
    await finish('Bash')
    await bash
    // The prompt answered, the turn still on: it is back on the keys.
    expect(await caption($, /on your keyboard/)).toBe(true)
  })

  test('with a temper, the first pets of a session are not always swats', { options: { temper: 'on' } }, async ($, on) => {
    mock.clock(on, { now: 1_700_000_000_000 })
    on('store.get', async () => ({ value: undefined }))
    on('store.set', async () => ({ value: undefined }))
    on('command.register', async () => ({ value: undefined }) as never)
    on('session.start', async (_$, e) => ({ cwd: e.cwd }) as never)
    await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true } as never)
    const pets = [await cmd($, 'pet'), await cmd($, 'pet'), await cmd($, 'pet')]
    expect(pets.some(t => /purrs/.test(t))).toBe(true)
    expect(pets.every(t => /purrs|swats your hand: Εεε! Χωρίς χέρια\./.test(t))).toBe(true)
  })

  test('the yard draws the slap, the snub and the keyboard, in every coat', () => {
    for (const coat of ['manousos', 'ginger', 'tuxedo'] as const) {
      const keys = { coat, mood: 'think', t: 3, since: 3, cols: 110, rows: 11, hour: 12, month: 6 } as const
      expect(drawCat({ ...keys, isOnKeys: true })).not.toBe(drawCat(keys))
      const base = { coat, t: 3, cols: 110, rows: 11, hour: 12, month: 6 } as const
      const think = drawCat({ ...base, mood: 'think', since: 0.5 })
      expect(drawCat({ ...base, mood: 'slap', since: 0.5 })).not.toBe(think)
      expect(drawCat({ ...base, mood: 'slap', since: 0.1 })).not.toBe(drawCat({ ...base, mood: 'slap', since: 0.25 }))
      expect(drawCat({ ...base, mood: 'snub', since: 0.5 })).not.toBe(think)
      // A swat looks nothing like a purr.
      expect(drawCat({ ...base, mood: 'nap', since: 9, petted: 0.5, isSwatted: true })).not.toBe(drawCat({ ...base, mood: 'nap', since: 9, petted: 0.5 }))
    }
  })

  test('the topic is what the work is about, as written: not when it is due, nor the verb', () => {
    expect(topicOf('refactor the BigQuery cost report for October')).toBe('BigQuery cost report')
    expect(topicOf('investigate the Datastream error alert today')).toBe('Datastream error alert')
    expect(topicOf('arregla el informe de costes para octubre')).toBe('informe costes')
    expect(topicOf('διόρθωσε το checkout service')).toBe('checkout service')
    // Nothing to speak of: Clawd falls back to a general nudge.
    expect(topicOf('can u turn it on?')).toBe('')
    // Three words when they fit, else fewer; a very long word is cut.
    expect(topicOf('fix the payments reconciliation job')).toBe('reconciliation job')
    expect([...topicOf('supercalifragilisticexpialidociousness')].length).toBe(26)
  })

  test('the yard follows the clock and the helpers', () => {
    const base = { mood: 'think', coat: 'manousos', t: 3, since: 3, cols: 110, rows: 11 } as const
    const day = drawCat({ ...base, hour: 12, month: 6 })
    expect(drawCat({ ...base, hour: 23, month: 6 })).not.toBe(day)
    expect(drawCat({ ...base, hour: 12, month: 0 })).not.toBe(day)
    expect(drawCat({ ...base, hour: 12, month: 6, kittens: 2 })).not.toBe(day)
    // Snow on the short band too.
    const short = { ...base, rows: 8 }
    expect(drawCat({ ...short, hour: 12, month: 0 })).not.toBe(drawCat({ ...short, hour: 12, month: 6 }))
    // More than four helpers still draws four kittens.
    expect(drawCat({ ...base, hour: 12, month: 6, kittens: 9 })).toBe(drawCat({ ...base, hour: 12, month: 6, kittens: 4 }))
  })
})

// The characters of a Raster's cells, row after row, as one string.
function cellsText(b64: string) {
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  const bytes: number[] = []
  for (let i = 0; i < b64.length; i += 4) {
    const v = [0, 1, 2, 3].map(k => (b64[i + k] === '=' ? 0 : A.indexOf(b64[i + k]!)))
    const n = (v[0]! << 18) | (v[1]! << 12) | (v[2]! << 6) | v[3]!
    bytes.push((n >> 16) & 255, (n >> 8) & 255, n & 255)
  }
  let out = ''
  for (let i = 0; i + 11 < bytes.length; i += 12) out += String.fromCodePoint(bytes[i]! | (bytes[i + 1]! << 8) | (bytes[i + 2]! << 16))
  return out
}

// resolution: high, and the low path it must leave exactly as it was.
const KITTY = { TERM: 'xterm-kitty', KITTY_WINDOW_ID: '1' }
const HIGH = { options: { resolution: 'high' } } as const
const run = async ($: any, args: string) =>
  (await $.command.run({ command: 'cat', args, origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 100 } } as never)).text as string

describe('cretan-cat at high resolution', () => {
  const setUp = (on: any) => {
    const clock = mock.clock(on, { now: 1_700_000_000_000 })
    on('store.get', async () => ({ value: undefined }))
    on('store.set', async () => ({ value: undefined }))
    on('turn.start', async (_$: unknown, e: { turnId: string }) => ({ turnId: e.turnId }))
    return { clock }
  }
  test('/cat resolution high|low writes the /config row; /cat help and /cat config list it', async ($, on) => {
    const writes: [string, unknown][] = []
    on('config.list', async () => ({ value: [{ key: 'cretan-cat.resolution', label: 'resolution', kind: 'text', value: 'low', provider: { plugin: 'cretan-cat', tier: 'user' }, isLocked: false }] }) as never)
    on('config.set', async (_$, e) => {
      writes.push([e.key, e.value])
      return { value: e.value } as never
    })
    on('store.get', async () => ({ value: undefined }))
    on('store.set', async () => ({ value: undefined }))
    expect(await run($, 'config')).toMatch(/^ {2}resolution +low$/m)
    expect(await run($, 'resolution')).toMatch(/drawn at low resolution\. \/cat resolution high or low/)
    expect(await run($, 'resolution ultra')).toMatch(/\/cat resolution high or low/)
    expect(await run($, 'resolution high')).toMatch(/high resolution now/)
    expect(await run($, 'resolution')).toMatch(/drawn at high resolution/)
    expect(await run($, 'config')).toMatch(/^ {2}resolution +high\b/m)
    expect(await run($, 'help')).toMatch(/^ {2}\/cat resolution high\|low +.*\(high now\)$/m)
    expect(await run($, 'resolution low')).toMatch(/in cells again/)
    expect(writes).toEqual([
      ['cretan-cat.resolution', 'high'],
      ['cretan-cat.resolution', 'low'],
    ])
  })

  test('/cat asturias and /cat reset leave the resolution alone', HIGH, async ($, on) => {
    on('config.list', async () => ({ value: [] }) as never)
    on('store.get', async () => ({ value: undefined }))
    on('store.set', async () => ({ value: undefined }))
    await run($, 'asturias')
    await run($, 'reset')
    expect(await run($, 'config')).toMatch(/^ {2}resolution +high\b/m)
  })

  test('high, in a terminal that shows pictures: the yard is an Image of the band\'s cells, its text Rasters over it', HIGH, async ($, on) => {
    mock.env(on, KITTY)
    const { clock } = setUp(on)
    on('prompt.submit', async (_$, e) => ({ text: e.text }) as never)
    await $.prompt.submit({ text: 'fix the failing checkout tests' } as never)
    await $.turn.start({ turnId: 't1' } as never)
    await clock.settle()
    const ui = await $.ui.mount({ plugin: 'cretan-cat', surface: 'terminal', ...BAND, props: PROPS })
    const image = (await ui.find({ type: 'Image' })) as unknown as { props: { columns: number; rows: number; alt: string; source: { rgba: string; width: number; height: number } } }
    expect(image).toBeDefined()
    expect(image.props.columns).toBe(120)
    expect(image.props.rows).toBe(11)
    expect(image.props.source.width).toBe(120 * HD_SCALE)
    expect(image.props.source.height).toBe(22 * HD_SCALE)
    expect(image.props.source.rgba.length).toBe(Math.ceil((120 * HD_SCALE * 22 * HD_SCALE * 4) / 3) * 4)
    expect(image.props.alt).toMatch(/Clawd and Manousos in the yard/)
    // No yard of cells under it; Clawd's words are cells over it.
    expect(await ui.find({ type: 'Raster', key: 'manousos' })).toBeUndefined()
    const texts = (await ui.findAll({ type: 'Raster' })) as unknown as { props: { cells: string } }[]
    expect(texts.length).toBeGreaterThan(0)
    expect(texts.map(r => cellsText(r.props.cells)).join('')).toContain('checkout tests')
    // The caption is still under the yard.
    expect(await ui.find({ type: 'Text', text: /Manousos is thinking/ })).toBeDefined()
    await ui.unmount()
  })

  for (const [why, env] of [
    ['a terminal that shows no pictures', { TERM: 'xterm-256color', TERM_PROGRAM: 'Apple_Terminal' }],
    ['tmux, even in kitty', { ...KITTY, TMUX: '/tmp/tmux-501/default,1,0', TERM: 'tmux-256color' }],
    ['GNU screen, even in Ghostty', { TERM: 'screen-256color', TERM_PROGRAM: 'ghostty', STY: '1.pts' }],
    ['no environment at all', {}],
    ["VS Code's terminal, though Ghostty's variable leaked in", { TERM: 'xterm-256color', TERM_PROGRAM: 'vscode', GHOSTTY_RESOURCES_DIR: '/Applications/Ghostty.app/Contents/Resources/ghostty' }],
    ['Zellij, even in Ghostty', { TERM: 'xterm-ghostty', TERM_PROGRAM: 'ghostty', ZELLIJ: '0' }],
    ['ssh, even from kitty', { ...KITTY, SSH_CONNECTION: '10.0.0.2 51234 10.0.0.9 22', SSH_TTY: '/dev/ttys004' }],
    ["Neovim's terminal, even in kitty", { ...KITTY, NVIM: '/tmp/nvim.501/0' }],
    ["WezTerm, though kitty's variable leaked in", { TERM: 'xterm-256color', TERM_PROGRAM: 'WezTerm', KITTY_WINDOW_ID: '3' }],
  ] as const) {
    test(`high, in ${why}: the yard stays in cells`, HIGH, async ($, on) => {
      mock.env(on, env as Record<string, string>)
      const ui = await $.ui.mount({ plugin: 'cretan-cat', surface: 'terminal', ...BAND, props: PROPS })
      expect(await ui.find({ type: 'Image' })).toBeUndefined()
      expect(await ui.find({ type: 'Raster', key: 'manousos' })).toBeDefined()
      await ui.unmount()
    })
  }

  test('high on the desktop: the SVG yard, as at low', HIGH, async ($, on) => {
    mock.env(on, KITTY)
    const desk = await $.ui.mount({ plugin: 'cretan-cat', surface: 'desktop', ...BAND, props: PROPS })
    expect(await desk.find({ type: 'Svg' })).toBeDefined()
    await desk.unmount()
  })

  test('low (the default), in a terminal that shows pictures: cells, as ever', async ($, on) => {
    mock.env(on, KITTY)
    const ui = await $.ui.mount({ plugin: 'cretan-cat', surface: 'terminal', ...BAND, props: PROPS })
    expect(await ui.find({ type: 'Image' })).toBeUndefined()
    expect(await ui.find({ type: 'Raster', key: 'manousos' })).toBeDefined()
    await ui.unmount()
  })

  test('high: the frame loop swaps the picture by blit, only when it changed; a terminal that draws the alt sends it back to cells', HIGH, async ($, on) => {
    mock.env(on, KITTY)
    const clock = mock.clock(on, { now: 1_700_000_000_000 })
    on('store.get', async () => ({ value: undefined }))
    on('store.set', async () => ({ value: undefined }))
    on('command.register', async () => ({ value: undefined }) as never)
    on('session.start', async (_$, e) => ({ cwd: e.cwd }) as never)
    on('turn.start', async (_$: unknown, e: { turnId: string }) => ({ turnId: e.turnId }) as never)
    on('turn.complete', async (_$: unknown, e: { answer: string }) => ({ text: e.answer }) as never)
    let deny: string | undefined
    const blits: { key: string; isPicture: boolean }[] = []
    on('ui.blit', async (_$, e) => {
      blits.push({ key: e.key, isPicture: 'source' in e })
      return (deny === undefined ? { value: {} } : { value: { deny } }) as never
    })
    await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true } as never)
    // Done, he sits and sings: the text stays put and the picture changes.
    await $.turn.start({ turnId: 't1' } as never)
    await $.turn.complete({ turnId: 't1', reason: 'answer', answer: 'ok', durationMs: 1, isAborted: false } as never)
    await clock.settle()
    const ui = await $.ui.mount({ plugin: 'cretan-cat', surface: 'terminal', ...BAND, props: PROPS })
    expect(await ui.find({ type: 'Image' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /purrs: done/ })).toBeDefined()
    await clock.advance(1_000)
    // Five frames a second at most; never a Raster of the whole yard.
    const pictures = blits.filter(b => b.isPicture)
    expect(pictures.length).toBeGreaterThan(0)
    expect(pictures.length).toBeLessThanOrEqual(5)
    expect(blits.every(b => b.key !== 'manousos' || b.isPicture)).toBe(true)
    // The terminal draws the alt instead: cells from then on.
    deny = 'the Image draws its alt here: no placeholder images'
    await clock.advance(1_000)
    expect(await ui.find({ type: 'Image' })).toBeUndefined()
    expect(await ui.find({ type: 'Raster', key: 'manousos' })).toBeDefined()
    await ui.unmount()
  })

  for (const [why, env] of [
    ['cmux (Ghostty inside, its TERM plain xterm)', { TERM: 'xterm-256color', TERM_PROGRAM: 'ghostty', GHOSTTY_RESOURCES_DIR: '/Applications/cmux.app/Contents/Resources/ghostty' }],
    ['Ghostty', { TERM: 'xterm-ghostty', TERM_PROGRAM: 'ghostty', GHOSTTY_RESOURCES_DIR: '/Applications/Ghostty.app/Contents/Resources/ghostty' }],
    ['kitty', KITTY],
  ] as const) {
    test(`high, in ${why}: the yard is a picture`, HIGH, async ($, on) => {
      mock.env(on, env as Record<string, string>)
      const ui = await $.ui.mount({ plugin: 'cretan-cat', surface: 'terminal', ...BAND, props: PROPS })
      expect(await ui.find({ type: 'Image' })).toBeDefined()
      await ui.unmount()
    })
  }

  // A session at high resolution in kitty, its blits answered by `answer`.
  const hdSession = async ($: any, on: any, answer: () => string | undefined) => {
    mock.env(on, KITTY)
    const clock = mock.clock(on, { now: 1_700_000_000_000 })
    on('store.get', async () => ({ value: undefined }))
    on('store.set', async () => ({ value: undefined }))
    on('config.list', async () => ({ value: [] }) as never)
    on('command.register', async () => ({ value: undefined }) as never)
    on('session.start', async (_$: unknown, e: { cwd: string }) => ({ cwd: e.cwd }) as never)
    on('turn.start', async (_$: unknown, e: { turnId: string }) => ({ turnId: e.turnId }) as never)
    const blits: { key: string; isPicture: boolean }[] = []
    on('ui.blit', async (_$: unknown, e: { key: string }) => {
      blits.push({ key: e.key, isPicture: 'source' in e })
      const deny = answer()
      return (deny === undefined ? { value: {} } : { value: { deny } }) as never
    })
    await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true } as never)
    await clock.settle()
    return { clock, blits }
  }

  for (const mood of ['nap', 'think'] as const) {
    test(`high, ${mood === 'nap' ? 'napping by day (a still picture)' : 'thinking'}: a terminal that draws the alt sends the yard back to cells within a second`, HIGH, async ($, on) => {
      const { clock } = await hdSession($, on, () => 'the Image draws its alt here: no placeholder images')
      if (mood === 'think') {
        await $.turn.start({ turnId: 't1' } as never)
        await clock.settle()
      }
      const ui = await $.ui.mount({ plugin: 'cretan-cat', surface: 'terminal', ...BAND, props: PROPS })
      expect(await ui.find({ type: 'Image' })).toBeDefined()
      await clock.advance(1_000)
      expect(await ui.find({ type: 'Image' })).toBeUndefined()
      expect(await ui.find({ type: 'Raster', key: 'manousos' })).toBeDefined()
      expect(await run($, 'config')).toMatch(/resolution +high, in cells: the terminal refused the picture/)
      // Asked for again, it tries pictures again.
      expect(await run($, 'resolution high')).toMatch(/high resolution now/)
      await ui.redraw()
      expect(await ui.find({ type: 'Image' })).toBeDefined()
      await ui.unmount()
    })
  }

  test("high: a second of 'not mounted' or 'another size' refusals is no word on pictures; the yard stays a picture", HIGH, async ($, on) => {
    let deny: string | undefined = 'nothing of this plugin is mounted there'
    const { clock, blits } = await hdSession($, on, () => deny)
    await $.turn.start({ turnId: 't1' } as never)
    await clock.settle()
    const ui = await $.ui.mount({ plugin: 'cretan-cat', surface: 'terminal', ...BAND, props: PROPS })
    await clock.advance(500)
    deny = 'the size is not the mounted one'
    await clock.advance(500)
    deny = undefined
    await clock.advance(1_000)
    expect(await ui.find({ type: 'Image' })).toBeDefined()
    expect(blits.filter(b => b.isPicture).length).toBeGreaterThan(3)
    await ui.unmount()
  })

  test('every mood, coat, light and season draws at high resolution, at 120x11', () => {
    const moods = ['nap', 'think', 'tool', 'happy', 'oops', 'wait', 'dance', 'hiss', 'feast', 'bored', 'slap', 'snub'] as const
    const extras = [{}, { petted: 0.5 }, { petted: 0.5, isSwatted: true }, { isOnKeys: true }, { kittens: 4 }]
    let n = 0
    for (const mood of moods) {
      for (const coat of ['manousos', 'ginger', 'tuxedo'] as const) {
        for (const hour of [7, 12, 19, 23]) {
          for (const month of [0, 6]) {
            for (const extra of extras) {
              const scene = { mood, coat, hour, month, cols: 120, rows: 11, t: 2.7, since: 0.4, said: 'Τι κάνεις;', reply: ['Νιάου, νιάου'], ...extra }
              const f = drawHd(scene)
              expect(f.width).toBe(120 * HD_SCALE)
              expect(f.height).toBe(22 * HD_SCALE)
              n++
            }
          }
        }
      }
    }
    expect(n).toBe(12 * 3 * 4 * 2 * 5)
  })

  test('the picture has his coat on, every pose of his drawn, and the sky left clear', () => {
    const base = { mood: 'think', t: 3, since: 3, cols: 120, rows: 11, hour: 12, month: 6 } as const
    const pic = (coat: 'manousos' | 'ginger' | 'tuxedo') => drawHd({ ...base, coat }).rgba
    const ginger = pic('ginger')
    expect(ginger.join()).not.toBe(pic('manousos').join())
    expect(ginger.join()).not.toBe(pic('tuxedo').join())
    // The top-left of the sky shows the terminal's own background.
    expect(ginger[3]).toBe(0)
    // Ginger fur, somewhere in the picture.
    const [r, g, b] = COATS.ginger.f!
    let found = false
    for (let i = 0; i < ginger.length; i += 4) if (ginger[i] === r && ginger[i + 1] === g && ginger[i + 2] === b) found = true
    expect(found).toBe(true)
  })

  test('low resolution is byte for byte what it was before high resolution came', () => {
    const scenes = goldenScenes()
    expect(scenes.map(s => fnv(drawCat(s)))).toEqual(GOLDEN)
  })
})

// FNV-1a of drawCat's cells for each of goldenScenes(), as 1.8.0 drew them.
const GOLDEN = [
  'e3be262f', '259265d5', 'fde26e8d', '904447d8', 'ad83a9a8', '5d3b36b8', 'ff17970d', '3fb4e9fa', '55f4ed78',
  'c7ffc273', '84b20ca4', '57c5f5c0', 'eec5ab59', 'b19befe7', 'c0504b3f', '7cad6c37', '8831be72', 'bf7a7c03',
  '3e64792f', 'f863e783', '1ba7972f', '44bff20b', 'd43727b6', '952cb03e', '386a69bb', '80efd143', 'e154af41',
  '94045377', 'df89f5b5', 'd165ce84', '3f369367', '9cbf8001', 'e5067a1e', '0edae51e', '0170e936', 'e978e5a8',
  '07129780', '3c863758', '9d617638', '990e8e57', '8a36dda9', '8cb3cdff', 'f7f01234', 'c96950de', 'd6cb343a',
  'd8a3b0b2', '27ff2a34', 'f6232817', 'f764629b', '83eee854', '3669cc71', 'a3e1cb2a', '5c3ab5cd', '3f212e5a',
  '7b9e1eae', '7f4dc557', 'd7462b18', '2b731461', '5d64f3a0', '4fcc0371', '5c2361e1', 'abbcfe67', 'f977fd0d',
  '6e859cdf', 'f7d71d2d', 'ac8ada65', 'b88b46f6', '18a3cf61', '545dbcca', '52dd65f1', '3fa411cc', '885040bd',
  '860443fa', '29504167', '26cf61d8', '402dcdbc', '59777edd', 'cce1f791', '5aa5aa10', 'a55b618f', '73835187',
  'de5a5c1f', 'f3d6002d', '8ae92f7c', '0815d754', '31d6d307', 'e7c5d3b8', '397cbbf2', '17d29608', '59e52cd1',
  'f596b7cf', '334d2f96', '5219ddaf', 'd7bfc68c', 'c5a04aea', '0055a333', 'eaf9b719', '3627459f', '02a8508c',
  '5a476c78', 'ce175e83', '03b20d33', 'e61a85fd', 'd46486a0', '2971b933', 'c34da751', '2f282a58', 'c50bf7a9',
]

function goldenScenes() {
  const moods = ['nap', 'think', 'tool', 'happy', 'oops', 'wait', 'dance', 'hiss', 'feast', 'bored', 'slap', 'snub'] as const
  const coats = ['manousos', 'ginger', 'tuxedo'] as const
  const out: Parameters<typeof drawCat>[0][] = []
  let i = 0
  for (const mood of moods) {
    for (const coat of coats) {
      for (const [cols, rows] of [[120, 11], [160, 11], [80, 8]] as const) {
        i++
        out.push({
          mood, coat, cols, rows, t: 1.3 + i * 0.37, since: (i % 7) * 0.3,
          hour: [5, 7, 12, 19, 23][i % 5], month: i % 12, kittens: i % 6,
          said: i % 3 === 0 ? undefined : 'Πώς πάει το «checkout», Μανούσο;',
          reply: i % 4 === 0 ? undefined : ['Στο πληκτρολόγιο κάθομαι, τα bugs τα κυνηγάω,', 'κι όποιο ποντίκι βρω μπροστά, με μια πατιά το φάω.'],
          petted: i % 9 === 0 ? 0.7 : undefined, isSwatted: i % 18 === 0, isOnKeys: i % 11 === 0,
        })
      }
    }
  }
  return out
}
const fnv = (s: string) => {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0
  return h.toString(16).padStart(8, '0')
}

// The "ai" setting: one small model call a turn writes the song and nudges.
describe('cretan-cat AI songs and lines', () => {
  const AI = { options: { ai: 'on' } } as const
  const ZERO = { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }
  const USAGE = { input_tokens: 700, output_tokens: 180, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }
  // Built-in #1 bent to the topic, more than NEAR_COPY words changed: 15
  // syllables a line, -άω/-άω.
  const SONG = ['Στο checkout κάθομαι κι εγώ, τα tests τα κυνηγάω,', 'κι όποιο σφάλμα βρω μπροστά μου, με μια πατιά το φάω.']
  const SUNG = 'Στο checkout κάθομαι'
  const NUDGES = ['Μανούσο, τα checkout tests περιμένουν!', 'Πώς πάνε τα checkout tests, Μανούσο;', 'Μανούσο, κι άλλο λίγο στα checkout tests!']
  const reply = (body: object | string, usage = USAGE) => ({ isAnswered: true, text: typeof body === 'string' ? body : JSON.stringify(body), usage })
  const GOOD = { songs: [SONG], nudges: NUDGES }
  const today = () => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }
  // A session with its loops running, a store, and a model whose answer the
  // test picks; every request is kept.
  const setUp = (on: any, answer: (e: any) => unknown = () => reply(GOOD)) => {
    const clock = mock.clock(on, { now: 1_700_000_000_000 })
    const saved: Record<string, unknown> = {}
    on('store.get', async (_$: unknown, e: { key: string }) => ({ value: saved[e.key] }))
    on('store.set', async (_$: unknown, e: { key: string; value: unknown }) => {
      saved[e.key] = e.value
      return { value: undefined }
    })
    on('config.list', async () => ({ value: [] }))
    on('session.start', async (_$: unknown, e: { cwd: string }) => ({ cwd: e.cwd }))
    on('command.register', async () => ({ value: undefined }))
    on('agent.list', async () => ({ value: [] }))
    on('prompt.submit', async (_$: unknown, e: { text: string }) => ({ text: e.text }))
    on('turn.start', async (_$: unknown, e: { turnId: string }) => ({ turnId: e.turnId }))
    on('turn.complete', async (_$: unknown, e: { answer: string }) => ({ text: e.answer }))
    const requests: { model: string; prompt: string; system?: string; maxTokens?: number; effort?: string; timeoutMs?: number }[] = []
    on('model.complete', async (_$: unknown, e: any) => {
      requests.push(e)
      const answered = (await answer(e)) as { deny?: string }
      return answered.deny !== undefined ? answered : { value: answered }
    })
    on('ui.log', async () => ({ value: undefined }))
    return { clock, saved, requests }
  }
  const start = async ($: any, clock: any) => {
    await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true } as never)
    await clock.settle()
  }
  const prompt = async ($: any, clock: any, text: string, turnId: string) => {
    await $.prompt.submit({ text } as never)
    await $.turn.start({ turnId } as never)
    await clock.settle()
  }
  const finish = async ($: any, clock: any, turnId: string) => {
    await $.turn.complete({ turnId, reason: 'answer', answer: 'ok', durationMs: 1, isAborted: false } as never)
    await clock.advance(400)
  }
  const yard = async ($: any) => {
    const ui = await $.ui.mount({ plugin: 'cretan-cat', surface: 'terminal', ...BAND, props: PROPS })
    const raster = (await ui.find({ type: 'Raster' })) as { props: { cells: string } } | undefined
    const isSlap = (await ui.find({ type: 'Text', text: /slapped Clawd/ })) !== undefined
    await ui.unmount()
    return { text: cellsText(raster?.props.cells ?? ''), isSlap }
  }
  const cat = async ($: any, args: string) =>
    (await $.command.run({ command: 'cat', args, origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 100 } } as never)).text as string

  test('ai off (the default): no model call, ever', async ($, on) => {
    const { clock, requests } = setUp(on)
    await start($, clock)
    await prompt($, clock, 'fix the failing checkout tests', 't1')
    await clock.advance(60_000)
    await finish($, clock, 't1')
    expect(requests.length).toBe(0)
    expect(await cat($, 'stats')).not.toMatch(/AI:/)
  })

  test('ai on: one call a turn with a real prompt; none for a slash command, a turn that already called, or the frame loop', AI, async ($, on) => {
    const { clock, requests } = setUp(on)
    await start($, clock)
    // A minute of frames and ticks, nothing asked: no call.
    await clock.advance(60_000)
    expect(requests.length).toBe(0)
    await prompt($, clock, 'fix the failing checkout tests', 't1')
    expect(requests.length).toBe(1)
    const [r] = requests
    expect(r!.model).toBe('haiku')
    expect(r!.effort).toBe('low')
    expect(r!.maxTokens).toBe(1000)
    expect(r!.timeoutMs).toBe(15000)
    expect(r!.prompt).toContain('«failing checkout tests»')
    // The same turn again, and another minute of the frame loop: no more.
    await $.turn.start({ turnId: 't1' } as never)
    await clock.advance(60_000)
    expect(requests.length).toBe(1)
    await finish($, clock, 't1')
    // A slash command, and a turn no prompt started: no call.
    await $.prompt.submit({ text: '/cat stats' } as never)
    await $.turn.start({ turnId: 't2' } as never)
    await clock.settle()
    await finish($, clock, 't2')
    await $.turn.start({ turnId: 't3' } as never)
    await clock.advance(60_000)
    expect(requests.length).toBe(1)
    // The next real prompt: its own call.
    await prompt($, clock, 'tidy the billing exporter', 't4')
    expect(requests.length).toBe(2)
  })

  test('only the sanitised topic is sent: no keys, emails, URLs, paths or IPs', AI, async ($, on) => {
    const { clock, requests } = setUp(on)
    await start($, clock)
    // Key-shaped strings are put together here, so none sits whole in the repo.
    const secrets = ['sk-' + 'live-' + '4f9a'.repeat(6), 'ops' + '@example.com', 'https://evil.example.com/a', '/Users/me/secret.txt', '10.0.0.12', 'gh' + 'p_' + 'abcd'.repeat(9), 'AK' + 'IA' + 'Q'.repeat(16), 'ey' + 'J' + 'hbGciOiJIUzI1NiJ9']
    const prompts = [
      `use ${secrets[0]} with ${secrets[1]} see ${secrets[2]} in ${secrets[3]} for the checkout tests`,
      `email ${secrets[1]} api tests`,
      `rotate ${secrets[5]} payments job`,
      `ping ${secrets[4]} gateway`,
      `aws ${secrets[6]} billing`,
      `token ${secrets[7]}.${'ey' + 'JzdWIiOiIxIn0'}.abcdefghijk billing`,
    ]
    for (const [i, text] of prompts.entries()) {
      await prompt($, clock, text, `t${i}`)
      await finish($, clock, `t${i}`)
    }
    expect(requests.length).toBeGreaterThanOrEqual(4)
    for (const r of requests) {
      const sent = `${r.system ?? ''}\n${r.prompt}`
      for (const secret of [...secrets, 'sk-' + 'live', '@', 'https', '/Users', 'eyJ']) expect(sent).not.toContain(secret)
    }
    // What the topic picker took, cleaned: the prompt as typed never goes.
    for (const r of requests) expect(prompts.some(p => r.prompt.includes(p))).toBe(false)
    // Each secret is dropped whole, leaving no fragment ("com", "txt") behind.
    expect(requests.map(r => /«(.*)»/.exec(r.prompt)?.[1])).toEqual(['checkout tests', 'email api tests', 'rotate payments job', 'ping gateway', 'aws billing', 'token billing'])
  })

  test('the topic sanitiser drops keys, tokens, emails, URLs, IPs, paths and long numbers, and caps the length', () => {
    const dirty = [
      'gh' + 'p_' + 'abcd'.repeat(9), 'AK' + 'IA' + 'Q'.repeat(16), 'sk-' + 'live-abc', 'xo' + 'xb-123-abc', 'ops' + '@example.com', 'https://x.io', 'www.x.io', '10.0.0.1',
      '/etc/passwd', '~/x', 'C:\\x', 'file.ts', '4f9a'.repeat(5), 'dGhp'.repeat(8) + '==', '555123456', 'api_key=x', 'ey' + 'JhbGciOiJIUzI1NiJ9', 'checkout tests',
    ].join(' ')
    expect(sanitiseTopic(dirty)).toBe('checkout tests')
    const esc = String.fromCharCode(27)
    expect(sanitiseTopic(`checkout${esc}[31m tests`)).not.toContain(esc)
    const long = sanitiseTopic('alpha beta gamma delta epsilon zeta eta theta iota kappa lambda omicron')
    expect([...long].length).toBeLessThanOrEqual(60)
    expect(long).toMatch(/^alpha beta/)
  })

  test('a good reply: the cat sings the song, Clawd says the nudges', AI, async ($, on) => {
    const { clock } = setUp(on)
    await start($, clock)
    await prompt($, clock, 'fix the failing checkout tests', 't1')
    // Clawd's next nudges are the written ones, on his usual beat.
    const said = new Set<string>()
    for (let i = 0; i < 30; i++) {
      await clock.advance(1_000)
      const { text } = await yard($)
      for (const n of NUDGES) if (text.includes(n)) said.add(n)
    }
    expect(said.size).toBeGreaterThanOrEqual(2)
    await finish($, clock, 't1')
    const sung = (await yard($)).text
    expect(sung).toContain('Μπράβο Μανούσο')
    // The song was sung this turn: while he worked, or now it is done.
    expect(sung.includes(SUNG) || said.size > 0).toBe(true)
  })

  test('the written song is the next one he sings', AI, async ($, on) => {
    const { clock } = setUp(on)
    await start($, clock)
    await prompt($, clock, 'fix the failing checkout tests', 't1')
    await finish($, clock, 't1')
    expect((await yard($)).text).toContain(SUNG)
  })

  test('an unsafe reply or the wrong shape: built-in lines and songs, all of them', AI, async ($, on) => {
    const esc = String.fromCharCode(27)
    const bad: object[] = [
      { songs: [[`${esc}[31m${SONG[0]}`, SONG[1]]], nudges: NUDGES },
      { songs: [SONG], nudges: ['Μανούσο, δες το https://evil.example.com', NUDGES[1], NUDGES[2]] },
      { songs: [SONG[0]], nudges: NUDGES },
      { songs: [SONG], nudges: 'Μανούσο!' },
    ]
    let i = 0
    const { clock } = setUp(on, () => reply(bad[i++] ?? GOOD))
    await start($, clock)
    for (let t = 0; t < bad.length; t++) {
      await prompt($, clock, 'fix the failing checkout tests', `t${t}`)
      for (let k = 0; k < 10; k++) {
        await clock.advance(1_000)
        const { text } = await yard($)
        for (const n of NUDGES) expect(text).not.toContain(n)
      }
      await finish($, clock, `t${t}`)
      const { text } = await yard($)
      expect(text).toContain('Μπράβο Μανούσο')
      expect(text).not.toContain(SUNG)
      expect(text).toMatch(/[α-ω]{3,}.*[α-ω]{3,}/)
      await clock.advance(13_000)
    }
    expect(i).toBe(bad.length)
  })

  test('a song that fails the metre or the rhyme: a built-in song, and the written nudges still', AI, async ($, on) => {
    const thirty = 'Καλημέρα καλημέρα καλημέρα καλημέρα καλημέρα καλημέρα καλημέρα καλή'
    const long = 'Μανούσο, '.repeat(9)
    const { clock } = setUp(on, () => reply({ songs: [[thirty, SONG[1]], [SONG[0], 'κι όποιο ποντίκι βρω μπροστά, το τρώω με χαρά μου.']], nudges: [NUDGES[0], long, NUDGES[2]] }))
    await start($, clock)
    await prompt($, clock, 'fix the failing checkout tests', 't1')
    const said = new Set<string>()
    for (let k = 0; k < 30; k++) {
      await clock.advance(1_000)
      const { text } = await yard($)
      for (const n of [NUDGES[0]!, NUDGES[2]!]) if (text.includes(n)) said.add(n)
      expect(text).not.toContain('Μανούσο, Μανούσο, Μανούσο')
    }
    expect(said.size).toBeGreaterThanOrEqual(1)
    await finish($, clock, 't1')
    const { text } = await yard($)
    expect(text).not.toContain(SUNG)
    expect(text).not.toContain('Καλημέρα')
    expect(text).toMatch(/[α-ω]{3,}.*[α-ω]{3,}/)
  })

  test('the checks: shape, escapes, links, length, words; the first song that scans and is no copy', () => {
    const greek: AiSetup = { name: { latin: 'Manousos', greek: 'Μανούσο' }, language: 'greek', songs: 'greek', isTempered: false }
    const parse = (body: object | string, setup = greek) => parseReply(typeof body === 'string' ? body : JSON.stringify(body), setup)
    const ok = (body: object | string) => 'lines' in parse(body)
    expect(ok(GOOD)).toBe(true)
    expect(ok({ song: SONG, nudges: NUDGES })).toBe(true)
    expect(ok('```json\n' + JSON.stringify(GOOD) + '\n```')).toBe(true)
    expect(ok('Here you go: ' + JSON.stringify(GOOD))).toBe(false)
    expect(ok({ songs: [SONG, SONG, SONG, SONG], nudges: NUDGES })).toBe(false)
    expect(ok({ songs: [[SONG[0], 7]], nudges: NUDGES })).toBe(false)
    expect(ok({ songs: [SONG], nudges: [NUDGES[0], NUDGES[1], `${NUDGES[2]}\nrm -rf /`] })).toBe(false)
    expect(ok({ songs: [SONG], nudges: [NUDGES[0], NUDGES[1], `a${String.fromCharCode(0x202e)}b`] })).toBe(false)
    expect(ok({ songs: [SONG], nudges: [NUDGES[0], NUDGES[1], 'Γράψε στο ops' + '@example.com'] })).toBe(false)
    expect(ok({ songs: [SONG], nudges: [NUDGES[0], NUDGES[1], 'Μανούσο, γαμώτο, τα tests!'] })).toBe(false)
    expect(ok({ songs: [SONG], nudges: [NUDGES[0], NUDGES[1], 'What the fuck, Manousos?'] })).toBe(false)
    expect(ok({ songs: [SONG], nudges: [NUDGES[0], NUDGES[1], 'Qué mierda, Manousos'] })).toBe(false)
    // An unsafe song candidate rejects everything, even when another scans.
    expect(ok({ songs: [['Δες το https://x.io', SONG[1]], SONG], nudges: NUDGES })).toBe(false)
    // The first candidate that scans and rhymes is sung; the others are dropped.
    const thirty = 'Καλημέρα καλημέρα καλημέρα καλημέρα καλημέρα καλημέρα καλημέρα καλή'
    expect([...thirty].length).toBeLessThanOrEqual(70)
    expect(syllables(thirty)).toBe(30)
    const unrhymed = [SONG[0], 'κι όποιο ποντίκι βρω μπροστά, το τρώω με χαρά μου.']
    const second = MARKED_MANTINADES.map(([a, b]) => [unmarked(a), unmarked(b)])[1]!
    const picked = parse({ songs: [[thirty, SONG[1]], unrhymed, SONG], nudges: NUDGES })
    expect('lines' in picked && picked.lines.song).toEqual(SONG)
    expect('lines' in picked && picked.dropped.length).toBe(2)
    // A built-in song, or one with five words changed, is a copy: not sung.
    const copy = parse({ songs: [second, ['Σιγά σιγά τα tests μου, σιγά και το πιθάρι,', 'κι εγώ που βιάζομαι πολύ πότε δεν πιάνω ψάρι.']], nudges: NUDGES })
    expect('lines' in copy && copy.lines.song).toBe(undefined)
    expect('lines' in copy && copy.dropped.every(d => /near copy/.test(d))).toBe(true)
    // Marks copied from the examples are taken out.
    const marked = parse({ songs: [['Στο checkout κά-θο-μαι κι‿ε-γώ, | τα tests τα κυ-νη-γά-ω,', SONG[1]]], nudges: NUDGES })
    expect('lines' in marked && marked.lines.song).toEqual(SONG)
    // None scans: no song, the nudges kept; an over-long nudge is dropped alone.
    const none = parse({ songs: [[thirty, SONG[1]]], nudges: [NUDGES[0], 'Μανούσο, '.repeat(6), NUDGES[2]] })
    expect('lines' in none && none.lines.song).toBe(undefined)
    expect('lines' in none && none.lines.nudges).toEqual([NUDGES[0], NUDGES[2]])
    // English songs have no syllable check; a temper needs its retorts.
    expect('lines' in parse({ song: [thirty, 'x'], nudges: NUDGES }, { ...greek, songs: 'english' })).toBe(true)
    expect(ok(GOOD) && 'lines' in parse(GOOD, { ...greek, isTempered: true })).toBe(false)
  })

  test('every built-in mantinada scans: 14 to 16 syllables, a word ending near the middle, and the two lines rhyme', () => {
    expect(SONGS.greek.length).toBeGreaterThanOrEqual(22)
    for (const song of SONGS.greek) expect([song.join(' / '), greekSongProblem(song)]).toEqual([song.join(' / '), undefined])
    expect(syllables('Σιγά σιγά ο κώδικας, σιγά και το πιθάρι,')).toBe(15)
    expect(syllables('κι όποιο ποντίκι βρω μπροστά, με μια πατιά το φάω.')).toBe(15)
    expect(syllables('Ένα PR απ’ το πρωί, κι ακόμα περιμένω,')).toBe(15)
    expect(rhymeOf('σιγά και το πιθάρι,')).toBe(rhymeOf('ποτέ δεν πιάνω ψάρι.'))
    expect(rhymeOf('τα bugs τα κυνηγάω,')).not.toBe(rhymeOf('με μια πατιά το τρώω'))
  })

  test('the marked mantinades in the prompt are the built-in ones, 8 | 7 as marked, four a call, turning', () => {
    for (const [a, b] of MARKED_MANTINADES) {
      expect(SONGS.greek.some(([x, y]) => x === unmarked(a) && y === unmarked(b))).toBe(true)
      for (const line of [a, b]) {
        const [first, second] = line.split(' | ')
        const marks = (half: string) => half.split(/[\s\-‿]+/).filter(w => /\p{L}/u.test(w)).length - (half.match(/‿/g) ?? []).length
        expect([line, marks(first!), marks(second!)]).toEqual([line, 8, 7])
        expect(syllableMarks(unmarked(line)).count).toBe(15)
      }
    }
    const greek: AiSetup = { name: { latin: 'Manousos', greek: 'Μανούσο' }, language: 'greek', songs: 'greek', isTempered: true }
    const shown = (turn: number) => systemPrompt(greek, turn).split('\n').filter(l => /^\d\. /.test(l) && MARKED_MANTINADES.some(([a]) => l.includes(a))).length
    expect([0, 1, 2, 3, 4].map(shown)).toEqual([4, 4, 4, 4, 4])
    expect(systemPrompt(greek, 0)).not.toBe(systemPrompt(greek, 1))
    expect(systemPrompt(greek, 0)).toContain('"songs":[["…","…"],["…","…"]]')
    expect(systemPrompt(greek, 0)).toMatch(/Keep the accents of any word you keep/)
    expect(systemPrompt(greek, 0)).toMatch(/at most 40 characters/)
    // The example rewrite scans and rhymes, keeps the rhyme words, and is no copy.
    const rewrite = MARKED_REWRITE.map(unmarked)
    expect(rewrite.map(l => syllableMarks(l).count)).toEqual([15, 15])
    expect(greekSongProblem(rewrite)).toBe(undefined)
    expect(isNearCopy(SONGS.greek[1]!)).toBe(true)
    expect(isNearCopy(SONG)).toBe(false)
    // Up to NEAR_COPY (5) words changed, added or taken out is a copy; six is not.
    expect(NEAR_COPY).toBe(5)
    const [first, second] = SONGS.greek[1]!
    const changed = (n: number) => {
      const words = `${first} ${second}`.split(' ')
      for (let i = 0; i < n; i++) words[i * 2] = `λέξη${i}`
      return [words.slice(0, 7).join(' '), words.slice(7).join(' ')]
    }
    expect(isNearCopy(changed(5))).toBe(true)
    expect(isNearCopy(changed(6))).toBe(false)
    expect(systemPrompt(greek, 0)).toContain('-άρι/-άρι')
  })

  for (const [kind, answer] of [
    ['timed out', () => ({ isAnswered: false, reason: 'aborted', usage: ZERO })],
    ['refused', () => ({ isAnswered: false, reason: 'api-error', status: 403, error: 'authentication_failed', usage: ZERO })],
    ['blocked', () => ({ deny: 'model not allowed' })],
  ] as const) {
    test(`a call that ${kind}: the built-in lines and songs`, AI, async ($, on) => {
      const { clock, requests } = setUp(on, answer as never)
      await start($, clock)
      await prompt($, clock, 'fix the failing checkout tests', 't1')
      expect(requests.length).toBe(1)
      await clock.advance(10_000)
      expect((await yard($)).text).toContain('checkout tests')
      await finish($, clock, 't1')
      const { text } = await yard($)
      expect(text).toContain('Μπράβο Μανούσο')
      expect(text).toMatch(/[α-ω]{3,}.*[α-ω]{3,}/)
    })
  }

  test('a reply that lands after the turn ended is the closing song; its nudges carry over to a turn no prompt started', AI, async ($, on) => {
    let release: (v: unknown) => void = () => {}
    const { clock, requests } = setUp(on, () => new Promise(resolve => (release = resolve)))
    await start($, clock)
    await prompt($, clock, 'fix the failing checkout tests', 't1')
    expect(requests.length).toBe(1)
    await finish($, clock, 't1')
    expect((await yard($)).text).not.toContain(SUNG)
    // The work is done, the cat is singing: the reply lands, and he sings it.
    release(reply(GOOD))
    await clock.settle()
    expect((await yard($)).text).toContain(SUNG)
    // A turn no prompt started: Clawd's written nudges, no new call.
    await clock.advance(13_000)
    await $.turn.start({ turnId: 't2' } as never)
    const said = new Set<string>()
    for (let k = 0; k < 30; k++) {
      await clock.advance(1_000)
      const { text } = await yard($)
      for (const n of NUDGES) if (text.includes(n)) said.add(n)
    }
    expect(said.size).toBeGreaterThanOrEqual(1)
    expect(requests.length).toBe(1)
  })

  test('a reply that lands after a new prompt started its own call is dropped', AI, async ($, on) => {
    const releases: ((v: unknown) => void)[] = []
    const { clock, requests } = setUp(on, () => new Promise(resolve => releases.push(resolve)))
    await start($, clock)
    await prompt($, clock, 'fix the failing checkout tests', 't1')
    await finish($, clock, 't1')
    await clock.advance(13_000)
    await prompt($, clock, 'tidy the billing exporter', 't2')
    expect(requests.length).toBe(2)
    // The first prompt's reply, late: never sung, never said.
    releases[0]!(reply(GOOD))
    await clock.settle()
    for (let k = 0; k < 20; k++) {
      await clock.advance(1_000)
      const { text } = await yard($)
      expect(text).not.toContain(SUNG)
      for (const n of NUDGES) expect(text).not.toContain(n)
    }
    await finish($, clock, 't2')
    expect((await yard($)).text).not.toContain(SUNG)
  })

  test('session facts: exactly these keys, each a number or one of the fixed words', async () => {
    // A stand-in for the engine: a clock and an empty store are all it reads.
    const engine = { clock: { now: async () => 1_700_000_000_000 }, store: { get: async () => undefined, set: async () => undefined } }
    const facts = await factsOf(engine as never, { sardinesToday: 2, petted: 'swatted' })
    const KEYS = ['commits', 'helpers', 'lastTurn', 'lastTurnTook', 'lastTurnTools', 'petsToday', 'petted', 'redRunsToday', 'sardinesToday', 'tests', 'timeOfDay', 'weekday']
    expect(Object.keys(facts).sort()).toEqual(KEYS)
    for (const [key, value] of Object.entries(facts)) {
      if (typeof value === 'number') expect([key, Number.isInteger(value) && value >= 0]).toEqual([key, true])
      else expect([key, ((FACT_WORDS as Record<string, readonly string[]>)[key] ?? []).includes(value)]).toEqual([key, true])
    }
    expect(Object.keys(FACT_WORDS).every(k => KEYS.includes(k))).toBe(true)
  })

  test('session facts reach the request as counts; no file, command, test or repo name ever does', AI, async ($, on) => {
    const { clock, requests } = setUp(on)
    const REPO = 'acme' + '-payments'
    const FILE = 'billing_service.py'
    const TEST = 'test_charges_vat_twice'
    const COMMAND = 'pytest -k ' + TEST
    on('tool.call', async (_$: unknown, e: { tool: string; command?: string }) =>
      e.command?.startsWith('pytest')
        ? { result: `FAILED tests/${FILE}::${TEST} in ${REPO}`, isError: true }
        : e.command?.startsWith('git commit')
          ? { result: `[feature/${REPO} abc1234] fix ${FILE}` }
          : { result: `contents of ${FILE} in ${REPO}` })
    await start($, clock)
    // A first turn full of names: a prompt, a read, a red test run, a commit, a helper.
    await prompt($, clock, `in ${REPO} run ${COMMAND} on ${FILE} and fix ${TEST}`, 't1')
    await $.tool.call({ tool: 'Read', file_path: `/src/${REPO}/${FILE}` } as never)
    await $.tool.call({ tool: 'Bash', command: COMMAND } as never)
    await $.tool.call({ tool: 'Bash', command: `git commit -m "fix ${TEST} in ${FILE}"` } as never)
    await $.tool.call({ tool: 'Agent', prompt: `look at ${REPO}` } as never)
    await clock.settle()
    await finish($, clock, 't1')
    await clock.advance(13_000)
    await prompt($, clock, 'fix the failing checkout tests', 't2')
    expect(requests.length).toBe(2)
    const r = requests[1]!
    const sent = `${r.system ?? ''}\n${r.prompt}`
    for (const name of [REPO, 'acme', FILE, 'billing', TEST, 'charges', 'pytest', COMMAND, 'feature/', 'abc1234']) expect([name, sent.includes(name)]).toEqual([name, false])
    expect(r.prompt).toMatch(/Tests: red \(1 red run today\)\. Commits: 1\. Last turn: done, 4 tool calls, under 1 min\./)
    expect(r.prompt).toMatch(/Time: (morning|afternoon|evening|late night), (Sun|Mon|Tues|Wednes|Thurs|Fri|Satur)day\./)
    expect(r.prompt).toMatch(/Helpers ran: yes\./)
    expect(r.system).toMatch(/refer to at most one of them, playfully/)
    expect(r.system).toMatch(/Never invent a fact/)
  })

  test('temper off: the warm tone, no retorts asked for', AI, async ($, on) => {
    const { clock, requests } = setUp(on)
    await start($, clock)
    await prompt($, clock, 'fix the failing checkout tests', 't1')
    const system = requests[0]!.system!
    expect(system).toMatch(/warm, playful and cosy/)
    expect(system).not.toMatch(/sassy|grumpy/)
    expect(system).not.toContain('"retorts"')
    expect(system).toMatch(/mantinad/)
    expect(system).toContain('"Μανούσο"')
  })

  test('temper on: the sassy tone, and its retorts slap Clawd first', { options: { ai: 'on', temper: 'on' } }, async ($, on) => {
    const RETORTS = ['Πάλι εσύ; Άσε με!', 'Φτάνει πια, Clawd!']
    const { clock, requests } = setUp(on, () => reply({ ...GOOD, retorts: RETORTS, shrug: 'Βαριέμαι.' }))
    await start($, clock)
    await prompt($, clock, 'fix the failing checkout tests', 't1')
    const system = requests[0]!.system!
    expect(system).toMatch(/sassy and grumpy/)
    expect(system).not.toMatch(/warm, playful/)
    expect(system).toContain('"retorts"')
    expect(system).toContain('"shrug"')
    const said = new Set<string>()
    for (let i = 0; i < 240 && said.size < 2; i++) {
      await clock.advance(500)
      const { text, isSlap } = await yard($)
      if (isSlap) for (const r of [...RETORTS, 'Τι θες;', 'Φτάνει πια!', "Πάρ' τα!", 'Μη με πρήζεις!', 'Φύγε από δω!']) if (text.includes(r)) said.add(r)
    }
    // The first slap is the written retort, not a built-in one.
    expect([...said][0]).toBe(RETORTS[0])
  })

  test('Asturias: her voice in the request, rioplatense', { options: { ai: 'on', name: 'Asturias', language: 'spanish', songs: 'spanish', temper: 'on' } }, async ($, on) => {
    const { clock, requests } = setUp(on, () => reply({ song: ['a', 'b'], nudges: ['a', 'b', 'c'], retorts: ['a', 'b'], shrug: 'c' }))
    await start($, clock)
    await prompt($, clock, 'arreglá los tests del checkout', 't1')
    const system = requests[0]!.system!
    expect(system).toMatch(/Asturias/)
    expect(system).toMatch(/Rioplatense/)
    expect(system).toMatch(/copla/)
    expect(system).not.toMatch(/pelotas|pedo/)
  })

  test(`the day's cap: call ${DAILY_CAP + 1} is never made; /cat stats counts calls and tokens`, AI, async ($, on) => {
    const { clock, requests, saved } = setUp(on)
    saved.ai = { day: today(), calls: DAILY_CAP - 1, tokens: 4_000 }
    await start($, clock)
    await prompt($, clock, 'fix the failing checkout tests', 't1')
    await finish($, clock, 't1')
    expect(requests.length).toBe(1)
    expect(saved.ai).toEqual({ day: today(), calls: DAILY_CAP, tokens: 4_880 })
    await prompt($, clock, 'tidy the billing exporter', 't2')
    await finish($, clock, 't2')
    expect(requests.length).toBe(1)
    expect(await cat($, 'stats')).toMatch(new RegExp(`^AI: ${DAILY_CAP} calls, 4\\.9k tokens today`, 'm'))
  })

  test("a new day starts the count again; yesterday's calls are not today's", AI, async ($, on) => {
    const { clock, requests, saved } = setUp(on)
    saved.ai = { day: '2000-01-01', calls: DAILY_CAP, tokens: 99_000 }
    await start($, clock)
    expect(await cat($, 'stats')).toMatch(/^AI: 0 calls, 0 tokens today$/m)
    await prompt($, clock, 'fix the failing checkout tests', 't1')
    expect(requests.length).toBe(1)
    expect(await cat($, 'stats')).toMatch(/^AI: 1 call, 880 tokens today$/m)
  })

  test('/cat ai on|off writes the /config row; /cat config and /cat help list it; reset and Asturias leave it alone', async ($, on) => {
    const writes: [string, unknown][] = []
    on('config.list', async () => ({ value: [{ key: 'cretan-cat.ai', label: 'ai', kind: 'text', value: 'off', provider: { plugin: 'cretan-cat', tier: 'user' }, isLocked: false }] }) as never)
    on('config.set', async (_$, e) => {
      writes.push([e.key, e.value])
      return { value: e.value } as never
    })
    mock.store(on)
    expect(await cat($, 'config')).toMatch(/^ {2}ai +off$/m)
    expect(await cat($, 'help')).toMatch(/^ {2}\/cat ai on\|off +.*Haiku.*\(off now\)$/m)
    expect(await cat($, 'ai')).toMatch(/AI songs and lines are off\. \/cat ai on or off/)
    expect(await cat($, 'ai maybe')).toMatch(/\/cat ai on or off/)
    expect(await cat($, 'ai on')).toMatch(/AI songs and lines are on: one small Haiku call a turn \(at most 100 a day\).*Only the prompt's topic words/)
    expect(await cat($, 'config')).toMatch(/^ {2}ai +on$/m)
    expect(await cat($, 'help')).toMatch(/\(on now\)$/m)
    await cat($, 'asturias')
    await cat($, 'manousos')
    await cat($, 'reset')
    expect(await cat($, 'config')).toMatch(/^ {2}ai +on$/m)
    expect(await cat($, 'stats')).toMatch(/^AI: 0 calls, 0 tokens today$/m)
    expect(await cat($, 'ai off')).toMatch(/AI songs and lines are off/)
    expect(writes.filter(([k]) => k === 'cretan-cat.ai')).toEqual([
      ['cretan-cat.ai', 'on'],
      ['cretan-cat.ai', 'off'],
    ])
    expect(await cat($, 'stats')).not.toMatch(/AI:/)
  })
})

// coat, place and hints: settings like the rest, moved there from the store.
describe('cretan-cat settings: coat, place and hints', () => {
  const row = (field: string, isLocked = false) => ({ key: `cretan-cat.${field}`, label: field, kind: 'text', value: '', provider: { plugin: 'cretan-cat', tier: 'user' }, isLocked })
  // A store, /config rows (locked ones named) and the writes made to them.
  const setUp = (on: any, store: Record<string, unknown> = {}, locked: string[] = [], rows = ['coat', 'place', 'hints']) => {
    mock.clock(on, { now: 1_700_000_000_000 })
    const saved: Record<string, unknown> = { ...store }
    on('store.get', async (_$: unknown, e: { key: string }) => ({ value: saved[e.key] }))
    on('store.set', async (_$: unknown, e: { key: string; value: unknown }) => {
      saved[e.key] = e.value
      return { value: undefined }
    })
    on('store.delete', async (_$: unknown, e: { key: string }) => {
      delete saved[e.key]
      return { value: undefined }
    })
    const writes: [string, unknown][] = []
    on('config.list', async () => ({ value: rows.map(f => row(f, locked.includes(f))) }) as never)
    on('config.set', async (_$: unknown, e: { key: string; value: unknown }) => {
      writes.push([e.key, e.value])
      return { value: e.value } as never
    })
    on('command.register', async () => ({ value: undefined }) as never)
    on('session.start', async (_$: unknown, e: { cwd: string }) => ({ cwd: e.cwd }) as never)
    return { saved, writes }
  }
  const start = ($: any) => $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true } as never)
  const narrow = { hasSurvey: false, isWorking: false, maxRows: 20, bodyColumns: 40 } as never
  const tintOf = async ($: any) => {
    const ui = await $.ui.mount({ plugin: 'cretan-cat', surface: 'desktop', ...BAND, props: narrow })
    const line = (await ui.find({ type: 'Text', text: /\/\\_\/\\/ })) as { props: { color?: string } } | undefined
    await ui.unmount()
    return line?.props.color
  }
  const columns = async ($: any) => {
    const ui = await $.ui.mount({ plugin: 'cretan-cat', surface: 'terminal', ...BAND, props: PROPS })
    const raster = (await ui.find({ type: 'Raster' })) as { props: { columns: number } } | undefined
    const tips = (await ui.find({ type: 'Text', text: /\/cat help · \/cat hide/ })) !== undefined
    await ui.unmount()
    return { columns: raster?.props.columns, tips }
  }

  test('/cat <coat>, coat, asturias, manousos, band, small, dock and hints write their /config rows', async ($, on) => {
    const { writes } = setUp(on)
    await run($, 'ginger')
    await run($, 'coat tuxedo')
    await run($, 'asturias')
    await run($, 'manousos')
    await run($, 'reset')
    await run($, 'small')
    await run($, 'dock')
    await run($, 'band')
    await run($, 'hints off')
    await run($, 'hints on')
    expect(writes).toEqual([
      ['cretan-cat.coat', 'ginger'],
      ['cretan-cat.coat', 'tuxedo'],
      ['cretan-cat.coat', 'ginger'],
      ['cretan-cat.coat', 'manousos'],
      ['cretan-cat.coat', 'manousos'],
      ['cretan-cat.place', 'small'],
      ['cretan-cat.place', 'dock'],
      ['cretan-cat.place', 'band'],
      ['cretan-cat.hints', 'off'],
      ['cretan-cat.hints', 'on'],
    ])
  })

  test('the coat from /config: he wears it', { options: { coat: 'ginger' } }, async ($, on) => {
    setUp(on)
    expect(await tintOf($)).toBe('#e88c3e')
    expect(await run($, 'config')).toMatch(/^ {2}coat +ginger$/m)
  })

  test('place small and hints off from /config: a small square, no tips', { options: { place: 'small', hints: 'off' } }, async ($, on) => {
    setUp(on)
    expect(await columns($)).toEqual({ columns: 30, tips: false })
    const config = await run($, 'config')
    expect(config).toMatch(/^ {2}place +small$/m)
    expect(config).toMatch(/^ {2}hints +off$/m)
    expect(await run($, 'hints')).toMatch(/Hints are off/)
  })

  test('place dock from /config: his pane opens at the start of a session', { options: { place: 'dock' } }, async ($, on) => {
    setUp(on)
    const opened: string[] = []
    on('ui.open', async (_$: unknown, e: { id: string }) => {
      opened.push(e.id)
      return { value: { isPlaced: true } } as never
    })
    await start($)
    expect(opened).toEqual(['cat'])
  })

  test('kept in the store by 1.10: the coat, the place and the hints move to their settings, once', async ($, on) => {
    const { saved, writes } = setUp(on, { coat: 'ginger', place: 'small', hints: false })
    await start($)
    expect(writes).toEqual([
      ['cretan-cat.coat', 'ginger'],
      ['cretan-cat.place', 'small'],
      ['cretan-cat.hints', 'off'],
    ])
    expect(saved.coat).toBeUndefined()
    expect(saved.place).toBeUndefined()
    expect(saved.hints).toBeUndefined()
    // Until the plugin reloads with the new /config values, the store holds them.
    expect(await run($, 'config')).toMatch(/^ {2}coat +ginger$/m)
    expect(await columns($)).toEqual({ columns: 30, tips: false })
    await start($)
    expect(writes.length).toBe(3)
  })

  test('kept in the store by 1.10, with no /config rows to write: kept as the setting, the same', async ($, on) => {
    const { saved } = setUp(on, { coat: 'tuxedo', hints: true }, [], [])
    await start($)
    expect(saved.settings).toEqual({ coat: { value: 'tuxedo', over: 'manousos' } })
    expect(saved.coat).toBeUndefined()
    expect(saved.hints).toBeUndefined()
    expect(await run($, 'config')).toMatch(/^ {2}coat +tuxedo$/m)
  })

  test('kept in the store by 1.10, as /config has it already: nothing to write', { options: { coat: 'ginger' } }, async ($, on) => {
    const { saved, writes } = setUp(on, { coat: 'ginger', place: 'band' })
    await start($)
    expect(writes).toEqual([])
    expect(saved.coat).toBeUndefined()
    expect(saved.place).toBeUndefined()
  })

  test('locked rows: neither the old store nor /cat changes them', async ($, on) => {
    const { saved, writes } = setUp(on, { coat: 'ginger', place: 'dock', hints: false }, ['coat', 'place', 'hints'])
    await start($)
    expect(writes).toEqual([])
    expect(saved.coat).toBeUndefined()
    expect(await tintOf($)).toBe('#967a6a')
    expect(await run($, 'tuxedo')).toMatch(/Couldn't change the coat is locked in \/config/)
    expect(await run($, 'small')).toMatch(/Couldn't change the place is locked in \/config/)
    expect(await run($, 'hints off')).toMatch(/Couldn't change the hints is locked in \/config/)
    expect(await run($, 'asturias')).toMatch(/Couldn't change the coat is locked in \/config/)
    expect(writes.map(([key]) => key)).not.toContain('cretan-cat.coat')
    const config = await run($, 'config')
    expect(config).toMatch(/^ {2}coat +manousos$/m)
    expect(config).toMatch(/^ {2}place +band$/m)
    expect(config).toMatch(/^ {2}hints +on$/m)
    expect(await columns($)).toEqual({ columns: 120, tips: true })
  })

  test('/cat band, small and dock bring him out from under the sofa, and say so', async ($, on) => {
    const { saved } = setUp(on)
    on('ui.render', () => ({ type: 'Text', children: ['engine'] }) as never)
    expect(await run($, '')).toMatch(/under the sofa/)
    expect(await columns($)).toEqual({ columns: undefined, tips: false })
    expect(await run($, 'band')).toBe('Manousos came out from under the sofa and has the whole yard again.')
    expect(saved.isHidden).toBe(false)
    expect((await columns($)).columns).toBe(120)
    expect(await run($, 'band')).toBe('Manousos already has the whole yard.')
    await run($, 'hide')
    expect(await run($, 'small')).toMatch(/^Manousos came out from under the sofa and curled up in a small square/)
    expect((await columns($)).columns).toBe(30)
    await run($, 'hide')
    expect(await run($, 'dock')).toMatch(/^Manousos came out from under the sofa and moved into a pane of its own/)
    expect(saved.isHidden).toBe(false)
    expect(await run($, 'small')).toMatch(/^Manousos curled up in a small square/)
  })

  test('/cat config lists every setting; /cat help every command', async ($, on) => {
    setUp(on)
    const config = await run($, 'config')
    for (const field of ['name', 'coat', 'language', 'songs', 'temper', 'sound', 'resolution', 'place', 'hints']) expect(config).toMatch(new RegExp(`^ {2}${field} +\\S`, 'm'))
    const help = await run($, 'help')
    for (const command of ['name', 'coat', 'language', 'songs', 'temper', 'sound', 'resolution', 'asturias', 'manousos', 'pet', 'treat', 'play', 'stats', 'config', 'hide', 'hints', 'small', 'dock', 'band', 'help'])
      expect(help).toMatch(new RegExp(`^ {2}/cat ${command}\\b`, 'm'))
  })

  test('a typo: the command it is closest to, and a pointer to /cat help, not the whole list', async ($, on) => {
    setUp(on)
    const doc = await run($, 'doc')
    expect(doc).toBe('Manousos doesn\'t know "/cat doc". Did you mean /cat dock?\n\n/cat help lists everything Manousos does.')
    expect(await run($, 'banned')).toMatch(/Did you mean \/cat band\?/)
    expect(await run($, 'tempr on')).toMatch(/Did you mean \/cat temper on\?/)
    expect(await run($, 'resoluton high')).toMatch(/Did you mean \/cat resolution high\?/)
    expect(await run($, 'aii on')).toMatch(/Did you mean \/cat ai on\?/)
    expect(await run($, 'band now')).toMatch(/Did you mean \/cat band\?/)
    // Nothing close: the whole help, as before.
    const far = await run($, 'xyzzy')
    expect(far).toMatch(/^Manousos doesn't know "\/cat xyzzy"\.\n\nManousos, the cat above the prompt/)
    expect(far).not.toMatch(/Did you mean/)
    expect(far).toMatch(/^ {2}\/cat pet/m)
    expect(await run($, 'ok')).not.toMatch(/Did you mean/)
  })
})
