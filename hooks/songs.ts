// What the cat sings while Claude works, by the "songs" setting: Cretan
// mantinades, rioplatense coplas and tangos, or English couplets. Each set
// stays in its own language, whatever language Clawd speaks.

export const SONG_LANGUAGES = ['greek', 'english', 'spanish'] as const
export type SongLanguage = (typeof SONG_LANGUAGES)[number]
export const isSongLanguage = (v: unknown): v is SongLanguage => typeof v === 'string' && (SONG_LANGUAGES as readonly string[]).includes(v)

// Cretan mantinades: fifteen-syllable rhyming couplets.
const MANTINADES: [string, string][] = [
  ['Στο πληκτρολόγιο κάθομαι, τα bugs τα κυνηγάω,', 'κι όποιο ποντίκι βρω μπροστά, με μια πατιά το φάω.'],
  ['Σιγά σιγά ο κώδικας, σιγά και το πιθάρι,', 'κι εγώ που βιάζομαι πολύ ποτέ δεν πιάνω ψάρι.'],
  ['Ψάχνω στα logs σαν το βοσκό που χάθηκε τ\' αρνί του,', 'κι όταν το βρει, πώς χαίρεται σαν να \'βρε την ψυχή του.'],
  ['Ψηλά στον Ψηλορείτη μας χιονίζει και φυσάει,', 'κι εγώ ’μαι μέσα στο ζεστό, κι ο κώδικας κυλάει.'],
  ['Μην κάνεις merge Παρασκευή, το λέει κι η γιαγιά μου,', 'γιατί το Σάββατο θα κλαις, θα λες «αχ, η καρδιά μου».'],
  ['Συλλογισμένος κάθομαι, κι εσείς μη μ’ ενοχλείτε,', 'θα φέρω μιαν απάντηση ψηλή σαν Ψηλορείτη.'],
  ['Η λύρα θέλει δοξαριά, κι εγώ γυρεύω χάδι,', 'κι ο κώδικας δουλειά πολλή, τη μέρα και το βράδυ.'],
  ['Στις τρεις τη νύχτα μ’ έπιασε το on-call με τρομάρα,', 'κι εγώ στον ύπνο μου ζητώ ρακή και μια κιθάρα.'],
  ['Τα tests μου είναι κάπριτσα, σαν κοπελιά που αλλάζει,', 'κι εκεί που λες πως πέρασε, το build σε κατασφάζει.'],
  ['Ένα PR απ’ το πρωί, κι ακόμα περιμένω,', 'τα γένια μου μακρύνανε, στον καφενέ πηγαίνω.'],
  ['Ρακή μου και ρακάκι μου, σε πίνω να ξεχάσω', 'το force push που ’κανα στο main, πριν τη δουλειά τη χάσω.'],
  ['Μια σύσκεψη, και δεύτερη, και τρίτη μες στη μέρα,', 'κι ο κώδικάς μου κάθεται και χάσκει στον αέρα.'],
  ['Επάτησα, χωρίς να δω, στο πληκτρολόγιο πάνω,', 'κι έλυσα μόνος μου το bug· τι θέλεις να σου κάνω;'],
  ['Το Datadog μας ακριβό, σαν τ’ ακριβό χρυσάφι,', 'τα logs που δεν διαβάζουμε σαπίζουνε στο ράφι.'],
  ['Σαν μεθυσμένος στο γλεντί, το pod ξαναπεθαίνει,', 'κι ο Kubernetes το κοιτά και λέει πως υγιαίνει.'],
  ['Τα tickets μου στο Jira ’ναι σαν τ’ ουρανού τ’ αστέρια,', 'κι εγώ τα κλείνω σιγανά, με δυο μονάχα χέρια.'],
  ['Στο laptop μου δουλεύει, ναι, το ορκίζομαι στη μάνα,', 'μα στην production έπεσε, και χτύπησε καμπάνα.'],
  ['Στο standup λέω «προχωρώ», το ίδιο κάθε μέρα,', 'In Progress μένει πάντα του, ώσπου να βάλω βέρα.'],
  ['Βρίζω αυτόν που έγραψε τον κώδικα πριν χρόνια,', 'και το git blame με πρόδωσε, και πέφτουν τα κανόνια.'],
  ['Απ’ τον μπακάλη ζήτησα ρακή και παξιμάδι,', 'κι ήρθε πιο γρήγορα απ’ το build που τρέχει απ’ το βράδυ.'],
  ['Δυο πράγματα ’ναι δύσκολα σε τούτη τη ζωή μας:', 'το cache και τα ονόματα, κι off-by-one η ντροπή μας.'],
  ['DELETE χωρίς WHERE έτρεξα μες στην production βάση,', 'backup γυρεύω τώρα πια, μα κάπου θα ’χει σπάσει.'],
  // Beef with the Argentine across the sea, never by name.
  ['Η Αργεντινή μου φωνάζει πως τ’ ασάδο της νικάει,', 'μα έναν ντάκο κρητικό ποτέ της δεν ξεχνάει.'],
  ['Μου λέει «che» και «boludo», κι εγώ δεν καταλαβαίνω,', 'της λέω «άντε στο καλό», και στη ρακή μου πηαίνω.'],
  ['Ταγκό χορεύει η Αργεντινή, τα πόδια της τα σέρνει,', 'μα στο δικό μου πεντοζάλι ανάσα δεν την παίρνει.'],
  ['Όλη τη μέρα πίνει μάτε, με το καλαμάκι,', 'κι εγώ γλεντώ στον καφενέ με κρητικό ρακάκι.'],
  ['Μου λέει τ’ Ακονκάγκουα της ως τα ουράνια πάει,', 'μα στην κορφή του Ψηλορείτη ο Δίας μας κερνάει.'],
]

// Payador coplas, four eight-syllable lines sung two to a line, the
// gauchos' answer to the mantinada; and a few tangos, bent to the work.
const COPLAS: [string, string][] = [
  ['Aquí me pongo a cantar al compás de la consola,', 'que yo, gata que desvela un bug, no me quedo sola.'],
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
  // Beef with the Greek across the sea, never by name.
  ['Dice el griego que es filósofo porque duerme todo el día;', 'yo también duermo la siesta, y no la llamo sabiduría.'],
  ['El gato de Creta canta con la lira desafinada;', 'le saco el bandoneón, y se le apaga la mantinada.'],
  ['El griego me habla de Homero, de Ulises y de su viaje;', 'yo me tomo un colectivo, y llego antes, sin equipaje.'],
  ['Me jura que su aceite es el mejor de todo el mundo;', 'le serví un chimichurri, y quedó meditabundo.'],
  ['El griego come sardinas y dice que es un manjar;', 'que pruebe una milanesa, y después vuelva a hablar.'],
  ['Me dijo «καλημέρα», y yo le dije «¿qué decís?»;', 'si querés hablar conmigo, hablame en castellano, aprendiz.'],
  ['Dice que inventó la lógica, la democracia y el teatro;', 'pero el dulce de leche es nuestro, y eso no lo empata ningún gato.'],
  ['Dice que en su paniguiri se baila hasta que sale el sol;', 'a esa hora, en Buenos Aires, recién abre el boliche, mi amor.'],
]

// English rhyming couplets, in the same spirit.
const COUPLETS: [string, string][] = [
  ['Upon the keyboard, there I sit and chase each bug in sight,', 'and any mouse that crosses me is gone in just one bite.'],
  ['Slow and steady, line by line, the way the old folks say;', "so if I rush right through the code, I'm hungry all the day."],
  ['I search the logs the way a shepherd hunts a stray at night,', 'and when I find the error, oh, my heart is warm and light.'],
  ["Don't merge upon a Friday, as my grandma used to say,", "or you'll spend your Saturday in tears and disarray."],
  ['At three a.m. the pager rang, the on-call shift was mine;', 'I dreamt of raki, sunny Crete, and graphs that all looked fine.'],
  ['My tests are fickle lovers, changing moods from day to day:', 'you think the build is passing, then it throws it all away.'],
  ["I sent my PR this morning, and I'm waiting for review;", "my whiskers have grown longer, and my coffee's cold now too."],
  ['One meeting, then another, then a third one after lunch,', 'and all my code sits idle while the calendar eats my lunch.'],
  ['It works upon my laptop, and I swear it on my name,', "but production's down in flames, and somehow I'm to blame."],
  ['At standup I say "progressing", as I do most every day;', "the ticket's still In Progress, and it's likely there to stay."],
  ['I cursed whoever wrote this code so many years ago,', 'then git blame showed my own name there, and all I said was "oh".'],
  ['There are only two hard problems that will ruin any day:', 'cache invalidation, naming things, and off-by-one, they say.'],
  ['I ran a DELETE without a WHERE upon the prod DB,', 'and now I hunt for backups while the team comes after me.'],
  ['Our Datadog bill is precious, like a chest of shining gold,', 'and the logs nobody reads in there are slowly growing old.'],
  ['Like a dancer at a wedding, the pod goes down and up,', "and Kubernetes swears it's healthy, raising high its cup."],
]

export const SONGS: Record<SongLanguage, [string, string][]> = { greek: MANTINADES, english: COUPLETS, spanish: COPLAS }
