import { describe, expect, it } from 'vitest';
import { dealHands, legalPlays, trickWinner } from './tricks';
import type { Card, Suit } from './deck';

const c = (rank: number, suit: Suit): Card => ({ id: `${rank}${suit}`, rank, suit, faceUp: true });

describe('trick-taking helpers', () => {
  it('deals four hands of 13', () => {
    const h = dealHands();
    expect(h.map((x) => x.length)).toEqual([13, 13, 13, 13]);
    expect(new Set(h.flat().map((x) => x.id)).size).toBe(52);
  });

  it('awards the trick to the highest card of the suit led, or the highest trump', () => {
    const t = [
      { seat: 0, card: c(10, 'hearts') },
      { seat: 1, card: c(1, 'clubs') },
      { seat: 2, card: c(12, 'hearts') },
      { seat: 3, card: c(2, 'hearts') },
    ];
    expect(trickWinner(t, null).seat).toBe(2);
    t[1] = { seat: 1, card: c(2, 'spades') };
    expect(trickWinner(t, 'spades').seat).toBe(1);
    expect(trickWinner([{ seat: 0, card: c(1, 'hearts') }, { seat: 1, card: c(13, 'hearts') }], null).seat).toBe(0);
  });

  it('forces following suit and keeps a locked suit from being led early', () => {
    const hand = [c(3, 'hearts'), c(9, 'clubs'), c(12, 'spades')];
    expect(legalPlays(hand, [{ seat: 1, card: c(5, 'clubs') }], { locked: 'hearts', broken: false })).toEqual([c(9, 'clubs')]);
    expect(legalPlays(hand, [], { locked: 'hearts', broken: false }).map((x) => x.suit)).not.toContain('hearts');
    expect(legalPlays([c(3, 'hearts')], [], { locked: 'hearts', broken: false })).toHaveLength(1);
  });
});
