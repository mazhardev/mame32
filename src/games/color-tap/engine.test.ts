import { describe, expect, it } from 'vitest';
import { makeRound, pointsFor } from './engine';

describe('color tap', () => {
  it('always offers the target among the options', () => {
    let seed = 3;
    const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (const level of ['easy', 'normal', 'hard'] as const) {
      for (let i = 0; i < 50; i++) {
        const r = makeRound(level, i, random);
        expect(r.options).toContain(r.target);
        expect(new Set(r.options).size).toBe(r.options.length);
      }
    }
  });

  it('easy ink always matches and hard ink never does', () => {
    let seed = 9;
    const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 30; i++) {
      const e = makeRound('easy', 0, random);
      expect(e.ink).toBe(e.target);
      const h = makeRound('hard', 0, random);
      expect(h.ink).not.toBe(h.target);
    }
  });

  it('the window shrinks with the streak and speed earns points', () => {
    expect(makeRound('normal', 20, () => 0.5).time).toBeLessThan(makeRound('normal', 0, () => 0.5).time);
    expect(pointsFor(1, 1)).toBeGreaterThan(pointsFor(1, 0));
  });
});
