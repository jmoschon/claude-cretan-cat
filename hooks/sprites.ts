// The cat as hand-drawn pixel art, facing right (mirrored to face left),
// 14 pixels tall: seven terminal rows at two pixels a cell. Each letter is a
// color of his coat:
//   .  clear          o  outline         f  fur          F  light fur
//   d  dark fur       w  white           g  white shade  e  eye
//   k  pupil, or a shut eye              E  wide eye     n  nose
//   p  pink inside the ears

import type { Coat } from '../types'

type Rgb = [number, number, number]

export type Pose = keyof typeof SPRITES

// The coats he can wear (/cat <coat>), letter by letter.
export const COATS: Record<Coat, Record<string, Rgb>> = (() => {
  const shared: Record<string, Rgb> = { w: [244, 240, 232], g: [196, 190, 184], k: [18, 14, 12], n: [232, 120, 140], p: [222, 136, 150] }
  return {
    // From the photo: dark brown long hair, white bib, belly and paws.
    manousos: { ...shared, o: [34, 26, 24], f: [104, 86, 74], F: [150, 128, 106], d: [58, 46, 40], e: [236, 196, 70], E: [255, 226, 120] },
    // An orange tabby with green eyes.
    ginger: { ...shared, o: [86, 40, 16], f: [232, 140, 62], F: [250, 186, 116], d: [176, 86, 36], e: [120, 200, 80], E: [170, 235, 120] },
    tuxedo: { ...shared, o: [12, 12, 14], f: [52, 50, 58], F: [80, 78, 90], d: [30, 30, 34], w: [246, 246, 246], g: [200, 200, 206], e: [150, 220, 90], E: [200, 250, 140] },
    // A grey tabby with a cream belly, light green eyes, white bib and muzzle.
    tabby: { ...shared, o: [46, 42, 38], f: [128, 122, 112], F: [168, 162, 150], d: [78, 72, 66], w: [248, 238, 222], g: [212, 206, 196], e: [140, 210, 120], E: [180, 240, 160] },
  }
})()

export const CAT_H = 14

export const SPRITES = {
  walkA: [
    '..............o........o..',
    '.............opo......opo.',
    '..ooo........opfoooooofpo.',
    '.odddo......offffffffffffo',
    '.odfo.......offfekfffekffo',
    'odfo........offFffnnffFffo',
    'ofo.........ofwwwwoowwwwfo',
    'ofo.ooooooooooffwwwwwwffo.',
    '.oofffFfffFfffffffwwwwfo..',
    '..offFfffFfffFffffwwwwo...',
    '..offfffffffffffffwwwgo...',
    '...odfffwwwwwwwffffgo.....',
    '...ofo.ofo....ofo.ofo.....',
    '...www.www....www.www.....',
  ],
  walkB: [
    '..............o........o..',
    '.............opo......opo.',
    '..ooo........opfoooooofpo.',
    '.odddo......offffffffffffo',
    '.odfo.......offfekfffekffo',
    'odfo........offFffnnffFffo',
    'ofo.........ofwwwwoowwwwfo',
    'ofo.ooooooooooffwwwwwwffo.',
    '.oofffFfffFfffffffwwwwfo..',
    '..offFfffFfffFffffwwwwo...',
    '..offfffffffffffffwwwgo...',
    '...odfffwwwwwwwffffgo.....',
    '..ofo...ofo..ofo...ofo....',
    '.www.....www..www.....www.',
  ],
  crouch: [
    '..........................',
    '..........................',
    '..............o........o..',
    '.............opo......opo.',
    '..ooo........opfoooooofpo.',
    '.odddo......offffffffffffo',
    '.odfo.......offfEEfffEEffo',
    'odfo........offFffnnffFffo',
    'ofo.........ofwwwwoowwwwfo',
    'ofo.ooooooooooffwwwwwwffo.',
    '.oofffFfffFfffffffwwwwfo..',
    '..offFfffFfffFffffwwwwo...',
    '..owwwfffffffffffowwwwo...',
    '..ooooooooooooooooooooo...',
  ],
  sitA: [
    '...o.........o......',
    '..opo.......opo.....',
    '..opfooooooofpo.....',
    '.offfffffffffffo....',
    '.offekfffffekffo....',
    '.offFfffnfffFffo....',
    '.ofwwwwwowwwwwfo....',
    '..offwwwwwwwffo.....',
    '..offfwwwwwfffo.....',
    '.offFfwwwwwfFffo....',
    '.offffwwwwwffffo..oo',
    '.offffowwwoffffo.odo',
    '.offfowwwwwofffoodo.',
    '..oowwwoowwwoooddo..',
  ],
  sitB: [
    '...o.........o......',
    '..opo.......opo.....',
    '..opfooooooofpo.....',
    '.offfffffffffffo....',
    '.offekfffffekffo....',
    '.offFfffnfffFffo....',
    '.ofwwwwwowwwwwfo....',
    '..offwwwwwwwffo.....',
    '..offfwwwwwfffo.....',
    '.offFfwwwwwfFffo....',
    '.offffwwwwwffffo....',
    '.offffowwwoffffo.ooo',
    '.offfowwwwwofffoddo.',
    '..oowwwoowwwoooddo..',
  ],
  sleep: [
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '..........o.......o.....',
    '.........opo.....opo....',
    '....ooooopfooooooofpo...',
    '..ooffFfofffffffffffo...',
    '.offFfffoffkkfffkkffo...',
    '.offfFffoffFffnffFffo...',
    '.offffffofwwwwowwwwfo...',
    '.offFfffwwwwwwwwwwwwo...',
    '..odddddooooooooooooo...',
  ],
  startled: [
    '..............o........o..',
    '....o.o......opo......opo.',
    '...odfdo.....opfoooooofpo.',
    '...ofdfo....offffffffffffo',
    '....ofo.....offfEEfffEEffo',
    '....ofo.ooooofFffnnffFffo.',
    '....ofoffFffofwwwwoowwwwfo',
    '....offFfffFfffwwwwwwffo..',
    '....offfffffffffffwwwwfo..',
    '....offfffffffffffwwwwo...',
    '....offfffffffffffwwgo....',
    '....ofo.ofo....ofo.ofo....',
    '....ofo.ofo....ofo.ofo....',
    '....www.www....www.www....',
  ],
  // Being petted: eyes shut, purring.
  purr: [
    '...o.........o......',
    '..opo.......opo.....',
    '..opfooooooofpo.....',
    '.offfffffffffffo....',
    '.offkkfffffkkffo....',
    '.offFfffnfffFffo....',
    '.ofwwwwwowwwwwfo....',
    '..offwwwwwwwffo.....',
    '..offfwwwwwfffo.....',
    '.offFfwwwwwfFffo....',
    '.offffwwwwwffffo..oo',
    '.offffowwwoffffo.odo',
    '.offfowwwwwofffoodo.',
    '..oowwwoowwwoooddo..',
  ],
  // Bored by a long tool: a big yawn before he dozes off.
  yawn: [
    '...o.........o......',
    '..opo.......opo.....',
    '..opfooooooofpo.....',
    '.offfffffffffffo....',
    '.offkkfffffkkffo....',
    '.offFfffnfffFffo....',
    '.ofwwwwokowwwwfo....',
    '..offwwokkowffo.....',
    '..offfwwoowwffo.....',
    '.offFfwwwwwfFffo....',
    '.offffwwwwwffffo..oo',
    '.offffowwwoffffo.odo',
    '.offfowwwwwofffoodo.',
    '..oowwwoowwwoooddo..',
  ],
  // A slap at Clawd, brows down: the paw wound up, then out mid-swipe.
  slapA: [
    '.......o.........o......',
    '.oo...opo.......opo.....',
    'owwo..opfooooooofpo.....',
    'owwo.offfoffffffoffo....',
    '.ofo.offekfffffekffo....',
    '.ofo.offFfffnfffFffo....',
    '..ofoofwwwwwowwwwwfo....',
    '...offoffwwwwwwwffo.....',
    '....ooofffwwwwwfffo.....',
    '.....offFfwwwwwfFffo....',
    '.....offffwwwwwffffo..oo',
    '.....offffowwwoffffo.odo',
    '.....offfowwwwwofffoodo.',
    '......oowwwoowwwoooddo..',
  ],
  slapB: [
    '.......o.........o......',
    '......opo.......opo.....',
    '......opfooooooofpo.....',
    '.....offfoffffffoffo....',
    '.....offekfffffekffo....',
    '.....offFfffnfffFffo....',
    '.....ofwwwwwowwwwwfo....',
    '.oo...offwwwwwwwffo.....',
    'owwo..offfwwwwwfffo.....',
    'owwfffffFfwwwwwfFffo....',
    '.oo..offffwwwwwffffo..oo',
    '.....offffowwwoffffo.odo',
    '.....offfowwwwwofffoodo.',
    '......oowwwoowwwoooddo..',
  ],
  // From behind, tail up: what you get for dangling a toy at a cat with a temper.
  back: [
    '...ofo.ooo.ofo.oddo...',
    '...odfofffofdo..oddo..',
    '....offfffffo...oddo..',
    '...offfffffffo.oddo...',
    '...offfffffffo.oddo...',
    '...offfffffffooddo....',
    '....offfffffooddo.....',
    '...oooddddddoddo......',
    '..offffffffoddofo.....',
    '.offfFFfffoddofffo....',
    '.offffffffoddofffo....',
    '.offfffffoddoffffo....',
    '..offfffonddofffo.....',
    '...wwwfffofffwww......',
  ],
} satisfies Record<string, string[]>

// A kitten, one per subagent Claude has running, in two running frames,
// facing left; and the sardine Clawd tosses for a commit (s outline, S
// silver, k eye).
export const KITTEN = {
  a: [
    '..o..o....',
    '.opooopo..',
    '.offfffo.o',
    '.ofefefoof',
    '.ofwnwfof.',
    'offffffo..',
    '.ow.ow....',
  ],
  b: [
    '..o..o....',
    '.opooopo..',
    '.offfffo..',
    '.ofefefo.o',
    '.ofwnwfoof',
    'offffffof.',
    '..ow.ow...',
  ],
} satisfies Record<string, string[]>

export const SARDINE = ['..sss..s', '.sSSSs.s', 'sSkSSSss', '.sSSSs.s', '..sss..s']

export const SARDINE_COLORS: Record<string, Rgb> = { s: [80, 96, 118], S: [186, 202, 220], k: [18, 14, 12] }
