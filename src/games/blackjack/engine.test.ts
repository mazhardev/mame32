import { expect, it } from 'vitest';
import { outcome } from './engine';
import type { Card } from '../_shared/cards/deck';
const cards = (ranks: number[]): Card[] =>
  ranks.map((rank, i) => ({ id: String(i), suit: 'clubs', rank, faceUp: true }));
it('prioritizes blackjack over an ordinary 21', () => {
  expect(outcome(cards([1, 13]), cards([7, 7, 7]))).toBe('win');
});
it('counts a busted player as a loss even when dealer busts', () => {
  expect(outcome(cards([10, 10, 5]), cards([10, 10, 2]))).toBe('loss');
});
it('treats equal totals and equal naturals as pushes', () => {
  expect(outcome(cards([1, 10]), cards([1, 11]))).toBe('push');
  expect(outcome(cards([10, 8]), cards([9, 9]))).toBe('push');
});
