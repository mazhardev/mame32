import { describe, expect, it } from 'vitest';
import { createRng } from '@/utils/random';
import { areAdjacent } from '../_shared/puzzle/hamilton';
import {
  LEVELS,
  advance,
  begin,
  connectedCount,
  generate,
  isConnected,
  isSolved,
  validSave,
} from './engine';
import type { Puzzle } from './engine';

// 3×3: flow 0 joins 0→6 down the left, flow 1 joins 1→8 around the rest.
const p: Puzzle = { n: 3, ends: [[0, 6], [1, 8]] };
const empty = () => [[], []] as number[][];

describe('flow connect rules', () => {
  it('starts drawing only from an endpoint or an existing pipe', () => {
    expect(begin(p, empty(), 4)).toBeNull();
    const started = begin(p, empty(), 0)!;
    expect(started.active).toBe(0);
    expect(started.paths[0]).toEqual([0]);
  });

  it('extends to adjacent squares and connects the pair', () => {
    let paths = begin(p, empty(), 0)!.paths;
    expect(advance(p, paths, 0, 4)).toBeNull(); // diagonal
    paths = advance(p, paths, 0, 3)!;
    paths = advance(p, paths, 0, 6)!;
    expect(isConnected(p, 0, paths[0])).toBe(true);
    // A finished pipe cannot keep growing.
    expect(advance(p, paths, 0, 7)).toBeNull();
  });

  it("never enters another flow's endpoint", () => {
    const paths = begin(p, empty(), 0)!.paths;
    expect(advance(p, paths, 0, 1)).toBeNull();
  });

  it('cuts another pipe it crosses, and retracts along its own', () => {
    let paths: number[][] = [[0], [1, 4, 3]];
    paths = advance(p, paths, 0, 3)!;
    expect(paths[0]).toEqual([0, 3]);
    expect(paths[1]).toEqual([1, 4]);
    paths = advance(p, [[0, 3, 4], [1]], 0, 3)!;
    expect(paths[0]).toEqual([0, 3]);
  });

  it('is solved only when every pair is joined and every square filled', () => {
    const joined = [[0, 3, 6], [1, 2, 5, 8]];
    expect(connectedCount(p, joined)).toBe(2);
    expect(isSolved(p, joined)).toBe(false); // 4 and 7 are empty
    expect(isSolved(p, [[0, 3, 6], [1, 2, 5, 4, 7, 8]])).toBe(true);
  });

  it('generates solvable puzzles with non-adjacent endpoints', () => {
    for (const level of Object.values(LEVELS)) {
      for (let seed = 0; seed < 10; seed++) {
        const puzzle = generate(level, createRng(`flow-${level.n}-${seed}`).next);
        expect(puzzle.ends).toHaveLength(level.flows);
        const cells = puzzle.ends.flat();
        expect(new Set(cells).size).toBe(cells.length);
        for (const [a, b] of puzzle.ends) expect(areAdjacent(a, b, level.n)).toBe(false);
      }
    }
  });

  it('validates saves', () => {
    const puzzle = generate(LEVELS.easy, createRng(1).next);
    const good = { puzzle, paths: puzzle.ends.map(() => []), moves: 0, ms: 0 };
    expect(validSave(good)).toBe(true);
    expect(validSave({ ...good, paths: [[99]] })).toBe(false);
    expect(validSave({ ...good, puzzle: { ...puzzle, n: 6 } })).toBe(false);
  });
});
