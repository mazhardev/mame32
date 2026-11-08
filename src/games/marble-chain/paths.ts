/**
 * Marble Chain tracks. Each track is a smooth curve the marble chain rolls
 * along, from just off screen to the pit at its end. Curves are built from
 * spirals (round, wavy, oval, rounded-square or diamond shaped), then
 * resampled every pixel so a marble's place is simply its distance along the
 * track.
 */
export const W = 480;
export const H = 360;
export const R = 8;
export const D = R * 2;

export interface Track {
  /** Points one pixel apart along the curve. */
  xs: Float32Array;
  ys: Float32Array;
  length: number;
  /** Where the shooter sits. */
  sx: number;
  sy: number;
}

type Pt = [number, number];

function resample(pts: Pt[]): { xs: Float32Array; ys: Float32Array; length: number } {
  const xs: number[] = [pts[0][0]];
  const ys: number[] = [pts[0][1]];
  let carry = 0;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1];
    const [bx, by] = pts[i];
    const seg = Math.hypot(bx - ax, by - ay);
    let d = 1 - carry;
    while (d <= seg) {
      const t = d / seg;
      xs.push(ax + (bx - ax) * t);
      ys.push(ay + (by - ay) * t);
      d += 1;
    }
    carry = seg - (d - 1);
  }
  return { xs: Float32Array.from(xs), ys: Float32Array.from(ys), length: xs.length - 1 };
}

const sgnPow = (v: number, p: number) => Math.sign(v) * Math.abs(v) ** p;

/** A spiral winding inward; `shape` 2 is an ellipse, 4+ a rounded square, 1 a diamond. */
function spiral(
  cx: number,
  cy: number,
  rx0: number,
  ry0: number,
  rx1: number,
  ry1: number,
  turns: number,
  start: number,
  shape: number,
  dir: 1 | -1,
  wobble = 0,
  lobes = 6,
): Pt[] {
  const pts: Pt[] = [];
  const n = Math.ceil(turns * 400);
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const t = start + dir * u * turns * Math.PI * 2;
    const w = 1 + wobble * Math.sin(lobes * t);
    const rx = (rx0 + (rx1 - rx0) * u) * w;
    const ry = (ry0 + (ry1 - ry0) * u) * w;
    pts.push([cx + rx * sgnPow(Math.cos(t), 2 / shape), cy + ry * sgnPow(Math.sin(t), 2 / shape)]);
  }
  return pts;
}

function lead(from: Pt, pts: Pt[]): Pt[] {
  return [from, ...pts];
}

/** The five track shapes. */
export const TRACKS: (() => Track)[] = [
  // 0: round spiral around the shooter.
  () => {
    const sp = spiral(240, 186, 205, 158, 78, 62, 1.6, Math.PI, 2, 1);
    return { ...resample(lead([-30, sp[0][1]], sp)), sx: 240, sy: 186 };
  },
  // 1: a wavy flower-shaped spiral.
  () => {
    const sp = spiral(240, 184, 196, 148, 84, 64, 1.55, -Math.PI / 2, 2, 1, 0.08, 5);
    return { ...resample(lead([sp[0][0], -30], sp)), sx: 240, sy: 184 };
  },
  // 2: rounded-square spiral.
  () => {
    const sp = spiral(240, 182, 212, 160, 92, 70, 1.45, Math.PI / 2, 5, -1);
    return { ...resample(lead([sp[0][0], H + 30], sp)), sx: 240, sy: 182 };
  },
  // 3: a wide oval spiral, two turns.
  () => {
    const sp = spiral(240, 182, 222, 160, 92, 66, 1.95, 0, 3, -1);
    return { ...resample(lead([W + 30, sp[0][1]], sp)), sx: 240, sy: 182 };
  },
  // 4: diamond spiral.
  () => {
    const sp = spiral(240, 182, 250, 182, 96, 72, 1.5, 0, 1.4, 1);
    return { ...resample(lead([W + 30, sp[0][1]], sp)), sx: 240, sy: 182 };
  },
];

export interface LevelDef {
  index: number;
  track: number;
  colors: number;
  /** Marbles that roll out over the level. */
  count: number;
  /** Rolling speed in px/s. */
  speed: number;
  name: string;
}

export const TEMPLES = ['Jade Temple', 'Sun Temple', 'Moon Temple'];
export const PER_TEMPLE = 5;
const NAMES = ['Coiled Path', 'Lotus', 'Stone Court', 'Long Oval', 'Diamond Eye'];

export const LEVELS: LevelDef[] = Array.from({ length: 15 }, (_, i) => {
  const tier = Math.floor(i / PER_TEMPLE);
  const k = i % PER_TEMPLE;
  return {
    index: i,
    track: k,
    colors: [4, 5, 6][tier],
    count: 60 + tier * 30 + k * 6,
    speed: 26 + tier * 7 + k * 1.5,
    name: `${TEMPLES[tier].split(' ')[0]} · ${NAMES[k]}`,
  };
});

const cache = new Map<number, Track>();
export function track(i: number): Track {
  let t = cache.get(i);
  if (!t) {
    t = TRACKS[i]();
    cache.set(i, t);
  }
  return t;
}

/** Position on a track at distance s (clamped to the ends). */
export function at(t: Track, s: number): [number, number] {
  const c = Math.max(0, Math.min(t.length, s));
  const i = Math.floor(c);
  const f = c - i;
  const j = Math.min(t.length, i + 1);
  return [t.xs[i] + (t.xs[j] - t.xs[i]) * f, t.ys[i] + (t.ys[j] - t.ys[i]) * f];
}
