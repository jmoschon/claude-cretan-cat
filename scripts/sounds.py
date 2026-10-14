"""Synthesizes the cat's sounds into sounds/, the ones the "sound"
setting plays. No samples, so no license but this repository's; stdlib only
and seeded, so the same bytes every run.

    python3 scripts/sounds.py [sounds]

A cat's voice the way speech is made: a source (the glottis: a band-limited
pulse train with a little jitter and shimmer, plus breath noise) through a
vocal tract (two or three resonant filters that move as the mouth opens and
closes). Each sound is a pitch contour and a mouth contour:

  happy.wav  "mrrp!", a short rolled trill rising into a bright chirp
             (work done, a sardine)
  mew.wav    "mew?", a small meow whose pitch climbs at the end, like a
             question (Claude waits for you)
  purr.wav   a purr: ~25 low pulses a second, a breath out then a breath in
             (petted)
  hiss.wav   a short growl, then a hiss: noise through the open mouth with a
             sharp start (red tests, a swat)

And one that isn't his voice:

  bell.wav   the jingle bell (cascabel) on the fishing toy, shaken: a metal
             pea rattling in a small shell, each knock ringing its few
             inharmonic partials (play)
"""

import math
import random
import struct
import sys
import wave

RATE = 22050
NYQUIST = RATE / 2


class Resonator:
    """A two-pole resonance (biquad band-pass, constant peak gain) whose
    center and bandwidth may change sample by sample."""

    def __init__(self):
        self.x1 = self.x2 = self.y1 = self.y2 = 0.0

    def __call__(self, x, freq, bandwidth):
        w = 2 * math.pi * min(freq, NYQUIST * 0.95) / RATE
        q = max(0.5, freq / bandwidth)
        alpha = math.sin(w) / (2 * q)
        a0 = 1 + alpha
        b0, b2 = alpha / a0, -alpha / a0
        a1, a2 = -2 * math.cos(w) / a0, (1 - alpha) / a0
        y = b0 * x + b2 * self.x2 - a1 * self.y1 - a2 * self.y2
        self.x2, self.x1 = self.x1, x
        self.y2, self.y1 = self.y1, y
        return y


class Filter:
    """A biquad low- or high-pass (RBJ cookbook), cutoff free to move."""

    def __init__(self, kind):
        self.kind = kind
        self.x1 = self.x2 = self.y1 = self.y2 = 0.0

    def __call__(self, x, cutoff, q=0.707):
        w = 2 * math.pi * min(cutoff, NYQUIST * 0.95) / RATE
        alpha = math.sin(w) / (2 * q)
        c = math.cos(w)
        a0 = 1 + alpha
        if self.kind == 'low':
            b0 = b2 = (1 - c) / 2 / a0
            b1 = (1 - c) / a0
        else:
            b0 = b2 = (1 + c) / 2 / a0
            b1 = -(1 + c) / a0
        a1, a2 = -2 * c / a0, (1 - alpha) / a0
        y = b0 * x + b1 * self.x1 + b2 * self.x2 - a1 * self.y1 - a2 * self.y2
        self.x2, self.x1 = self.x1, x
        self.y2, self.y1 = self.y1, y
        return y


def curve(points, k):
    """Piecewise, eased (cosine) interpolation through (k, value) points."""
    if k <= points[0][0]:
        return points[0][1]
    for (k0, v0), (k1, v1) in zip(points, points[1:]):
        if k <= k1:
            u = (k - k0) / (k1 - k0)
            return v0 + (v1 - v0) * (1 - math.cos(math.pi * u)) / 2
    return points[-1][1]


class Glottis:
    """A band-limited glottal source: harmonics of f0 falling ~10 dB an
    octave (a Rosenberg-like pulse's spectrum), with jitter (the period
    wanders) and shimmer (the loudness wanders), as a real voice does."""

    def __init__(self, rng):
        self.rng = rng
        self.phase = 0.0
        self.jitter = 0.0
        self.shimmer = 0.0

    def __call__(self, f0, tilt=1.0):
        # Slow random walks, smoothed, for jitter and shimmer.
        self.jitter = 0.995 * self.jitter + 0.005 * self.rng.gauss(0, 1)
        self.shimmer = 0.99 * self.shimmer + 0.01 * self.rng.gauss(0, 1)
        f = f0 * (1 + 0.02 * self.jitter)
        self.phase = (self.phase + 2 * math.pi * f / RATE) % (2 * math.pi)
        out = 0.0
        h = 1
        while h * f < NYQUIST * 0.9:
            out += math.sin(h * self.phase) / h ** tilt
            h += 1
        return out * (1 + 0.6 * self.shimmer)


def voice(seconds, pitch, mouth, loud, seed, trill=None, breath=0.06):
    """A cat's voiced sound. `pitch(k)`: f0 in Hz; `mouth(k)`: 0 closed
    ("m": only the nasal murmur gets out) to 1 wide open ("a"); `loud(k)`:
    the envelope; `trill(k)`: depth of a rolled "rr" flutter, if any."""
    rng = random.Random(seed)
    glottis = Glottis(rng)
    f1, f2, f3, nasal = Resonator(), Resonator(), Resonator(), Resonator()
    lips = Filter('low')
    out = []
    n = int(RATE * seconds)
    for i in range(n):
        k = i / n
        f0 = pitch(k) * (1 + 0.008 * math.sin(2 * math.pi * 5.5 * i / RATE))
        src = glottis(f0) + breath * rng.gauss(0, 1)
        if trill is not None:
            depth = trill(k)
            src *= 1 - depth * (0.5 + 0.5 * math.cos(2 * math.pi * 30 * i / RATE))
        m = mouth(k)
        # The vowel: a small cat's tract is short, so its formants sit high.
        # Closed ("m", "ow") F1 ~700, F2 ~1300; open "a" F1 ~1200, F2 ~2200.
        a = f1(src, 700 + 500 * m, 180 + 120 * m)
        b = f2(src, 1300 + 900 * m, 260 + 140 * m)
        c = f3(src, 3300 + 500 * m, 450)
        hum = nasal(src, 320, 140)
        x = (1.0 * a + 0.9 * b * m + 0.35 * c * m) * (0.12 + 0.88 * m) + 0.5 * hum * (1 - m)
        # Closed lips muffle the top.
        x = lips(x, 900 + 5200 * m)
        out.append(x * loud(k))
    return out


def meowish_envelope(attack, release):
    return lambda k: min(1.0, k / attack) * min(1.0, (1 - k) / release) ** 1.5


def happy():
    # "mrrp!": a short closed "mrr" flutter, rising, bursting open into a chirp.
    pitch = lambda k: curve([(0, 520), (0.35, 600), (0.7, 900), (0.85, 960), (1, 880)], k)
    mouth = lambda k: curve([(0, 0.2), (0.4, 0.45), (0.7, 0.95), (0.85, 0.9), (1, 0.35)], k)
    trill = lambda k: curve([(0, 0.85), (0.5, 0.75), (0.65, 0.0), (1, 0.0)], k)
    return voice(0.5, pitch, mouth, meowish_envelope(0.06, 0.2), seed=11, trill=trill)


def mew():
    # "mew?": m-ee opening, a short dip, then the pitch climbs like a question.
    pitch = lambda k: curve([(0, 560), (0.25, 680), (0.5, 620), (0.8, 820), (1, 900)], k)
    mouth = lambda k: curve([(0, 0.0), (0.18, 0.75), (0.45, 0.95), (0.8, 0.6), (1, 0.45)], k)
    return voice(0.7, pitch, mouth, meowish_envelope(0.08, 0.22), seed=7)


def purr():
    """A purr: the larynx clicks ~25 times a second, each click a short
    damped thump through a low, chesty resonance; a breath out (louder,
    a little faster) then a breath in (softer, slower, airier)."""
    rng = random.Random(3)
    chest, throat = Resonator(), Resonator()
    lp = Filter('low')
    out = []
    n = int(RATE * 1.2)
    phase = 0.0
    for i in range(n):
        t = i / RATE
        k = i / n
        exhale = t < 0.66
        rate = 26.0 if exhale else 23.0
        phase += rate * (1 + 0.04 * rng.gauss(0, 1)) / RATE
        if phase >= 1:
            phase -= 1
        # The click: a fast attack, then a decay over a third of the cycle.
        pulse = (phase / 0.04 if phase < 0.04 else math.exp(-(phase - 0.04) * 11)) * (1 if exhale else 0.7)
        noise = rng.gauss(0, 1)
        src = pulse * (0.7 + 0.6 * noise) + 0.05 * noise * (1.6 if not exhale else 1)
        x = 1.2 * chest(src, 140, 90) + 0.5 * throat(src, 420, 260)
        x = lp(x, 1400)
        # Each breath swells and fades; a short gap between them.
        breath = math.sin(math.pi * min(1, t / 0.64)) if exhale else math.sin(math.pi * min(1, (t - 0.68) / 0.5)) if t > 0.68 else 0
        out.append(x * max(0.0, breath) ** 0.6 * min(1.0, (1 - k) / 0.05))
    return out


def hiss():
    """A short growl, then the hiss: breath forced through the open mouth,
    broadband noise above ~2 kHz with a hump near 5 kHz, a sharp start and a
    slow fall."""
    rng = random.Random(5)
    glottis = Glottis(rng)
    g1, g2 = Resonator(), Resonator()
    h1, h2 = Filter('high'), Filter('high')
    s1 = Resonator()
    out = []
    n = int(RATE * 0.65)
    for i in range(n):
        t = i / RATE
        noise = rng.gauss(0, 1)
        # The growl: a low, rough voice (~95 Hz) and noise, ~0.15 s.
        growl = 0.0
        if t < 0.18:
            env = min(1.0, t / 0.02) * min(1.0, (0.18 - t) / 0.05)
            src = glottis(95 + 15 * math.sin(2 * math.pi * 7 * t), tilt=1.0) * (0.7 + 0.5 * noise)
            growl = env * (g1(src, 450, 200) + 0.6 * g2(src, 1100, 300)) * 1.6
        # The hiss: in at 0.14 s within 8 ms, then a slow fall.
        hissed = 0.0
        if t >= 0.14:
            u = t - 0.14
            env = min(1.0, u / 0.008) * math.exp(-u * 2.2) * min(1.0, (0.65 - t) / 0.12)
            x = h2(h1(noise, 2000), 2000)
            hissed = env * (0.55 * x + 0.9 * s1(noise, 5200, 2600))
        out.append(growl + hissed)
    return out


def bell():
    """The toy's cascabel, shaken three times: two small jingle bells, each a
    loose pea rattling in a slotted shell. A knock rings the shell's high,
    inharmonic partials for only a few hundredths of a second, so what you
    hear is the rattle, ~45 knocks a second, not a tone."""
    rng = random.Random(7)
    # Each little bell's modes (Hz, gain, seconds to ring down).
    bells = [
        [(4650, 1.0, 0.035), (7010, 0.8, 0.024), (9300, 0.6, 0.016)],
        [(5230, 1.0, 0.03), (7640, 0.7, 0.02), (9850, 0.5, 0.014)],
    ]
    knocks = []
    for start, length in [(0.0, 0.22), (0.30, 0.2), (0.58, 0.28)]:
        t = start
        while t < start + length:
            # Hardest mid-shake, a flick at each end.
            k = (t - start) / length
            strength = (0.35 + 0.65 * math.sin(math.pi * k)) * rng.uniform(0.5, 1.0)
            knocks.append((t, strength, rng.randrange(len(bells)), rng.uniform(-120, 120)))
            t += rng.uniform(0.012, 0.035)
    n = int(RATE * 0.95)
    out = [0.0] * n
    click = Filter('high')
    for start, strength, which, detune in knocks:
        first = int(start * RATE)
        for i in range(first, min(n, first + int(RATE * 0.1))):
            u = (i - first) / RATE
            ring = sum(gain * math.sin(2 * math.pi * (freq + detune) * u) * math.exp(-u / decay) for freq, gain, decay in bells[which])
            out[i] += strength * ring
        # The pea on the shell: a couple of milliseconds of bright noise.
        for i in range(first, min(n, first + int(RATE * 0.002))):
            out[i] += strength * 0.9 * click(rng.gauss(0, 1), 6000)
    return out


def write(target, samples, peak=0.55):
    """Normalizes to `peak` of full scale, fades the very ends (no click)
    and writes 16-bit mono."""
    top = max(abs(s) for s in samples) or 1.0
    n = len(samples)
    edge = int(RATE * 0.006)
    frames = []
    for i, s in enumerate(samples):
        fade = min(1.0, i / edge, (n - 1 - i) / edge)
        frames.append(int(round(s / top * peak * fade * 32767)))
    with wave.open(target, 'wb') as out:
        out.setnchannels(1)
        out.setsampwidth(2)
        out.setframerate(RATE)
        out.writeframes(struct.pack('<%dh' % n, *frames))
    print(f'{target}: {n / RATE:.2f}s')


SOUNDS = {'happy': (happy, 0.55), 'mew': (mew, 0.5), 'purr': (purr, 0.5), 'hiss': (hiss, 0.4), 'bell': (bell, 0.35)}

if __name__ == '__main__':
    folder = sys.argv[1] if len(sys.argv) > 1 else 'sounds'
    for name, (make, peak) in SOUNDS.items():
        write(f'{folder}/{name}.wav', make(), peak)
