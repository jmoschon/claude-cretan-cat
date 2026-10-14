// Manousos as hand-drawn pixel art, facing right (mirrored to face left),
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
    ginger: { ...shared, o: [86, 40, 16], f: [232, 140, 62], F: [250, 186, 116], d: [176, 86, 36], e: [120, 200, 80], E: [170, 235, 120] },
    tuxedo: { ...shared, o: [12, 12, 14], f: [52, 50, 58], F: [80, 78, 90], d: [30, 30, 34], w: [246, 246, 246], g: [200, 200, 206], e: [150, 220, 90], E: [200, 250, 140] },
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
} satisfies Record<string, string[]>
