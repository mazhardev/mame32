/**
 * Lane Rush track generation. The track is three lanes (−1, 0, 1) running
 * along z in metres. It is laid out ahead of the runner from hand-made
 * patterns, each of which can always be passed: no row ever blocks all three
 * lanes, obstacles that need a lane change leave time to make it, and the
 * spacing grows with speed so there is always time to react.
 */
export type Lane = -1 | 0 | 1;
export type Kind = 'low' | 'high' | 'block' | 'coin' | 'magnet' | 'shield' | 'double';

export interface Item {
  kind: Kind;
  lane: Lane;
  z: number;
  /** Length along the track (blocks); 0.4 for hurdles and bars. */
  len: number;
  /** Height above the ground (coins in arcs). */
  y: number;
  taken: boolean;
  /** Visual variety for blocks. */
  style: number;
}

export const LANES: Lane[] = [-1, 0, 1];
export const LANE_W = 1.5;
export const BAR_LEN = 0.4;

type Rand = () => number;
const pick = <T>(r: Rand, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)];
const shuffle = <T>(r: Rand, xs: T[]): T[] => {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

function item(kind: Kind, lane: Lane, z: number, len = kind === 'block' ? 10 : kind === 'low' || kind === 'high' ? BAR_LEN : 0, y = 0, style = 0): Item {
  return { kind, lane, z, len, y: kind === 'coin' || kind === 'magnet' || kind === 'shield' || kind === 'double' ? y || 0.6 : y, taken: false, style };
}

function coins(lane: Lane, z0: number, n: number, gap = 1.6): Item[] {
  return Array.from({ length: n }, (_, i) => item('coin', lane, z0 + i * gap));
}

/** Coins in an arc over a hurdle, peaking above it. */
function arc(lane: Lane, zc: number): Item[] {
  return [-3, -1.5, 0, 1.5, 3].map((dz) => item('coin', lane, zc + dz, 0, 0.6 + 1.1 * (1 - (dz / 3.6) ** 2)));
}

export interface Pattern {
  items: Item[];
  length: number;
}

/**
 * Patterns are built for a reaction distance `d` (metres the runner covers
 * in about three quarters of a second at the current speed).
 */
const PATTERNS: { easy: boolean; make: (r: Rand, d: number) => Pattern }[] = [
  {
    // A hurdle to jump, coins in another lane.
    easy: true,
    make: (r) => {
      const [a, b] = shuffle(r, LANES);
      return { items: [item('low', a, 0), ...arc(a, 0.2), ...coins(b, -2, 5)], length: 4 };
    },
  },
  {
    // A bar to slide under.
    easy: true,
    make: (r) => {
      const a = pick(r, LANES);
      return { items: [item('high', a, 0), ...coins(a, 2, 4)], length: 8 };
    },
  },
  {
    // Two trains: take the free lane.
    easy: true,
    make: (r) => {
      const [a, b, c] = shuffle(r, LANES);
      const len = 9 + Math.floor(r() * 6);
      return { items: [item('block', a, 0, len, 0, Math.floor(r() * 3)), item('block', b, 0, len, 0, Math.floor(r() * 3)), ...coins(c, 0, Math.floor(len / 1.6))], length: len };
    },
  },
  {
    // Hurdles right across.
    easy: true,
    make: (r) => {
      const c = pick(r, LANES);
      return { items: [...LANES.map((l) => item('low', l, 0)), ...arc(c, 0.2)], length: 4 };
    },
  },
  {
    // A gantry right across: slide.
    easy: false,
    make: () => ({ items: LANES.map((l) => item('high', l, 0)), length: 2 }),
  },
  {
    // One of each.
    easy: false,
    make: (r) => {
      const kinds = shuffle(r, ['low', 'high', 'block'] as Kind[]);
      return { items: LANES.map((l, i) => item(kinds[i], l, 0, kinds[i] === 'block' ? 8 : BAR_LEN, 0, Math.floor(r() * 3))), length: 8 };
    },
  },
  {
    // Zig-zag: two pairs of trains, the gap moves one lane over.
    easy: false,
    make: (r, d) => {
      const f1 = pick(r, LANES);
      const f2 = (f1 === 0 ? pick(r, [-1, 1] as Lane[]) : 0) as Lane;
      const len = 8;
      const z2 = len + d;
      const items: Item[] = [];
      for (const l of LANES) {
        if (l !== f1) items.push(item('block', l, 0, len, 0, Math.floor(r() * 3)));
        if (l !== f2) items.push(item('block', l, z2, len, 0, Math.floor(r() * 3)));
      }
      items.push(...coins(f1, 0, 5), ...coins(f2, z2, 5));
      return { items, length: z2 + len };
    },
  },
  {
    // A long train, a hurdle beside it and a free lane.
    easy: false,
    make: (r) => {
      const [a, b, c] = shuffle(r, LANES);
      return { items: [item('block', a, 0, 14, 0, Math.floor(r() * 3)), item('low', b, 5), ...arc(b, 5.2), ...coins(c, 0, 8)], length: 14 };
    },
  },
  {
    // Jump, then slide, in the same lane.
    easy: false,
    make: (r, d) => {
      const [a, b] = shuffle(r, LANES);
      return { items: [item('low', a, 0), item('high', a, d), ...coins(b, 0, Math.floor(d / 1.6) + 2)], length: d + 2 };
    },
  },
  {
    // A breather: a line of coins, sometimes a power-up at the end.
    easy: true,
    make: (r) => {
      const a = pick(r, LANES);
      const items = coins(a, 0, 10);
      if (r() < 0.45) items.push(item(pick(r, ['magnet', 'shield', 'double'] as Kind[]), pick(r, LANES), 18, 0, 0.8));
      return { items, length: 18 };
    },
  },
];

export const PATTERN_COUNT = PATTERNS.length;

/** Builds the next pattern at `z`. Returns the items and where the next one may start. */
export function nextPattern(r: Rand, z: number, speed: number, distance: number, only?: number): { items: Item[]; end: number } {
  const d = Math.max(7, speed * 0.75);
  const pool = PATTERNS.filter((p) => distance > 250 || p.easy);
  const p = only !== undefined ? PATTERNS[only] : pick(r, pool);
  const made = p.make(r, d);
  for (const it of made.items) it.z += z;
  // A gap after the pattern, a little shorter as the run goes on.
  const gap = Math.max(d, speed * (distance > 1500 ? 0.85 : 1.05));
  return { items: made.items, end: z + made.length + gap };
}

export const isObstacle = (k: Kind) => k === 'low' || k === 'high' || k === 'block';
export const laneX = (l: number) => l * LANE_W;
