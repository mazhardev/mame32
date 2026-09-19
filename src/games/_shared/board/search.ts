/**
 * Generic game-tree search for two-player, perfect-information games whose
 * states are immutable. Scores are always from the point of view of the side
 * to move (negamax). Iterative deepening under a time budget keeps the
 * computer responsive on every device.
 */
export interface SearchGame<S, M> {
  /** Legal moves for the side to move; an empty list means the game is over. */
  moves(state: S): M[];
  play(state: S, move: M): S;
  /** Heuristic score for the side to move. */
  evaluate(state: S): number;
  /** Final score for the side to move when the game has ended, else null. */
  terminal?(state: S): number | null;
  /** Whether the side to move changes after this move (false for extra turns). */
  switches?(state: S, move: M): boolean;
}

export const WIN = 1_000_000;
const TIMEOUT = Symbol('timeout');

export function searchBest<S, M>(
  game: SearchGame<S, M>,
  state: S,
  maxDepth: number,
  timeMs = 700,
  jitter = 0.5,
): M | null {
  let rootMoves = game.moves(state);
  if (!rootMoves.length) return null;
  if (rootMoves.length === 1) return rootMoves[0];
  const deadline = performance.now() + timeMs;
  let nodes = 0;
  const switches = (s: S, m: M) => (game.switches ? game.switches(s, m) : true);

  const negamax = (s: S, depth: number, alpha: number, beta: number): number => {
    if ((++nodes & 511) === 0 && performance.now() > deadline) throw TIMEOUT;
    const end = game.terminal?.(s);
    if (end !== undefined && end !== null) return end > 0 ? end + depth : end < 0 ? end - depth : 0;
    if (depth === 0) return game.evaluate(s);
    const ms = game.moves(s);
    if (!ms.length) return game.evaluate(s);
    let best = -Infinity;
    for (const m of ms) {
      const next = game.play(s, m);
      const v = switches(s, m) ? -negamax(next, depth - 1, -beta, -alpha) : negamax(next, depth - 1, alpha, beta);
      if (v > best) best = v;
      if (v > alpha) alpha = v;
      if (alpha >= beta) break;
    }
    return best;
  };

  let best = rootMoves[0];
  for (let depth = 1; depth <= maxDepth; depth++) {
    const scores = new Map<M, number>();
    let depthBest = rootMoves[0];
    let bestScore = -Infinity;
    try {
      for (const m of rootMoves) {
        const next = game.play(state, m);
        const v = switches(state, m) ? -negamax(next, depth - 1, -Infinity, -bestScore) : negamax(next, depth - 1, bestScore, Infinity);
        const score = v + Math.random() * jitter;
        scores.set(m, score);
        if (score > bestScore) {
          bestScore = score;
          depthBest = m;
        }
      }
    } catch (e) {
      if (e === TIMEOUT) break;
      throw e;
    }
    best = depthBest;
    rootMoves = [...rootMoves].sort((a, b) => (scores.get(b) ?? -Infinity) - (scores.get(a) ?? -Infinity));
    if (bestScore >= WIN / 2) break;
  }
  return best;
}

/** Easy opponents: sometimes play a random legal move instead of the best one. */
export function maybeRandom<M>(moves: M[], best: M | null, randomChance: number): M | null {
  if (!moves.length) return null;
  if (Math.random() < randomChance) return moves[Math.floor(Math.random() * moves.length)];
  return best;
}
