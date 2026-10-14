# claude-cretan-cat

Manousos, a Cretan cat, lives above your Claude Code prompt. While Claude
works, Clawd tells him what to do, and Manousos answers in mantinades, the
rhyming couplets of Crete. When the work is done he sits and purrs; when
nothing is happening he sleeps on his cushion. Behind them stands
Psiloritis, under the sun or the moon as your clock says.

![Clawd and Manousos above the Claude Code prompt](docs/demo.gif)

He is drawn after a real cat: dark brown long hair, a white bib and white
mittens.

It costs nothing to run. There are no model calls and no network requests;
everything is drawn locally from what Claude Code is already doing.

An independent project, not affiliated with or endorsed by Anthropic.

## What he does

| When | Manousos | Clawd |
|---|---|---|
| Nothing is running | Sleeps curled up on his cushion | Dozes |
| Claude is thinking | Paces the lawn, singing a mantinada | Nudges him about your task: *How's "checkout tests" going, Manousos?* |
| Claude runs a tool | Crouches, wiggles, pounces | Gives the order for that tool: *Run the command!*, *Read the file!* |
| Claude needs you: a permission prompt, a question, a plan to approve | Sits up and looks at you, `?` over his head: *Meow! Waiting for you.* | Waves at you |
| Tests pass | Dances | Cheers |
| Tests fail | Hisses | *Tests are red...* |
| A commit goes in | Catches the sardine Clawd tosses him, and eats it | Tosses it |
| A tool runs for over 20 seconds | Yawns, then dozes off until it's done (not for questions, helpers, or a call that asked your permission: there is no signal for when you answer, so he stays up for it) | *Don't fall asleep, it's still running!* |
| The work is done | If Claude ran any tools, eats a sardine first; then sits, wags his tail, sings one more couplet | Tosses a sardine, then cheers |
| Something failed | Jumps, tail puffed up | Asks what happened |
| You pressed Esc | Goes back to sleep | Dozes |

The topic Clawd mentions is picked from the last meaningful words of your
prompt, as you wrote them: "refactor the BigQuery cost report for October"
becomes "BigQuery cost report", leaving out the verb and when it is due.
Slash commands are never picked up.

A few more things:

- **Helpers.** While Claude has subagents running, a kitten runs across the
  lawn for each one (up to four).
- **Time of day.** The yard follows your local clock, so it changes a few
  times a day rather than from moment to moment (see the table below). From
  December to March there is snow on the peak.
- **Petting.** Type `/cat pet`, or click `pet` under the yard, or press `p`
  while the band has the focus (ctrl+x then Tab moves the focus to it), and
  he closes his eyes and purrs. Where only the ASCII cat fits, the caption
  purrs instead.
- **What counts as tests and commits.** A command in a Bash call that runs a
  test runner (`npm test`, `pytest`, `go test`, `cargo test`, `make test`,
  `npx vitest` and the like), and a `git commit` that went in. Quoted text and
  heredocs don't count, and neither does a run you denied or one sent to the
  background. A failing exit code is a failing run; where a pipe or `|| true`
  hides the exit code (`npm test 2>&1 | tail`), the output is read instead.
- **Waiting.** He sits up when Claude Code shows you a permission prompt, asks
  you a question, or wants a plan approved. There is no signal for the moment
  you answer a permission prompt, so he stays up until that tool call ends.

### The yard through the day

| Local time | Sky behind Psiloritis | The window |
|---|---|---|
| 06:00–08:00 | Dawn: a purple sky, the sun low behind the mountains | Glass |
| 08:00–18:00 | Day: the sun high | Glass |
| 18:00–21:00 | Dusk: an orange-purple sky, the sun setting | The lamp is lit |
| 21:00–06:00 | Night: a dark blue sky, stars and a moon | The lamp is lit |

What moves all the time is Manousos and Clawd themselves, the bubbles, and
the kittens while helpers run.

## Install

You need Claude Code with plugin hook modules, an early-access feature. This
was built and tested on version 2.1.299.

At the Claude Code prompt:

```
/plugin install cretan-cat --marketplace jmoschon/claude-cretan-cat
```

Answer `y` to add the marketplace, then pick a scope (user scope loads him in
every session). He appears above the prompt straight away.

### From source

```sh
git clone https://github.com/jmoschon/claude-cretan-cat ~/src/claude-cretan-cat
claude --plugin-dir ~/src/claude-cretan-cat
```

To load it in every session, add the folder to the `env` block of
`~/.claude/settings.json` with its full path, then restart Claude Code:

```json
{
  "env": {
    "CLAUDE_CODE_PLUGIN_DIRS": "/Users/you/src/claude-cretan-cat"
  }
}
```

To update, run `git pull` in the folder.

## Commands and settings

| Command | What it does |
|---|---|
| `/cat hide`, `/cat show` | Hide him, or bring him back. A bare `/cat` toggles. He stays hidden in new sessions until you bring him back. |
| `/cat pet` | Pet him: he closes his eyes and purrs (with a temper, he may swat you instead). |
| `/cat manousos` | The original coat: dark brown with a white bib and mittens. |
| `/cat ginger` | An orange tabby. |
| `/cat tuxedo` | Black and white. |
| `/cat name <name>` | Call the cat something else, up to 20 characters. `/cat name Manousos` goes back. |
| `/cat language <language>` | What Clawd speaks: `greek`, `english`, `spanish` or `rioplatense`. `/cat lang` works too. |
| `/cat songs <language>` | What the cat sings: `greek`, `spanish` or `english`. |
| `/cat temper on`, `/cat temper off` | Give the cat a temper, or take it away. See below. |
| `/cat asturias` | Asturias, all at once: named Asturias, in the ginger coat, Clawd in rioplatense, coplas and tangos, temper on. She answers in her own words (*¿Qué querés?*, *Yo no fui, che*, *¿Sardina? ¿Y el asado?*). |
| `/cat reset` | Manousos as he came: his name and coat, Greek, mantinades, no temper. |
| `/cat stats` | His stats, drawn: today's sardines as fish (one per commit, or per finished task that used tools), how full his belly is, sardines in all and his best day, pets and swats, the last seven days as bars, and his rank, from *Village kitten* to *Lord of Psiloritis*. |
| `/cat config` | Every setting and what it is now, sound included. `/cat settings` works too. |
| `/cat help` | Lists all of this. Anything `/cat` doesn't know says so, then shows the same. |

The coat you pick, whether he is hidden, his sardines and his pets are
remembered across sessions. The name, the two languages and the temper are
settings: `/cat name`, `/cat language`, `/cat songs` and `/cat temper`
change the same rows you find under `/config`, so the two never disagree.

| Setting (`/config`) | Values | Default | What it does |
|---|---|---|---|
| Cretan cat: name | any name, up to 20 characters | `Manousos` | What the cat is called, in the caption and by Clawd. In Greek, Clawd calls Manousos *Μανούσο*, and any other name as you wrote it. |
| Cretan cat: Clawd's language | `greek`, `english`, `spanish`, `rioplatense` | `greek` | What Clawd says, and the cat's short replies. Rioplatense is the Spanish of Buenos Aires (*¡Dale Manousos, arrancamos!*), and the cat answers in it the way Asturias does. |
| Cretan cat: songs | `greek`, `spanish`, `english` | `greek` | What the cat sings while Claude works: Cretan mantinades, payador coplas and the odd tango, or English rhyming couplets, all bent to the work. Each set stays in its own language, whatever Clawd speaks. |
| Cretan cat: temper | `off`, `on` | `off` | See below. |
| Cretan cat: sound | `off`, `on` | `off` | A soft meow when the work is done or Claude is waiting for you. It plays through `afplay`, so on macOS only. |

### Temper

With the temper on, the cat has opinions:

- **Nag him and he bites back.** Each time Clawd nudges him while Claude
  thinks, he may slap Clawd (*Stop nagging!*) or ignore him altogether
  (*Nope.*).
- **Petting him** sometimes gets you a swat instead of a purr.
- **Your keyboard.** Some turns he gets there before Claude does and lies
  down on it and asks for cuddles, while Clawd
  tells him to get off. Pet him and he gets off; otherwise he stays until
  the turn ends, so when you're idle he naps as usual. Nothing is held up:
  it's only his side of the yard, and he gets up whenever Claude needs you,
  something fails or the tests finish.

## Room it needs

The full scene is 11 rows plus a caption line, in a terminal at least about
83 columns wide.

- With less height, Clawd's speech bubble is left out and the yard keeps its
  8 rows.
- With less width, the mantinada moves out of its bubble and shows as text
  under the yard.
- In the desktop app the yard is the same, cell for cell, drawn as an SVG
  image instead of terminal cells. Two differences: the sky is painted for
  the time of day (the terminal shows its own background there), and it
  moves a few frames a second where the terminal's moves about ten, as the
  desktop has no way to repaint the image in place.
- Where the yard doesn't fit at all, he is drawn as an ASCII cat with his
  caption beside him, in his coat's color while he naps or works; a
  reaction (done, startled, waiting, tests, a sardine) shows in its own.

## Troubleshooting

**Nothing shows up.** Run `claude --debug` and look for lines starting with
`cretan-cat`. If they say hook modules are turned off, your Claude Code
doesn't have the feature yet.

**He disappeared.** You may have hidden him, in this session or an earlier one: type `/cat show`.

**No meow.** Sound is off unless you turn it on in `/config`, and it plays on
macOS only.

## Development

```sh
claude plugin validate .   # what the engine will load, and anything it would refuse
claude plugin test .       # tests/cat.test.ts against the engine
npx -p typescript tsc -p . # types (Claude Code writes .claude-plugin/types/ when it loads the plugin)
```

Files:

- `hooks/register.tsx`: the hooks. Watches prompts, turns and tool calls,
  keeps the cat's mood, and draws the band above the prompt.
- `hooks/manousos.ts`: draws the scene as pixels, two to a terminal cell.
- `hooks/svg.ts`: the same cells as an SVG, for the desktop app.
- `hooks/sprites.ts`: Manousos, pose by pose, as letter grids, and his coats.
- `hooks/lines.ts`: what Clawd and the cat say, per language; the cat's
  name; how the topic is picked from a prompt; which Bash commands are tests
  or commits.
- `hooks/songs.ts`: what the cat sings, per song language.
- `hooks/clawd.ts`: Clawd, from claude-toons.
- `sounds/meow.wav`: the meow, synthesized by `scripts/meow.py` (no samples).

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
