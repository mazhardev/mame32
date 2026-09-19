import { buildDeck, shuffleDeck } from '../_shared/cards/deck';
import type { Card } from '../_shared/cards/deck';

/** Gin-style rummy: aces low, face cards count 10 as deadwood. */
export const value = (c: Card) => Math.min(10, c.rank);

/** Every possible meld (sets of 3–4 of a rank, runs of 3+ in a suit) within a hand. */
export function allMelds(hand: Card[]): Card[][] {
  const out: Card[][] = [];
  const byRank = new Map<number, Card[]>();
  for (const c of hand) byRank.set(c.rank, [...(byRank.get(c.rank) ?? []), c]);
  for (const cards of byRank.values()) {
    if (cards.length >= 3) {
      out.push(cards);
      if (cards.length === 4) for (let skip = 0; skip < 4; skip++) out.push(cards.filter((_, i) => i !== skip));
    }
  }
  for (const suit of ['spades', 'hearts', 'diamonds', 'clubs']) {
    const cards = hand.filter((c) => c.suit === suit).sort((a, b) => a.rank - b.rank);
    for (let i = 0; i < cards.length; i++) {
      const run = [cards[i]];
      for (let j = i + 1; j < cards.length && cards[j].rank === run[run.length - 1].rank + 1; j++) {
        run.push(cards[j]);
        if (run.length >= 3) out.push([...run]);
      }
    }
  }
  return out;
}

export interface Arrangement {
  melds: Card[][];
  deadwood: Card[];
  points: number;
}

/** Finds the meld arrangement with the least deadwood (exhaustive search; hands are small). */
export function arrange(hand: Card[]): Arrangement {
  const melds = allMelds(hand);
  let best: Arrangement = { melds: [], deadwood: hand, points: hand.reduce((n, c) => n + value(c), 0) };
  const search = (start: number, used: Set<string>, chosen: Card[][]) => {
    const dead = hand.filter((c) => !used.has(c.id));
    const pts = dead.reduce((n, c) => n + value(c), 0);
    if (pts < best.points) best = { melds: chosen, deadwood: dead, points: pts };
    for (let i = start; i < melds.length; i++) {
      if (melds[i].some((c) => used.has(c.id))) continue;
      const next = new Set(used);
      for (const c of melds[i]) next.add(c.id);
      search(i + 1, next, [...chosen, melds[i]]);
    }
  };
  search(0, new Set(), []);
  return best;
}

export interface RummyState {
  hands: [Card[], Card[]];
  stock: Card[];
  discard: Card[];
  turn: 0 | 1;
  /** 'draw' before picking up a card, 'discard' after. */
  step: 'draw' | 'discard';
}

export function deal(first: 0 | 1 = 0, rand: () => number = Math.random): RummyState {
  const d = shuffleDeck(buildDeck(1, true), rand);
  return { hands: [d.slice(0, 10), d.slice(10, 20)], stock: d.slice(21), discard: [d[20]], turn: first, step: 'draw' };
}

export function drawFrom(s: RummyState, pile: 'stock' | 'discard'): RummyState {
  const hands = [...s.hands] as [Card[], Card[]];
  if (pile === 'stock') {
    hands[s.turn] = [...hands[s.turn], s.stock[0]];
    return { ...s, hands, stock: s.stock.slice(1), step: 'discard' };
  }
  hands[s.turn] = [...hands[s.turn], s.discard[s.discard.length - 1]];
  return { ...s, hands, discard: s.discard.slice(0, -1), step: 'discard' };
}

export function discardCard(s: RummyState, card: Card): RummyState {
  const hands = [...s.hands] as [Card[], Card[]];
  hands[s.turn] = hands[s.turn].filter((c) => c.id !== card.id);
  return { ...s, hands, discard: [...s.discard, card], turn: s.turn === 0 ? 1 : 0, step: 'draw' };
}

/** Best card to throw away: the one leaving the least deadwood (ties: the higher card). */
export function bestDiscard(hand: Card[], avoid: Card[] = []): { card: Card; after: number } {
  let best = { card: hand[0], after: Infinity };
  for (const c of hand) {
    let after = arrange(hand.filter((x) => x.id !== c.id)).points;
    // Mild penalty for feeding the opponent a card next to one they took.
    if (avoid.some((a) => a.rank === c.rank || (a.suit === c.suit && Math.abs(a.rank - c.rank) <= 1))) after += 1.5;
    if (after < best.after || (after === best.after && value(c) > value(best.card))) best = { card: c, after };
  }
  return best;
}

export interface KnockResult {
  knocker: 0 | 1;
  winner: 0 | 1;
  points: number;
  gin: boolean;
  undercut: boolean;
  deadwood: [number, number];
}

/**
 * Settles a knock: the knocker's opponent may lay off cards onto the
 * knocker's melds (not after gin), then deadwood is compared.
 */
export function settle(knockerHand: Card[], otherHand: Card[], knocker: 0 | 1): KnockResult {
  const k = arrange(knockerHand);
  const o = arrange(otherHand);
  const gin = k.points === 0;
  let otherDead = o.deadwood;
  if (!gin) {
    // Lay off deadwood that extends the knocker's melds.
    let changed = true;
    const melds = k.melds.map((m) => [...m]);
    while (changed) {
      changed = false;
      for (const c of otherDead) {
        for (const m of melds) {
          const isSet = m.every((x) => x.rank === m[0].rank);
          const fits = isSet ? c.rank === m[0].rank && m.length < 4 : c.suit === m[0].suit && (c.rank === Math.min(...m.map((x) => x.rank)) - 1 || c.rank === Math.max(...m.map((x) => x.rank)) + 1);
          if (fits) {
            m.push(c);
            otherDead = otherDead.filter((x) => x.id !== c.id);
            changed = true;
            break;
          }
        }
        if (changed) break;
      }
    }
  }
  const od = otherDead.reduce((n, c) => n + value(c), 0);
  const other = (knocker === 0 ? 1 : 0) as 0 | 1;
  const deadwood: [number, number] = knocker === 0 ? [k.points, od] : [od, k.points];
  if (gin) return { knocker, winner: knocker, points: od + 25, gin, undercut: false, deadwood };
  if (od <= k.points) return { knocker, winner: other, points: k.points - od + 25, gin, undercut: true, deadwood };
  return { knocker, winner: knocker, points: od - k.points, gin, undercut: false, deadwood };
}

export type Level = 'easy' | 'normal' | 'hard';

/** Computer draw decision: take the discard only if it lowers deadwood. */
export function wantsDiscard(hand: Card[], card: Card, level: Level, rand: () => number = Math.random): boolean {
  if (level === 'easy') return rand() < 0.3;
  const now = arrange(hand).points;
  return bestDiscard([...hand, card]).after < now - (level === 'hard' ? 0 : 1);
}

/** Knock threshold: Hard waits for a stronger hand while the stock is long. */
export function shouldKnock(deadwood: number, stockLeft: number, level: Level): boolean {
  if (deadwood === 0) return true;
  if (deadwood > 10) return false;
  if (level === 'easy') return deadwood <= 6;
  if (level === 'hard') return stockLeft < 12 ? true : deadwood <= 5;
  return true;
}
