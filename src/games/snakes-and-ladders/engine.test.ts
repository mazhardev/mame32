import { describe, expect, it } from 'vitest';
import { cellOf, jumpsFor, step } from './engine';

describe('snakes and ladders', () => {
  it('climbs ladders and slides down snakes', () => {
    expect(step(1, 2, 'normal')).toEqual({ landing: 3, final: 22, kind: 'ladder' });
    expect(step(14, 3, 'normal')).toEqual({ landing: 17, final: 4, kind: 'snake' });
    expect(step(10, 3, 'normal')).toEqual({ landing: 13, final: 13, kind: null });
  });

  it('handles rolls past 100 differently per difficulty', () => {
    expect(step(97, 5, 'easy').final).toBe(100);
    expect(step(97, 5, 'normal')).toEqual({ landing: 97, final: 97, kind: 'blocked' });
    expect(step(97, 3, 'normal').final).toBe(100);
    // 97 + 6 = 103 bounces back to 97.
    expect(step(97, 6, 'hard')).toMatchObject({ landing: 97, kind: 'bounce' });
  });

  it('never chains one jump into another', () => {
    for (const level of ['easy', 'normal', 'hard'] as const) {
      const jumps = jumpsFor(level);
      for (const to of Object.values(jumps)) expect(jumps[to]).toBeUndefined();
      expect(jumps[100]).toBeUndefined();
    }
  });

  it('maps squares onto a zig-zag board', () => {
    expect(cellOf(1)).toEqual({ row: 9, col: 0 });
    expect(cellOf(10)).toEqual({ row: 9, col: 9 });
    expect(cellOf(11)).toEqual({ row: 8, col: 9 });
    expect(cellOf(100)).toEqual({ row: 0, col: 0 });
  });
});
