import { describe, expect, it } from 'vitest';
import { LEVELS_PER_PACK, PACKS, blocker, clearDepth, exitPath, generateLevel, stars } from './engine';
import type { Lot } from './engine';

// 3×3 lot: car 0 (cells 0,1) faces right into car 1 (cell 2, 5) which faces down.
const lot: Lot = {
  w: 3,
  h: 3,
  cars: [
    { cells: [0, 1], dir: 'right', color: 0 },
    { cells: [2, 5], dir: 'down', color: 1 },
  ],
  bollards: [],
};

describe('parking rules', () => {
  it('drives straight ahead to the edge', () => {
    expect(exitPath(lot, lot.cars[0])).toEqual([2]);
    expect(exitPath(lot, lot.cars[1])).toEqual([8]);
  });

  it('is blocked by cars still in the lot, then freed when they leave', () => {
    expect(blocker(lot, new Set([0, 1]), 0)).toBe(2);
    expect(blocker(lot, new Set([0, 1]), 1)).toBe(-1);
    expect(blocker(lot, new Set([0]), 0)).toBe(-1);
  });

  it('counts clearing rounds and detects deadlocks', () => {
    expect(clearDepth(lot)).toBe(2);
    const outward: Lot = {
      w: 2,
      h: 2,
      cars: [
        { cells: [0, 1], dir: 'right', color: 0 },
        { cells: [3, 2], dir: 'left', color: 1 },
      ],
      bollards: [],
    };
    // Both face outwards, so both leave in the first round.
    expect(clearDepth(outward)).toBe(1);
    // A car facing a bollard can never leave.
    const walled: Lot = { w: 3, h: 1, cars: [{ cells: [0, 1], dir: 'right', color: 0 }], bollards: [2] };
    expect(clearDepth(walled)).toBe(-1);
  });

  it('generates every level as clearable and stable', () => {
    for (const pack of ['easy', 'normal', 'hard'] as const) {
      for (let i = 0; i < LEVELS_PER_PACK; i++) {
        const a = generateLevel(pack, i);
        expect(clearDepth(a)).toBeGreaterThan(0);
        expect(a.w).toBe(PACKS[pack].w);
        const cells = a.cars.flatMap((c) => c.cells).concat(a.bollards);
        expect(new Set(cells).size).toBe(cells.length);
        expect(generateLevel(pack, i)).toEqual(a);
      }
    }
  });

  it('awards stars by dents', () => {
    expect(stars(0)).toBe(3);
    expect(stars(2)).toBe(2);
    expect(stars(5)).toBe(1);
  });
});
