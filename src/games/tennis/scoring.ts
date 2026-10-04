import type { Side } from '../_shared/rally/rally';

/**
 * Short-format tennis scoring: first to 4 games, no-advantage games (the
 * point at 40–40 decides the game) and a tie-break to 7 at 3–3.
 */
export interface Match {
  games: [number, number];
  points: [number, number];
  tiebreak: boolean;
  /** Who serves the current game (or served first in the tie-break). */
  gameServer: Side;
  winner: Side | null;
  /** Games won without losing a point. */
  loveGames: number;
}

export const GAMES_TO_WIN = 4;
const CALLS = ['0', '15', '30', '40'];

export function newMatch(server: Side = 0): Match {
  return { games: [0, 0], points: [0, 0], tiebreak: false, gameServer: server, winner: null, loveGames: 0 };
}

export function server(m: Match): Side {
  if (!m.tiebreak) return m.gameServer;
  const total = m.points[0] + m.points[1];
  return ((m.gameServer + Math.floor((total + 1) / 2)) % 2) as Side;
}

/** Records a point; returns 'game' or 'match' when one ends. */
export function pointTo(m: Match, who: Side): 'point' | 'game' | 'match' {
  if (m.winner !== null) return 'match';
  const them: Side = who === 0 ? 1 : 0;
  m.points[who] += 1;
  if (m.tiebreak) {
    if (m.points[who] >= 7 && m.points[who] - m.points[them] >= 2) {
      m.games[who] += 1;
      m.winner = who;
      return 'match';
    }
    return 'point';
  }
  if (m.points[who] < 4) return 'point';
  if (who === 0 && m.points[them] === 0) m.loveGames += 1;
  m.games[who] += 1;
  m.points = [0, 0];
  m.gameServer = m.gameServer === 0 ? 1 : 0;
  if (m.games[who] === GAMES_TO_WIN) {
    m.winner = who;
    return 'match';
  }
  if (m.games[0] === GAMES_TO_WIN - 1 && m.games[1] === GAMES_TO_WIN - 1) m.tiebreak = true;
  return 'game';
}

/** "30–15", "Deciding point", or tie-break points. */
export function callScore(m: Match): string {
  const [a, b] = m.points;
  if (m.tiebreak) return `Tie-break ${a}–${b}`;
  if (a === 3 && b === 3) return 'Deciding point';
  return `${CALLS[a]}–${CALLS[b]}`;
}
