// Who lives in the yard, by coat: Manousos, the Cretan, in his own coat or
// the tuxedo; Asturias, the ginger from Buenos Aires, who sings coplas and
// tangos instead of mantinades, and answers for herself in rioplatense
// Spanish whatever the language setting says.

import type { Coat } from '../types'
import { RIOPLATENSE, type Language, type Lines, type Name } from './lines'

// Her own short answers, in place of the language setting's.
export type Says = {
  hiss: string
  wait: string
  green: string
  red: string
  commit: string
  bored: string
  // Clawd nudged once too often: a slap, or nothing at all.
  slap: string[]
  snub: string[]
  // A pet she didn't ask for.
  swat: string
  // Lying on your keyboard: what she types into Clawd's bubble, and what
  // she wants to get off it.
  typed: string[]
  asks: string
}

export type Persona = {
  name: Name
  he: string
  him: string
  his: string
  songs: [string, string][]
  says?: Says
  // How Clawd speaks a language to this cat, where it isn't the usual way.
  dialects?: Partial<Record<Language, (n: Name) => Lines>>
  // The chance that a nudge from Clawd earns a slap, or a snub, instead;
  // and that a turn starts with her on your keyboard.
  temper: { slap: number; snub: number; keys: number }
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

// Asturias' songs: payador coplas, four eight-syllable lines sung two to a
// line, the gauchos' answer to the mantinada; and a few tangos, bent to the
// work.
const COPLAS: [string, string][] = [
  ['Aquí me pongo a cantar al compás de la consola,', 'que la gata que desvela un bug no se queda sola.'],
  ['Yo no soy gata de nadie, ni de patrón ni de amigo;', 'si me buscás, yo te araño; si me ignorás, te persigo.'],
  ['No se deploya los viernes, eso me enseñó mi abuela;', 'porque el sábado hay asado, y el pager no se consuela.'],
  ['Cebame un mate, Clawdito, que este build va para largo;', 'si sale verde, te canto; si sale rojo, te amargo.'],
  ['Si me hablás, me hago la sorda; si me apurás, te doy un sopapo;', 'yo soy gata de arrabal, y a mí no me corre ningún guapo.'],
  ['Me tirás una sardina, ¿me viste cara de griega?', 'Pasame un pedazo de asado, y después hablamos, colega.'],
  ['Que el griego cante a su monte, que yo canto al Aconcagua;', 'él tiene raki en la mesa, y yo tengo el mate y el agua.'],
  ['A las tres de la mañana me sonó el pager del on-call;', 'yo maullé como una loca, y el bug siguió tan normal.'],
  ['Mandé el PR a la mañana y todavía estoy esperando;', 'me crecieron los bigotes, y el mate se está enfriando.'],
  ['Maldije al que escribió esto, hace por lo menos un año,', 'y el git blame me batió: era yo. ¡Qué desengaño!'],
  ['En mi máquina anda, che, te lo juro por mi vieja;', 'pero en prod se prendió fuego, y el cliente ya se queja.'],
  ['En la daily digo «avanzo», y lo digo cada día;', 'el ticket sigue In Progress, pero con mucha alegría.'],
  ['Corrí un DELETE sin WHERE en la base de producción;', 'ahora busco el backup y rezo por mi salvación.'],
  ['Mi repo querido, cuando yo te vuelva a ver,', 'no habrá más merge conflicts, ni pipelines por correr.'],
  ['Que el legacy fue y será una porquería, ya lo sé,', 'en el commit quinientos seis y en el dos mil también.'],
  ['Volver, con la frente marchita, al ticket que dejé en Review;', 'sentir que es un soplo la vida, que veinte commits no es nada.'],
  ['Che, Clawd, no me apurés, que yo laburo a mi modo:', 'un ratito con el código, y una siesta para todo.'],
]

const MANOUSOS: Persona = {
  name: { latin: 'Manousos', greek: 'Μανούσο' },
  he: 'he',
  him: 'him',
  his: 'his',
  songs: MANTINADES,
  temper: { slap: 0, snub: 0, keys: 0 },
}

const ASTURIAS: Persona = {
  name: { latin: 'Asturias', greek: 'Αστούριας' },
  he: 'she',
  him: 'her',
  his: 'her',
  songs: COPLAS,
  dialects: { spanish: RIOPLATENSE },
  says: {
    hiss: '¡Fffs! ¿Quién fue?',
    wait: '¿Qué querés?',
    green: 'Obvio. ¿Qué esperabas?',
    red: '¡Fffs! Yo no fui, che.',
    commit: '¿Sardina? ¿Y el asado?',
    bored: 'Qué embole... zzz',
    slap: ['¿Qué querés?', '¡Qué pesado!', '¡Tomá!', '¡Qué hincha pelotas!', 'Ni en pedo.', '¡Salí de acá!', '¿Me estás cargando?'],
    snub: ['...', 'Ni ahí.', 'Qué pesado...', 'Mmm. No.', 'Estoy ocupada.', 'Después vemos.'],
    swat: '¡Ey! Sin tocar.',
    typed: ['asdfjjjjjjjjjj;;;;;;', 'ñññññññññññññññ', 'qwwwwwwwwwwwwwwwwwww', 'gggggggg              h'],
    asks: '¿Y mis mimos?',
  },
  temper: { slap: 0.3, snub: 0.3, keys: 0.2 },
}

export const CATS: Record<Coat, Persona> = { manousos: MANOUSOS, tuxedo: MANOUSOS, ginger: ASTURIAS }
