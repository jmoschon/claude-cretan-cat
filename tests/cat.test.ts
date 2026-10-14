import { describe, expect, mock, test } from 'claude-code/testing'

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

  test('draws the pixel-art yard in the terminal, the ASCII cat elsewhere', async $ => {
    const term = await $.ui.mount({ plugin: 'cretan-cat', surface: 'terminal', ...BAND, props: PROPS })
    expect(await term.find({ type: 'Raster' })).toBeDefined()
    await term.unmount()
    const desk = await $.ui.mount({ plugin: 'cretan-cat', surface: 'desktop', ...BAND, props: PROPS })
    expect(await desk.find({ type: 'Raster' })).toBeUndefined()
    await desk.unmount()
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
    expect((await run('ginger')).text).toMatch(/ginger coat/)
    expect(saved.coat).toBe('ginger')
    expect((await run('zebra')).text).toMatch(/manousos, ginger, tuxedo/)
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
    expect(text).toContain('«checkout tests»')
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
    ['english', '"checkout tests"'],
    ['spanish', '«checkout tests»'],
    ['polish', '„checkout tests”'],
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
