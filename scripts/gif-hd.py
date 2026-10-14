"""Turns frames from scripts/frames-hd.ts into an animated GIF, the way a
picture-showing terminal (kitty, Ghostty) shows the high-resolution yard:
the picture stretched over the band's cells, on a dark terminal background
where it is clear (the sky), and the text cells drawn over it as
scripts/gif.py draws them. Needs Pillow (pip install pillow).

    python3 scripts/gif-hd.py frames-hd.jsonl docs/demo.gif
"""

import base64
import json
import struct
import sys

from PIL import Image, ImageDraw

from gif import BACKGROUND, CELL_H, CELL_W, CLEAR, FOREGROUND, color, font

DARK = (30, 30, 46)


def draw(frame, face):
    cols, rows = frame['cols'], frame['rows']
    size = (cols * CELL_W, rows * CELL_H)
    picture = Image.frombytes('RGBA', (frame['width'], frame['height']), base64.b64decode(frame['rgba']))
    image = Image.new('RGB', size, DARK)
    image.paste(picture.resize(size, Image.NEAREST), (0, 0), picture.resize(size, Image.NEAREST))
    pen = ImageDraw.Draw(image)
    for o in frame['overlays']:
        raw = base64.b64decode(o['cells'])
        words = struct.unpack('<%dI' % (len(raw) // 4), raw)
        for row in range(o['rows']):
            for col in range(o['columns']):
                at = (row * o['columns'] + col) * 3
                char, fg = chr(words[at]), color(words[at + 1], FOREGROUND)
                x, y = (o['col'] + col) * CELL_W, (o['row'] + row) * CELL_H
                if words[at + 2] != CLEAR:
                    pen.rectangle([x, y, x + CELL_W - 1, y + CELL_H - 1], fill=color(words[at + 2], BACKGROUND))
                if char != ' ':
                    pen.text((x, y + 1), char, fill=fg, font=face)
    return image


def main(source, target):
    face = font()
    with open(source) as lines:
        frames = [draw(json.loads(line), face) for line in lines if line.strip()]
    # One palette for every frame, from frames across the whole scene (day,
    # dusk and night), keeps the colors steady from frame to frame.
    sample = frames[::8]
    sheet = Image.new('RGB', (frames[0].width, frames[0].height * len(sample)))
    for i, f in enumerate(sample):
        sheet.paste(f, (0, i * f.height))
    palette = sheet.quantize(colors=255, method=Image.MEDIANCUT)
    frames = [f.quantize(palette=palette, dither=Image.NONE) for f in frames]
    frames[0].save(target, save_all=True, append_images=frames[1:], duration=100, loop=0, optimize=True)
    print(f'{target}: {len(frames)} frames, {frames[0].width}x{frames[0].height}')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
