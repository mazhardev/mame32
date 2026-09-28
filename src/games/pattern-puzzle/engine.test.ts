import { describe, expect, it } from 'vitest';
import { createRng } from '@/utils/random';
import { LEVELS, correctCount, generate, makeTarget, matches, shift } from './engine';

describe('pattern puzzle moves', () => {
  const grid = [0, 1, 2, 3, 4, 5, 6, 7, 8];

  it('slides rows with wrap-around', () => {
    expect(shift(grid, 3, { axis: 'row', index: 0, by: 1 })).toEqual([2, 0, 1, 3, 4, 5, 6, 7, 8]);
    expect(shift(grid, 3, { axis: 'row', index: 2, by: -1 })).toEqual([0, 1, 2, 3, 4, 5, 7, 8, 6]);
  });

  it('slides columns with wrap-around', () => {
    expect(shift(grid, 3, { axis: 'col', index: 1, by: 1 })).toEqual([0, 7, 2, 3, 1, 5, 6, 4, 8]);
    expect(shift(grid, 3, { axis: 'col', index: 0, by: -1 })).toEqual([3, 1, 2, 6, 4, 5, 0, 7, 8]);
  });

  it('undoes a slide with the opposite slide', () => {
    const moved = shift(grid, 3, { axis: 'col', index: 2, by: 2 });
    expect(shift(moved, 3, { axis: 'col', index: 2, by: -2 })).toEqual(grid);
  });
});

describe('pattern puzzle generation', () => {
  it('makes symmetric targets using every colour', () => {
    for (const { n, colors } of Object.values(LEVELS)) {
      const t = makeTarget(n, colors, createRng(n).next);
      expect(new Set(t).size).toBe(colors);
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) expect(t[r * n + c]).toBe(t[r * n + (n - 1 - c)]);
    }
  });

  it('scrambles into an unsolved position with the same tiles', () => {
    for (const diff of ['easy', 'normal', 'hard'] as const) {
      for (let seed = 0; seed < 10; seed++) {
        const { n, target, grid } = generate(diff, `pp-${seed}`);
        expect(matches(grid, target)).toBe(false);
        expect(correctCount(grid, target)).toBeLessThanOrEqual(n * n * 0.7);
        expect([...grid].sort()).toEqual([...target].sort());
      }
    }
  });
});
