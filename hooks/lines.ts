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
