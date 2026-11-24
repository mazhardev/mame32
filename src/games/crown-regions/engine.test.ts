import { describe, expect, it } from 'vitest';
import { createRng } from '@/utils/random';
import { CROWN, EMPTY, MARK, borders, conflicts, countSolutions, cycle, generate, hint, isSolved } from './engine';
import type { Cell } from './engine';
import { LEVEL_COUNT, SIZES, levelPuzzle } from './CrownRegionsGame';

const solved = (p: ReturnType<typeof generate>): Cell[] => {
  const cells = new Array<Cell>(p.n * p.n).fill(EMPTY);
  p.solution.forEach((c, r) => (cells[r * p.n + c] = CROWN));
  return cells;
};

describe('crown regions', () => {
  it('generates puzzles with exactly one solution, and regions that each hold one crown', () => {
    for (const n of [6, 7, 8]) {
      const p = generate(n, createRng(`t-${n}`).next);
      expect(countSolutions(n, p.regions, 5)).toBe(1);
      expect(new Set(p.regions).size).toBe(n);
      expect(new Set(p.solution).size).toBe(n);
      const regionOf = p.solution.map((c, r) => p.regions[r * n + c]);
      expect(new Set(regionOf).size).toBe(n);
      expect(isSolved(p, solved(p))).toBe(true);
    }
  });

  it('builds the same levels every time from their seeds', () => {
    expect(levelPuzzle(6, 3)).toEqual(levelPuzzle(6, 3));
    expect(levelPuzzle(6, 3).regions).not.toEqual(levelPuzzle(6, 4).regions);
  });

  it('keeps every region connected', () => {
    const p = levelPuzzle(SIZES.normal, 0);
    const { n } = p;
    for (let r = 0; r < n; r++) {
      const cells = p.regions.flatMap((v, i) => (v === r ? [i] : []));
      const seen = new Set([cells[0]]);
      const stack = [cells[0]];
      while (stack.length) {
        const i = stack.pop() as number;
        for (const j of [i - 1, i + 1, i - n, i + n]) {
          if (j < 0 || j >= n * n || seen.has(j) || p.regions[j] !== r) continue;
          if (Math.abs((j % n) - (i % n)) > 1) continue;
          seen.add(j);
          stack.push(j);
        }
      }
      expect(seen.size).toBe(cells.length);
    }
  });

  it('flags crowns in the same row, column or region, and crowns that touch', () => {
    const p = levelPuzzle(6, 0);
    const cells = new Array<Cell>(36).fill(EMPTY);
    cells[0] = CROWN;
    cells[7] = CROWN; // diagonal neighbour
    expect(conflicts(p, cells)).toEqual(new Set([0, 7]));
    const row = new Array<Cell>(36).fill(EMPTY);
    row[0] = CROWN;
    row[5] = CROWN;
    expect(conflicts(p, row).size).toBe(2);
    expect(isSolved(p, row)).toBe(false);
  });

  it('cycles a square through cross, crown and empty', () => {
    expect(cycle(EMPTY)).toBe(MARK);
    expect(cycle(MARK)).toBe(CROWN);
    expect(cycle(CROWN)).toBe(EMPTY);
  });

  it('hints a wrong crown first, then a missing one, and nothing once solved', () => {
    const p = levelPuzzle(6, 1);
    const cells = new Array<Cell>(36).fill(EMPTY);
    const wrong = p.solution[0] === 0 ? 1 : 0;
    cells[wrong] = CROWN;
    expect(hint(p, cells)).toEqual({ cell: wrong, kind: 'remove' });
    expect(hint(p, new Array<Cell>(36).fill(EMPTY))?.kind).toBe('place');
    expect(hint(p, solved(p))).toBeNull();
  });

  it('draws region borders on the outside edge', () => {
    const p = levelPuzzle(6, 2);
    expect(borders(p, 0).top && borders(p, 0).left).toBe(true);
    expect(borders(p, 35).bottom && borders(p, 35).right).toBe(true);
  });

  it('has thirty levels per size', () => {
    expect(LEVEL_COUNT).toBe(30);
  });
});
