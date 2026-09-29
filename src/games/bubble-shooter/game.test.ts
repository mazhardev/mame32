import { describe, expect, it } from 'vitest';
import { emptyInput, inputWith, simulate } from '../_shared/arcade/kit';
import { COLS, cellPos, cluster, create, floating, neighbours, settle, spec } from './game';
import type { State } from './game';

const rng = () => 0.3;

function empty(): State {
  const s = create('normal', rng);
  s.grid = s.grid.map((row) => row.map(() => -1));
  return s;
}

describe('bubble shooter', () => {
  it('uses consistent hex neighbours', () => {
    const s = empty();
    for (const [r, c] of neighbours(s, 2, 4)) {
      // Every neighbour lists the original cell back.
      expect(neighbours(s, r, c).some(([a, b]) => a === 2 && b === 4)).toBe(true);
      const [x1, y1] = cellPos(s, 2, 4);
      const [x2, y2] = cellPos(s, r, c);
      expect(Math.hypot(x1 - x2, y1 - y2)).toBeCloseTo(38, 0);
    }
  });

  it('pops three matching bubbles and drops what hung from them', () => {
    const s = empty();
    s.grid[0][2] = 1;
    s.grid[0][3] = 1;
    // A different colour hanging only from the pair.
    const hang = neighbours(s, 0, 3).find(([r]) => r === 1)!;
    s.grid[hang[0]][hang[1]] = 4;
    settle(s, 0, 4, 1, rng);
    expect(s.grid[0].slice(2, 5)).toEqual([-1, -1, -1]);
    expect(s.grid[hang[0]][hang[1]]).toBe(-1);
    expect(s.falling).toHaveLength(1);
    expect(s.score).toBe(30 + 20);
  });

  it('keeps pairs that do not reach three', () => {
    const s = empty();
    s.grid[0][0] = 2;
    settle(s, 0, 1, 2, rng);
    expect(cluster(s, 0, 0)).toHaveLength(2);
    expect(s.grid[0][1]).toBe(2);
  });

  it('finds bubbles that are no longer attached to the ceiling', () => {
    const s = empty();
    s.grid[3][3] = 0;
    expect(floating(s)).toEqual([[3, 3]]);
  });

  it('fires a bubble that sticks to the top of the board', () => {
    const s = empty();
    s.grid[0][5] = 0;
    s.angle = -Math.PI / 2;
    const before = s.grid.flat().filter((v) => v >= 0).length;
    // Keep one bubble on the board so the level does not reset.
    s.current = 3;
    const input = inputWith([], ['action']);
    simulate(spec, s, 1, input, rng);
    expect(s.grid.flat().filter((v) => v >= 0).length).toBe(before + 1);
    expect(s.shots).toBe(1);
  });

  it('ends when bubbles reach the danger line', () => {
    const s = empty();
    s.grid[15][0] = 1;
    simulate(spec, s, 0.05, emptyInput(), rng);
    expect(s.over).toBe(true);
  });

  it('drops the ceiling a full row after a set number of shots', () => {
    const s = empty();
    s.grid[0][0] = 0;
    s.dropEvery = 1;
    s.current = 3;
    s.angle = -Math.PI / 2;
    simulate(spec, s, 1, inputWith([], ['action']), rng);
    expect(s.grid[0].every((v) => v >= 0)).toBe(true);
    expect(s.parity).toBe(1);
    // Every bubble still fits inside the board.
    s.grid.forEach((row, r) => row.forEach((v, c) => v >= 0 && expect(cellPos(s, r, c)[0] + 19).toBeLessThanOrEqual(COLS * 38 + 19)));
  });
});
