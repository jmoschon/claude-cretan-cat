export type Mood = 'nap' | 'think' | 'tool' | 'happy' | 'oops'
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
}

declare module 'claude-code' {
  interface PluginState {
    'cretan-cat': { cat: Cat; isHidden: boolean; coat: Coat }
  }
}
