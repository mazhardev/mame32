import { describe, expect, it } from 'vitest';
import { createRng } from '@/utils/random';
import {
  isSolvable,
  isSolved,
  manhattan,
  scoreFor,
  shuffleTiles,
  slideDirection,
  slideFrom,
  solvedTiles,
  validSave,
} from './engine';

describe('sliding puzzle rules', () => {
  it('recognises the solved layout', () => {
    expect(isSolved(solvedTiles(3))).toBe(true);
    expect(isSolved([1, 2, 3, 4, 5, 6, 7, 0, 8])).toBe(false);
    expect(manhattan(solvedTiles(4), 4)).toBe(0);
  });

  it('slides a whole line of tiles towards the gap', () => {
    // Gap in the bottom-right; tapping the bottom-left tile moves the row right.
    const start = solvedTiles(3);
    expect(slideFrom(start, 3, 6)).toEqual([1, 2, 3, 4, 5, 6, 0, 7, 8]);
    // Tapping the top-right tile moves the column down.
    expect(slideFrom(start, 3, 2)).toEqual([1, 2, 0, 4, 5, 3, 7, 8, 6]);
  });

  it('refuses tiles that are not in line with the gap', () => {
    expect(slideFrom(solvedTiles(3), 3, 0)).toBeNull();
    expect(slideFrom(solvedTiles(3), 3, 8)).toBeNull();
  });

  it('moves the neighbouring tile in the arrow direction', () => {
    const start = solvedTiles(3);
    expect(slideDirection(start, 3, 'right')).toEqual([1, 2, 3, 4, 5, 6, 7, 0, 8]);
    expect(slideDirection(start, 3, 'down')).toEqual([1, 2, 3, 4, 5, 0, 7, 8, 6]);
    // Nothing to the right of or below a bottom-right gap.
    expect(slideDirection(start, 3, 'left')).toBeNull();
    expect(slideDirection(start, 3, 'up')).toBeNull();
  });

  it('applies the parity rule for odd and even boards', () => {
    expect(isSolvable(solvedTiles(3), 3)).toBe(true);
    expect(isSolvable(solvedTiles(4), 4)).toBe(true);
    // Swapping two tiles makes any board unsolvable.
    const swapped3 = solvedTiles(3);
    [swapped3[0], swapped3[1]] = [swapped3[1], swapped3[0]];
    expect(isSolvable(swapped3, 3)).toBe(false);
    const swapped4 = solvedTiles(4);
    [swapped4[13], swapped4[14]] = [swapped4[14], swapped4[13]];
    expect(isSolvable(swapped4, 4)).toBe(false);
  });

  it('only ever produces solvable, unsolved shuffles', () => {
    for (const n of [3, 4, 5]) {
      for (let seed = 0; seed < 20; seed++) {
        const tiles = shuffleTiles(n, createRng(`${n}-${seed}`).next);
        expect(new Set(tiles).size).toBe(n * n);
        expect(isSolvable(tiles, n)).toBe(true);
        expect(isSolved(tiles)).toBe(false);
      }
    }
  });

  it('scores fewer moves and less time higher, never below 100', () => {
    expect(scoreFor(4, 80, 60_000)).toBeGreaterThan(scoreFor(4, 120, 60_000));
    expect(scoreFor(4, 80, 30_000)).toBeGreaterThan(scoreFor(4, 80, 90_000));
    expect(scoreFor(3, 9999, 9_999_000)).toBe(100);
  });

  it('validates saved games, rejecting corrupt or unsolvable boards', () => {
    const tiles = shuffleTiles(3, createRng(1).next);
    expect(validSave({ n: 3, tiles, moves: 4, ms: 1000 })).toBe(true);
    expect(validSave({ n: 3, tiles: tiles.slice(1), moves: 4, ms: 1000 })).toBe(false);
    expect(validSave({ n: 6, tiles, moves: 4, ms: 1000 })).toBe(false);
    expect(validSave({ n: 3, tiles: [1, 1, 2, 3, 4, 5, 6, 7, 0], moves: 0, ms: 0 })).toBe(false);
    expect(validSave({ n: 3, tiles: [2, 1, 3, 4, 5, 6, 7, 8, 0], moves: 0, ms: 0 })).toBe(false);
    expect(validSave(null)).toBe(false);
  });
});
