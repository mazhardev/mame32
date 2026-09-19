import type { Card } from './deck';

/**
 * Shared rule for TriPeaks and Golf: a card can go on the waste if it is one
 * rank above or below the waste card. With `wrap`, Kings and Aces connect.
 */
export function adjacent(a: Card, b: Card, wrap: boolean): boolean {
  const d = Math.abs(a.rank - b.rank);
  return d === 1 || (wrap && d === 12);
}
