import { describe, expect, it } from 'vitest';
import { dealRow, deal, isRun, move, won } from './engine';
import type { SpiderState } from './engine';
import type { Card, Suit } from '../_shared/cards/deck';

const c = (rank: number, suit: Suit = 'spades', faceUp = true): Card => ({ id: `${rank}${suit}${Math.random()}`, rank, suit, faceUp });

describe('spider solitaire', () => {
  it.each([1, 2, 4] as const)('deals 54 cards and keeps 50 in stock with %i suit(s)', (n) => {
    const s = deal(n);
    expect(s.columns.map((x) => x.length)).toEqual([6, 6, 6, 6, 5, 5, 5, 5, 5, 5]);
    expect(s.stock).toHaveLength(50);
    expect(new Set([...s.stock, ...s.columns.flat()].map((x) => x.suit)).size).toBe(n);
  });

  it('moves only same-suit runs, onto a card one rank higher', () => {
    const s: SpiderState = { columns: [[c(8), c(7)], [c(9, 'hearts')], [c(9)], [], [], [], [], [], [], []], stock: [], done: [], moves: 0 };
    expect(isRun(s.columns[0], 0)).toBe(true);
    expect(move(s, 0, 0, 1)).not.toBeNull();
    const mixed: SpiderState = { ...s, columns: [[c(8, 'hearts'), c(7)], ...s.columns.slice(1)] };
    expect(move(mixed, 0, 0, 2)).toBeNull();
    expect(move(mixed, 0, 1, 2)).toBeNull();
  });

  it('removes a completed King-to-Ace run and flips the card beneath', () => {
    const run = Array.from({ length: 12 }, (_, i) => c(13 - i));
    const s: SpiderState = { columns: [[c(4, 'hearts', false), ...run], [c(1)], [], [], [], [], [], [], [], []], stock: [], done: [], moves: 0 };
    const r = move(s, 1, 0, 0);
    expect(r?.completed).toBe(1);
    expect(r?.state.done).toEqual(['spades']);
    expect(r?.state.columns[0]).toHaveLength(1);
    expect(r?.state.columns[0][0].faceUp).toBe(true);
  });

  it('cannot deal a row while a column is empty', () => {
    const s = deal(1);
    expect(dealRow(s)?.state.stock).toHaveLength(40);
    s.columns[3] = [];
    expect(dealRow(s)).toBeNull();
    expect(won({ ...s, done: Array(8).fill('spades') })).toBe(true);
  });
});
