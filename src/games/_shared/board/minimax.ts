/**
 * Generic alpha-beta search shared by the board-game AIs.
 * The caller supplies an adapter that can list moves, apply and undo them, and
 * score a position; the search itself is game agnostic.
 */
export interface SearchAdapter<M> {
  getMoves: () => M[];
  apply: (move: M) => void;
  undo: (move: M) => void;
  /** Positive scores favour the maximising player. */
  evaluate: () => number;
  isTerminal: () => boolean;
  /** Optional move ordering hint; better moves first prunes far more. */
  order?: (moves: M[]) => M[];
}

export interface SearchResult<M> {
  move: M | null;
  score: number;
  nodes: number;
}

const WIN = 1_000_000;

export function alphaBeta<M>(
  adapter: SearchAdapter<M>,
  depth: number,
  maximizing: boolean,
): SearchResult<M> {
  let nodes = 0;

  function search(depthLeft: number, alpha: number, beta: number, isMax: boolean): number {
    nodes += 1;
    if (depthLeft === 0 || adapter.isTerminal()) {
      const score = adapter.evaluate();
      // Prefer faster wins and slower losses by nudging with remaining depth.
      if (score >= WIN) return score + depthLeft;
      if (score <= -WIN) return score - depthLeft;
      return score;
    }

    const moves = adapter.order ? adapter.order(adapter.getMoves()) : adapter.getMoves();
    if (!moves.length) return adapter.evaluate();

    if (isMax) {
      let best = -Infinity;
      for (const move of moves) {
        adapter.apply(move);
        const value = search(depthLeft - 1, alpha, beta, false);
        adapter.undo(move);
        if (value > best) best = value;
        if (best > alpha) alpha = best;
        if (alpha >= beta) break;
      }
      return best;
    }

    let best = Infinity;
    for (const move of moves) {
      adapter.apply(move);
      const value = search(depthLeft - 1, alpha, beta, true);
      adapter.undo(move);
      if (value < best) best = value;
      if (best < beta) beta = best;
      if (alpha >= beta) break;
    }
    return best;
  }

  const moves = adapter.order ? adapter.order(adapter.getMoves()) : adapter.getMoves();
  let bestMove: M | null = null;
  let bestScore = maximizing ? -Infinity : Infinity;

  for (const move of moves) {
    adapter.apply(move);
    const value = search(depth - 1, -Infinity, Infinity, !maximizing);
    adapter.undo(move);
    if (maximizing ? value > bestScore : value < bestScore) {
      bestScore = value;
      bestMove = move;
    }
  }

  return { move: bestMove, score: bestScore, nodes };
}

export const WIN_SCORE = WIN;
