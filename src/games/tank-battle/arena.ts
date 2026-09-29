/**
 * Tank Battle arenas. Only the top half and the middle row are written out;
 * the bottom half is the top half rotated 180°, so every arena is fair for
 * both spawn points. '.' is open ground, 'B' is a brick wall that shells
 * destroy and 'S' is steel that shells bounce off.
 */
export const COLS = 20;
export const ROWS = 13;
export const TILE = 32;

export type Tile = 0 | 1 | 2;
export const EMPTY: Tile = 0;
export const BRICK: Tile = 1;
export const STEEL: Tile = 2;

const HALVES: { name: string; top: string[]; middle: string }[] = [
  {
    name: 'Crossfire',
    top: [
      '....................',
      '.BBB....B...........',
      '.B......B....SSS....',
      '.....SS.B...........',
      '..........BBB....B..',
      '...B.............B..',
    ],
    middle: '...B...SS..SS...B...',
  },
  {
    name: 'Fortress',
    top: [
      '....................',
      '..SSSS........B.....',
      '..........B...B.....',
      '.BB.......B.........',
      '.....BBBB.....SS....',
      '.........B..........',
    ],
    middle: '..B.B....SS....B.B..',
  },
  {
    name: 'Open Field',
    top: [
      '....................',
      '....................',
      '...SS.....B......B..',
      '...S......B.........',
      '......BB.......S....',
      '...............S....',
    ],
    middle: '.......B....B.......',
  },
];

export const ARENA_NAMES = HALVES.map((h) => h.name);
export const SPAWNS = [
  { x: 1, y: 6, angle: 0 },
  { x: COLS - 2, y: 6, angle: Math.PI },
];

const parse = (ch: string): Tile => (ch === 'B' ? BRICK : ch === 'S' ? STEEL : EMPTY);

/** Builds a fresh, mutable grid for arena `index` (grid[y][x]). */
export function buildArena(index: number): Tile[][] {
  const { top, middle } = HALVES[index % HALVES.length];
  const rows = [...top, middle, ...top.map((r) => [...r].reverse().join('')).reverse()];
  return rows.map((r) => [...r].map(parse));
}

export const ARENA_COUNT = HALVES.length;
