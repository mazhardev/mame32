import { describe, expect, it } from 'vitest';
import { createRng } from '@/utils/random';
import { CLEAR_AT, boardCells, dealStack, emptyCells, isOver, neighbours, newGame, place, settle, topRun, validState } from './engine';

const cells = boardCells(2);
const centre = cells.findIndex(([q, r]) => q === 0 && r === 0);

describe('hexa sort', () => {
  it('has a 19-cell board where the centre has six neighbours', () => {
    expect(cells).toHaveLength(19);
    expect(neighbours(cells, centre)).toHaveLength(6);
    const corner = cells.findIndex(([q, r]) => q === 2 && r === -2);
    expect(neighbours(cells, corner)).toHaveLength(3);
  });

  it('deals stacks of 2 to 6 tiles in valid colours', () => {
    const r = createRng('deal').next;
    for (let i = 0; i < 100; i++) {
      const s = dealStack(4, r);
      expect(s.length).toBeGreaterThanOrEqual(2);
      expect(s.length).toBeLessThanOrEqual(6);
      expect(s.every((c) => c >= 0 && c < 4)).toBe(true);
    }
  });

  it('slides matching tops onto the placed stack', () => {
    const stacks = cells.map(() => [] as number[]);
    const [a, b] = neighbours(cells, centre);
    stacks[a] = [1, 2, 2];
    stacks[b] = [0];
    stacks[centre] = [2];
    const steps = settle(cells, stacks, centre);
    expect(stacks[centre]).toEqual([2, 2, 2]);
    expect(stacks[a]).toEqual([1]);
    expect(stacks[b]).toEqual([0]);
    expect(steps[0]).toMatchObject({ kind: 'move', from: a, to: centre, count: 2 });
  });

  it(`clears ${CLEAR_AT} of a colour and keeps settling what is underneath`, () => {
    const stacks = cells.map(() => [] as number[]);
    const [a, b] = neighbours(cells, centre);
    stacks[a] = [3, 1, 1, 1, 1, 1, 1];
    stacks[b] = [3, 3];
    stacks[centre] = [3, 1, 1, 1, 1];
    const steps = settle(cells, stacks, centre);
    expect(steps.some((s) => s.kind === 'clear' && s.count === 10)).toBe(true);
    // After the clear, the 3s left behind gather on one stack.
    expect(Math.max(...stacks.map((s) => (s.at(-1) === 3 ? topRun(s) : 0)))).toBeGreaterThanOrEqual(3);
  });

  it('places only on empty cells, refills the tray and scores clears', () => {
    const r = createRng('place').next;
    let s = newGame(2, 3, r);
    expect(place(s, 0, 0, r)).not.toBeNull();
    s = (place(s, 0, 0, r) as NonNullable<ReturnType<typeof place>>).state;
    expect(place(s, 1, 0, r)).toBeNull();
    s = (place(s, 1, 1, r) as NonNullable<ReturnType<typeof place>>).state;
    s = (place(s, 2, 2, r) as NonNullable<ReturnType<typeof place>>).state;
    expect(s.tray.every((x) => x !== null)).toBe(true);
    expect(s.placed).toBe(3);
    expect(s.score).toBeGreaterThan(0);
  });

  it('ends when no empty cell is left', () => {
    const s = newGame(2, 3, Math.random);
    s.stacks = s.stacks.map((_, i) => [i % 3, (i + 1) % 3]);
    expect(emptyCells(s)).toHaveLength(0);
    expect(isOver(s)).toBe(true);
    expect(validState(s)).toBe(true);
    expect(validState({ ...s, stacks: [] })).toBe(false);
  });
});
