import { SUITS, buildDeck, shuffleDeck } from '../_shared/cards/deck';
import type { Card, Suit } from '../_shared/cards/deck';

/** Crazy Eights for 2–4 players. Seat 0 is you. */
export interface C8State {
  hands: Card[][];
  stock: Card[];
  discard: Card[];
  /** The suit to follow — normally the top card's, or the one named on an 8. */
  suit: Suit;
  turn: number;
  /** True once the current player has drawn this turn. */
  drew: boolean;
}

export function deal(players: number, rand: () => number = Math.random): C8State {
  const d = shuffleDeck(buildDeck(1, true), rand);
  const size = players === 2 ? 7 : 5;
  const hands = Array.from({ length: players }, (_, p) => d.slice(p * size, p * size + size));
  let rest = d.slice(players * size);
  // Don't start on an 8.
  let firstIdx = rest.findIndex((c) => c.rank !== 8);
  if (firstIdx < 0) firstIdx = 0;
  const first = rest[firstIdx];
  rest = rest.filter((_, i) => i !== firstIdx);
  return { hands, stock: rest, discard: [first], suit: first.suit, turn: 0, drew: false };
}

export const top = (s: C8State) => s.discard[s.discard.length - 1];
export const canPlay = (s: C8State, c: Card) => c.rank === 8 || c.suit === s.suit || c.rank === top(s).rank;

export function playCard(s: C8State, card: Card, chosen?: Suit): C8State {
  const hands = s.hands.map((h, i) => (i === s.turn ? h.filter((c) => c.id !== card.id) : h));
  return { ...s, hands, discard: [...s.discard, card], suit: card.rank === 8 ? (chosen ?? card.suit) : card.suit, turn: (s.turn + 1) % s.hands.length, drew: false };
}

/** Draws one card, reshuffling the discard pile (except its top) when the stock is empty. */
export function drawCard(s: C8State, rand: () => number = Math.random): C8State {
  let stock = s.stock;
  let discard = s.discard;
  if (!stock.length) {
    if (discard.length <= 1) return { ...s, drew: true };
    stock = shuffleDeck(discard.slice(0, -1), rand);
    discard = discard.slice(-1);
  }
  const hands = s.hands.map((h, i) => (i === s.turn ? [...h, stock[0]] : h));
  return { ...s, hands, stock: stock.slice(1), discard, drew: true };
}

export function pass(s: C8State): C8State {
  return { ...s, turn: (s.turn + 1) % s.hands.length, drew: false };
}

export const cardPoints = (c: Card) => (c.rank === 8 ? 50 : c.rank >= 10 ? 10 : c.rank);
export const handPoints = (h: Card[]) => h.reduce((n, c) => n + cardPoints(c), 0);

/** The suit a player holds most of (excluding eights) — the natural choice after playing an 8. */
export function favouriteSuit(hand: Card[]): Suit {
  const counts = SUITS.map((suit) => hand.filter((c) => c.suit === suit && c.rank !== 8).length);
  return SUITS[counts.indexOf(Math.max(...counts))];
}

export type Level = 'easy' | 'normal' | 'hard';

/** Computer choice: returns the card to play (and suit for an 8), or null to draw/pass. */
export function choose(s: C8State, level: Level, rand: () => number = Math.random): { card: Card; suit?: Suit } | null {
  const hand = s.hands[s.turn];
  const options = hand.filter((c) => canPlay(s, c));
  if (!options.length) return null;
  if (level === 'easy') {
    const card = options[Math.floor(rand() * options.length)];
    return { card, suit: card.rank === 8 ? SUITS[Math.floor(rand() * 4)] : undefined };
  }
  const nonEights = options.filter((c) => c.rank !== 8);
  const next = s.hands[(s.turn + 1) % s.hands.length];
  if (nonEights.length) {
    // Prefer the card whose suit we hold most of, and dump high cards first.
    const count = (suit: Suit) => hand.filter((c) => c.suit === suit).length;
    const card = [...nonEights].sort((a, b) => count(b.suit) - count(a.suit) || cardPoints(b) - cardPoints(a))[0];
    // Hard: if the next player is about to go out, keep an 8 in reserve but switch suit if we can.
    if (level === 'hard' && next.length === 1) {
      const switchers = nonEights.filter((c) => c.suit !== s.suit);
      if (switchers.length) return { card: switchers[0] };
    }
    return { card };
  }
  const eight = options[0];
  const rest = hand.filter((c) => c.id !== eight.id);
  return { card: eight, suit: rest.length ? favouriteSuit(rest) : eight.suit };
}
