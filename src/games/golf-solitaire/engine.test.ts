import { describe, expect, it } from 'vitest';
import { canPlay, deal, play, remaining, stuck } from './engine';
import type { GolfState } from './engine';
import type { Card } from '../_shared/cards/deck';

const c = (rank: number): Card => ({ id: `g${rank}-${Math.random()}`, rank, suit: 'diamonds', faceUp: true });

describe('golf solitaire', () => {
  it('deals seven columns of five, sixteen in stock and one on the waste', () => {
    const s = deal();
    expect(s.columns.map((x) => x.length)).toEqual([5, 5, 5, 5, 5, 5, 5]);
    expect(s.stock).toHaveLength(16);
    expect(s.waste).toHaveLength(1);
    expect(remaining(s)).toBe(35);
  });

  it('plays the bottom card one rank away from the waste card', () => {
    const s: GolfState = { columns: [[c(3), c(8)], [c(5)]], stock: [], waste: [c(7)] };
    expect(canPlay(s, 0, false, true)).toBe(true);
    expect(canPlay(s, 1, false, true)).toBe(false);
    expect(play(s, 0, false, true)?.waste.at(-1)?.rank).toBe(8);
  });

  it('blocks everything on a King under the traditional rule', () => {
    const s: GolfState = { columns: [[c(12)], [c(1)]], stock: [], waste: [c(13)] };
    expect(canPlay(s, 0, false, true)).toBe(false);
    expect(canPlay(s, 0, false, false)).toBe(true);
    expect(canPlay(s, 1, true, false)).toBe(true);
    expect(stuck(s, false, true)).toBe(true);
  });
});
