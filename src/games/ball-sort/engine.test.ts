import { describe, expect, it } from 'vitest';
import { createRng } from '@/utils/random';
import {
  CAPACITY,
  LEVELS,
  canMove,
  generate,
  isSolved,
  moveBall,
  solve,
  sortedCount,
  validSave,
} from './engine';
import type { Tubes } from './engine';

describe('ball sort rules', () => {
  it('moves only onto an empty tube or a matching top ball', () => {
    const tubes: Tubes = [[0, 1], [1], [0, 0, 0, 1], []];
    expect(canMove(tubes, 0, 1)).toBe(true); // 1 onto 1
    expect(canMove(tubes, 1, 0)).toBe(true);
    expect(canMove(tubes, 0, 3)).toBe(true); // into empty
    expect(canMove(tubes, 1, 2)).toBe(false); // tube 2 is full
    expect(canMove(tubes, 3, 0)).toBe(false); // empty source
    expect(moveBall(tubes, 0, 1)).toEqual([[0], [1, 1], [0, 0, 0, 1], []]);
  });

  it('moves exactly one ball at a time', () => {
    const tubes: Tubes = [[0, 1, 1], [], [0, 0, 0, 1], [1]];
    expect(moveBall(tubes, 0, 1)).toEqual([[0, 1], [1], [0, 0, 0, 1], [1]]);
  });

  it('recognises sorted racks', () => {
    expect(isSolved([[0, 0, 0, 0], [], [1, 1, 1, 1]])).toBe(true);
    expect(isSolved([[0, 0, 0], [0], [1, 1, 1, 1]])).toBe(false);
    expect(sortedCount([[0, 0, 0, 0], [1, 1, 1, 0], []])).toBe(1);
  });

  it('only deals puzzles the solver can finish, and its solutions are legal', () => {
    for (const lv of Object.values(LEVELS)) {
      for (let seed = 0; seed < 8; seed++) {
        const tubes = generate(lv.colors, lv.empty, createRng(`bs-${lv.colors}-${seed}`).next);
        expect(tubes).toHaveLength(lv.colors + lv.empty);
        expect(tubes.flat()).toHaveLength(lv.colors * CAPACITY);
        expect(isSolved(tubes)).toBe(false);
        const plan = solve(tubes)!;
        let board = tubes;
        for (const [from, to] of plan) {
          const next = moveBall(board, from, to);
          expect(next).not.toBeNull();
          board = next!;
        }
        expect(isSolved(board)).toBe(true);
      }
    }
  });

  it('reports dead ends as unsolvable', () => {
    // Two colours interleaved with no free space at all.
    expect(solve([[0, 1, 0, 1], [1, 0, 1, 0]])).toBeNull();
  });

  it('validates saves', () => {
    const tubes = generate(4, 2, createRng(3).next);
    const good = { tubes, colors: 4, moves: 2, hints: 0, undos: 1, extraTube: false };
    expect(validSave(good)).toBe(true);
    expect(validSave({ ...good, colors: 5 })).toBe(false);
    expect(validSave({ ...good, tubes: [...tubes.slice(0, -1), [9]] })).toBe(false);
    expect(validSave({ ...good, moves: -1 })).toBe(false);
    expect(validSave({ ...good, tubes: [[0, 0, 0, 0], [1, 1, 1, 1], [2, 2, 2, 2], [3, 3, 3, 3], [], []] })).toBe(false);
  });
});
