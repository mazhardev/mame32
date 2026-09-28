import { describe, expect, it } from 'vitest';
import { createRng } from '@/utils/random';
import { LEVELS, edge, extend, generate, isComplete, nextDot } from './engine';
import type { Puzzle } from './engine';

/** A hand-made 3×3 puzzle: 1 top-left, 2 top-right, 3 bottom-left (serpentine). */
const tiny: Puzzle = { n: 3, dots: [1, 0, 2, 0, 0, 0, 3, 0, 0], walls: [edge(4, 7)], total: 3 };

describe('connect the dots rules', () => {
  it('must start on dot 1', () => {
    expect(extend(tiny, [], 1)).toBeNull();
    expect(extend(tiny, [], 0)).toEqual([0]);
  });

  it('moves only to adjacent squares through open edges', () => {
    expect(extend(tiny, [0], 4)).toBeNull(); // diagonal
    expect(extend(tiny, [0, 1, 4], 7)).toBeNull(); // wall between 4 and 7
    expect(extend(tiny, [0], 1)).toEqual([0, 1]);
  });

  it('visits the dots in order', () => {
    // From 3 (bottom-left) you cannot reach dot 3 before dot 2.
    expect(extend(tiny, [0, 3], 6)).toBeNull();
    expect(nextDot(tiny, [0, 1, 2])).toBe(3);
  });

  it('retracts or cuts back when stepping onto the line', () => {
    expect(extend(tiny, [0, 1, 2], 1)).toEqual([0, 1]);
    expect(extend(tiny, [0, 1, 2, 5], 0)).toEqual([0]);
  });

  it('completes only when every square is covered and the line ends on the last dot', () => {
    const solution = [0, 1, 2, 5, 4, 3, 6];
    expect(isComplete(tiny, solution)).toBe(false); // squares 7 and 8 missed
    const full: Puzzle = { ...tiny, dots: [1, 0, 2, 0, 0, 0, 0, 0, 3], walls: [] };
    let path: number[] = [];
    for (const c of [0, 1, 2, 5, 4, 3, 6, 7, 8]) path = extend(full, path, c)!;
    expect(isComplete(full, path)).toBe(true);
  });

  it('generates puzzles whose hidden route obeys every rule', () => {
    for (const level of Object.values(LEVELS)) {
      for (let seed = 0; seed < 10; seed++) {
        const p = generate(level, createRng(`ctd-${level.n}-${seed}`).next);
        expect(p.total).toBe(level.dots);
        expect(p.walls).toHaveLength(level.walls);
        // Solve by following the dots with a depth-first search.
        const solve = (path: number[]): number[] | null => {
          if (isComplete(p, path)) return path;
          const end = path[path.length - 1];
          for (const c of [end - 1, end + 1, end - p.n, end + p.n]) {
            if (c < 0 || c >= p.n * p.n || path.includes(c)) continue;
            const next = extend(p, path, c);
            if (!next || next.length !== path.length + 1) continue;
            const done = solve(next);
            if (done) return done;
          }
          return null;
        };
        if (level.n <= 6) expect(solve([p.dots.indexOf(1)])).not.toBeNull();
      }
    }
  });
});
