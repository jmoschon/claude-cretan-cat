// What Clawd tells Manousos, and what Manousos says when he isn't singing,
// in each language the "language" setting offers. The mantinades are not
// here: they are Cretan, and stay in Greek whatever the setting.

export const LANGUAGES = ['greek', 'english', 'spanish'] as const
export type Language = (typeof LANGUAGES)[number]

export const isLanguage = (v: unknown): v is Language => typeof v === 'string' && (LANGUAGES as readonly string[]).includes(v)

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

const N_GR = 'Μανούσο'
const N = 'Manousos'

export const LINES: Record<Language, Lines> = {
  greek: {
    nudges: [
      t => `${N_GR}, κοίτα λίγο το «${t}»!`,
      t => `Πώς πάει το «${t}», ${N_GR};`,
      t => `Μην κοιμάσαι! Το «${t}» περιμένει.`,
      t => `${N_GR}, θέλω το «${t}» ως το μεσημέρι!`,
      t => `Αν φτιάξεις το «${t}», έχει σαρδέλα.`,
      t => `Έλα ${N_GR}, λίγο ακόμα με το «${t}».`,
    ],
    vague: [`${N_GR}, πιάσε δουλειά!`, `Τι κάνεις εκεί, ${N_GR};`, `Έλα ${N_GR}, ξεκινάμε!`],
    tool: tool =>
      ({
        run: `${N_GR}, τρέξε την εντολή!`,
        read: `Διάβασε το αρχείο, ${N_GR}!`,
        edit: `Φτιάξε τον κώδικα, ${N_GR}!`,
        search: `Βρες το, ${N_GR}! Ψάξε παντού.`,
        web: `Ψάξε στο ίντερνετ, ${N_GR}!`,
        agents: `Φώναξε τα γατάκια να βοηθήσουν, ${N_GR}!`,
        mcp: `Ρώτα τους φίλους μας, ${N_GR}: ${shortTool(tool)}`,
        other: `${N_GR}, κάνε ένα ${tool}!`,
      })[kind(tool)],
    done: `Μπράβο ${N_GR}! Πάρε μια λιχουδιά.`,
    oops: `Ωχ, ${N_GR}... τι έγινε;`,
    hiss: 'Φφφ! Κάτι στράβωσε.',
    wait: ['Ψιτ! Περιμένουμε εσένα!', 'Μιάου! Περιμένω εσένα.'],
    green: [`Πράσινα τα tests, ${N_GR}!`, 'Ζήτω! Χορεύω!'],
    red: [`Κόκκινα τα tests, ${N_GR}...`, 'Φφφ! Κόκκινα!'],
    commit: [`Ορίστε μια σαρδέλα, ${N_GR}!`, 'Ννιάμ! Ευχαριστώ!'],
    bored: [`${N_GR}, μην κοιμάσαι, ακόμα τρέχει!`, 'Χααα... ζζζ'],
  },
  english: {
    nudges: [
      t => `${N}, have a look at "${t}"!`,
      t => `How's "${t}" going, ${N}?`,
      t => `No napping! "${t}" is waiting.`,
      t => `${N}, I need "${t}" by lunch!`,
      t => `Fix "${t}" and there's a sardine in it.`,
      t => `Come on ${N}, a bit more on "${t}".`,
    ],
    vague: [`${N}, time to work!`, `What are you up to, ${N}?`, `Come on ${N}, let's go!`],
    tool: tool =>
      ({
        run: `${N}, run the command!`,
        read: `Read the file, ${N}!`,
        edit: `Fix the code, ${N}!`,
        search: `Find it, ${N}! Look everywhere.`,
        web: `Search the web, ${N}!`,
        agents: `Call the kittens to help, ${N}!`,
        mcp: `Ask our friends, ${N}: ${shortTool(tool)}`,
        other: `${N}, do a ${tool}!`,
      })[kind(tool)],
    done: `Well done, ${N}! Have a treat.`,
    oops: `Uh-oh, ${N}... what happened?`,
    hiss: 'Hsss! Something went wrong.',
    wait: ['Psst! We are waiting for you!', 'Meow! Waiting for you.'],
    green: [`Tests are green, ${N}!`, 'Hooray! Dance time!'],
    red: [`Tests are red, ${N}...`, 'Hsss! Red!'],
    commit: [`Here's a sardine, ${N}!`, 'Nom! Thank you!'],
    bored: [`${N}, don't fall asleep, it's still running!`, 'Yaaawn... zzz'],
  },
  spanish: {
    nudges: [
      t => `${N}, ¡mira «${t}»!`,
      t => `¿Cómo va «${t}», ${N}?`,
      t => `¡Nada de siestas! «${t}» te espera.`,
      t => `${N}, ¡quiero «${t}» para el mediodía!`,
      t => `Si arreglas «${t}», hay sardina.`,
      t => `Venga ${N}, un poco más con «${t}».`,
    ],
    vague: [`${N}, ¡a trabajar!`, `¿Qué haces ahí, ${N}?`, `¡Venga ${N}, empezamos!`],
    tool: tool =>
      ({
        run: `${N}, ¡ejecuta el comando!`,
        read: `¡Lee el archivo, ${N}!`,
        edit: `¡Arregla el código, ${N}!`,
        search: `¡Encuéntralo, ${N}! Busca por todas partes.`,
        web: `¡Busca en internet, ${N}!`,
        agents: `¡Llama a los gatitos para que ayuden, ${N}!`,
        mcp: `Pregunta a nuestros amigos, ${N}: ${shortTool(tool)}`,
        other: `${N}, ¡haz un ${tool}!`,
      })[kind(tool)],
    done: `¡Bien hecho, ${N}! Toma una golosina.`,
    oops: `Ay, ${N}... ¿qué ha pasado?`,
    hiss: '¡Fffs! Algo salió mal.',
    wait: ['¡Psst! ¡Te estamos esperando!', '¡Miau! Te estoy esperando.'],
    green: [`¡Tests en verde, ${N}!`, '¡Bravo! ¡A bailar!'],
    red: [`Tests en rojo, ${N}...`, '¡Fffs! ¡Rojo!'],
    commit: [`¡Toma una sardina, ${N}!`, '¡Ñam! ¡Gracias!'],
    bored: [`${N}, no te duermas, ¡aún sigue!`, 'Aaah... zzz'],
  },
}

// Words that say nothing about what a prompt is about, in the languages
// people are likely to write prompts in, so the topic Clawd picks is a
// real one ("fix the failing checkout tests" -> "checkout tests").
const STOP = new Set(
  (
    'a an the and or but of to in on at for from with by about into this that these those it its is are was be ' +
    'can could would should will please pls me my we our you your i im do does did make add fix change update ' +
    'use using get set run check look see want need let lets just also some any all more again now then there ' +
    'how what why where when which who new like out up down one two not no yes ok hi hey hello thanks ' +
    'και να το τα τη την της του των σε με για από που ένα μια στο στη στην ' +
    'el la los las de del que y en un una unos unas para por con sin es son se lo le les como más pero al ' +
    'ya o este esta estos estas ese esa mi tu su hola gracias por favor haz hacer arregla cambia añade'
  ).split(' '),
)

// The topic of a prompt in a word or two: its last two words that carry
// meaning, which is usually what the work is about; one word when two run
// long; a very long word is cut.
export function topicOf(text: string): string {
  const words = text
    .toLowerCase()
    .replace(/[`"'«»“”¡!¿?()[\]{}<>.,;:]/g, ' ')
    .split(/\s+/)
    .filter(w => [...w].length >= 3 && !STOP.has(w) && !/^[\d/~._-]+$/.test(w) && !w.includes('/'))
  const two = words.slice(-2).join(' ')
  const topic = [...two].length > 26 ? (words[words.length - 1] ?? '') : two
  return [...topic].slice(0, 26).join('')
}

// What a Bash command was, as the cat cares: a test run, a commit, or
// anything else. Quoted text is set aside first (`echo "git commit"` is no
// commit), then each command of the line is read on its own: a runner only
// counts where a command starts (`pip install pytest` runs pip, not tests).
const RUNNERS = new Set(['pytest', 'jest', 'vitest', 'mocha', 'ava', 'tap', 'rspec', 'phpunit', 'pest', 'tox', 'nox', 'ctest', 'karma', 'playwright', 'cypress'])
const WITH_TEST = new Set(['go', 'cargo', 'mix', 'dotnet', 'swift', 'deno', 'bun', 'zig', 'flutter', 'dart', 'gradle', 'gradlew', 'mvn', 'mvnw', 'sbt', 'lein', 'stack', 'cabal'])
const PACKAGE = new Set(['npm', 'pnpm', 'yarn', 'bun'])
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
    const after = parts.filter((p, j) => j > i && j % 2 === 1 && (p === '&' || (parts[j + 1] ?? '').trim() !== ''))
    out.push({ words: text.split(/\s+/).filter(Boolean), isExitTold: after.every(sep => sep === '&&') })
  }
  return out
}

// The command's own name, without its path (`./gradlew` -> `gradlew`).
const nameOf = (word: string | undefined) => (word ?? '').split('/').pop() ?? ''

function isTests(words: string[]): boolean {
  const name = nameOf(words[0])
  const rest = words.slice(1).filter(w => !w.startsWith('-'))
  if (RUNNERS.has(name)) return true
  if (name === 'node' && words.includes('--test')) return true
  if (PACKAGE.has(name)) {
    // Past a workspace and the values of --filter, --prefix and the like.
    const words2: string[] = []
    for (let i = 1; i < words.length; i++) {
      const w = words[i]!
      if (/^--?(filter|prefix|dir|cwd|workspace|C|F|w)$/.test(w)) i++
      else if (!w.startsWith('-')) words2.push(w)
    }
    const at = words2[0] === 'workspace' ? 2 : 0
    const script = words2[at] === 'run' ? words2[at + 1] : words2[at]
    if (script !== undefined && (['test', 't', 'tests'].includes(script) || script.startsWith('test:') || RUNNERS.has(script))) return true
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
