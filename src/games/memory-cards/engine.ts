import { SUITS, buildDeck, cardColor, shuffleDeck } from '../_shared/cards/deck';
import type { Card } from '../_shared/cards/deck';

/** Two cards match when they share rank and colour (e.g. 7♥ and 7♦). */
export const matches = (a: Card, b: Card) => a.id !== b.id && a.rank === b.rank && cardColor(a.suit) === cardColor(b.suit);

/** Deals `pairs` matching pairs, shuffled, all face down. */
export function dealPairs(pairs: number, rand: () => number = Math.random): Card[] {
  const deck = buildDeck();
  const options: [Card, Card][] = [];
  for (let rank = 1; rank <= 13; rank++) {
    for (const color of ['red', 'black'] as const) {
      const [a, b] = SUITS.filter((s) => cardColor(s) === color).map((s) => deck.find((c) => c.rank === rank && c.suit === s) as Card);
      options.push([a, b]);
    }
  }
  const chosen = shuffleDeck(options as unknown as Card[], rand) as unknown as [Card, Card][];
  return shuffleDeck(chosen.slice(0, pairs).flat(), rand).map((c) => ({ ...c, faceUp: false }));
}
