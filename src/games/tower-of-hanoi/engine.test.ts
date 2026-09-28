import { describe, expect, it } from 'vitest';
import {
  canMove,
  initial,
  isSolved,
  minMoves,
  move,
  movesRemaining,
  nextOptimalMove,
  validPegs,
  validSave,
} from './engine';
import type { Pegs } from './engine';

describe('tower of hanoi rules', () => {
  it('starts with every disc on the left peg, largest at the bottom', () => {
    expect(initial(3)).toEqual([[3, 2, 1], [], []]);
    expect(minMoves(3)).toBe(7);
    expect(minMoves(7)).toBe(127);
  });

  it('never allows a larger disc on a smaller one', () => {
    const pegs: Pegs = [[3, 2], [1], []];
    expect(canMove(pegs, 0, 1)).toBe(false);
    expect(canMove(pegs, 1, 0)).toBe(true);
    expect(canMove(pegs, 0, 2)).toBe(true);
    expect(canMove(pegs, 2, 0)).toBe(false); // empty source
    expect(move(pegs, 0, 1)).toBeNull();
  });

  it('solves any size optimally by following the hint', () => {
    for (const discs of [1, 3, 5, 7]) {
      let pegs = initial(discs);
      let moves = 0;
      while (!isSolved(pegs, discs)) {
        const m = nextOptimalMove(pegs, discs)!;
        pegs = move(pegs, m[0], m[1])!;
        expect(pegs).not.toBeNull();
        moves++;
      }
      expect(moves).toBe(minMoves(discs));
    }
  });

  it('recovers optimally from a detour', () => {
    let pegs = initial(4);
    pegs = move(pegs, 0, 1)!; // the optimal opening for an even tower
    pegs = move(pegs, 1, 2)!; // then a wasted move
    const needed = movesRemaining(pegs, 4);
    let count = 0;
    while (!isSolved(pegs, 4)) {
      const m = nextOptimalMove(pegs, 4)!;
      pegs = move(pegs, m[0], m[1])!;
      count++;
    }
    expect(count).toBe(needed);
  });

  it('counts remaining moves from the start as the minimum', () => {
    expect(movesRemaining(initial(5), 5)).toBe(31);
    expect(movesRemaining([[], [], [3, 2, 1]], 3)).toBe(0);
    expect(nextOptimalMove([[], [], [3, 2, 1]], 3)).toBeNull();
  });

  it('validates peg layouts and saves', () => {
    expect(validPegs([[3, 1], [2], []], 3)).toBe(true);
    expect(validPegs([[1, 3], [2], []], 3)).toBe(false); // larger on smaller
    expect(validPegs([[3, 2], [2], []], 3)).toBe(false); // duplicate disc
    expect(validPegs([[3], [2], []], 3)).toBe(false); // missing disc
    expect(validSave({ discs: 3, pegs: [[3, 1], [2], []], moves: 3, hints: 0 })).toBe(true);
    expect(validSave({ discs: 3, pegs: [[], [], [3, 2, 1]], moves: 7, hints: 0 })).toBe(false);
    expect(validSave({ discs: 4, pegs: initial(4), moves: 0, hints: 0 })).toBe(false);
  });
});
