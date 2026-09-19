import { B, K, P, Q, moveFlags, moveFrom, movePromo, moveTo } from './engine';
import type { Chess } from './engine';

export const MATE = 100_000;
const VALUE = [0, 100, 320, 330, 500, 900, 0];

/**
 * Piece-square bonuses, built from simple formulas rather than copied tables.
 * Indexed from White's point of view (square 0 = a8); Black mirrors ranks.
 */
function table(fn: (rank: number, file: number) => number): number[] {
  return Array.from({ length: 64 }, (_, sq) => Math.round(fn(7 - (sq >> 3), sq & 7)));
}
const centre = (rank: number, file: number) => 3.5 - Math.max(Math.abs(rank - 3.5), Math.abs(file - 3.5)); // 0 edge … 3 centre
const PST: number[][] = [
  [],
  table((rank, file) => [0, 0, 4, 10, 22, 40, 70, 0][rank] + (file === 3 || file === 4 ? [0, 0, 4, 14, 12, 6, 0, 0][rank] : 0) - (rank === 1 && (file === 3 || file === 4) ? 8 : 0)),
  table((rank, file) => centre(rank, file) * 10 - 20),
  table((rank, file) => centre(rank, file) * 5 - 5 + (rank === 0 ? -5 : 0)),
  table((rank, file) => (rank === 6 ? 15 : 0) + (file === 3 || file === 4 ? 4 : 0)),
  table((rank, file) => centre(rank, file) * 3 - 4),
  table((rank, file) => (rank === 0 ? [15, 25, 5, 0, 0, 5, 25, 15][file] : -10 * rank)),
];
const KING_END = table((rank, file) => centre(rank, file) * 12 - 18);

export function evaluate(c: Chess): number {
  const b = c.board;
  let score = 0;
  let material = 0;
  for (let sq = 0; sq < 64; sq++) {
    const p = b[sq];
    if (!p) continue;
    const t = Math.abs(p);
    if (t !== P && t !== K) material += VALUE[t];
  }
  const endgame = material <= 2600;
  let bishops1 = 0;
  let bishops2 = 0;
  for (let sq = 0; sq < 64; sq++) {
    const p = b[sq];
    if (!p) continue;
    const t = Math.abs(p);
    const idx = p > 0 ? sq : (7 - (sq >> 3)) * 8 + (sq & 7);
    const v = VALUE[t] + (t === K && endgame ? KING_END[idx] : PST[t][idx]);
    score += p > 0 ? v : -v;
    if (t === B) {
      if (p > 0) bishops1++;
      else bishops2++;
    }
  }
  if (bishops1 >= 2) score += 30;
  if (bishops2 >= 2) score -= 30;
  return score * c.turn;
}

/** Most valuable victim, least valuable attacker; promotions first. */
function order(c: Chess, moves: number[], first = -1): number[] {
  const scored = moves.map((m) => {
    let s = 0;
    if (m === first) s = 1e6;
    const victim = Math.abs(c.board[moveTo(m)]);
    if (victim) s += 10 * VALUE[victim] - VALUE[Math.abs(c.board[moveFrom(m)])] / 10 + 1000;
    if (moveFlags(m) & 1) s += 1000;
    if (movePromo(m) === Q) s += 9000;
    return [m, s] as const;
  });
  scored.sort((a, b) => b[1] - a[1]);
  return scored.map(([m]) => m);
}

const TIMEOUT = Symbol('timeout');

export interface SearchOptions {
  maxDepth: number;
  timeMs: number;
  /** Centipawns of random noise at the root, to vary play and weaken easy levels. */
  noise?: number;
}

export function bestMove(root: Chess, { maxDepth, timeMs, noise = 0 }: SearchOptions): number | null {
  const c = root.clone();
  const legal = c.moves();
  if (!legal.length) return null;
  if (legal.length === 1) return legal[0];
  const deadline = performance.now() + timeMs;
  let nodes = 0;

  const quiesce = (alpha: number, beta: number, qply: number): number => {
    if ((++nodes & 1023) === 0 && performance.now() > deadline) throw TIMEOUT;
    const stand = evaluate(c);
    if (stand >= beta) return stand;
    if (stand > alpha) alpha = stand;
    if (qply > 6) return stand;
    for (const m of order(c, c.pseudo(true))) {
      if (!c.tryMake(m)) continue;
      const v = -quiesce(-beta, -alpha, qply + 1);
      c.unmake();
      if (v >= beta) return v;
      if (v > alpha) alpha = v;
    }
    return alpha;
  };

  const search = (depth: number, alpha: number, beta: number, ply: number): number => {
    if ((++nodes & 1023) === 0 && performance.now() > deadline) throw TIMEOUT;
    if (c.half >= 100) return 0;
    const check = c.inCheck();
    if (check && ply < 12) depth++;
    if (depth <= 0) return quiesce(alpha, beta, 0);
    let legalCount = 0;
    let best = -Infinity;
    for (const m of order(c, c.pseudo())) {
      if (!c.tryMake(m)) continue;
      legalCount++;
      const v = -search(depth - 1, -beta, -alpha, ply + 1);
      c.unmake();
      if (v > best) best = v;
      if (v > alpha) alpha = v;
      if (alpha >= beta) break;
    }
    if (!legalCount) return check ? -MATE + ply : 0;
    return best;
  };

  let best = legal[0];
  let rootMoves = order(c, legal);
  const jitter = new Map(legal.map((m) => [m, Math.random() * noise]));
  for (let depth = 1; depth <= maxDepth; depth++) {
    const scores = new Map<number, number>();
    let depthBest = rootMoves[0];
    let bestScore = -Infinity;
    try {
      for (const m of rootMoves) {
        c.make(m);
        const v = -search(depth - 1, -Infinity, -bestScore + noise, 1) + (jitter.get(m) ?? 0);
        c.unmake();
        scores.set(m, v);
        if (v > bestScore) {
          bestScore = v;
          depthBest = m;
        }
      }
    } catch (e) {
      if (e !== TIMEOUT) throw e;
      // A partial iteration still counts: the previous best was searched first.
      if (depth > 1 && scores.has(best)) best = depthBest;
      break;
    }
    best = depthBest;
    rootMoves = [...rootMoves].sort((a, b) => (scores.get(b) ?? -Infinity) - (scores.get(a) ?? -Infinity));
    if (bestScore > MATE - 100) break;
  }
  return best;
}

/** Plain material count, used for simple UI read-outs. */
export function materialBalance(c: Chess): number {
  let s = 0;
  for (let sq = 0; sq < 64; sq++) {
    const p = c.board[sq];
    if (p) s += Math.sign(p) * VALUE[Math.abs(p)];
  }
  return s;
}


/**
 * Scores every legal move with a full-window search to a fixed depth.
 * Slower than bestMove, but exact — used to build and check tactics puzzles.
 */
export function analyse(root: Chess, depth: number): { move: number; score: number }[] {
  const c = root.clone();
  const quiesce = (alpha: number, beta: number, qply: number): number => {
    const stand = evaluate(c);
    if (stand >= beta) return stand;
    if (stand > alpha) alpha = stand;
    if (qply > 6) return stand;
    for (const m of order(c, c.pseudo(true))) {
      if (!c.tryMake(m)) continue;
      const v = -quiesce(-beta, -alpha, qply + 1);
      c.unmake();
      if (v >= beta) return v;
      if (v > alpha) alpha = v;
    }
    return alpha;
  };
  const search = (d: number, alpha: number, beta: number, ply: number): number => {
    const check = c.inCheck();
    if (d <= 0 && !check) return quiesce(alpha, beta, 0);
    let legalCount = 0;
    let best = -Infinity;
    for (const m of order(c, c.pseudo())) {
      if (!c.tryMake(m)) continue;
      legalCount++;
      const v = -search(d - 1, -beta, -alpha, ply + 1);
      c.unmake();
      if (v > best) best = v;
      if (v > alpha) alpha = v;
      if (alpha >= beta) break;
    }
    if (!legalCount) return check ? -MATE + ply : 0;
    return best;
  };
  return c.moves().map((move) => {
    c.make(move);
    const score = -search(depth - 1, -Infinity, Infinity, 1);
    c.unmake();
    return { move, score };
  });
}
