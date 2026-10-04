/**
 * Rock Paper Scissors rules and the computer player.
 *
 * Easy plays at random. Normal and Hard predict the player's next move from
 * what they played after their last move (and on Hard, after their last two
 * moves), then play whatever beats the prediction. Hard also mixes in a
 * little randomness so it cannot be exploited by a fixed counter-pattern.
 */
export type Move = 'rock' | 'paper' | 'scissors';
export const MOVES: Move[] = ['rock', 'paper', 'scissors'];
export type Outcome = 'win' | 'loss' | 'draw';

const BEATS: Record<Move, Move> = { rock: 'scissors', paper: 'rock', scissors: 'paper' };
/** The move that beats the given move. */
export const counter = (m: Move): Move => MOVES.find((x) => BEATS[x] === m)!;

export function judge(player: Move, computer: Move): Outcome {
  if (player === computer) return 'draw';
  return BEATS[player] === computer ? 'win' : 'loss';
}

export type Level = 'easy' | 'normal' | 'hard';

/** Frequency of the player's next move after a given context of moves. */
export function predict(history: Move[], order: number): Move | null {
  if (history.length <= order) return null;
  const context = history.slice(-order).join(',');
  const counts: Record<Move, number> = { rock: 0, paper: 0, scissors: 0 };
  for (let i = order; i < history.length; i++) {
    if (history.slice(i - order, i).join(',') === context) counts[history[i]] += 1;
  }
  const best = MOVES.reduce((a, b) => (counts[b] > counts[a] ? b : a));
  return counts[best] > 0 ? best : null;
}

export function computerMove(history: Move[], level: Level, random: () => number): Move {
  const randomMove = MOVES[Math.floor(random() * 3)];
  if (level === 'easy') return randomMove;
  if (level === 'hard' && random() < 0.15) return randomMove;
  const guess = (level === 'hard' ? predict(history, 2) : null) ?? predict(history, 1) ?? mostCommon(history);
  return guess ? counter(guess) : randomMove;
}

function mostCommon(history: Move[]): Move | null {
  if (!history.length) return null;
  const counts: Record<Move, number> = { rock: 0, paper: 0, scissors: 0 };
  history.forEach((m) => (counts[m] += 1));
  return MOVES.reduce((a, b) => (counts[b] > counts[a] ? b : a));
}
