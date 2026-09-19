import type { Card } from '../_shared/cards/deck';
import { dealHands, high, legalPlays, trickWinner, unseenHigher } from '../_shared/cards/tricks';
import type { Play } from '../_shared/cards/tricks';

/** Partnership Spades: you (0) and North (2) against West (1) and East (3). Spades are trumps. */
export const teamOf = (seat: number) => seat % 2;

export interface SpadesState {
  hands: Card[][];
  bids: (number | null)[];
  trick: Play[];
  leader: number;
  tricksWon: number[];
  broken: boolean;
  played: Card[];
  tricks: number;
}

export function newHand(leader: number, rand: () => number = Math.random): SpadesState {
  return { hands: dealHands(rand), bids: [null, null, null, null], trick: [], leader, tricksWon: [0, 0, 0, 0], broken: false, played: [], tricks: 0 };
}

export const turnOf = (s: SpadesState) => (s.leader + s.trick.length) % 4;

export function legal(s: SpadesState, seat: number): Card[] {
  return legalPlays(s.hands[seat], s.trick, { locked: 'spades', broken: s.broken });
}

export function playCard(s: SpadesState, card: Card): { state: SpadesState; winner: number | null } {
  const seat = turnOf(s);
  const hands = s.hands.map((h, i) => (i === seat ? h.filter((c) => c.id !== card.id) : h));
  const trick = [...s.trick, { seat, card }];
  const broken = s.broken || card.suit === 'spades';
  if (trick.length < 4) return { state: { ...s, hands, trick, broken }, winner: null };
  const w = trickWinner(trick, 'spades').seat;
  const tricksWon = [...s.tricksWon];
  tricksWon[w]++;
  return { state: { ...s, hands, trick: [], leader: w, tricksWon, broken, played: [...s.played, ...trick.map((p) => p.card)], tricks: s.tricks + 1 }, winner: w };
}

/** Estimates tricks a hand will take: aces, protected kings, and spade length. */
export function suggestBid(hand: Card[]): number {
  let t = 0;
  const bySuit = (suit: string) => hand.filter((c) => c.suit === suit);
  for (const suit of ['clubs', 'diamonds', 'hearts']) {
    const cards = bySuit(suit);
    if (cards.some((c) => c.rank === 1)) t += 1;
    if (cards.some((c) => c.rank === 13) && cards.length >= 2 && cards.length <= 5) t += 0.75;
    if (cards.some((c) => c.rank === 12) && cards.length >= 3 && cards.length <= 4) t += 0.25;
  }
  const spades = bySuit('spades');
  for (const c of spades) if (high(c) >= 12) t += high(c) === 14 ? 1 : high(c) === 13 ? 0.8 : 0.5;
  t += Math.max(0, spades.length - 3) * 0.8;
  return Math.max(1, Math.min(13, Math.round(t)));
}

export interface HandResult {
  team: [number, number];
  bags: [number, number];
  made: [boolean, boolean];
}

/** Team contract scoring: 10 × bid if made (plus one per overtrick "bag"), −10 × bid if set. */
export function scoreHand(bids: number[], tricksWon: number[]): HandResult {
  const team: [number, number] = [0, 0];
  const bags: [number, number] = [0, 0];
  const made: [boolean, boolean] = [false, false];
  for (const t of [0, 1] as const) {
    const bid = bids[t] + bids[t + 2];
    const took = tricksWon[t] + tricksWon[t + 2];
    if (took >= bid) {
      team[t] = bid * 10 + (took - bid);
      bags[t] = took - bid;
      made[t] = true;
    } else team[t] = -bid * 10;
  }
  return { team, bags, made };
}

/** Every 10 accumulated bags costs 100 points. */
export function applyBags(score: number, bagsBefore: number, newBags: number): { score: number; bags: number } {
  let bags = bagsBefore + newBags;
  let sc = score;
  while (bags >= 10) {
    bags -= 10;
    sc -= 100;
  }
  return { score: sc, bags };
}

export type Level = 'easy' | 'normal' | 'hard';

export function chooseCard(s: SpadesState, level: Level, rand: () => number = Math.random): Card {
  const seat = turnOf(s);
  const options = legal(s, seat);
  if (options.length === 1 || level === 'easy') return options[Math.floor(rand() * options.length)];
  const hand = s.hands[seat];
  const byHigh = [...options].sort((a, b) => high(a) - high(b));
  const team = teamOf(seat);
  const teamBid = (s.bids[team] ?? 0) + (s.bids[team + 2] ?? 0);
  const teamTook = s.tricksWon[team] + s.tricksWon[team + 2];
  const avoidBags = level === 'hard' && teamTook >= teamBid;
  const sure = (c: Card) => unseenHigher(c, s.played, hand) === 0;

  if (!s.trick.length) {
    if (!avoidBags) {
      const winner = byHigh.filter((c) => c.suit !== 'spades' && sure(c)).pop();
      if (winner) return winner;
      const topSpade = byHigh.filter((c) => c.suit === 'spades' && sure(c)).pop();
      if (topSpade) return topSpade;
    }
    const nonSpades = byHigh.filter((c) => c.suit !== 'spades');
    return (nonSpades.length ? nonSpades : byHigh)[0];
  }

  const best = trickWinner(s.trick, 'spades');
  const partnerWinning = teamOf(best.seat) === team;
  const last = s.trick.length === 3;
  const beats = (c: Card) => trickWinner([...s.trick, { seat, card: c }], 'spades').seat === seat;
  const winners = byHigh.filter(beats);

  if (avoidBags || (partnerWinning && (last || high(best.card) >= 13 || best.card.suit === 'spades'))) {
    // Stay under if possible, and never waste a spade.
    const losing = byHigh.filter((c) => !beats(c));
    const pool = losing.length ? losing : byHigh;
    const nonSpade = pool.filter((c) => c.suit !== 'spades');
    return (nonSpade.length ? nonSpade : pool)[0];
  }
  if (winners.length) return last ? winners[0] : winners[winners.length - 1].suit === 'spades' ? winners[0] : winners[winners.length - 1];
  const nonSpade = byHigh.filter((c) => c.suit !== 'spades');
  return (nonSpade.length ? nonSpade : byHigh)[0];
}
