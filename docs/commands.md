# Commands

[Back to the README](../README.md)

| Command                    | What it does                                                          |
| -------------------------- | --------------------------------------------------------------------- |
| `/cat`                     | Hide him, or bring him back (toggles)                                 |
| `/cat hide`, `/cat show`   | Hide him, or bring him back; hidden stays hidden across sessions      |
| `/cat small`               | Just the cat, in a small square at the right above the prompt          |
| `/cat dock`                | Just the cat, in a pane docked on the right (fullscreen layout)        |
| `/cat band`                | The whole yard above the prompt again                                  |
| `/cat pet`                 | Pet him: he closes his eyes and purrs (or press `pet`, `p`)            |
| `/cat treat`               | Toss him a sardine (or press `treat`, `t`)                             |
| `/cat play`                | Dangle the fishing toy, its bell jingling (or press `play`, `y`)       |
| `/cat coat <coat>`         | The coat alone: `manousos` (dark brown, white bib and mittens), `ginger`, `tuxedo` |
| `/cat ginger`              | An orange tabby                                                       |
| `/cat tuxedo`              | Black and white                                                       |
| `/cat name <name>`         | Call the cat something else, up to 20 characters                      |
| `/cat language <language>` | What Clawd speaks: `greek`, `english`, `spanish`                      |
| `/cat songs <language>`    | What the cat sings: `greek`, `english`, `spanish`                     |
| `/cat temper on\|off`      | Give the cat a temper, or take it away (see [Temper](settings.md#temper)) |
| `/cat sound on\|off`       | His voice, on macOS (see [Sound](settings.md#sound))                   |
| `/cat resolution high\|low` | The yard as a fine picture in kitty and Ghostty, or in cells (see [Resolution](settings.md#resolution)) |
| `/cat hints on\|off`       | The /cat tips under the napping cat                                   |
| `/cat asturias`            | Asturias, all at once (see [Meet Asturias](../README.md#meet-asturias)) |
| `/cat manousos`            | Manousos as he came, coat and settings (`/cat reset` too)              |
| `/cat stats`               | Sardines, pets and his rank, drawn                                    |
| `/cat config`              | Every setting and what it is now                                      |
| `/cat help`                | Lists the commands                                                    |

A few details:

- **Aliases.** `/cat lang` is `/cat language`; `/cat settings` is
  `/cat config`.
- **Names.** `/cat name Manousos` goes back to the original. `/cat name` on
  its own says what he is called now.
- **Where he lives.** `/cat small` and `/cat dock` show the cat alone, no
  Clawd and no bubbles, in a square: at the right of the band, or in a pane
  of its own that the fullscreen layout docks on the right (elsewhere it sits
  above the prompt). Closing the pane by hand gives him back to the band. The
  place is remembered across sessions.
- **Asturias.** `/cat asturias` names the cat Asturias, puts her in the ginger
  coat, has Clawd speak Spanish as they speak it in Buenos Aires, sets the songs to coplas and tangos, and
  turns the temper on. She answers in her own words (*¿Qué querés?*, *Yo no
  fui, che*, *¿Sardina? ¿Y el asado?*).
- **Manousos.** `/cat manousos` (or `/cat reset`) brings back his name and
  coat, Greek, mantinades and no temper. Neither it nor `/cat asturias`
  touches the sound or the resolution. To put a coat on whoever the cat is
  now, use `/cat coat <coat>`.
- **Stats.** `/cat stats` draws today's sardines as fish (one per commit, or
  per finished task that used tools), how full his belly is, sardines in all
  and his best day, pets and swats, the last seven days as bars, and his
  rank, from *Kitten, no sardine yet* to *Lord of Psiloritis*.
- **Hidden.** `/cat band`, `/cat small` and `/cat dock` bring him out from
  under the sofa, as a coat does.
- **Typos.** A slip of a letter or two is caught: `/cat doc` answers
  *Manousos doesn't know "/cat doc". Did you mean /cat dock?*, and
  `/cat resoluton high` points at `/cat resolution high`. Anything not close
  to a command says it is unknown, then shows the help.

## `/cat help`

```text
Manousos, the cat above the prompt

  /cat name <name>          what the cat is called (Manousos now)
  /cat coat <coat>          the coat: manousos, ginger, tuxedo (manousos now); /cat ginger or tuxedo too
  /cat language <language>  what Clawd speaks: greek, english, spanish (greek now); /cat lang too
  /cat songs <language>     what Manousos sings: greek, english, spanish (greek now)
  /cat temper on|off        whether Manousos slaps Clawd, swats you, sits on your keyboard (off now)
  /cat sound on|off         whether Manousos mrrps, mews, purrs and hisses, on macOS (off now)
  /cat resolution high|low  the yard as a fine picture where the terminal shows them (kitty, Ghostty), or in cells (low now)
  /cat asturias             Asturias: ginger, rioplatense Spanish, coplas and a temper
  /cat manousos             Manousos as he came: brown, Greek, mantinades, no temper (/cat reset too)
  /cat pet                  pet the cat (or press pet under the yard)
  /cat treat                toss the cat a sardine (or press treat)
  /cat play                 dangle the fishing toy (or press play)
  /cat stats                sardines and pets
  /cat config               every setting and what it is now (/cat settings too)
  /cat hide|show            hide the cat, or bring it back (/cat alone toggles)
  /cat hints on|off         the /cat tips under the napping cat (on now)
  /cat band                 the whole yard above the prompt (band now)
  /cat small                the cat alone in a small square at the right, above the prompt
  /cat dock                 the cat in a pane of its own, docked on the right
  /cat help                 this list

The same settings are under /config, "Cretan cat".
```

## `/cat config`

```text
Manousos's settings

  name        Manousos
  coat        manousos
  language    greek
  songs       greek
  temper      off
  sound       off
  resolution  low
  place       band
  hints       on

/cat help says how to change them; they are under /config, "Cretan cat", too.
```

With `resolution: high`, the last row also says whether the picture is
showing; see [Resolution](settings.md#resolution).

## `/cat stats`

On a fresh install after one pet:

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
