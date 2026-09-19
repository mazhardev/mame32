import { describe, expect, it } from 'vitest';
import { deal, draw, indexOf, isFree, remove, rowOf } from './engine';
import type { PyramidState } from './engine';
import type { Card } from '../_shared/cards/deck';

const c = (rank: number): Card => ({ id: `r${rank}-${Math.random()}`, rank, suit: 'clubs', faceUp: true });

describe('pyramid solitaire', () => {
  it('lays out 28 cards in rows of 1 to 7', () => {
    const s = deal();
    expect(s.pyramid).toHaveLength(28);
    expect(s.stock).toHaveLength(24);
    expect(rowOf(0)).toBe(0);
    expect(rowOf(27)).toBe(6);
    expect(indexOf(6, 0)).toBe(21);
  });

  it('frees a card once both cards below it are gone', () => {
    const p = Array.from({ length: 28 }, () => c(1)) as (Card | null)[];
    expect(isFree(p, 21)).toBe(true);
    expect(isFree(p, 15)).toBe(false);
    p[21] = null;
    p[22] = null;
    expect(isFree(p, 15)).toBe(true);
  });

  it('removes kings alone and pairs totalling 13', () => {
    const pyramid = Array.from({ length: 28 }, () => c(2)) as (Card | null)[];
    pyramid[21] = c(13);
    pyramid[22] = c(6);
    const s: PyramidState = { pyramid, stock: [c(7)], waste: [], passes: 1, removed: 0 };
    expect(remove(s, { from: 'pyramid', index: 21 })?.removed).toBe(1);
    expect(remove(s, { from: 'pyramid', index: 22 }, { from: 'stock' })?.removed).toBe(2);
    expect(remove(s, { from: 'pyramid', index: 23 }, { from: 'stock' })).toBeNull();
    expect(remove(s, { from: 'pyramid', index: 10 })).toBeNull();
  });

  it('recycles the waste only while passes remain', () => {
    let s: PyramidState = { pyramid: [], stock: [c(3)], waste: [], passes: 1, removed: 0 };
    s = draw(s, 2) as PyramidState;
    expect(s.waste).toHaveLength(1);
    s = draw(s, 2) as PyramidState;
    expect(s.stock).toHaveLength(1);
    s = draw(draw(s, 2) as PyramidState, 2) as PyramidState;
    expect(s).toBeNull();
  });
});
