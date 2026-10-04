import { describe, expect, it } from 'vitest';
import { consistent, generate, options, uniqueAnswer } from './engine';

function rng(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
}

describe('balance puzzle', () => {
  it('finds every weighting that balances the clues', () => {
    // 1 A = 2 B with weights up to 4: (2,1) and (4,2).
    const ws = consistent([{ left: [1, 0], right: [0, 2] }], 2, 4);
    expect(ws).toEqual([
      [2, 1],
      [4, 2],
    ]);
    // How many B balance 2 A? Always 4.
    expect(uniqueAnswer([{ left: [1, 0], right: [0, 2] }], [2, 0], 1, 2, 4)).toBe(4);
  });

  it('generates puzzles whose clues pin down the answer', () => {
    const random = rng(99);
    for (const level of ['easy', 'normal', 'hard'] as const) {
      for (let i = 0; i < 8; i++) {
        const p = generate(level, random);
        const max = level === 'easy' ? 6 : 9;
        expect(uniqueAnswer(p.clues, p.ask, p.unit, p.shapes, max)).toBe(p.answer);
        // The real weights satisfy every clue.
        for (const c of p.clues) {
          const w = (pan: number[]) => pan.reduce((a, n, k) => a + n * p.weights[k], 0);
          expect(w(c.left)).toBe(w(c.right));
        }
      }
    }
  });

  it('offers four options including the answer', () => {
    const o = options(3, rng(1));
    expect(o).toHaveLength(4);
    expect(o).toContain(3);
    o.forEach((v) => expect(v).toBeGreaterThan(0));
  });
});
