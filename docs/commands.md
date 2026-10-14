# Commands

[Back to the README](../README.md)

| Command                    | What it does                                                          |
| -------------------------- | --------------------------------------------------------------------- |
| `/cat`                     | Hide him, or bring him back (toggles)                                 |
| `/cat hide`, `/cat show`   | Hide him, or bring him back; hidden stays hidden across sessions      |
| `/cat pet`                 | Pet him: he closes his eyes and purrs                                 |
| `/cat manousos`            | The original coat: dark brown, white bib and mittens                  |
| `/cat ginger`              | An orange tabby                                                       |
| `/cat tuxedo`              | Black and white                                                       |
| `/cat name <name>`         | Call the cat something else, up to 20 characters                      |
| `/cat language <language>` | What Clawd speaks: `greek`, `english`, `spanish`, `rioplatense`       |
| `/cat songs <language>`    | What the cat sings: `greek`, `spanish`, `english`                     |
| `/cat temper on\|off`      | Give the cat a temper, or take it away (see [Temper](settings.md#temper)) |
| `/cat resolution high\|low` | The yard as a fine picture in kitty and Ghostty, or in cells (see [Resolution](settings.md#resolution)) |
| `/cat asturias`            | Asturias, all at once (see [Meet Asturias](../README.md#meet-asturias)) |
| `/cat reset`               | Manousos as he came                                                   |
| `/cat stats`               | Sardines, pets and his rank, drawn                                    |
| `/cat config`              | Every setting and what it is now                                      |
| `/cat help`                | Lists the commands                                                    |

A few details:

- **Aliases.** `/cat lang` is `/cat language`; `/cat settings` is
  `/cat config`.
- **Names.** `/cat name Manousos` goes back to the original. `/cat name` on
  its own says what he is called now.
- **Asturias.** `/cat asturias` names the cat Asturias, puts her in the ginger
  coat, has Clawd speak rioplatense, sets the songs to coplas and tangos, and
  turns the temper on. She answers in her own words (*¿Qué querés?*, *Yo no
  fui, che*, *¿Sardina? ¿Y el asado?*).
- **Reset.** `/cat reset` brings back his name and coat, Greek, mantinades
  and no temper. Neither it nor `/cat asturias` touches the sound or the
  resolution.
- **Stats.** `/cat stats` draws today's sardines as fish (one per commit, or
  per finished task that used tools), how full his belly is, sardines in all
  and his best day, pets and swats, the last seven days as bars, and his
  rank, from *Kitten, no sardine yet* to *Lord of Psiloritis*.
- **Sound.** Sound has no `/cat` command; change it in `/config`.
- **Typos.** Anything `/cat` doesn't know says so, then shows the help.

## `/cat help`

```text
Manousos, the cat above the prompt

  /cat name <name>          what the cat is called (Manousos now)
  /cat <coat>               the coat: manousos, ginger, tuxedo (manousos now)
  /cat language <language>  what Clawd speaks: greek, english, spanish, rioplatense (greek now)
  /cat songs <language>     what Manousos sings: greek, spanish, english (greek now)
  /cat temper on|off        whether Manousos slaps Clawd, swats you, sits on your keyboard (off now)
  /cat resolution high|low  the yard as a fine picture where the terminal shows them (kitty, Ghostty), or in cells (low now)
  /cat asturias             Asturias: ginger, rioplatense, coplas and a temper
  /cat reset                Manousos as he came
  /cat pet                  pet the cat (or press pet under the yard)
  /cat stats                sardines and pets
  /cat config               every setting and what it is now
  /cat hide|show            hide the cat, or bring it back (/cat alone toggles)

The same settings, and sound, are under /config, "Cretan cat".
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

/cat help says how to change them; sound only changes in /config, "Cretan cat".
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
