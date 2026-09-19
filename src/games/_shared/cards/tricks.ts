import { buildDeck, shuffleDeck } from './deck';
import type { Card, Suit } from './deck';

/**
 * Shared machinery for four-player trick-taking games (Hearts, Spades).
 * Seats run clockwise: 0 = you (south), 1 = west, 2 = north, 3 = east.
 * Aces are high.
 */
export const high = (c: Card) => (c.rank === 1 ? 14 : c.rank);

export function dealHands(rand: () => number = Math.random): Card[][] {
  const d = shuffleDeck(buildDeck(1, true), rand);
  const hands = [0, 1, 2, 3].map((p) => d.filter((_, i) => i % 4 === p));
  return hands.map(sortHand);
}

const SUIT_ORDER: Suit[] = ['clubs', 'diamonds', 'spades', 'hearts'];
export function sortHand(h: Card[]): Card[] {
  return [...h].sort((a, b) => SUIT_ORDER.indexOf(a.suit) - SUIT_ORDER.indexOf(b.suit) || high(a) - high(b));
}

export interface Play {
  seat: number;
  card: Card;
}

/** The seat winning a trick so far: highest trump, else highest card of the suit led. */
export function trickWinner(trick: Play[], trump: Suit | null): Play {
  const led = trick[0].card.suit;
  let best = trick[0];
  for (const p of trick.slice(1)) {
    const b = best.card;
    const c = p.card;
    const beats = trump && c.suit === trump ? b.suit !== trump || high(c) > high(b) : c.suit === led && b.suit !== trump && high(c) > high(b);
    if (beats) best = p;
  }
  return best;
}

export interface LegalOptions {
  /** Suit that may not be led until "broken" (hearts in Hearts, spades in Spades). */
  locked: Suit | null;
  broken: boolean;
  /** Hearts' first trick: no point cards unless there is no choice. */
  firstTrick?: boolean;
  isPoint?: (c: Card) => boolean;
  mustLead?: Card;
}

export function legalPlays(hand: Card[], trick: Play[], o: LegalOptions): Card[] {
  if (o.mustLead && !trick.length) return hand.filter((c) => c.id === o.mustLead?.id);
  let options: Card[];
  if (!trick.length) {
    options = o.locked && !o.broken ? hand.filter((c) => c.suit !== o.locked) : hand;
    if (!options.length) options = hand;
  } else {
    const led = trick[0].card.suit;
    const follow = hand.filter((c) => c.suit === led);
    options = follow.length ? follow : hand;
  }
  if (o.firstTrick && o.isPoint) {
    const safe = options.filter((c) => !o.isPoint?.(c));
    if (safe.length) options = safe;
  }
  return options;
}

/** Cards already played, for simple card counting. */
export function unseenHigher(card: Card, played: Card[], hand: Card[]): number {
  let n = 0;
  for (let r = high(card) + 1; r <= 14; r++) {
    const rank = r === 14 ? 1 : r;
    const gone = played.some((c) => c.suit === card.suit && c.rank === rank) || hand.some((c) => c.suit === card.suit && c.rank === rank);
    if (!gone) n++;
  }
  return n;
}
