# claude-cretan-cat

Manousos is a Cretan cat who lives above your Claude Code prompt.

While Claude works, Clawd tells him what to do, and Manousos answers in song,
in a speech bubble beside him: Cretan *mantinades* by default, or Spanish
coplas, or English couplets. When the work is done he sits and purrs; when
nothing is happening he sleeps on his cushion. Behind them stands Psiloritis,
under the sun or the moon as your clock says.

![Clawd and Manousos above the Claude Code prompt](docs/demo.gif)

He is drawn after a real cat: dark brown long hair, a white bib and white
mittens.

- **Free to run.** No model calls and no network requests: everything is drawn
  locally from what Claude Code is already doing.
- **Independent.** Not affiliated with or endorsed by Anthropic.

## Contents

- [Quick start](#quick-start)
- [What he does](#what-he-does)
- [Commands](#commands)
- [Settings](#settings)
- [Temper](#temper)
- [Meet Asturias](#meet-asturias)
- [Room it needs](#room-it-needs)
- [Desktop app](#desktop-app)
- [Troubleshooting](#troubleshooting)
- [Development](#development)
- [Credits](#credits)
- [License](#license)

## Quick start

You need Claude Code with plugin hook modules, an early-access feature. This
was built and tested on version 2.1.299.

At the Claude Code prompt:

```text
/plugin install cretan-cat --marketplace jmoschon/claude-cretan-cat
```

Answer `y` to add the marketplace, then pick a scope (user scope loads him in
every session). He appears above the prompt straight away.

### From source

```sh
git clone https://github.com/jmoschon/claude-cretan-cat ~/src/claude-cretan-cat
claude --plugin-dir ~/src/claude-cretan-cat
```

To load it in every session, add the folder's full path to the `env` block of
`~/.claude/settings.json`, then restart Claude Code:

```json
{
  "env": {
    "CLAUDE_CODE_PLUGIN_DIRS": "/Users/you/src/claude-cretan-cat"
  }
}
```

To update, run `git pull` in the folder.

## What he does

| When                        | Manousos                                    | Clawd                                    |
| --------------------------- | ------------------------------------------- | ---------------------------------------- |
| Nothing is running          | Sleeps curled up on his cushion             | Dozes                                    |
| Claude is thinking          | Paces the lawn, singing                     | Nudges him about your task               |
| Claude runs a tool          | Crouches, wiggles, pounces                  | Gives the order for it                   |
| Claude needs you            | Sits up and looks at you, `?` overhead      | Waves at you                             |
| Tests pass                  | Dances                                      | Cheers                                   |
| Tests fail                  | Hisses                                      | *Tests are red...*                       |
| A commit goes in            | Catches a sardine and eats it               | Tosses the sardine                       |
| A tool runs over 20 seconds | Yawns, then dozes off until it's done       | *Don't fall asleep, it's still running!* |
| The work is done            | Purrs and sings; a sardine if Claude worked | Tosses the sardine, cheers               |
| Something failed            | Jumps, tail puffed up                       | Asks what happened                       |
| You pressed Esc             | Goes back to sleep                          | Dozes                                    |

The finer points:

- **Nudges.** While Claude thinks, Clawd nudges him about your task every few
  seconds (examples here are in English; Clawd speaks Greek by default): *How's "checkout tests" going, Manousos?* The topic is picked from
  the last meaningful words of your prompt, as you wrote them: "refactor the
  BigQuery cost report for October" becomes "BigQuery cost report", leaving
  out the verb and when it is due. Slash commands are never picked up.
- **Orders.** For each tool Clawd has a line: *Manousos, run the command!*,
  *Read the file, Manousos!*, *Call the kittens to help, Manousos!*
- **Waiting.** He sits up (*Meow! Waiting for you.*) when Claude Code shows
  you a permission prompt, asks you a question, or wants a plan approved.
  There is no signal for the moment you answer a permission prompt, so he
  stays up until that tool call ends.
- **Dozing off.** Only a tool that runs on by itself bores him. Questions,
  helpers and calls that asked your permission never do: he stays up for
  those (except where permission prompts reach no plugin; see
  [Troubleshooting](#troubleshooting)).
- **Sardines.** One per commit that goes in. When the work is done and Claude
  ran any tools, he gets one for the work too, unless a commit already fed
  him that turn. `/cat stats` keeps the count.
- **What counts as tests and commits.** A command in a Bash call that runs a
  test runner (`npm test`, `pytest`, `go test`, `cargo test`, `make test`,
  `npx vitest` and the like), and a `git commit` that went in. Quoted text and
  heredocs don't count, and neither does a run you denied or one sent to the
  background. A failing exit code is a failing run; where a pipe or `|| true`
  hides the exit code (`npm test 2>&1 | tail`), the output is read instead.
- **Helpers.** While Claude has subagents running, a kitten runs across the
  lawn for each one (up to four).
- **Petting.** Type `/cat pet`, click `pet` under the yard, or press `p` while
  the band has the focus (ctrl+x then Tab moves the focus to it), and he
  closes his eyes and purrs. Where only the ASCII cat fits, the caption purrs
  instead.

### The yard through the day

The yard follows your local clock, so it changes a few times a day rather than
from moment to moment. From December to March there is snow on the peak.

| Local time  | Sky behind Psiloritis                                | The window      |
| ----------- | ---------------------------------------------------- | --------------- |
| 06:00–08:00 | Dawn: a purple sky, the sun low behind the mountains | Glass           |
| 08:00–18:00 | Day: the sun high                                    | Glass           |
| 18:00–21:00 | Dusk: an orange-purple sky, the sun setting          | The lamp is lit |
| 21:00–06:00 | Night: a dark blue sky, stars and a moon             | The lamp is lit |

What moves all the time is Manousos and Clawd themselves, the bubbles, and
the kittens while helpers run.

## Commands

| Command                    | What it does                                                     |
| -------------------------- | ---------------------------------------------------------------- |
| `/cat`                     | Hide him, or bring him back (toggles)                            |
| `/cat hide`, `/cat show`   | Hide him, or bring him back; hidden stays hidden across sessions |
| `/cat hints on\|off`       | Show or hide the /cat tips under the napping cat                 |
| `/cat small`               | Just the cat, in a small square at the right above the prompt    |
| `/cat dock`                | Just the cat, in a pane docked on the right (fullscreen layout)  |
| `/cat band`                | The whole yard above the prompt again                            |
| `/cat pet`                 | Pet him: he closes his eyes and purrs                            |
| `/cat treat`               | Toss him a sardine (or press `treat`, `t`, under the yard)       |
| `/cat play`                | Dangle the fishing toy (or press `play`, `y`): he leaps at it    |
| `/cat coat <coat>`         | `manousos` (dark brown, white bib and mittens), `ginger`, `tuxedo` |
| `/cat ginger`              | An orange tabby                                                  |
| `/cat tuxedo`              | Black and white                                                  |
| `/cat name <name>`         | Call the cat something else, up to 20 characters                 |
| `/cat language <language>` | What Clawd speaks: `greek`, `english`, `spanish`, `rioplatense`  |
| `/cat songs <language>`    | What the cat sings: `greek`, `spanish`, `english`                |
| `/cat temper on\|off`      | Give the cat a temper, or take it away (see [Temper](#temper))   |
| `/cat sound on\|off`       | Its voice on macOS: mrrp when done, mew when waiting, purr, hiss |
| `/cat asturias`            | Asturias, all at once (see below)                                |
| `/cat manousos`            | Manousos as he came, coat and settings (`/cat reset` too)        |
| `/cat stats`               | Sardines, pets and his rank, drawn                               |
| `/cat config`              | Every setting and what it is now                                 |
| `/cat help`                | Lists the commands                                               |

A few details:

- **Aliases.** `/cat lang` is `/cat language`; `/cat settings` is
  `/cat config`.
- **Names.** `/cat name Manousos` goes back to the original.
- **Asturias.** `/cat asturias` names the cat Asturias, puts her in the ginger
  coat, has Clawd speak rioplatense, sets the songs to coplas and tangos, and
  turns the temper on. She answers in her own words (*¿Qué querés?*, *Yo no
  fui, che*, *¿Sardina? ¿Y el asado?*).
- **Reset.** `/cat manousos` (or `/cat reset`) brings back his name and coat, Greek, mantinades
  and no temper.
- **Stats.** `/cat stats` draws today's sardines as fish (one per commit, or
  per finished task that used tools), how full his belly is, sardines in all
  and his best day, pets and swats, the last seven days as bars, and his
  rank, from *Kitten, no sardine yet* to *Lord of Psiloritis*.
- **Typos.** Anything `/cat` doesn't know says so, then shows the help.

`/cat help`:

```text
Manousos, the cat above the prompt

  /cat name <name>          what the cat is called (Manousos now)
  /cat coat <coat>          the coat: manousos, ginger, tuxedo (manousos now); /cat ginger or tuxedo too
  /cat language <language>  what Clawd speaks: greek, english, spanish, rioplatense (greek now)
  /cat songs <language>     what Manousos sings: greek, spanish, english (greek now)
  /cat temper on|off        whether Manousos slaps Clawd, swats you, sits on your keyboard (off now)
  /cat sound on|off         whether Manousos mrrps, mews, purrs and hisses, on macOS (off now)
  /cat asturias             Asturias: ginger, rioplatense, coplas and a temper
  /cat manousos             Manousos as he came: brown, Greek, mantinades, no temper (/cat reset too)
  /cat pet                  pet the cat (or press pet under the yard)
  /cat treat                toss the cat a sardine (or press treat)
  /cat play                 dangle the fishing toy (or press play)
  /cat stats                sardines and pets
  /cat config               every setting and what it is now
  /cat hide|show            hide the cat, or bring it back (/cat alone toggles)
  /cat hints on|off         the /cat tips under the napping cat (on now)
  /cat small                the cat alone in a small square at the right, above the prompt
  /cat dock                 the cat in a pane of its own, docked on the right
  /cat band                 the whole yard above the prompt again

The same settings are under /config, "Cretan cat".
```

`/cat config`:

```text
Manousos's settings

  name      Manousos
  coat      manousos
  language  greek
  songs     greek
  temper    off
  sound     off

/cat help says how to change them; they are under /config, "Cretan cat", too.
```

`/cat stats`, on a fresh install after one pet:

```text
Manousos's stats

  today      ·  0 sardines
  belly      ░░░░░░░░░░ empty, staring at you
  in all     0 sardines
  petted     1 time ♥
  rank       Kitten, no sardine yet (Village kitten at 1)

  this week  (nothing yet)

One sardine per commit, or per finished task that used tools.
```

## Settings

The coat you pick, whether he is hidden, his sardines and his pets are
remembered across sessions. The name, the two languages, the temper and sound are
settings: `/cat name`, `/cat language`, `/cat songs`, `/cat temper` and `/cat sound` change
the same rows you find under `/config`, so the two never disagree.

| Setting (`/config`)          | Values                                       | Default    |
| ---------------------------- | -------------------------------------------- | ---------- |
| Cretan cat: name             | any name, up to 20 characters                | `Manousos` |
| Cretan cat: Clawd's language | `greek`, `english`, `spanish`, `rioplatense` | `greek`    |
| Cretan cat: songs            | `greek`, `spanish`, `english`                | `greek`    |
| Cretan cat: temper           | `off`, `on`                                  | `off`      |
| Cretan cat: sound            | `off`, `on`                                  | `off`      |

- **Name.** What the cat is called, in the caption and by Clawd. In Greek,
  Clawd calls Manousos *Μανούσο* and Asturias *Αστούριας*, and any other name
  as you wrote it.
- **Clawd's language.** What Clawd says, and the cat's short replies.
  Rioplatense is the Spanish of Buenos Aires (*¡Dale Manousos, arrancamos!*),
  and the cat answers in it the way Asturias does.
- **Songs.** What the cat sings while Claude works: Cretan mantinades,
  payador coplas and the odd tango, or English rhyming couplets, all bent to
  the work. Each set stays in its own language, whatever Clawd speaks.
- **Temper.** See [Temper](#temper).
- **Sound.** Turned on, the cat has a voice: a happy *mrrp!* when the work is
  done or a sardine lands, a questioning *mew?* when Claude is waiting for you
  (a permission prompt, a question, a plan to approve), a purr when you pet
  him, and a short hiss when the tests fail or he swats your hand. The fishing
  toy (`/cat play`) jingles its bell. Never more than one sound every two
  seconds, so a burst of events is one sound, not a chorus. It plays through
  `afplay`, so on macOS only. `/cat sound on|off` changes it, as `/config` does.

## Temper

With the temper on, the cat has opinions:

- **Nag him and he bites back.** Each time Clawd nudges him while Claude
  thinks, he may slap Clawd (*Stop nagging!*) or ignore him altogether
  (*Nope.*).
- **Petting him** sometimes gets you a swat instead of a purr.
- **Your keyboard.** Some turns he gets there before Claude does, lies down
  on it and asks for cuddles, while Clawd tells him to get off. Pet him and
  he gets off; otherwise he stays until the turn ends, so when you're idle he
  naps as usual. Nothing is held up: it's only his side of the yard, and he
  gets up whenever Claude needs you, something fails or the tests finish.

## Meet Asturias

Want the full ginger-cat experience? Meet **Asturias**, Manousos's sister,
who came home from across the sea with a big attitude.

```text
/cat asturias
```

- **Ginger,** from whiskers to tail.
- **Sings coplas and tangos,** not mantinades: payador verses bent to the
  work, and the odd *Volver* about the ticket left in Review.
- **Clawd talks to her in rioplatense,** and she answers in it: *¿Qué
  querés?*, *Yo no fui, che*, *¿Sardina? ¿Y el asado?*
- **Temper always on.** Nag her and she slaps Clawd. Pet her and you may
  get swatted. Some turns she's asleep on your keyboard before Claude gets
  there.

She doesn't take orders from anyone, least of all Clawd. When you've had
enough, `/cat manousos` brings Manousos back, calm and Greek.

## Room it needs

The full scene is 11 rows plus a caption line, in a terminal at least about
83 columns wide.

- **Less height.** Clawd's speech bubble is left out, his words go on a line
  under the yard, and the yard keeps its 8 rows.
- **Less width.** The cat's song moves out of its bubble and shows as text
  under the yard.
- **No room at all.** He is drawn as an ASCII cat with his caption beside
  him, in his coat's color while he naps or works; a reaction (done,
  startled, waiting, tests, a sardine) shows in its own.

## Desktop app

In the desktop app the yard is the same, cell for cell, drawn as an SVG image
instead of terminal cells. Two differences:

- The sky is painted for the time of day (the terminal shows its own
  background there).
- It moves a few frames a second where the terminal's moves about ten, as the
  desktop has no way to repaint the image in place.

## Troubleshooting

- **Nothing shows up.** Run `claude --debug` and look for lines starting with
  `cretan-cat`. If they say hook modules are turned off, your Claude Code
  doesn't have the feature yet.
- **He disappeared.** You may have hidden him, in this session or an earlier
  one: type `/cat show`.
- **He doesn't sit up for permission prompts.** Where an organization manages
  Claude Code, permission-request hooks run only for plugins it lists in its
  managed settings, so he misses those prompts: no sitting up, no *mew?*,
  and a long prompt may even bore him to sleep. Questions and plans still
  wake him.
- **No sound.** Sound is off unless you turn it on in `/config`, and it plays
  on macOS only.

## Development

```sh
claude plugin validate .   # what the engine will load, and anything it would refuse
claude plugin test .       # tests/cat.test.ts against the engine
npx -p typescript tsc -p . # types (Claude Code writes .claude-plugin/types/ when it loads the plugin)
```

| File                 | What it holds                                                                       |
| -------------------- | ----------------------------------------------------------------------------------- |
| `hooks/register.tsx` | The hooks: prompts, turns and tool calls, the cat's mood, the band above the prompt |
| `hooks/manousos.ts`  | The scene as pixels, two to a terminal cell                                         |
| `hooks/svg.ts`       | The same cells as an SVG, for the desktop app                                       |
| `hooks/sprites.ts`   | Manousos, pose by pose, as letter grids, and his coats                              |
| `hooks/lines.ts`     | What Clawd and the cat say; the name; topics; which commands are tests or commits   |
| `hooks/songs.ts`     | What the cat sings, per song language                                               |
| `hooks/clawd.ts`     | Clawd, from claude-toons                                                            |
| `sounds/*.wav`       | His voice (happy, mew, purr, hiss), synthesized by `scripts/sounds.py` (no samples) |

To redraw `docs/demo.gif` (needs Pillow):

```sh
npx tsx scripts/frames.ts > /tmp/frames.jsonl
python3 scripts/gif.py /tmp/frames.jsonl docs/demo.gif
```

## Credits

Clawd's sprite (`hooks/clawd.ts`) comes from
[claude-toons](https://github.com/achimala/claude-toons) by Anshu Chimala,
under the MIT license. That project is also where the idea of a cartoon
above the prompt comes from.

## License

MIT. See [LICENSE](LICENSE).
