import { describe, expect, it } from 'vitest';
import { allCandidates, clueText, countSolutions, emptyMarks, generate, holds, marksSolve } from './engine';

function rng(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
}

describe('logic grid', () => {
  it('enumerates every assignment', () => {
    expect(allCandidates(3, 3)).toHaveLength(36);
    expect(allCandidates(4, 3)).toHaveLength(576);
  });

  it('evaluates clue kinds', () => {
    const p = [[0, 1, 2], [2, 0, 1], [0, 1, 2]];
    expect(holds(p, { kind: 'same', a: { cat: 0, item: 0 }, b: { cat: 1, item: 2 } }, 2)).toBe(true);
    expect(holds(p, { kind: 'diff', a: { cat: 0, item: 0 }, b: { cat: 1, item: 0 } }, 2)).toBe(true);
    expect(holds(p, { kind: 'older', a: { cat: 0, item: 2 }, b: { cat: 0, item: 0 } }, 2)).toBe(true);
    expect(holds(p, { kind: 'either', a: { cat: 0, item: 0 }, b: { cat: 1, item: 2 }, c: { cat: 1, item: 1 } }, 2)).toBe(true);
  });

  it('generates puzzles with exactly one solution and no redundant clues', () => {
    const random = rng(17);
    for (const level of ['easy', 'normal', 'hard'] as const) {
      const p = generate(level, random);
      expect(countSolutions(p)).toBe(1);
      for (let i = 0; i < p.clues.length; i++) {
        expect(countSolutions({ ...p, clues: p.clues.filter((_, j) => j !== i) })).toBeGreaterThan(1);
      }
      p.clues.forEach((c) => expect(clueText(p.categories, c)).toMatch(/^[A-Z].*\.$/));
    }
  });

  it('accepts only the correct ticks', () => {
    const p = generate('easy', rng(5));
    const marks = emptyMarks(p.n, p.categories.length);
    expect(marksSolve(p, marks)).toBe(false);
    for (let person = 0; person < p.n; person++) for (let c = 1; c < p.categories.length; c++) marks[person][c][p.solution[c][person]] = 2;
    expect(marksSolve(p, marks)).toBe(true);
  });
});
