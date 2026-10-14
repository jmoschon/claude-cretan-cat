"""Turns frames from scripts/frames.ts into an animated GIF, drawing each
terminal cell as the terminal would: half blocks as two colored pixels,
text in a monospace font. Needs Pillow (pip install pillow).

    python3 scripts/gif.py frames.jsonl docs/demo.gif
"""

import base64
import json
import struct
import sys

from PIL import Image, ImageDraw, ImageFont

CELL_W, CELL_H = 9, 18
BACKGROUND = (30, 30, 36)
FOREGROUND = (220, 220, 220)
CLEAR = 0x01000000
FONTS = ['/System/Library/Fonts/Menlo.ttc', '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf']


def font():
    for path in FONTS:
        try:
            return ImageFont.truetype(path, 14)
        except OSError:
            pass
    return ImageFont.load_default()


def color(word, fallback):
    return fallback if word == CLEAR else ((word >> 16) & 255, (word >> 8) & 255, word & 255)


def draw(frame, face):
    cols, rows = frame['cols'], frame['rows']
    raw = base64.b64decode(frame['cells'])
    words = struct.unpack('<%dI' % (len(raw) // 4), raw)
    image = Image.new('RGB', (cols * CELL_W, rows * CELL_H), BACKGROUND)
    pen = ImageDraw.Draw(image)
    for row in range(rows):
        for col in range(cols):
            at = (row * cols + col) * 3
            char, fg, bg = chr(words[at]), color(words[at + 1], FOREGROUND), color(words[at + 2], BACKGROUND)
            x, y = col * CELL_W, row * CELL_H
            pen.rectangle([x, y, x + CELL_W - 1, y + CELL_H - 1], fill=bg)
            half = CELL_H // 2
            if char == '▀':
                pen.rectangle([x, y, x + CELL_W - 1, y + half - 1], fill=fg)
            elif char == '▄':
                pen.rectangle([x, y + half, x + CELL_W - 1, y + CELL_H - 1], fill=fg)
            elif char != ' ':
                pen.text((x, y + 1), char, fill=fg, font=face)
    return image


def main(source, target):
    face = font()
    with open(source) as lines:
        frames = [draw(json.loads(line), face) for line in lines if line.strip()]
    frames[0].save(target, save_all=True, append_images=frames[1:], duration=100, loop=0, optimize=True)
    print(f'{target}: {len(frames)} frames')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
