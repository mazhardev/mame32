import { describe, expect, it } from 'vitest';
import { dealPairs, matches } from './engine';

describe('memory cards', () => {
  it.each([6, 10, 15])('deals %i face-down pairs where every card has exactly one partner', (n) => {
    const cards = dealPairs(n);
    expect(cards).toHaveLength(n * 2);
    expect(cards.every((c) => !c.faceUp)).toBe(true);
    for (const c of cards) expect(cards.filter((o) => matches(c, o))).toHaveLength(1);
  });
});
