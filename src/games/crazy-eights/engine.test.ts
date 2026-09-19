import { describe, expect, it } from 'vitest';
import { canPlay, choose, deal, drawCard, handPoints, pass, playCard } from './engine';
import type { C8State } from './engine';
import type { Card, Suit } from '../_shared/cards/deck';
import { createRng } from '@/utils/random';

const c = (rank: number, suit: Suit): Card => ({ id: `${rank}${suit}${Math.random()}`, rank, suit, faceUp: true });

describe('crazy eights', () => {
  it('deals 7 each to two players and 5 each to more', () => {
    expect(deal(2).hands.map((h) => h.length)).toEqual([7, 7]);
    expect(deal(4).hands.map((h) => h.length)).toEqual([5, 5, 5, 5]);
    expect(deal(3).discard[0].rank).not.toBe(8);
  });

  it('matches suit or rank, and eights are wild and name a suit', () => {
    const s: C8State = { hands: [[c(5, 'hearts'), c(9, 'clubs'), c(8, 'spades')], [c(2, 'clubs')]], stock: [], discard: [c(9, 'hearts')], suit: 'hearts', turn: 0, drew: false };
    expect(canPlay(s, c(5, 'hearts'))).toBe(true);
    expect(canPlay(s, c(9, 'clubs'))).toBe(true);
    expect(canPlay(s, c(2, 'diamonds'))).toBe(false);
    const after = playCard(s, s.hands[0][2], 'diamonds');
    expect(after.suit).toBe('diamonds');
    expect(after.turn).toBe(1);
  });

  it('reshuffles the discard pile into an empty stock', () => {
    const s: C8State = { hands: [[], []], stock: [], discard: [c(3, 'clubs'), c(4, 'clubs'), c(5, 'clubs')], suit: 'clubs', turn: 0, drew: false };
    const r = drawCard(s);
    expect(r.hands[0]).toHaveLength(1);
    expect(r.discard).toHaveLength(1);
    expect(r.stock).toHaveLength(1);
    expect(pass(r).turn).toBe(1);
  });

  it('scores eights at 50 and face cards at 10', () => {
    expect(handPoints([c(8, 'clubs'), c(13, 'hearts'), c(3, 'spades')])).toBe(63);
  });

  it('computer players finish a game with legal moves only', () => {
    for (const level of ['easy', 'normal', 'hard'] as const) {
      const rng = createRng(level + 'c8').next;
      let s = deal(3, rng);
      for (let k = 0; k < 500 && s.hands.every((h) => h.length); k++) {
        const pick = choose(s, level, rng);
        if (pick) {
          expect(canPlay(s, pick.card)).toBe(true);
          s = playCard(s, pick.card, pick.suit);
        } else if (!s.drew) s = drawCard(s, rng);
        else s = pass(s);
      }
      expect(s.hands.some((h) => !h.length)).toBe(true);
    }
  });
});
