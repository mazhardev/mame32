import { describe, expect, it } from 'vitest';
import { searchBest } from '../_shared/board/search';
import { initial, legal, mancalaGame, sow } from './engine';

describe('mancala (kalah)', () => {
  it('sows seeds counter-clockwise and grants an extra turn in the store', () => {
    const r = sow(initial(), 2);
    expect(r.path).toEqual([3, 4, 5, 6]);
    expect(r.extraTurn).toBe(true);
    expect(r.state.turn).toBe(1);
    expect(r.state.pits[6]).toBe(1);
  });

  it('skips the opponent store', () => {
    const s = initial(0);
    s.pits[5] = 9;
    s.pits[10] = 1;
    const r = sow(s, 5);
    expect(r.path).not.toContain(13);
    expect(r.path.at(-1)).toBe(1);
  });

  it('captures from the opposite pit when landing in an own empty pit', () => {
    const s = initial(0);
    s.pits[0] = 1;
    s.pits[11] = 5; // opposite of pit 1
    s.pits[8] = 1;
    const r = sow(s, 0);
    expect(r.captured).toBe(6);
    expect(r.state.pits[6]).toBe(6);
    expect(r.state.pits[11]).toBe(0);
  });

  it('ends the game and sweeps remaining seeds when a side is empty', () => {
    const s = initial(0);
    s.pits[5] = 1;
    s.pits[9] = 3;
    const r = sow(s, 5);
    expect(legal(r.state)).toEqual([]);
    expect(r.state.pits[13]).toBe(3);
    expect(r.state.pits[6]).toBe(1);
  });

  it('the computer takes an extra-turn move from the opening', () => {
    const s = { ...initial(), turn: 2 as const };
    const m = searchBest(mancalaGame, s, 1, 300, 0);
    expect(m).toBe(9);
  });
});
