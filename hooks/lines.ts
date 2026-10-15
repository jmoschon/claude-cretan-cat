// What Clawd tells the cat, and what the cat says when not singing, in each
// language the "language" setting offers. The songs are in songs.ts, under
// a setting of their own.

export const LANGUAGES = ['greek', 'english', 'spanish', 'british'] as const
export type Language = (typeof LANGUAGES)[number]

export const isLanguage = (v: unknown): v is Language => typeof v === 'string' && (LANGUAGES as readonly string[]).includes(v)
// Spanish is rioplatense; "rioplatense", saved by older versions, means it too.
export const languageOf = (v: unknown): Language | undefined => (v === 'rioplatense' ? 'spanish' : isLanguage(v) ? v : undefined)

export type Lines = {
  // Nudges about the prompt's topic, one every few seconds while Claude thinks.
  nudges: ((topic: string) => string)[]
  // Nudges for a prompt with no topic to speak of ("hi").
  vague: string[]
  // The order for a tool, by the tool's name (an MCP tool by its own name).
  tool: (tool: string) => string
  done: string
  oops: string
  // Manousos, startled by a failure.
  hiss: string
  // Each of these is a pair: what Clawd says, and what Manousos answers.
  // Claude is waiting on you at a permission prompt.
  wait: [string, string]
  // Tests passed, tests failed.
  green: [string, string]
  red: [string, string]
  // A commit went in: Clawd tosses a sardine.
  commit: [string, string]
  // A tool has run long enough to bore him to sleep.
  bored: [string, string]
  // Clawd, slapped for a nudge; and his nudge, ignored.
  slapped: string
  snubbed: string
  // With the "temper" setting on, the cat's side of it: what it says as it
  // slaps Clawd, or ignores him; a pet it didn't ask for; and, lying on your
  // keyboard, what it wants to get off it.
  retort: string[]
  shrug: string[]
  swat: string
  asks: string
  // Clawd, finding the cat on your keyboard.
  offKeys: string
}

const kind = (tool: string) =>
  tool === 'Bash'
    ? 'run'
    : tool === 'Read'
      ? 'read'
      : tool === 'Edit' || tool === 'Write' || tool === 'NotebookEdit'
        ? 'edit'
        : tool === 'Grep' || tool === 'Glob'
          ? 'search'
          : tool === 'WebFetch' || tool === 'WebSearch'
            ? 'web'
            : tool === 'Agent' || tool === 'Workflow'
              ? 'agents'
              : tool.startsWith('mcp__')
                ? 'mcp'
                : 'other'

// An MCP tool by its own name (`mcp__server__tool` -> `tool`).
export const shortTool = (tool: string) => tool.split('__').pop() ?? tool

// The cat's name as Clawd calls it: as written, and in Greek (the
// vocative). A name of your own is called as you wrote it, in Greek too.
export type Name = { latin: string; greek: string }
export const DEFAULT_NAME = 'Manousos'
export const NAME_MOST = 20
export function catNameOf(raw: unknown): Name {
  const name = typeof raw === 'string' ? [...raw.replace(/[\u0000-\u001f\u007f]/g, '').trim()].slice(0, NAME_MOST).join('') : ''
  if (name === '' || name.toLowerCase() === DEFAULT_NAME.toLowerCase()) return { latin: DEFAULT_NAME, greek: 'Μανούσο' }
  if (name.toLowerCase() === 'asturias') return { latin: 'Asturias', greek: 'Αστούριας' }
  if (name.toLowerCase() === 'jamona') return { latin: 'Jamona', greek: 'Ζαμόνα' }
  return { latin: name, greek: name }
}

export const LINES: Record<Language, (n: Name) => Lines> = {
  greek: n => ({
    nudges: [
      t => `${n.greek}, κοίτα λίγο το «${t}»!`,
      t => `Πώς πάει το «${t}», ${n.greek};`,
      t => `Μην κοιμάσαι! Το «${t}» περιμένει.`,
      t => `${n.greek}, θέλω το «${t}» ως το μεσημέρι!`,
      t => `Αν φτιάξεις το «${t}», έχει σαρδέλα.`,
      t => `Έλα ${n.greek}, λίγο ακόμα με το «${t}».`,
    ],
    vague: [`${n.greek}, πιάσε δουλειά!`, `Τι κάνεις εκεί, ${n.greek};`, `Έλα ${n.greek}, ξεκινάμε!`],
    tool: tool =>
      ({
        run: `${n.greek}, τρέξε την εντολή!`,
        read: `Διάβασε το αρχείο, ${n.greek}!`,
        edit: `Φτιάξε τον κώδικα, ${n.greek}!`,
        search: `Βρες το, ${n.greek}! Ψάξε παντού.`,
        web: `Ψάξε στο ίντερνετ, ${n.greek}!`,
        agents: `Φώναξε τα γατάκια να βοηθήσουν, ${n.greek}!`,
        mcp: `Ρώτα τους φίλους μας, ${n.greek}: ${shortTool(tool)}`,
        other: `${n.greek}, κάνε ένα ${tool}!`,
      })[kind(tool)],
    done: `Μπράβο ${n.greek}! Πάρε μια λιχουδιά.`,
    oops: `Ωχ, ${n.greek}... τι έγινε;`,
    hiss: 'Φφφ! Κάτι στράβωσε.',
    wait: ['Ψιτ! Περιμένουμε εσένα!', 'Μιάου! Περιμένω εσένα.'],
    green: [`Πράσινα τα tests, ${n.greek}!`, 'Ζήτω! Χορεύω!'],
    red: [`Κόκκινα τα tests, ${n.greek}...`, 'Φφφ! Κόκκινα!'],
    commit: [`Ορίστε μια σαρδέλα, ${n.greek}!`, 'Ννιάμ! Ευχαριστώ!'],
    bored: [`${n.greek}, μην κοιμάσαι, ακόμα τρέχει!`, 'Χααα... ζζζ'],
    slapped: 'Άου! Γιατί με χτυπάς;',
    snubbed: `${n.greek}; Μ' ακούς;`,
    retort: ['Τι θες;', 'Φτάνει πια!', 'Πάρ\' τα!', 'Μη με πρήζεις!', 'Φύγε από δω!'],
    shrug: ['...', 'Όχι τώρα.', 'Μμμ. Όχι.', 'Αργότερα.', 'Δουλεύω.'],
    swat: 'Εεε! Χωρίς χέρια.',
    asks: 'Και τα χάδια μου;',
    offKeys: `${n.greek}, κατέβα από το πληκτρολόγιο!`,
  }),
  english: n => ({
    nudges: [
      t => `${n.latin}, have a look at "${t}"!`,
      t => `How's "${t}" going, ${n.latin}?`,
      t => `No napping! "${t}" is waiting.`,
      t => `${n.latin}, I need "${t}" by lunch!`,
      t => `Fix "${t}" and there's a sardine in it.`,
      t => `Come on ${n.latin}, a bit more on "${t}".`,
    ],
    vague: [`${n.latin}, time to work!`, `What are you up to, ${n.latin}?`, `Come on ${n.latin}, let's go!`],
    tool: tool =>
      ({
        run: `${n.latin}, run the command!`,
        read: `Read the file, ${n.latin}!`,
        edit: `Fix the code, ${n.latin}!`,
        search: `Find it, ${n.latin}! Look everywhere.`,
        web: `Search the web, ${n.latin}!`,
        agents: `Call the kittens to help, ${n.latin}!`,
        mcp: `Ask our friends, ${n.latin}: ${shortTool(tool)}`,
        other: `${n.latin}, do a ${tool}!`,
      })[kind(tool)],
    done: `Well done, ${n.latin}! Have a treat.`,
    oops: `Uh-oh, ${n.latin}... what happened?`,
    hiss: 'Hsss! Something went wrong.',
    wait: ['Psst! We are waiting for you!', 'Meow! Waiting for you.'],
    green: [`Tests are green, ${n.latin}!`, 'Hooray! Dance time!'],
    red: [`Tests are red, ${n.latin}...`, 'Hsss! Red!'],
    commit: [`Here's a sardine, ${n.latin}!`, 'Nom! Thank you!'],
    bored: [`${n.latin}, don't fall asleep, it's still running!`, 'Yaaawn... zzz'],
    slapped: 'Ow! What was that for?',
    snubbed: `${n.latin}? Hello?`,
    retort: ['What now?', 'Enough!', 'Take that!', 'Stop nagging!', 'Shoo!', 'Are you kidding me?'],
    shrug: ['...', 'Nope.', 'Mmm. No.', 'Busy.', 'Later.'],
    swat: 'Hey! No touching.',
    asks: 'Where are my cuddles?',
    offKeys: `${n.latin}, get off the keyboard!`,
  }),
  spanish: n => RIOPLATENSE(n),
  british: n => JAMONA(n),
}

// Spanish as they speak it in Buenos Aires: voseo, and "dale". The cat's own
// answers here are Asturias', who grew up there.
const RIOPLATENSE = (n: Name): Lines => ({
  nudges: [
    t => `${n.latin}, ¡mirá «${t}»!`,
    t => `¿Cómo va «${t}», ${n.latin}?`,
    t => `¡Nada de siesta! «${t}» te espera.`,
    t => `${n.latin}, ¡quiero «${t}» para el mediodía!`,
    t => `Si arreglás «${t}», hay sardina.`,
    t => `Dale ${n.latin}, un poquito más con «${t}».`,
  ],
  vague: [`${n.latin}, ¡a laburar!`, `¿Qué hacés ahí, ${n.latin}?`, `¡Dale ${n.latin}, arrancamos!`],
  tool: tool =>
    ({
      run: `${n.latin}, ¡corré el comando!`,
      read: `¡Leé el archivo, ${n.latin}!`,
      edit: `¡Arreglá el código, ${n.latin}!`,
      search: `¡Buscalo, ${n.latin}! Fijate por todos lados.`,
      web: `¡Buscá en internet, ${n.latin}!`,
      agents: `¡Llamá a los gatitos para que ayuden, ${n.latin}!`,
      mcp: `Preguntale a nuestros amigos, ${n.latin}: ${shortTool(tool)}`,
      other: `${n.latin}, ¡hacé un ${tool}!`,
    })[kind(tool)],
  done: `¡Bien ahí, ${n.latin}! Tomá una golosina.`,
  oops: `Uh, ${n.latin}... ¿qué pasó?`,
  hiss: '¡Fffs! ¿Quién fue?',
  wait: ['¡Ey! ¡Te estamos esperando!', '¿Qué querés?'],
  green: [`¡Tests en verde, ${n.latin}!`, 'Obvio. ¿Qué esperabas?'],
  red: [`Tests en rojo, ${n.latin}...`, '¡Fffs! Yo no fui, che.'],
  commit: [`¡Tomá una sardina, ${n.latin}!`, '¿Sardina? ¿Y el asado?'],
  bored: [`${n.latin}, no te duermas, ¡todavía sigue!`, 'Qué embole... zzz'],
  slapped: '¡Ay! ¿Y eso por qué?',
  snubbed: `¿${n.latin}? ¿Hola?`,
  retort: ['¿Qué querés?', '¡Qué pesado!', '¡Tomá!', '¡Qué hincha pelotas!', '¡Qué plomo!', 'Ni en pedo.', 'Ni a palos.', '¡Salí de acá!', '¿Me estás cargando?'],
  shrug: ['...', 'Ni ahí.', 'Qué pesado...', 'Mmm. No.', 'Estoy ocupada.', 'Después vemos.'],
  swat: '¡Ey! Sin tocar.',
  asks: '¿Y mis mimos?',
  offKeys: `¡${n.latin}, bajate del teclado!`,
})

// Jamona: a sweet, cuddly grey tabby. Posh older British. She loves jamón,
// birds, fetching hairbands, prog rock, folk, cups of tea, cuddles, sleeping
// on people and on the sofa. No temper — she only switches to Argentine
// Spanish when she wants you to throw the hairband so she can fetch it.
export const JAMONA = (n: Name): Lines => ({
  nudges: [
    t => `${n.latin}, do attend to "${t}", won't you?`,
    t => `How is "${t}" progressing, ${n.latin}, dear?`,
    t => `${n.latin}, I should rather like "${t}" by tea time.`,
    t => `Finish "${t}" and there's a slice of jamón.`,
    t => `Oh! Was that a bird? ... Right, "${t}". Carry on.`,
    t => `Come now ${n.latin}, a touch more on "${t}".`,
    t => `Shall we have a cup of tea after "${t}"?`,
    t => `${n.latin}, one more push on "${t}", then cuddles.`,
    t => `I'll sit on your lap while you do "${t}", yes?`,
    t => `Did you hear that chirping? Lovely. Now, "${t}".`,
    t => `A pigeon! ... No, focus. "${t}", ${n.latin}.`,
  ],
  vague: [`${n.latin}, shall we begin?`, `What are you up to, ${n.latin}?`, `Come along ${n.latin}, time to work.`, `Fancy a cup of tea before we start, ${n.latin}?`],
  tool: tool =>
    ({
      run: `${n.latin}, do run the command, please.`,
      read: `Read the file, ${n.latin}, if you'd be so kind.`,
      edit: `Attend to the code, ${n.latin}, there's a good cat.`,
      search: `Do have a look about, ${n.latin}.`,
      web: `Search the web, ${n.latin}, would you?`,
      agents: `Summon the kittens, ${n.latin}, we need the help.`,
      mcp: `Do ask our colleagues, ${n.latin}: ${shortTool(tool)}`,
      other: `${n.latin}, kindly perform a ${tool}.`,
    })[kind(tool)],
  done: `Splendid work, ${n.latin}! Cup of tea and jamón to celebrate?`,
  oops: `Oh dear, ${n.latin}... whatever happened?`,
  hiss: 'Goodness! Something has gone awry.',
  wait: ['Ahem! We are waiting on you, if you please.', 'Mew? One is waiting. Shall I sit on your lap?'],
  green: [`Tests are green, ${n.latin}! How marvellous.`, 'Delightful! A little celebration dance.'],
  red: [`Tests are red, ${n.latin}... most unfortunate.`, 'Oh dear. Shall we have some tea and try again?'],
  commit: [`A slice of jamón for you, ${n.latin}!`, 'Mmm! Exquisite, thank you.'],
  bored: [`${n.latin}, shall we put the kettle on? It's still running!`, 'Oh, a bird! ... I mean, yaaawn... zzz'],
  slapped: 'Oh! That was rather unexpected.',
  snubbed: `${n.latin}? I say, are you listening?`,
  // Sweet cat — no real temper lines, just gentle nudges.
  retort: ['I beg your pardon!', 'Really, now.', 'That was uncalled for.', 'How very rude.'],
  shrug: ['...', 'Mmm, not now.', 'Perhaps later, dear.', 'One is resting.', 'I am on the sofa.'],
  // She only switches to Argentine when she wants to play fetch.
  swat: '¡Tirá la gomita, dale! ¡Quiero jugar!',
  asks: '¡Che, tirame la gomita del pelo! ¡Dale, dale!',
  offKeys: `${n.latin}, I am quite comfortable here on the sofa. Oh, is that a bird?`,
})

// Words that say nothing about what a prompt is about, in the languages
// people are likely to write prompts in, so the topic Clawd picks is a
// real one ("fix the failing checkout tests" -> "checkout tests").
const STOP = new Set(
  (
    'a an the and or but of to in on at for from with by about into this that these those it its is are was be ' +
    'can could would should will please pls me my we our you your i im do does did make add fix change update ' +
    'use using get set run check look see want need let lets just also some any all more again now then there ' +
    'how what why where when which who new like out up down one two not no yes ok hi hey hello thanks ' +
    'u ur pls plz says say said tell show give try keep start stop open turn put take find help know think go ' +
    'refactor rewrite write create remove delete review investigate explain implement rename move improve ' +
    'clean migrate convert generate analyze analyse summarize summarise draft prepare compare verify ensure ' +
    // When it is due is not what it is about: "the cost report for October".
    'today tomorrow yesterday tonight morning afternoon evening week weekend month year asap eod soon later ' +
    'january february march april may june july august september october november december ' +
    'jan feb mar apr jun jul aug sep sept oct nov dec ' +
    'monday tuesday wednesday thursday friday saturday sunday ' +
    'διόρθωσε φτιάξε άλλαξε πρόσθεσε κοίτα δες τρέξε γράψε σβήσε έλεγξε σήμερα αύριο ' +
    'enero febrero marzo abril mayo junio julio agosto septiembre octubre noviembre diciembre hoy mañana revisa ' +
    'και να το τα τη την της του των σε με για από που ένα μια στο στη στην ' +
    'el la los las de del que y en un una unos unas para por con sin es son se lo le les como más pero al ' +
    'ya o este esta estos estas ese esa mi tu su hola gracias por favor haz hacer arregla cambia añade'
  ).split(' '),
)

// The topic of a prompt in a few words: its last words that carry meaning,
// which is usually what the work is about, as written ("BigQuery"): three
// when they fit, else two, else one; a very long word is cut.
const TOPIC_MOST = 26
export function topicOf(text: string): string {
  const words = text
    .replace(/[`"'«»“”¡!¿?()[\]{}<>.,;:]/g, ' ')
    .split(/\s+/)
    .filter(w => {
      const low = w.toLowerCase()
      return [...w].length >= 3 && !STOP.has(low) && !/^[\d/~._-]+$/.test(w) && !w.includes('/')
    })
  for (const n of [3, 2, 1]) {
    const topic = words.slice(-n).join(' ')
    if ([...topic].length <= TOPIC_MOST) return topic
  }
  return [...(words[words.length - 1] ?? '')].slice(0, TOPIC_MOST).join('')
}

// What a Bash command was, as the cat cares: a test run, a commit, or
// anything else. Quoted text is set aside first (`echo "git commit"` is no
// commit), then each command of the line is read on its own: a runner only
// counts where a command starts (`pip install pytest` runs pip, not tests).
const RUNNERS = new Set(['pytest', 'jest', 'vitest', 'mocha', 'ava', 'tap', 'rspec', 'phpunit', 'pest', 'tox', 'nox', 'ctest', 'karma', 'playwright', 'cypress'])
const WITH_TEST = new Set(['go', 'cargo', 'mix', 'dotnet', 'swift', 'deno', 'bun', 'zig', 'flutter', 'dart', 'gradle', 'gradlew', 'mvn', 'mvnw', 'sbt', 'lein', 'stack', 'cabal'])
const PACKAGE = new Set(['npm', 'pnpm', 'yarn', 'bun'])
const SETUP = new Set(['install', 'install-deps', 'codegen', 'open', 'show-report', 'init', 'verify'])
// Ahead of the real command: a variable, a wrapper, a runner of runners.
const PREFIX = /^(?:\w+=\S*\s+|(?:sudo|time|nice|env|command|exec|if|then|else|do|while|until)\s+|!\s*|timeout\s+(?:-\S+\s+)*\S+\s+|(?:npx|bunx|pnpx)\s+(?:-y\s+|--yes\s+)?|(?:pnpm|yarn|npm)\s+(?:exec|dlx)\s+|bundle\s+exec\s+|(?:uv|poetry|pipenv|hatch|pdm|rye)\s+run\s+|python3?\s+-m\s+)/

export type BashKind = 'tests' | 'commit'

// The commands of a line, each with whether its exit code is the line's:
// only `&&` may follow it (a failure stops the line there), never a pipe,
// `||`, `;` or `&`, which hand the line's exit code to someone else.
function commandsOf(line: string): { words: string[]; isExitTold: boolean }[] {
  // A heredoc's body is text, not commands: `cat > run.sh <<'EOF'` ... `EOF`.
  const noHeredocs = line.replace(/<<-?\s*(['"]?)(\w+)\1[^\n]*\n[\s\S]*?\n\s*\2\s*(?=\n|$)/g, '<<HEREDOC')
  // Quoted text set aside, and redirections (`2>&1`, `&>log`), whose `&` is
  // no background.
  const bare = noHeredocs.replace(/'[^']*'|"(?:\\.|[^"\\])*"/g, '""').replace(/\d*[<>]&[\d-]*|&>>?/g, ' ')
  const parts = bare.split(/(\|\||&&|[;|&\n])/)
  const out: { words: string[]; isExitTold: boolean }[] = []
  for (let i = 0; i < parts.length; i += 2) {
    let text = (parts[i] ?? '')
      .trim()
      .replace(/^[({]\s*/, '')
      .replace(/\s*[)}]\s*$/, '')
    for (let prefix = PREFIX.exec(text); prefix; prefix = PREFIX.exec(text)) text = text.slice(prefix[0].length)
    // A trailing `&` sends it to the background: its exit code is the shell's.
    // (A lone `)` or `}` closing a group is no command of its own.)
    const after = parts.filter((p, j) => j > i && j % 2 === 1 && (p === '&' || !/^[\s)}]*$/.test(parts[j + 1] ?? '')))
    out.push({ words: text.split(/\s+/).filter(Boolean), isExitTold: after.every(sep => sep === '&&') })
  }
  return out
}

// The command's own name, without its path (`./gradlew` -> `gradlew`).
const nameOf = (word: string | undefined) => (word ?? '').split('/').pop() ?? ''

function isTests(words: string[]): boolean {
  const name = nameOf(words[0])
  const rest = words.slice(1).filter(w => !w.startsWith('-'))
  // A runner, unless it's only being set up (`npx playwright install`).
  if (RUNNERS.has(name)) return !SETUP.has(rest[0] ?? '')
  if (name === 'node' && words.includes('--test')) return true
  if (PACKAGE.has(name)) {
    // Past a workspace and the values of --filter, --prefix and the like.
    const words2: string[] = []
    for (let i = 1; i < words.length; i++) {
      const w = words[i]!
      // (npm's -w names a workspace; pnpm's -w is the workspace root, alone.)
      if (/^--?(filter|prefix|dir|cwd|workspace|C|F)$/.test(w) || (w === '-w' && name === 'npm')) i++
      else if (!w.startsWith('-')) words2.push(w)
    }
    const at = words2[0] === 'workspace' ? 2 : 0
    const scriptAt = words2[at] === 'run' ? at + 1 : at
    const script = words2[scriptAt]
    const after = words2[scriptAt + 1] ?? ''
    if (script !== undefined && (['test', 't', 'tests'].includes(script) || script.startsWith('test:') || (RUNNERS.has(script) && !SETUP.has(after)))) return true
  }
  if (name === 'cargo' && rest[0] === 'nextest') return true
  if (name === 'make') return rest.some(w => ['test', 'tests', 'check'].includes(w))
  if (WITH_TEST.has(name)) return rest.some(w => w === 'test' || w === 'verify')
  return false
}

function isCommit(words: string[]): boolean {
  // (A commit's exit code, like a test run's, is its own only if nothing but
  // `&&` follows it: `git commit || true` always succeeds.)
  if (nameOf(words[0]) !== 'git') return false
  // Past git's own options (-C dir, -c key=value, --git-dir=...) to its command.
  let i = 1
  while (i < words.length && words[i]!.startsWith('-')) i += words[i] === '-C' || words[i] === '-c' ? 2 : 1
  return words[i] === 'commit' && !words.includes('--dry-run')
}

// What the command is, and whether its exit code is the test run's own: a
// run piped on (`| tail`) or followed by more (`|| true`, `; echo`) reports
// someone else's, so its output has to be read instead.
export function bashKind(command: string): { kind: BashKind; isExitTold: boolean } | undefined {
  const commands = commandsOf(command)
  const commit = commands.find(c => isCommit(c.words))
  if (commit) return { kind: 'commit', isExitTold: commit.isExitTold }
  const tests = commands.find(c => isTests(c.words))
  if (tests) return { kind: 'tests', isExitTold: tests.isExitTold }
  return undefined
}

// Whether a test run's output says something failed: "3 failed", "FAIL",
// "FAILED", "2 errors"; never "0 failed".
export const saysFailed = (text: string) => /\b[1-9]\d* (?:failed|failing|failures?|errors?)\b|\bFAIL(?:ED|URES?)?\b|\bnot ok \d/.test(text)
