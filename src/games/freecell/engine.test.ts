import { describe, expect, it } from 'vitest';
import { autoPlay, deal, isRun, maxRun, move, won } from './engine';
import type { FCState } from './engine';
import type { Card, Suit } from '../_shared/cards/deck';

const c = (rank: number, suit: Suit): Card => ({ id: `${rank}${suit}`, rank, suit, faceUp: true });
const empty = (): FCState => ({ cascades: Array.from({ length: 8 }, () => []), cells: [null, null, null, null], foundations: { spades: [], hearts: [], diamonds: [], clubs: [] }, moves: 0 });

describe('freecell', () => {
  it('deals all 52 cards into eight cascades (7,7,7,7,6,6,6,6)', () => {
    const s = deal();
    expect(s.cascades.map((x) => x.length)).toEqual([7, 7, 7, 7, 6, 6, 6, 6]);
  });

  it('builds down in alternating colours only', () => {
    const s = empty();
    s.cascades[0] = [c(9, 'spades')];
    s.cascades[1] = [c(8, 'hearts')];
    s.cascades[2] = [c(8, 'clubs')];
    expect(move(s, { kind: 'cascade', pile: 1, index: 0 }, { kind: 'cascade', pile: 0 })).not.toBeNull();
    expect(move(s, { kind: 'cascade', pile: 2, index: 0 }, { kind: 'cascade', pile: 0 })).toBeNull();
  });

  it('limits run length by free cells and empty columns', () => {
    const s = empty();
    s.cascades[0] = [c(9, 'spades'), c(8, 'hearts'), c(7, 'clubs')];
    s.cascades[1] = [c(10, 'hearts')];
    for (let i = 2; i < 8; i++) s.cascades[i] = [c(13, 'clubs')];
    expect(isRun(s.cascades[0], 0)).toBe(true);
    s.cells = [c(1, 'hearts'), c(2, 'hearts'), null, null];
    expect(maxRun(s, false)).toBe(3);
    expect(move(s, { kind: 'cascade', pile: 0, index: 0 }, { kind: 'cascade', pile: 1 })).not.toBeNull();
    s.cells = [c(1, 'hearts'), c(2, 'hearts'), c(3, 'hearts'), null];
    expect(move(s, { kind: 'cascade', pile: 0, index: 0 }, { kind: 'cascade', pile: 1 })).toBeNull();
  });

  it('plays aces and safe cards home automatically', () => {
    const s = empty();
    s.cascades[0] = [c(2, 'hearts'), c(1, 'hearts')];
    s.cascades[1] = [c(1, 'spades')];
    const r = autoPlay(s);
    expect(r.state.foundations.hearts).toHaveLength(2);
    expect(r.state.foundations.spades).toHaveLength(1);
  });

  it('recognises a finished game', () => {
    const s = empty();
    for (const suit of ['spades', 'hearts', 'diamonds', 'clubs'] as Suit[]) s.foundations[suit] = Array.from({ length: 13 }, (_, i) => c(i + 1, suit));
    expect(won(s)).toBe(true);
  });
});
