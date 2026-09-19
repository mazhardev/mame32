import { describe, expect, it } from 'vitest';
import { bankerDraws, payout, play, total } from './engine';
import type { Card } from '../_shared/cards/deck';

const c = (rank: number, i = 0): Card => ({ id: `${rank}-${i}-${Math.random()}`, rank, suit: 'hearts', faceUp: true });

describe('baccarat', () => {
  it('counts only the last digit, with tens and faces worth zero', () => {
    expect(total([c(7), c(8)])).toBe(5);
    expect(total([c(13), c(1)])).toBe(1);
  });

  it('follows the banker drawing table', () => {
    expect(bankerDraws(5, null)).toBe(true);
    expect(bankerDraws(6, null)).toBe(false);
    expect(bankerDraws(3, c(8))).toBe(false);
    expect(bankerDraws(3, c(9))).toBe(true);
    expect(bankerDraws(6, c(7))).toBe(true);
    expect(bankerDraws(6, c(5))).toBe(false);
  });

  it('stands on naturals and draws a third card on low totals', () => {
    // Player 4+5=9 natural; banker never draws.
    let r = play([c(4), c(2), c(5), c(3), c(9), c(9)]);
    expect(r.player).toHaveLength(2);
    expect(r.banker).toHaveLength(2);
    expect(r.winner).toBe('player');
    // Player 1+2=3 draws (gets a 2 → 5); banker 3+3=6 draws only on a 6 or 7, so stands.
    r = play([c(1), c(3), c(2), c(3), c(2), c(9)]);
    expect(r.player).toHaveLength(3);
    expect(r.banker).toHaveLength(2);
    expect(r.winner).toBe('banker');
  });

  it('pays player 1:1, banker 0.95:1 and tie 8:1', () => {
    expect(payout('player', 100, 'player')).toBe(100);
    expect(payout('banker', 100, 'banker')).toBe(95);
    expect(payout('tie', 10, 'tie')).toBe(80);
    expect(payout('player', 100, 'tie')).toBe(0);
    expect(payout('banker', 100, 'player')).toBe(-100);
  });
});
