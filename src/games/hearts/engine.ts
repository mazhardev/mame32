import type { Card } from '../_shared/cards/deck';
import { dealHands, high, legalPlays, sortHand, trickWinner } from '../_shared/cards/tricks';
import type { Play } from '../_shared/cards/tricks';

export const isQueenSpades = (c: Card) => c.suit === 'spades' && c.rank === 12;
export const points = (c: Card) => (c.suit === 'hearts' ? 1 : isQueenSpades(c) ? 13 : 0);
const isTwoClubs = (c: Card) => c.suit === 'clubs' && c.rank === 2;

/** Hand 1 passes left, 2 right, 3 across, 4 holds. */
export const passOffset = (handNo: number) => [1, 3, 2, 0][(handNo - 1) % 4];

export interface HeartsState {
  hands: Card[][];
  trick: Play[];
  leader: number;
  taken: number[];
  broken: boolean;
  played: Card[];
  tricks: number;
}

export function newHand(rand: () => number = Math.random): HeartsState {
  return { hands: dealHands(rand), trick: [], leader: 0, taken: [0, 0, 0, 0], broken: false, played: [], tricks: 0 };
}

export function applyPass(hands: Card[][], picks: Card[][], offset: number): Card[][] {
  if (!offset) return hands;
  const next = hands.map((h, s) => h.filter((c) => !picks[s].some((p) => p.id === c.id)));
  for (let s = 0; s < 4; s++) next[(s + offset) % 4].push(...picks[s]);
  return next.map(sortHand);
}

/** After passing, whoever holds the two of clubs leads it. */
export function startPlay(s: HeartsState): HeartsState {
  const leader = s.hands.findIndex((h) => h.some(isTwoClubs));
  return { ...s, leader };
}

export const turnOf = (s: HeartsState) => (s.leader + s.trick.length) % 4;

export function legal(s: HeartsState, seat: number): Card[] {
  const two = s.tricks === 0 && !s.trick.length ? s.hands[seat].find(isTwoClubs) : undefined;
  return legalPlays(s.hands[seat], s.trick, { locked: 'hearts', broken: s.broken, firstTrick: s.tricks === 0, isPoint: (c) => points(c) > 0, mustLead: two });
}

/** Plays a card; when the trick completes, the winner takes the points and leads next. */
export function playCard(s: HeartsState, card: Card): { state: HeartsState; winner: number | null } {
  const seat = turnOf(s);
  const hands = s.hands.map((h, i) => (i === seat ? h.filter((c) => c.id !== card.id) : h));
  const trick = [...s.trick, { seat, card }];
  const broken = s.broken || card.suit === 'hearts';
  if (trick.length < 4) return { state: { ...s, hands, trick, broken }, winner: null };
  const w = trickWinner(trick, null).seat;
  const taken = [...s.taken];
  taken[w] += trick.reduce((n, p) => n + points(p.card), 0);
  return {
    state: { hands, trick: [], leader: w, taken, broken, played: [...s.played, ...trick.map((p) => p.card)], tricks: s.tricks + 1 },
    winner: w,
  };
}

/** Points added to each seat for a finished hand, applying "shooting the moon". */
export function handScores(taken: number[]): { add: number[]; moon: number | null } {
  const moon = taken.findIndex((t) => t === 26);
  if (moon >= 0) return { add: taken.map((_, i) => (i === moon ? 0 : 26)), moon };
  return { add: [...taken], moon: null };
}

export type Level = 'easy' | 'normal' | 'hard';

/** Chooses three cards to pass: the queen and high spades, then high hearts, then high cards. */
export function choosePass(hand: Card[], level: Level, rand: () => number = Math.random): Card[] {
  if (level === 'easy') return [...hand].sort(() => rand() - 0.5).slice(0, 3);
  const spades = hand.filter((c) => c.suit === 'spades').length;
  const danger = (c: Card) => {
    if (isQueenSpades(c)) return spades >= 5 ? 5 : 100;
    if (c.suit === 'spades' && high(c) > 12) return spades >= 5 ? 4 : 80;
    if (c.suit === 'hearts') return 20 + high(c) * 2;
    return high(c) * 2 - hand.filter((x) => x.suit === c.suit).length;
  };
  return [...hand].sort((a, b) => danger(b) - danger(a)).slice(0, 3);
}

/** Computer card choice. */
export function chooseCard(s: HeartsState, level: Level, rand: () => number = Math.random): Card {
  const seat = turnOf(s);
  const options = legal(s, seat);
  if (options.length === 1 || level === 'easy') return options[Math.floor(rand() * options.length)];
  const hand = s.hands[seat];
  const byHigh = [...options].sort((a, b) => high(a) - high(b));
  const queenOut = !s.played.some(isQueenSpades) && !hand.some(isQueenSpades);

  if (!s.trick.length) {
    // Lead low from the longest non-heart suit; avoid leading spades into the queen with A/K.
    const safe = byHigh.filter((c) => !(level === 'hard' && queenOut && c.suit === 'spades' && high(c) > 12));
    const pool = safe.length ? safe : byHigh;
    const len = (c: Card) => hand.filter((x) => x.suit === c.suit).length;
    return [...pool].sort((a, b) => high(a) - high(b) || len(b) - len(a))[0];
  }

  const led = s.trick[0].card.suit;
  const following = options[0].suit === led;
  const winning = trickWinner(s.trick, null).card;
  const last = s.trick.length === 3;
  const trickPoints = s.trick.reduce((n, p) => n + points(p.card), 0);

  if (following) {
    const under = byHigh.filter((c) => high(c) < high(winning));
    if (under.length) {
      // Never drop the queen under a higher spade is fine — she goes to the winner.
      return under[under.length - 1];
    }
    if (last && trickPoints === 0) return byHigh[byHigh.length - 1];
    // Must win anyway: avoid winning with the queen.
    const noQueen = byHigh.filter((c) => !isQueenSpades(c));
    return (noQueen.length ? noQueen : byHigh)[0];
  }

  // Void in the suit led: dump the most dangerous card.
  const q = options.find(isQueenSpades);
  if (q) return q;
  const highSpade = options.filter((c) => c.suit === 'spades' && high(c) > 12);
  if (highSpade.length && queenOut) return highSpade[highSpade.length - 1];
  const hearts = options.filter((c) => c.suit === 'hearts').sort((a, b) => high(b) - high(a));
  if (hearts.length) return hearts[0];
  if (level === 'hard') {
    // Shed from the shortest suit to create a void.
    const len = (c: Card) => hand.filter((x) => x.suit === c.suit).length;
    return [...options].sort((a, b) => len(a) - len(b) || high(b) - high(a))[0];
  }
  return byHigh[byHigh.length - 1];
}
