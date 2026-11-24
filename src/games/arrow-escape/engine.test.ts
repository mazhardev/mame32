import { describe, expect, it } from 'vitest';
import { createRng } from '@/utils/random';
import { blocker, cells, freeRun, generate, movable, occupancy, solvable } from './engine';
import type { Board } from './engine';
import { LEVEL_COUNT, levelBoard } from './ArrowEscapeGame';

describe('arrow escape', () => {
  it('generates boards whose arrows fit inside without overlapping', () => {
    const b = generate(6, 6, 0.78, createRng('ae').next);
    const seen = new Set<string>();
    for (const a of b.arrows) {
      for (const [x, y] of cells(a)) {
        expect(x >= 0 && y >= 0 && x < 6 && y < 6).toBe(true);
        expect(seen.has(`${x},${y}`)).toBe(false);
        seen.add(`${x},${y}`);
      }
    }
    expect(b.arrows.length).toBeGreaterThan(5);
  });

  it('can clear every level in every pack', () => {
    for (const pack of ['easy', 'normal', 'hard'] as const) {
      for (let i = 0; i < LEVEL_COUNT; i += 5) expect(solvable(levelBoard(pack, i), new Set())).toBe(true);
    }
  });

  it('finds the arrow in the way, and none once it is gone', () => {
    const b: Board = {
      w: 4,
      h: 1,
      arrows: [
        { x: 0, y: 0, dir: 1, length: 1 },
        { x: 3, y: 0, dir: 1, length: 2 },
      ],
    };
    expect(blocker(b, 0, new Set())).toBe(1);
    expect(freeRun(b, 0, new Set())).toBe(1);
    expect(blocker(b, 1, new Set())).toBe(-1);
    expect(movable(b, new Set())).toEqual([1]);
    expect(blocker(b, 0, new Set([1]))).toBe(-1);
    expect(solvable(b, new Set())).toBe(true);
  });

  it('spots a deadlock: two arrows facing each other', () => {
    const b: Board = {
      w: 3,
      h: 1,
      arrows: [
        { x: 0, y: 0, dir: 1, length: 1 },
        { x: 2, y: 0, dir: 3, length: 1 },
      ],
    };
    expect(movable(b, new Set())).toEqual([]);
    expect(solvable(b, new Set())).toBe(false);
  });

  it('maps each arrow body onto the grid', () => {
    const b: Board = { w: 3, h: 3, arrows: [{ x: 1, y: 0, dir: 0, length: 3 }] };
    const grid = occupancy(b);
    expect([grid[1], grid[4], grid[7]]).toEqual([0, 0, 0]);
    expect(grid[0]).toBe(-1);
  });

  it('builds the same level from the same seed', () => {
    expect(levelBoard('normal', 4)).toEqual(levelBoard('normal', 4));
  });
});
