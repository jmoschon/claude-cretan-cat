# How he behaves

[Back to the README](../README.md)

## Contents

- [What he does, moment by moment](#what-he-does-moment-by-moment)
- [The finer points](#the-finer-points)
- [The yard through the day](#the-yard-through-the-day)
- [Room it needs](#room-it-needs)
- [Desktop app](#desktop-app)

## What he does, moment by moment

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

With the [temper](settings.md#temper) on he also has opinions: he may slap
Clawd for nagging, swat your hand, or get to your keyboard first.

## The finer points

- **Nudges.** While Claude thinks, Clawd nudges him about your task every few
  seconds (examples here are in English; Clawd speaks Greek by default): *How's
  "checkout tests" going, Manousos?* The topic is picked from the last
  meaningful words of your prompt, as you wrote them: "refactor the BigQuery
  cost report for October" becomes "BigQuery cost report", leaving out the
  verb and when it is due. Slash commands are never picked up. With
  [AI songs](settings.md#ai-songs-and-lines) on, the nudges and his song are
  written for that topic instead.
- **Orders.** For each tool Clawd has a line: *Manousos, run the command!*,
  *Read the file, Manousos!*, *Call the kittens to help, Manousos!*
- **Waiting.** He sits up (*Meow! Waiting for you.*) when Claude Code shows
  you a permission prompt, asks you a question, or wants a plan approved.
  There is no signal for the moment you answer a permission prompt, so he
  stays up until that tool call ends.
- **Dozing off.** Only a tool that runs on by itself bores him. Questions,
  helpers and calls that asked your permission never do: he stays up for
  those (except where permission prompts reach no plugin; see
  [Troubleshooting](troubleshooting.md#he-doesnt-sit-up-for-permission-prompts)).
- **Sardines.** One per commit that goes in. When the work is done and Claude
  ran any tools, he gets one for the work too, unless a commit already fed
  him that turn. [`/cat stats`](commands.md#cat-stats) keeps the count.
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

## The yard through the day

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
instead of terminal cells (whatever the [resolution](settings.md#resolution)).
Two differences:

- The sky is painted for the time of day (the terminal shows its own
  background there).
- It moves a few frames a second where the terminal's moves about ten, as the
  desktop has no way to repaint the image in place.
