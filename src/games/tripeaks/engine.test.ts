import { describe, expect, it } from 'vitest';
import { SLOTS, deal, flip, isFree, play } from './engine';
import type { TPState } from './engine';
import { adjacent } from '../_shared/cards/sequence';
import type { Card } from '../_shared/cards/deck';

const c = (rank: number): Card => ({ id: `t${rank}-${Math.random()}`, rank, suit: 'hearts', faceUp: true });

describe('tripeaks', () => {
  it('has 28 slots and deals one card to the waste', () => {
    expect(SLOTS).toHaveLength(28);
    const s = deal();
    expect(s.stock).toHaveLength(23);
    expect(s.waste).toHaveLength(1);
  });

  it('frees only the bottom row at first', () => {
    const s = deal();
    const free = s.tableau.map((_, i) => isFree(s.tableau, i));
    expect(free.filter(Boolean)).toHaveLength(10);
    expect(free.slice(18).every(Boolean)).toBe(true);
  });

  it('plays one rank up or down, with King–Ace wrapping only when allowed', () => {
    expect(adjacent(c(13), c(1), true)).toBe(true);
    expect(adjacent(c(13), c(1), false)).toBe(false);
    const tableau = Array.from({ length: 28 }, () => c(9)) as (Card | null)[];
    tableau[27] = c(6);
    const s: TPState = { tableau, stock: [c(2)], waste: [c(5)], streak: 0, bestStreak: 0, score: 0 };
    const r = play(s, 27, true);
    expect(r?.streak).toBe(1);
    expect(r?.waste.at(-1)?.rank).toBe(6);
    expect(play(s, 26, true)).toBeNull();
    expect(flip(s)?.streak).toBe(0);
  });
});
