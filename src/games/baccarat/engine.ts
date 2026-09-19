import { buildDeck, shuffleDeck } from '../_shared/cards/deck';
import type { Card } from '../_shared/cards/deck';

/** Baccarat values: aces 1, tens and faces 0, totals count only the last digit. */
export const cardPoints = (c: Card) => (c.rank >= 10 ? 0 : c.rank);
export const total = (cards: Card[]) => cards.reduce((s, c) => s + cardPoints(c), 0) % 10;

export type Side = 'player' | 'banker' | 'tie';

export function shoe(decks = 6, rand: () => number = Math.random): Card[] {
  return shuffleDeck(buildDeck(decks, true), rand);
}

/** Whether the banker draws, given the banker total and the player's third card (null if the player stood). */
export function bankerDraws(banker: number, playerThird: Card | null): boolean {
  if (playerThird === null) return banker <= 5;
  const x = cardPoints(playerThird);
  if (banker <= 2) return true;
  if (banker === 3) return x !== 8;
  if (banker === 4) return x >= 2 && x <= 7;
  if (banker === 5) return x >= 4 && x <= 7;
  if (banker === 6) return x === 6 || x === 7;
  return false;
}

export interface Coup {
  player: Card[];
  banker: Card[];
  winner: Side;
  rest: Card[];
}

/** Plays one coup from the shoe following the standard drawing rules. */
export function play(cards: Card[]): Coup {
  const s = [...cards];
  // Cards are dealt alternately: player, banker, player, banker.
  const [p1, b1, p2, b2] = s.splice(0, 4);
  const player = [p1, p2];
  const banker = [b1, b2];
  const natural = total(player) >= 8 || total(banker) >= 8;
  if (!natural) {
    let third: Card | null = null;
    if (total(player) <= 5) {
      third = s.shift() as Card;
      player.push(third);
    }
    if (bankerDraws(total(banker), third)) banker.push(s.shift() as Card);
  }
  const p = total(player);
  const b = total(banker);
  return { player, banker, winner: p === b ? 'tie' : p > b ? 'player' : 'banker', rest: s };
}

/** Net change to the bank for a stake on `side`. Banker wins pay 0.95 to 1; ties pay 8 to 1 and push other bets. */
export function payout(side: Side, stake: number, winner: Side): number {
  if (winner === 'tie') return side === 'tie' ? stake * 8 : 0;
  if (side !== winner) return -stake;
  return side === 'banker' ? Math.floor(stake * 0.95) : stake;
}
