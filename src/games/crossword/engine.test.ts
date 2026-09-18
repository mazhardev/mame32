import { describe, expect, it } from 'vitest';
import { createRng } from '@/utils/random';
import { cellsOf, generate, isComplete } from './engine';
import { CLUES } from './clues';

describe('crossword generator', () => {
  it('clue answers are lowercase words', () => {
    for (const [a] of CLUES) expect(/^[a-z]{3,8}$/.test(a)).toBe(true);
    expect(new Set(CLUES.map((c) => c[0])).size).toBe(CLUES.length);
  });

  it.each([
    [9, 7],
    [11, 10],
    [13, 14],
  ])('builds a connected %i×%i puzzle', (size, target) => {
    for (let seed = 1; seed <= 5; seed++) {
      const p = generate(createRng(seed), CLUES, size, target);
      expect(p.entries.length).toBeGreaterThanOrEqual(Math.min(target, 6));
      // Every entry spells its answer in the grid.
      for (const e of p.entries) {
        expect(
          cellsOf(e, size)
            .map((i) => p.cells[i])
            .join(''),
        ).toBe(e.answer);
      }
      // Every maximal run of 2+ letters is an entry (no accidental words).
      const words = new Set(p.entries.map((e) => `${e.dir}:${e.row}:${e.col}`));
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          const filled = (rr: number, cc: number) =>
            rr >= 0 && cc >= 0 && rr < size && cc < size && p.cells[rr * size + cc] !== null;
          if (!filled(r, c)) continue;
          if (!filled(r, c - 1) && filled(r, c + 1))
            expect(words.has(`across:${r}:${c}`)).toBe(true);
          if (!filled(r - 1, c) && filled(r + 1, c)) expect(words.has(`down:${r}:${c}`)).toBe(true);
        }
      }
      // Numbers increase in reading order.
      const nums = p.entries.map((e) => e.number);
      expect(nums).toEqual([...nums].sort((a, b) => a - b));
      expect(isComplete(p, p.cells)).toBe(true);
    }
  });
});
