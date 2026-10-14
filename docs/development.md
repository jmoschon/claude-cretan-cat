# Development

[Back to the README](../README.md)

## Running from source

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

## Checks

```sh
claude plugin validate .   # what the engine will load, and anything it would refuse
claude plugin test .       # tests/cat.test.ts against the engine
npx -p typescript tsc -p . # types (Claude Code writes .claude-plugin/types/ when it loads the plugin)
```

## Files

| File                    | What it holds                                                                          |
| ----------------------- | -------------------------------------------------------------------------------------- |
| `hooks/register.tsx`    | The hooks: prompts, turns and tool calls, the cat's mood, the band above the prompt    |
| `hooks/manousos.ts`     | The scene as pixels, two to a terminal cell                                            |
| `hooks/hd.ts`           | The same scene as a picture at three times the density, for `resolution: high`         |
| `hooks/hd-sprites.ts`   | The finer art for `resolution: high`: the cat's poses, kittens, the sardine, Clawd     |
| `hooks/svg.ts`          | The same cells as an SVG, for the desktop app                                          |
| `hooks/sprites.ts`      | Manousos, pose by pose, as letter grids, and his coats                                 |
| `hooks/lines.ts`        | What Clawd and the cat say; the name; topics; which commands are tests or commits      |
| `hooks/songs.ts`        | What the cat sings, per song language                                                  |
| `hooks/clawd.ts`        | Clawd, his sprite and his looks                                                        |
| `hooks/ai.ts`           | AI songs and lines: the topic cleaned, the Haiku call, the checks, the daily cap       |
| `sounds/*.wav`          | His voice (happy, mew, purr, hiss) and the toy's bell, synthesized by `scripts/sounds.py` |
| `scripts/frames.ts`, `scripts/gif.py`       | The low-resolution demo, `docs/demo-low.gif`                       |
| `scripts/frames-hd.ts`, `scripts/gif-hd.py` | The high-resolution demo, `docs/demo.gif`                          |

Every grid in `hooks/hd-sprites.ts` is optional: a pose, kitten frame, sardine
or look of Clawd's with no fine grid of its own is drawn from its
low-resolution sprite, each pixel a 3 by 3 block, so nothing is ever missing.

## Sounds

The five sounds are synthesized, not sampled (stdlib Python, seeded, so the
same bytes every run). To make them again:

```sh
python3 scripts/sounds.py          # writes sounds/happy.wav, mew.wav, purr.wav, hiss.wav, bell.wav
```

## The demo GIFs

Both need Pillow (`python3 -m pip install --user pillow`) and draw with the
plugin's own code, so they show exactly what the terminal would.

`docs/demo.gif`, the yard at `resolution: high`, as kitty or Ghostty shows it
(the picture stretched over the cells on a dark terminal background, the
bubbles drawn on top):

```sh
npx tsx scripts/frames-hd.ts > /tmp/frames-hd.jsonl
python3 scripts/gif-hd.py /tmp/frames-hd.jsonl docs/demo.gif
```

`docs/demo-low.gif`, the yard at `resolution: low`, half-block cells:

```sh
npx tsx scripts/frames.ts > /tmp/frames.jsonl
python3 scripts/gif.py /tmp/frames.jsonl docs/demo-low.gif
```

The story each one tells is the list of beats at the top of its `frames`
script: change a beat's mood, words, hour or length there.
