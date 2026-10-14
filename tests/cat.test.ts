import { describe, expect, mock, test } from 'claude-code/testing'

import { topicOf } from '../hooks/lines'
import { drawCat, drawCells, skyAt } from '../hooks/manousos'
import { cellsToSvg, SVG_MOST } from '../hooks/svg'

const BAND = { component: 'AbovePrompt' } as const
const PROPS = { hasSurvey: false, isWorking: false, maxRows: 20, bodyColumns: 120 } as never

describe('cretan-cat', () => {
  test('naps above the prompt until Claude starts working', async $ => {
    for (const surface of ['terminal', 'desktop'] as const) {
      const ui = await $.ui.mount({ plugin: 'cretan-cat', surface, ...BAND, props: PROPS })
      expect(await ui.find({ type: 'Text', text: /napping/ })).toBeDefined()
      // The caption tells you how to hide him and change his coat.
      expect(await ui.find({ type: 'Text', text: /\/cat ginger, tuxedo or manousos/ })).toBeDefined()
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
      reply: ['Στο πληκτρολόγιο κάθεται, τα bugs τα κυνηγάει,', 'κι όποιο ποντίκι βρει μπροστά, με μια πατιά το φάει.'],
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
    expect(saved.coat).toBe('tuxedo')
    expect((await run('ginger')).text).toMatch(/Manousos is wearing the ginger coat/)
    expect(saved.coat).toBe('ginger')
    expect((await run('zebra')).text).toMatch(/manousos, ginger, tuxedo/)
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
    expect(await run('stats')).toMatch(/petted 1 time\./)
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
    expect(stats.text).toMatch(/2 sardines today and 2 in all/)
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

  test('sound off (the default): no meow', async ($, on) => {
    const { clock } = setUp(on)
    const played: unknown[] = []
    on('audio.play', async (_$, e) => {
      played.push(e.clip)
      return { value: undefined } as never
    })
    await $.turn.start({ turnId: 't1' } as never)
    await $.turn.complete({ turnId: 't1', reason: 'answer', answer: 'ok', durationMs: 1, isAborted: false } as never)
    await clock.settle()
    expect(played).toEqual([])
  })

  test('sound on: a meow when the work is done', { options: { sound: 'on' } }, async ($, on) => {
    const { clock } = setUp(on)
    const played: unknown[] = []
    on('audio.play', async (_$, e) => {
      played.push(e.clip)
      return { value: undefined } as never
    })
    await $.turn.start({ turnId: 't1' } as never)
    await $.turn.complete({ turnId: 't1', reason: 'answer', answer: 'ok', durationMs: 1, isAborted: false } as never)
    await clock.settle()
    expect(played).toEqual([{ asset: 'sounds/meow.wav' }])
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
    expect(await cmd($, 'language rioplatense')).toMatch(/speaks rioplatense now/)
    expect(await cmd($, 'lang klingon')).toMatch(/greek, english, spanish, rioplatense/)
    expect(await cmd($, 'songs english')).toMatch(/sings in english now/)
    expect(await cmd($, 'songs')).toMatch(/greek, spanish, english/)
    expect(await cmd($, 'temper on')).toMatch(/has a temper now/)
    expect(writes).toEqual([
      ['cretan-cat.name', 'Luna Bella'],
      ['cretan-cat.language', 'rioplatense'],
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
    expect(await cmd($, 'stats')).toMatch(/^Luna has had/)
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
    expect(await cmd($, 'asturias')).toMatch(/^Asturias is here now\. ¿Qué querés\? \(\/cat reset brings Manousos back\)$/)
    expect(saved.coat).toBe('ginger')
    expect(saved.settings).toEqual({
      name: { value: 'Asturias', over: 'Manousos' },
      language: { value: 'rioplatense', over: 'greek' },
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
    expect(saved.coat).toBe('manousos')
    expect(await cmd($, 'temper')).toMatch(/Temper is off/)
    expect(await cmd($, 'songs')).toMatch(/sings in greek/)
    await clock.advance(13_000)
    expect(await caption($, /Manousos is napping/)).toBe(true)
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
      ['cretan-cat.language', 'rioplatense'],
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

  test('language rioplatense: Clawd says it the Buenos Aires way', { options: { language: 'rioplatense' } }, async ($, on) => {
    const { clock } = setUp(on)
    await $.turn.start({ turnId: 't1' } as never)
    await clock.settle()
    expect(await yardText($)).toMatch(/a laburar|Qué hacés ahí|Dale Manousos/)
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
