// What the cat is doing: asleep, thinking, on a tool, done, startled by a
// failure; waiting on you at a permission prompt; dancing at green tests,
// hissing at red ones; eating the sardine a commit earns; dozing off while a
// long tool runs.
export type Mood = 'nap' | 'think' | 'tool' | 'happy' | 'oops' | 'wait' | 'dance' | 'hiss' | 'feast' | 'bored'
export type Coat = 'manousos' | 'ginger' | 'tuxedo'
export type Cat = {
  mood: Mood
  frame: number
  tool: string | null
  helpers: number
  verse: number
  // The topic of the last prompt, as Clawd refers to it, and which of
  // his nudging lines he is on.
  asked: string | null
  nudge: number
  // Sardines eaten today, one per commit.
  sardines: number
  // When he was last petted, in clock milliseconds (0: never).
  pettedAt: number
}

declare module 'claude-code' {
  interface PluginState {
    'cretan-cat': { cat: Cat; isHidden: boolean; coat: Coat }
  }
}
