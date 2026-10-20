/**
 * Slingshot Siege levels: 30 forts in three worlds of ten. Each level is
 * built with a few helpers (posts, beams, frames, blocks) on flat ground at
 * y = 0, with the slingshot at x = 4. Units are metres; y points up.
 *
 * Every level is checked by scripts/solve-slingshot.ts, which searches for
 * a winning sequence of shots and records it in solutions.ts; the tests
 * replay those shots to prove each level can be won.
 */
export type Mat = 'wood' | 'stone' | 'ice' | 'tnt';
export type Ammo = 'pebble' | 'triple' | 'boulder' | 'zoomer' | 'kaboom';

export interface BoxPiece {
  t: 'box';
  mat: Mat;
  x: number;
  y: number;
  w: number;
  h: number;
  a: number;
}

export interface EnemyPiece {
  t: 'enemy';
  size: 0 | 1 | 2;
  x: number;
  y: number;
}

export interface RockPiece {
  t: 'rock';
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Piece = BoxPiece | EnemyPiece | RockPiece;

export interface Level {
  index: number;
  world: number;
  name: string;
  pieces: Piece[];
  ammo: Ammo[];
}

export const P = 0.4;
export const ENEMY_R = [0.42, 0.56, 0.78] as const;
export const SLING_X = 4;
export const SLING_Y = 2.6;

class Build {
  pieces: Piece[] = [];
  box(mat: Mat, x: number, y: number, w: number, h: number, a = 0) {
    this.pieces.push({ t: 'box', mat, x, y, w, h, a });
  }
  /** A vertical post standing on y; returns its top. */
  post(x: number, y: number, h = 2.4, mat: Mat = 'wood') {
    this.box(mat, x, y + h / 2, P, h);
    return y + h;
  }
  /** A horizontal beam lying on y from x0 to x1; returns its top. */
  beam(x0: number, x1: number, y: number, mat: Mat = 'wood') {
    this.box(mat, (x0 + x1) / 2, y + P / 2, x1 - x0, P);
    return y + P;
  }
  /** A square block of side s centred on x, standing on y; returns its top. */
  block(x: number, y: number, s = 1, mat: Mat = 'wood') {
    this.box(mat, x, y + s / 2, s, s);
    return y + s;
  }
  /** Two posts and a beam across them; returns the top of the beam. */
  frame(x0: number, x1: number, y = 0, h = 2.4, mat: Mat = 'wood', top: Mat = mat) {
    this.post(x0 + P / 2, y, h, mat);
    this.post(x1 - P / 2, y, h, mat);
    return this.beam(x0, x1, y + h, top);
  }
  tnt(x: number, y: number) {
    this.box('tnt', x, y + 0.4, 0.8, 0.8);
    return y + 0.8;
  }
  enemy(x: number, y: number, size: 0 | 1 | 2 = 0) {
    this.pieces.push({ t: 'enemy', size, x, y: y + ENEMY_R[size] });
  }
  /** Solid ground raised from y0 to y1 between x0 and x1. */
  rock(x0: number, x1: number, y1: number, y0 = 0) {
    this.pieces.push({ t: 'rock', x: (x0 + x1) / 2, y: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0 });
    return y1;
  }
  /** A pyramid of blocks: `rows` blocks wide at the bottom. Returns the top. */
  pyramid(x0: number, y: number, rows: number, s = 1, mat: Mat = 'wood') {
    let top = y;
    for (let r = 0; r < rows; r++) {
      for (let k = 0; k < rows - r; k++) this.block(x0 + s / 2 + k * s + (r * s) / 2, y + r * s, s, mat);
      top = y + (r + 1) * s;
    }
    return top;
  }
}

type Def = { name: string; ammo: Ammo[]; build: (b: Build) => void };

const W1: Def[] = [
  {
    name: 'First Fort',
    ammo: ['pebble', 'pebble', 'pebble'],
    build: (b) => {
      b.frame(20, 23);
      b.enemy(21.5, 0);
    },
  },
  {
    name: 'Neighbours',
    ammo: ['pebble', 'pebble', 'pebble'],
    build: (b) => {
      b.frame(18, 21);
      b.enemy(19.5, 0);
      b.frame(24, 27);
      b.enemy(25.5, 0);
    },
  },
  {
    name: 'Upstairs',
    ammo: ['pebble', 'pebble', 'pebble'],
    build: (b) => {
      const t = b.frame(20, 23.2);
      b.enemy(21.6, 0);
      b.frame(20.2, 23, t, 2);
      b.enemy(21.6, t);
    },
  },
  {
    name: 'Block Hill',
    ammo: ['pebble', 'pebble', 'pebble'],
    build: (b) => {
      const top = b.pyramid(20, 0, 4);
      b.enemy(22, top);
      b.enemy(25.6, 0);
    },
  },
  {
    name: 'Row of Huts',
    ammo: ['triple', 'triple', 'pebble'],
    build: (b) => {
      for (const x of [19, 22.4, 25.8]) {
        b.frame(x, x + 3);
        b.enemy(x + 1.5, 0);
      }
    },
  },
  {
    name: 'Thin Ice',
    ammo: ['pebble', 'triple', 'pebble'],
    build: (b) => {
      const t = b.frame(20, 23, 0, 2.4, 'ice', 'wood');
      b.enemy(21.5, 0);
      b.frame(20.2, 22.8, t, 2, 'ice');
      b.enemy(21.5, t);
      b.post(24.2, 0, 3.2);
    },
  },
  {
    name: 'Heavy Hitter',
    ammo: ['boulder', 'pebble', 'pebble'],
    build: (b) => {
      const t = b.frame(20, 24);
      b.block(20.9, t, 1);
      b.block(23.1, t, 1);
      b.beam(20.4, 23.6, t + 1);
      b.enemy(22, 0, 1);
      b.enemy(22, t);
    },
  },
  {
    name: 'Three Floors',
    ammo: ['pebble', 'boulder', 'triple'],
    build: (b) => {
      let y = 0;
      for (let f = 0; f < 3; f++) {
        const top = b.frame(21, 24, y, 2.2);
        b.enemy(22.5, y);
        y = top;
      }
    },
  },
  {
    name: 'On the Hill',
    ammo: ['triple', 'pebble', 'boulder'],
    build: (b) => {
      const g = b.rock(22, 32, 2);
      b.frame(23, 26, g);
      b.enemy(24.5, g);
      b.frame(28, 31, g);
      b.enemy(29.5, g);
    },
  },
  {
    name: 'Meadow Castle',
    ammo: ['boulder', 'triple', 'pebble', 'pebble'],
    build: (b) => {
      const l1 = b.frame(19, 22);
      const l2 = b.frame(19, 22, l1, 2);
      const r1 = b.frame(27, 30);
      const r2 = b.frame(27, 30, r1, 2);
      b.enemy(20.5, l1);
      b.enemy(28.5, r1);
      b.enemy(20.5, l2);
      b.enemy(28.5, r2);
      b.enemy(24.5, 0, 1);
    },
  },
];

const W2: Def[] = [
  {
    name: 'Sandstone Gate',
    ammo: ['zoomer', 'pebble', 'pebble'],
    build: (b) => {
      b.frame(20, 23, 0, 2.4, 'stone', 'wood');
      b.enemy(21.5, 0);
      b.tnt(24, 0);
      b.enemy(25.6, 0);
    },
  },
  {
    name: 'Behind the Wall',
    ammo: ['zoomer', 'boulder', 'pebble'],
    build: (b) => {
      for (let k = 0; k < 3; k++) b.block(19.5, k, 1, 'stone');
      b.frame(22, 25);
      b.enemy(23.5, 0);
      b.frame(26, 29);
      b.enemy(27.5, 0);
    },
  },
  {
    name: 'Step Pyramid',
    ammo: ['boulder', 'boulder', 'pebble'],
    build: (b) => {
      const top = b.pyramid(20, 0, 5, 1, 'stone');
      b.enemy(22.5, top);
      b.enemy(26.2, 0);
      b.enemy(18.6, 0, 1);
    },
  },
  {
    name: 'Powder Keg',
    ammo: ['pebble', 'pebble', 'pebble'],
    build: (b) => {
      const t = b.frame(19.6, 24.4);
      b.tnt(20.6, 0);
      b.enemy(22, 0);
      b.tnt(23.4, 0);
      b.frame(20, 24, t, 2);
      b.enemy(22, t);
    },
  },
  {
    name: 'Pillars',
    ammo: ['zoomer', 'zoomer', 'boulder'],
    build: (b) => {
      for (const x of [20, 23, 26]) b.post(x, 0, 3.6, 'stone');
      b.beam(19.7, 22.99, 3.6);
      b.beam(23.01, 26.3, 3.6);
      b.enemy(21.4, 4);
      b.enemy(24.6, 4);
      b.enemy(24.5, 0);
    },
  },
  {
    name: 'Twin Dunes',
    ammo: ['triple', 'zoomer', 'boulder'],
    build: (b) => {
      const g1 = b.rock(19, 24, 1.5);
      const g2 = b.rock(27, 32, 2.5);
      b.frame(20, 23, g1);
      b.enemy(21.5, g1);
      b.frame(28, 31, g2, 2.4, 'stone', 'wood');
      b.enemy(29.5, g2);
    },
  },
  {
    name: 'Bunker',
    ammo: ['boulder', 'zoomer', 'pebble'],
    build: (b) => {
      b.frame(20, 25, 0, 2, 'stone', 'stone');
      b.enemy(21.5, 0);
      b.enemy(23.5, 0);
      b.block(22.5, 2.4, 1);
      b.enemy(22.5, 3.4);
    },
  },
  {
    name: 'Storeroom',
    ammo: ['zoomer', 'triple', 'boulder'],
    build: (b) => {
      const t = b.frame(20, 26, 0, 2.6, 'stone', 'wood');
      b.tnt(21.4, 0);
      b.enemy(23, 0, 1);
      b.tnt(24.6, 0);
      b.frame(21, 25, t, 2);
      b.enemy(23, t);
    },
  },
  {
    name: 'Mixed Towers',
    ammo: ['zoomer', 'boulder', 'triple', 'pebble'],
    build: (b) => {
      const a = b.frame(19, 22, 0, 2.4, 'stone', 'wood');
      b.enemy(20.5, 0);
      b.frame(19.2, 21.8, a, 2, 'wood');
      b.enemy(20.5, a);
      const c = b.frame(25, 28, 0, 2.4, 'wood', 'stone');
      b.enemy(26.5, 0);
      b.frame(25.2, 27.8, c, 2, 'ice');
      b.enemy(26.5, c);
    },
  },
  {
    name: 'Desert Throne',
    ammo: ['boulder', 'boulder', 'zoomer', 'triple'],
    build: (b) => {
      b.frame(20, 23, 0, 2.4, 'stone');
      b.enemy(21.5, 0);
      const t = b.frame(24, 29, 0, 3, 'stone', 'stone');
      b.enemy(26.5, 0, 2);
      b.block(25, t, 1, 'wood');
      b.block(28, t, 1, 'wood');
      b.enemy(26.5, t);
      b.frame(30, 33, 0, 2.4, 'stone');
      b.enemy(31.5, 0);
    },
  },
];

const W3: Def[] = [
  {
    name: 'Ice Spire',
    ammo: ['kaboom', 'pebble', 'pebble'],
    build: (b) => {
      let y = 0;
      for (let f = 0; f < 3; f++) {
        const top = b.frame(21, 23.6, y, 2, 'ice');
        b.enemy(22.3, y);
        y = top;
      }
    },
  },
  {
    name: 'Cold Storage',
    ammo: ['kaboom', 'zoomer', 'pebble'],
    build: (b) => {
      b.frame(20, 23, 0, 2.4, 'stone', 'ice');
      b.enemy(21.5, 0);
      b.tnt(24.2, 0);
      b.frame(25.4, 28.4, 0, 2.4, 'ice', 'stone');
      b.enemy(26.9, 0);
    },
  },
  {
    name: 'High Ledge',
    ammo: ['triple', 'kaboom', 'boulder'],
    build: (b) => {
      const g = b.rock(23, 31, 3.5);
      const t = b.frame(24, 27, g, 2.4, 'ice');
      b.enemy(25.5, g);
      b.enemy(25.5, t);
      b.frame(28, 30.6, g, 2.4, 'ice');
      b.enemy(29.3, g);
    },
  },
  {
    name: 'Frozen Bridge',
    ammo: ['kaboom', 'kaboom', 'zoomer'],
    build: (b) => {
      const l = b.frame(19, 22, 0, 3, 'stone', 'ice');
      const r = b.frame(26, 29, 0, 3, 'stone', 'ice');
      b.beam(21.6, 26.4, Math.max(l, r), 'wood');
      b.enemy(24, Math.max(l, r) + P);
      b.enemy(20.5, 0);
      b.enemy(27.5, 0);
    },
  },
  {
    name: 'Glass Windows',
    ammo: ['kaboom', 'boulder', 'zoomer'],
    build: (b) => {
      const t = b.frame(20, 26, 0, 2.4, 'stone', 'stone');
      b.post(23, 0, 2.4, 'ice');
      b.enemy(21.6, 0);
      b.enemy(24.4, 0);
      b.frame(21, 25, t, 2, 'ice', 'ice');
      b.enemy(23, t, 1);
    },
  },
  {
    name: 'Tall Order',
    ammo: ['kaboom', 'triple', 'boulder', 'pebble'],
    build: (b) => {
      let y = 0;
      const mats: Mat[] = ['stone', 'wood', 'ice'];
      for (let f = 0; f < 3; f++) {
        const top = b.frame(21, 23.8, y, 2.2, mats[f]);
        if (f === 0) {
          b.tnt(21.9, 0);
          b.enemy(22.9, 0);
        } else b.enemy(22.4, y);
        y = top;
      }
    },
  },
  {
    name: 'Snow Village',
    ammo: ['triple', 'triple', 'kaboom', 'zoomer'],
    build: (b) => {
      [18, 21.2, 24.4, 27.6, 30.8].forEach((x, k) => {
        b.frame(x, x + 2.8, 0, 2, k % 2 ? 'ice' : 'wood');
        b.enemy(x + 1.4, 0);
      });
    },
  },
  {
    name: 'Crystal Pyramid',
    ammo: ['boulder', 'kaboom', 'zoomer'],
    build: (b) => {
      const top = b.pyramid(20, 0, 5, 1, 'ice');
      b.enemy(22.5, top, 2);
      b.enemy(26.2, 0);
    },
  },
  {
    name: 'Peaks',
    ammo: ['kaboom', 'zoomer', 'triple', 'boulder'],
    build: (b) => {
      const g1 = b.rock(19, 23, 2);
      const g2 = b.rock(26, 31, 3.2);
      const t = b.frame(19.5, 22.5, g1, 2.4, 'ice', 'stone');
      b.enemy(21, g1);
      b.enemy(21, t);
      b.frame(27, 30, g2, 2.4, 'stone', 'ice');
      b.enemy(28.5, g2, 1);
    },
  },
  {
    name: 'Glacier Citadel',
    ammo: ['kaboom', 'kaboom', 'boulder', 'zoomer', 'triple'],
    build: (b) => {
      const l = b.frame(18, 21, 0, 2.4, 'stone', 'ice');
      b.enemy(19.5, 0);
      b.frame(18.2, 20.8, l, 2, 'ice');
      b.enemy(19.5, l);
      const m = b.frame(22, 27, 0, 3, 'stone', 'stone');
      b.tnt(23.2, 0);
      b.enemy(24.8, 0, 2);
      b.frame(23, 26, m, 2.2, 'ice', 'wood');
      b.enemy(24.5, m, 1);
      const r = b.frame(28, 31, 0, 2.4, 'stone', 'ice');
      b.enemy(29.5, 0);
      b.frame(28.2, 30.8, r, 2, 'ice');
      b.enemy(29.5, r);
    },
  },
];

export const WORLDS = ['Meadow Fort', 'Desert Ruins', 'Glacier Citadel'];
export const PER_WORLD = 10;
const DEFS = [...W1, ...W2, ...W3];
export const LEVEL_COUNT = DEFS.length;

export function level(index: number): Level {
  const d = DEFS[index];
  const b = new Build();
  d.build(b);
  return { index, world: Math.floor(index / PER_WORLD), name: d.name, pieces: b.pieces, ammo: d.ammo.slice() };
}

/** Right-hand edge of everything in a level (for the camera). */
export function levelRight(l: Level): number {
  let x = 24;
  for (const p of l.pieces) x = Math.max(x, p.x + (p.t === 'enemy' ? ENEMY_R[p.size] : p.w / 2));
  return x + 3;
}
