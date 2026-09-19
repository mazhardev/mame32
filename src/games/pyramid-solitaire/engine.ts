import { buildDeck, shuffleDeck } from '../_shared/cards/deck';
import type { Card } from '../_shared/cards/deck';

/**
 * Pyramid: 28 cards in 7 rows. Remove pairs that total 13 (Jack 11,
 * Queen 12, Kings alone). A pyramid card is free once both cards
 * overlapping it from the row below are gone.
 */
export interface PyramidState {
  pyramid: (Card | null)[];
  stock: Card[];
  waste: Card[];
  passes: number;
  removed: number;
}
export type Pick = { from: 'pyramid'; index: number } | { from: 'waste' } | { from: 'stock' };

export const rowOf = (i: number) => Math.floor((Math.sqrt(8 * i + 1) - 1) / 2);
export const indexOf = (r: number, c: number) => (r * (r + 1)) / 2 + c;

export function deal(rand: () => number = Math.random): PyramidState {
  const d = shuffleDeck(buildDeck(1, true), rand);
  return { pyramid: d.slice(0, 28), stock: d.slice(28), waste: [], passes: 1, removed: 0 };
}

export function isFree(p: (Card | null)[], i: number): boolean {
  if (!p[i]) return false;
  const r = rowOf(i);
  if (r === 6) return true;
  const c = i - indexOf(r, 0);
  return !p[indexOf(r + 1, c)] && !p[indexOf(r + 1, c + 1)];
}

export function cardAt(s: PyramidState, pick: Pick): Card | null {
  if (pick.from === 'pyramid') return isFree(s.pyramid, pick.index) ? s.pyramid[pick.index] : null;
  if (pick.from === 'waste') return s.waste[s.waste.length - 1] ?? null;
  return s.stock[s.stock.length - 1] ?? null;
}

function take(s: PyramidState, pick: Pick): PyramidState {
  if (pick.from === 'pyramid') {
    const pyramid = [...s.pyramid];
    pyramid[pick.index] = null;
    return { ...s, pyramid };
  }
  if (pick.from === 'waste') return { ...s, waste: s.waste.slice(0, -1) };
  return { ...s, stock: s.stock.slice(0, -1) };
}

const same = (a: Pick, b: Pick) => a.from === b.from && (a.from !== 'pyramid' || (b.from === 'pyramid' && a.index === b.index));

/** Removes one King, or two cards totalling 13. Returns null if not allowed. */
export function remove(s: PyramidState, a: Pick, b?: Pick): PyramidState | null {
  const ca = cardAt(s, a);
  if (!ca) return null;
  if (!b) return ca.rank === 13 ? { ...take(s, a), removed: s.removed + 1 } : null;
  if (same(a, b)) return null;
  const cb = cardAt(s, b);
  if (!cb || ca.rank + cb.rank !== 13) return null;
  // A pyramid card can't pair with the card directly covering it.
  if (a.from === 'pyramid' && b.from === 'pyramid') {
    const both = [...s.pyramid];
    both[a.index] = null;
    if (!isFree(both, b.index) && !isFree(s.pyramid, b.index)) return null;
  }
  return { ...take(take(s, a), b), removed: s.removed + 2 };
}

/** Turns the next stock card onto the waste, recycling the waste if passes remain. */
export function draw(s: PyramidState, maxPasses: number): PyramidState | null {
  if (s.stock.length) return { ...s, stock: s.stock.slice(0, -1), waste: [...s.waste, s.stock[s.stock.length - 1]] };
  if (s.passes >= maxPasses || !s.waste.length) return null;
  return { ...s, stock: [...s.waste].reverse(), waste: [], passes: s.passes + 1 };
}

export const cleared = (s: PyramidState) => s.pyramid.every((c) => !c);

/** Whether any removal is possible right now (ignoring the stock). */
export function anyMove(s: PyramidState): boolean {
  const picks: Pick[] = [{ from: 'waste' }, ...s.pyramid.map((_, index) => ({ from: 'pyramid', index }) as Pick)];
  const live = picks.filter((p) => cardAt(s, p));
  for (const a of live) {
    if (remove(s, a)) return true;
    for (const b of live) if (remove(s, a, b)) return true;
  }
  return false;
}
