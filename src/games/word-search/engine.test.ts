import { expect, it } from 'vitest';
import { LEVELS, generate, pathBetween, matchWord } from './engine';
import { createRng } from '@/utils/random';
it('selects only horizontal, vertical and diagonal lines', () => {
  expect(pathBetween(0, 22)).toEqual([0, 11, 22]);
  expect(pathBetween(0, 21)).toEqual([]);
});
it('embeds each listed word intact in the grid', () => {
  for (let i = 0; i < 10; i++) {
    const b = generate();
    expect(b.placed).toHaveLength(LEVELS.normal.words);
    for (const p of b.placed) expect(matchWord(b.grid, p.path, p.word)).toBe(true);
  }
});
it('scales the grid and word count with difficulty', () => {
  for (const key of ['easy', 'normal', 'hard'] as const) {
    const level = LEVELS[key];
    const rng = createRng(`ws-${key}`);
    const b = generate(level, rng.next);
    expect(b.size).toBe(level.size);
    expect(b.grid).toHaveLength(level.size * level.size);
    expect(b.placed).toHaveLength(level.words);
    for (const p of b.placed) {
      expect(b.grid.length).toBeGreaterThan(Math.max(...p.path));
      expect(p.path.map((i) => b.grid[i]).join('')).toBe(p.word);
    }
  }
});
it('keeps every word reading forwards on Easy', () => {
  for (let i = 0; i < 20; i++) {
    const b = generate(LEVELS.easy, createRng(i).next);
    for (const p of b.placed) {
      const [a, z] = [p.path[0], p.path[p.path.length - 1]];
      // Forward directions only ever increase the column, or keep it and move down.
      const dx = (z % 8) - (a % 8);
      expect(dx > 0 || (dx === 0 && z > a)).toBe(true);
    }
  }
});
