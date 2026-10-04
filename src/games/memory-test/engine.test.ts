import { describe, expect, it } from 'vitest';
import { complete, failed, gridSize, makePattern, tap } from './engine';

describe('memory test', () => {
  it('grows the grid and the pattern with the level', () => {
    expect(gridSize(1)).toBe(3);
    expect(gridSize(4)).toBe(4);
    expect(gridSize(100)).toBe(7);
    const p = makePattern(5, Math.random);
    expect(new Set(p).size).toBe(7);
    p.forEach((c) => expect(c).toBeLessThan(gridSize(5) ** 2));
  });

  it('counts hits, ignores repeats and fails after three misses', () => {
    const a = { found: [], wrong: [] };
    const pattern = [0, 4];
    expect(tap(pattern, a, 0)).toBe('hit');
    expect(tap(pattern, a, 0)).toBe('repeat');
    expect(tap(pattern, a, 1)).toBe('miss');
    expect(tap(pattern, a, 2)).toBe('miss');
    expect(failed(a)).toBe(false);
    expect(tap(pattern, a, 4)).toBe('hit');
    expect(complete(pattern, a)).toBe(true);
    tap(pattern, a, 3);
    expect(failed(a)).toBe(true);
  });
});
