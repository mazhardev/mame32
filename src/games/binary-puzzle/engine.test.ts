import { describe, expect, it } from 'vitest';
import { conflicts, countSolutions, generate, isSolved, randomSolution } from './engine';
import type { Grid } from './engine';

function rng(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
}

describe('binary puzzle', () => {
  it('detects triples, unbalanced lines and duplicate lines', () => {
    const triple: Grid = [0, 0, 0, 1, -1, -1, ...Array(30).fill(-1)];
    expect(conflicts(triple, 6).has(0)).toBe(true);
    const row: Grid = [0, 1, 0, 1, 0, 1];
    const dup: Grid = [...row, ...row, ...Array(24).fill(-1)];
    expect(conflicts(dup, 6).size).toBeGreaterThan(0);
  });

  it('builds valid full solutions', () => {
    for (const n of [6, 8]) {
      const g = randomSolution(n, rng(n));
      expect(isSolved(g, n)).toBe(true);
    }
  });

  it('generates puzzles with exactly one solution that matches', () => {
    const p = generate(6, rng(42));
    expect(countSolutions(p.givens, 6)).toBe(1);
    expect(p.givens.filter((c) => c !== -1).length).toBeLessThan(36);
    p.givens.forEach((c, i) => c !== -1 && expect(c).toBe(p.solution[i]));
  });

  it('generates a 10×10 quickly', () => {
    const t = performance.now();
    const p = generate(10, rng(7));
    expect(countSolutions(p.givens, 10)).toBe(1);
    expect(performance.now() - t).toBeLessThan(4000);
  });
});
