import { describe, expect, it } from 'vitest';
import { applyBags, chooseCard, legal, newHand, playCard, scoreHand, suggestBid, turnOf } from './engine';
import type { SpadesState } from './engine';
import { createRng } from '@/utils/random';
import type { Card, Suit } from '../_shared/cards/deck';

const c = (rank: number, suit: Suit): Card => ({ id: `${rank}${suit}`, rank, suit, faceUp: true });

describe('spades', () => {
  it('scores made and set contracts with bags', () => {
    const r = scoreHand([3, 5, 2, 3], [5, 3, 1, 4]);
    expect(r.team).toEqual([51, -80]);
    expect(r.bags).toEqual([1, 0]);
    expect(applyBags(95, 9, 2)).toEqual({ score: -5, bags: 1 });
  });

  it('estimates bids from aces, kings and spade length', () => {
    const strong = [c(1, 'spades'), c(13, 'spades'), c(12, 'spades'), c(5, 'spades'), c(4, 'spades'), c(1, 'hearts'), c(1, 'clubs'), c(13, 'clubs'), c(2, 'clubs'), c(3, 'diamonds'), c(4, 'diamonds'), c(5, 'diamonds'), c(6, 'diamonds')];
    expect(suggestBid(strong)).toBeGreaterThanOrEqual(6);
    const weak = [2, 3, 4, 5, 6, 7, 8].map((r) => c(r, 'hearts')).concat([2, 3, 4, 5, 6, 7].map((r) => c(r, 'clubs')));
    expect(suggestBid(weak)).toBe(1);
  });

  it('spades trump the suit led and cannot be led before they are broken', () => {
    let s: SpadesState = { ...newHand(0), hands: [[c(2, 'spades'), c(9, 'hearts')], [c(10, 'hearts')], [c(12, 'hearts')], [c(3, 'spades')]] };
    expect(legal(s, 0).map((x) => x.suit)).toEqual(['hearts']);
    s = playCard(s, c(9, 'hearts')).state;
    s = playCard(s, c(10, 'hearts')).state;
    s = playCard(s, c(12, 'hearts')).state;
    const r = playCard(s, c(3, 'spades'));
    expect(r.winner).toBe(3);
    expect(r.state.broken).toBe(true);
  });

  it('computer players always play legal cards through a full hand', () => {
    for (const level of ['easy', 'normal', 'hard'] as const) {
      const rng = createRng(level).next;
      let s = newHand(1, rng);
      s = { ...s, bids: s.hands.map(suggestBid) };
      for (let k = 0; k < 52; k++) {
        const seat = turnOf(s);
        const card = chooseCard(s, level, rng);
        expect(legal(s, seat).map((x) => x.id)).toContain(card.id);
        s = playCard(s, card).state;
      }
      expect(s.tricksWon.reduce((a, b) => a + b)).toBe(13);
    }
  });
});
