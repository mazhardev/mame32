import { buildDeck, shuffleDeck } from '../_shared/cards/deck';
import type { Card } from '../_shared/cards/deck';

/** War: aces are high; ties trigger a "war" of three face-down cards and one face-up. */
export const warRank = (c: Card) => (c.rank === 1 ? 14 : c.rank);

export interface WarState {
  you: Card[];
  cpu: Card[];
  round: number;
}

export function deal(rand: () => number = Math.random): WarState {
  const d = shuffleDeck(buildDeck(), rand);
  return { you: d.slice(0, 26), cpu: d.slice(26), round: 0 };
}

export interface Battle {
  state: WarState;
  /** Face-up cards compared in each stage (more than one stage means war). */
  stages: [Card, Card][];
  winner: 'you' | 'cpu';
  pot: number;
}

/**
 * Plays one round. A player who cannot finish a war (too few cards) loses
 * the round and, with it, all their remaining cards.
 */
export function battle(s: WarState, rand: () => number = Math.random): Battle {
  const you = [...s.you];
  const cpu = [...s.cpu];
  const pot: Card[] = [];
  const stages: [Card, Card][] = [];
  for (;;) {
    if (!you.length || !cpu.length) break;
    const a = you.shift() as Card;
    const b = cpu.shift() as Card;
    pot.push(a, b);
    stages.push([a, b]);
    if (warRank(a) !== warRank(b)) break;
    // War: three cards face down each (or as many as possible, keeping one to flip).
    const n = Math.min(3, you.length - 1, cpu.length - 1);
    if (n < 0 || !you.length || !cpu.length) break;
    pot.push(...you.splice(0, n), ...cpu.splice(0, n));
  }
  const last = stages[stages.length - 1];
  let winner: 'you' | 'cpu';
  if (warRank(last[0]) !== warRank(last[1])) winner = warRank(last[0]) > warRank(last[1]) ? 'you' : 'cpu';
  else winner = you.length >= cpu.length ? 'you' : 'cpu';
  // Winnings go to the bottom in a random order, which avoids endless loops.
  const won = shuffleDeck(pot, rand).map((c) => ({ ...c, faceUp: false }));
  if (winner === 'you') you.push(...won);
  else cpu.push(...won);
  if (warRank(last[0]) === warRank(last[1])) {
    // Unfinished war: the side that ran out forfeits whatever is left.
    if (winner === 'you') you.push(...cpu.splice(0));
    else cpu.push(...you.splice(0));
  }
  return { state: { you, cpu, round: s.round + 1 }, stages, winner, pot: pot.length };
}
