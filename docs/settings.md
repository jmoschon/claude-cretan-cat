# Settings

[Back to the README](../README.md)

Every setting is a row under `/config`, "Cretan cat", and on the screen that
installs him. Each has a `/cat` command that changes the same row, so the two
never disagree: `/cat name`, `/cat coat` (or `/cat ginger`, `/cat tuxedo`),
`/cat language`, `/cat songs`, `/cat temper`, `/cat sound`,
`/cat resolution`, `/cat band|small|dock` and `/cat hints`. A row your
organization has locked keeps its value, and `/cat` says so. Whether he is
hidden, his sardines and his pets are remembered across sessions too.

Up to 1.10 the coat, where he lives and the hints were kept apart from the
settings. The first session after the update moves what you picked into
them: a cat you dressed in the ginger coat stays ginger.

| Setting (`/config`)          | Values                                       | Default    |
| ---------------------------- | -------------------------------------------- | ---------- |
| Cretan cat: his name           | any name, up to 20 characters              | `Manousos` |
| Cretan cat: coat               | `manousos`, `ginger`, `tuxedo`             | `manousos` |
| Cretan cat: what Clawd speaks  | `greek`, `english`, `spanish`              | `greek`    |
| Cretan cat: what he sings      | `greek`, `english`, `spanish`              | `greek`    |
| Cretan cat: temper             | `off`, `on`                                | `off`      |
| Cretan cat: sound              | `off`, `on`                                | `off`      |
| Cretan cat: resolution         | `low`, `high`                              | `low`      |
| Cretan cat: where he lives     | `band`, `small`, `dock`                    | `band`     |
| Cretan cat: hints              | `on`, `off`                                | `on`       |

`/cat config` lists them all with what they are now
([example](commands.md#cat-config)).

## Name

What the cat is called, in the caption and by Clawd. In Greek, Clawd calls
Manousos *Μανούσο* and Asturias *Αστούριας*, and any other name as you wrote
it.

## Clawd's language

What Clawd says, and the cat's short replies. Spanish is the Spanish of
Buenos Aires (*¡Dale Manousos, arrancamos!*), and the cat answers in it the
way Asturias does. A `/config` row still set to the old `rioplatense` reads as
the default, Greek, until you pick `spanish`.

## Songs

What the cat sings while Claude works: Cretan mantinades, payador coplas and
the odd tango, or English rhyming couplets, all bent to the work. Each set
stays in its own language, whatever Clawd speaks.

## Temper

With the temper on, the cat has opinions:

- **Nag him and he bites back.** Each time Clawd nudges him while Claude
  thinks, he may slap Clawd (*Stop nagging!*) or ignore him altogether
  (*Nope.*).
- **Petting him** sometimes gets you a swat instead of a purr.
- **The fishing toy.** About one time in three he won't play: he curls up
  and looks the other way, or turns around, tail up, and shows you his butt.
- **Your keyboard.** Some turns he gets there before Claude does, lies down
  on it and asks for cuddles, while Clawd tells him to get off. Pet him and
  he gets off; otherwise he stays until the turn ends, so when you're idle he
  naps as usual. Nothing is held up: it's only his side of the yard, and he
  gets up whenever Claude needs you, something fails or the tests finish.

## Sound

Turned on, the cat has a voice:

- a happy *mrrp!* when the work is done or a sardine lands,
- a questioning *mew?* when Claude is waiting for you (a permission prompt,
  a question, a plan to approve),
- a purr when you pet him,
- a short hiss when the tests fail or he swats your hand,
- the fishing toy's bell, a little cascabel, when you dangle it.

Never more than one sound every two seconds, so a burst of events is one
sound, not a chorus. The *mew?* is the exception: it tells you Claude is
waiting, so it always plays. Claude Code plays the sounds with `afplay`, so on
macOS only; a Linux or Windows terminal stays quiet. `/cat sound on` or `off`
changes it, as `/config` does.

## Resolution

How finely the yard is drawn.

- **`low`** (the default): two pixels to a terminal cell, using half-block
  characters. It works in every terminal. This is how it looks:

  ![The yard at resolution low](demo-low.gif)

- **`high`**: the yard as a real picture, three times as fine each way, the
  way the [GIF in the README](../README.md) shows it. Clawd and the cat are
  drawn from finer art, and the mountains, wall, window, lawn, cushion and
  shadows are painted again at that density. The words (both bubbles, the
  dotted line to his, the marks by his head) stay as text laid over the
  picture. The picture repaints about five times a second, and only what
  changed.

`/cat resolution high` or `/cat resolution low` switches it, or `/config`.
`/cat reset` and `/cat asturias` leave it as it is.

### Where high shows

We recommend **[cmux](https://cmux.com)**, where `high` was built and tested
(it runs on Ghostty). Only a terminal that shows pictures can draw it: **kitty** or **Ghostty**,
and not inside **tmux** or **screen**, which pass no pictures through.
Elsewhere `high` quietly draws the usual cells, so it is safe to leave on.
The desktop app always draws its SVG, and a terminal too small for the yard
gets the ASCII cat, whatever the resolution.

The plugin decides once per session, from the environment Claude Code was
started in:

- **kitty or Ghostty:** `TERM` is `xterm-kitty` or `xterm-ghostty`, or
  `TERM_PROGRAM` is `kitty` or `ghostty`, or `KITTY_WINDOW_ID` or
  `GHOSTTY_RESOURCES_DIR` is set.
- **Multiplexed (no pictures):** `TMUX` or `STY` is set, `TERM` starts with
  `screen` or `tmux`, or `TERM_PROGRAM` is `tmux`.

If the terminal turns the picture down anyway (three refusals in a row, or
one that says it is drawing the placeholder text instead), he goes back to
cells for the rest of the session.

### Is the picture on?

`/cat config` tells you. With `resolution: high`, its last row reads one of:

| `/cat config` says                                         | Meaning                                                                    |
| ---------------------------------------------------------- | -------------------------------------------------------------------------- |
| `high (pictures)`                                          | The yard is a picture.                                                     |
| `high, in cells: not drawn yet`                            | The band hasn't been drawn since the plugin loaded.                        |
| `high, in cells: pictures not detected (TERM=… TERM_PROGRAM=…)` | Not kitty or Ghostty, or under tmux or screen; the variables it saw follow (and `GHOSTTY`, `KITTY`, `TMUX`, `SCREEN` when those were set). |
| `high, in cells: the terminal refused the picture: …`      | The terminal said no; its reason follows. Cells for the rest of the session. |
| `high, in cells: this terminal surface has no Image element` | This Claude Code can't place pictures above the prompt.                  |
| `high, in cells: the desktop draws cells`                  | The desktop app (or any other surface but the terminal) draws its own way. |
