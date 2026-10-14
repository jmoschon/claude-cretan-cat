"""Synthesizes sounds/meow.wav, the soft meow the "sound" setting plays: a
pitch that rises ("mi-") and falls ("-aow"), a few harmonics shaped by two
formants that open and close like a mouth, a touch of vibrato, and a gentle
fade in and out. No samples, so no license but this repository's.

    python3 scripts/meow.py sounds/meow.wav
"""

import math
import struct
import sys
import wave

RATE = 22050
SECONDS = 0.75


def pitch(k):
    # Up from 520 Hz to 820 Hz over the first third, then down to 430 Hz.
    if k < 0.33:
        return 520 + (820 - 520) * math.sin(k / 0.33 * math.pi / 2)
    return 820 - (820 - 430) * ((k - 0.33) / 0.67) ** 1.4


def formant(f, center, width):
    return math.exp(-((f - center) / width) ** 2)


def main(target):
    frames = []
    phase = 0.0
    n = int(RATE * SECONDS)
    for i in range(n):
        k = i / n
        f0 = pitch(k) * (1 + 0.012 * math.sin(2 * math.pi * 6 * i / RATE))
        phase += 2 * math.pi * f0 / RATE
        # The mouth: "ee" (a high formant) opening into "ow" (a low one).
        mouth = min(1.0, k / 0.4)
        sample = 0.0
        for h in range(1, 9):
            f = f0 * h
            gain = (1 - mouth) * formant(f, 2600, 700) + mouth * formant(f, 900, 450) + 0.35 * formant(f, f0, 200)
            sample += gain / h * math.sin(h * phase)
        envelope = min(1.0, k / 0.06) * min(1.0, (1 - k) / 0.25)
        frames.append(int(max(-1.0, min(1.0, sample * envelope * 0.3)) * 32767))
    with wave.open(target, 'wb') as out:
        out.setnchannels(1)
        out.setsampwidth(2)
        out.setframerate(RATE)
        out.writeframes(struct.pack('<%dh' % len(frames), *frames))
    print(f'{target}: {n} samples, {SECONDS}s')


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'sounds/meow.wav')
