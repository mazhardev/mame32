import { shuffleWith } from '@/utils/random';

export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export type Color = 'red' | 'black';

export interface Card {
  id: string;
  suit: Suit;
  /** 1 = Ace, 11 = Jack, 12 = Queen, 13 = King. */
  rank: number;
  faceUp: boolean;
}

export const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];

export const SUIT_SYMBOL: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

export const RANK_LABEL: Record<number, string> = {
  1: 'A',
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'J',
  12: 'Q',
  13: 'K',
};

export function cardColor(suit: Suit): Color {
  return suit === 'hearts' || suit === 'diamonds' ? 'red' : 'black';
}

export function cardLabel(card: Card): string {
  return `${RANK_LABEL[card.rank]}${SUIT_SYMBOL[card.suit]}`;
}

export function cardName(card: Card): string {
  const names: Record<number, string> = { 1: 'Ace', 11: 'Jack', 12: 'Queen', 13: 'King' };
  return `${names[card.rank] ?? card.rank} of ${card.suit}`;
}

/** Builds an ordered deck; `decks` > 1 produces the multi-deck shoes some games use. */
export function buildDeck(decks = 1, faceUp = false): Card[] {
  const cards: Card[] = [];
  for (let d = 0; d < decks; d++) {
    for (const suit of SUITS) {
      for (let rank = 1; rank <= 13; rank++) {
        cards.push({ id: `${d}-${suit}-${rank}`, suit, rank, faceUp });
      }
    }
  }
  return cards;
}

/** Fisher-Yates, using the supplied random source so deals can be seeded. */
export function shuffleDeck(cards: Card[], random: () => number = Math.random): Card[] {
  return shuffleWith(cards.slice(), random);
}

/** Blackjack-style value: face cards are 10, aces are 11 until they must be 1. */
export function blackjackValue(cards: Card[]): { total: number; soft: boolean } {
  let total = 0;
  let aces = 0;
  for (const card of cards) {
    if (card.rank === 1) {
      aces += 1;
      total += 11;
    } else {
      total += Math.min(card.rank, 10);
    }
  }
  let soft = aces > 0;
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
    soft = aces > 0;
  }
  return { total, soft };
}
