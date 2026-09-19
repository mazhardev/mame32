import { describe, expect, it } from 'vitest';
import { SIZE, chooseMove, winningLine } from './engine';
import type { Stone } from './engine';

const idx = (r: number, c: number) => r * SIZE + c;
function board(stones: [number, number, Stone][]): Stone[] {
  const b: Stone[] = Array(SIZE * SIZE).fill(0);
  for (const [r, c, s] of stones) b[idx(r, c)] = s;
  return b;
}

describe('gomoku', () => {
  it('detects five in a row in every direction', () => {
    const h = board([0, 1, 2, 3, 4].map((c) => [7, c, 1]));
    expect(winningLine(h, idx(7, 2))).toHaveLength(5);
    const d = board([0, 1, 2, 3, 4].map((k) => [k, k, 2]));
    expect(winningLine(d, idx(4, 4))).toHaveLength(5);
    const four = board([0, 1, 2, 3].map((c) => [7, c, 1]));
    expect(winningLine(four, idx(7, 3))).toBeNull();
  });

  it.each(['easy', 'normal', 'hard'] as const)('%s computer completes its own five', (level) => {
    const b = board([
      [5, 5, 2],
      [5, 6, 2],
      [5, 7, 2],
      [5, 8, 2],
      [9, 9, 1],
      [9, 10, 1],
    ]);
    const m = chooseMove(b, 2, level);
    expect([idx(5, 4), idx(5, 9)]).toContain(m);
  });

  it.each(['normal', 'hard'] as const)('%s computer blocks an open four', (level) => {
    const b = board([
      [7, 5, 1],
      [7, 6, 1],
      [7, 7, 1],
      [7, 8, 1],
      [2, 2, 2],
    ]);
    expect([idx(7, 4), idx(7, 9)]).toContain(chooseMove(b, 2, level));
  });
});
