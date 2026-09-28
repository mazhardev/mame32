import { describe, expect, it } from 'vitest';
import { createRng } from '@/utils/random';
import { E, N, S, SIZES, W, current, flooded, generate, isSolved, looseEnds, minClicks, rotate, scramble, symmetry } from './engine';

describe('pipe tiles', () => {
  it('rotates openings clockwise', () => {
    expect(rotate(N, 1)).toBe(E);
    expect(rotate(N | E, 1)).toBe(E | S);
    expect(rotate(W, 1)).toBe(N);
    expect(rotate(N | S, 1)).toBe(E | W);
    expect(rotate(N | E, 4)).toBe(N | E);
    expect(rotate(N | E, -1)).toBe(W | N);
  });

  it('knows which tiles look the same when turned', () => {
    expect(symmetry(N | S)).toBe(2);
    expect(symmetry(N | E | S | W)).toBe(1);
    expect(symmetry(N)).toBe(4);
    expect(symmetry(N | E)).toBe(4);
  });
});

describe('pipe puzzles', () => {
  it('generates spanning trees: solved networks reach every tile with no loose ends', () => {
    for (const n of Object.values(SIZES)) {
      for (let seed = 0; seed < 8; seed++) {
        const p = generate(n, createRng(`pipe-${n}-${seed}`).next);
        const solved = p.solution;
        expect(flooded(n, p.source, solved).size).toBe(n * n);
        expect(looseEnds(n, solved)).toBe(0);
        // A tree on n² tiles has exactly n² − 1 connections.
        const openings = solved.reduce((s, m) => s + ((m & 1) + ((m >> 1) & 1) + ((m >> 2) & 1) + ((m >> 3) & 1)), 0);
        expect(openings).toBe(2 * (n * n - 1));
        expect(solved.every((m) => m !== 15 && m !== 0)).toBe(true);
      }
    }
  });

  it('scrambles into an unsolved position and counts the clicks back', () => {
    const p = generate(5, createRng('scramble').next);
    const turns = scramble(p, createRng('t').next);
    expect(isSolved(p, turns)).toBe(false);
    const clicks = minClicks(p, turns);
    // Applying exactly the minimal clicks per tile solves it.
    const fixed = turns.map((t, i) => {
      const sym = symmetry(p.solution[i]);
      const off = ((t % sym) + sym) % sym;
      return t + (off === 0 ? 0 : sym - off);
    });
    expect(fixed.reduce((s, t, i) => s + t - turns[i], 0)).toBe(clicks);
    expect(isSolved(p, fixed)).toBe(true);
    expect(current(p, fixed)).toEqual(p.solution);
  });
});
