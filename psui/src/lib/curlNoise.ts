const PERM_SIZE = 256;

function buildPermutation(seed: number): Uint8Array {
  const base = new Uint8Array(PERM_SIZE);
  for (let i = 0; i < PERM_SIZE; i++) base[i] = i;

  let s = seed >>> 0;
  function next(): number {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  for (let i = PERM_SIZE - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    const tmp = base[i];
    base[i] = base[j];
    base[j] = tmp;
  }
  return base;
}

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

const GRADIENTS: ReadonlyArray<readonly [number, number]> = [
  [1, 1],
  [-1, 1],
  [1, -1],
  [-1, -1],
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

export class Noise2D {
  private readonly perm: Uint8Array;

  constructor(seed = 1337) {
    const base = buildPermutation(seed);
    this.perm = new Uint8Array(PERM_SIZE * 2);
    for (let i = 0; i < this.perm.length; i++) this.perm[i] = base[i & 255];
  }

  private gradientAt(ix: number, iy: number): readonly [number, number] {
    const index = this.perm[(this.perm[ix & 255] + iy) & 255] & 7;
    return GRADIENTS[index];
  }

  sample(x: number, y: number): number {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const xf = x - x0;
    const yf = y - y0;

    const g00 = this.gradientAt(x0, y0);
    const g10 = this.gradientAt(x0 + 1, y0);
    const g01 = this.gradientAt(x0, y0 + 1);
    const g11 = this.gradientAt(x0 + 1, y0 + 1);

    const d00 = g00[0] * xf + g00[1] * yf;
    const d10 = g10[0] * (xf - 1) + g10[1] * yf;
    const d01 = g01[0] * xf + g01[1] * (yf - 1);
    const d11 = g11[0] * (xf - 1) + g11[1] * (yf - 1);

    const u = fade(xf);
    const v = fade(yf);

    return lerp(lerp(d00, d10, u), lerp(d01, d11, u), v);
  }
}

const CURL_EPSILON = 0.01;

/**
 * A divergence-free direction at (x, y), derived from the scalar noise
 * field's own numerical gradient (rotated 90°). Particles following this
 * trace continuous, non-crossing swirls instead of jittering randomly —
 * this is what "curl noise" means, as distinct from plain random motion.
 */
export function curl2D(noise: Noise2D, x: number, y: number): readonly [number, number] {
  const dPsiDy = (noise.sample(x, y + CURL_EPSILON) - noise.sample(x, y - CURL_EPSILON)) / (2 * CURL_EPSILON);
  const dPsiDx = (noise.sample(x + CURL_EPSILON, y) - noise.sample(x - CURL_EPSILON, y)) / (2 * CURL_EPSILON);
  return [dPsiDy, -dPsiDx];
}
