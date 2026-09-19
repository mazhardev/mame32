/**
 * Draughts/checkers engine covering several rule sets:
 *  - English checkers: 8×8, men move and capture forwards only, kings move one step.
 *  - International: 10×10, men capture backwards too, "flying" kings, and
 *    you must take the sequence that captures the most pieces.
 *  - Brazilian: International rules on an 8×8 board.
 *
 * Squares are indexed row * size + col; only dark squares are used.
 * Player 1 (bottom, moves up) starts; player 2 is at the top.
 */

export interface DraughtsRules {
  size: number;
  rows: number;
  flyingKings: boolean;
  menCaptureBackward: boolean;
  maxCapture: boolean;
}

export const ENGLISH: DraughtsRules = { size: 8, rows: 3, flyingKings: false, menCaptureBackward: false, maxCapture: false };
export const INTERNATIONAL: DraughtsRules = { size: 10, rows: 4, flyingKings: true, menCaptureBackward: true, maxCapture: true };
export const BRAZILIAN: DraughtsRules = { size: 8, rows: 3, flyingKings: true, menCaptureBackward: true, maxCapture: true };

/** 0 empty; 1/2 men; 3/4 kings of player 1/2. */
export type Cell = 0 | 1 | 2 | 3 | 4;
export type Player = 1 | 2;

export interface Move {
  from: number;
  /** Every square landed on, in order (one entry for a simple move). */
  path: number[];
  captured: number[];
  promotes: boolean;
}

export const owner = (c: Cell): Player | 0 => (c === 0 ? 0 : c === 1 || c === 3 ? 1 : 2);
export const isKing = (c: Cell) => c === 3 || c === 4;

export function initialBoard(rules: DraughtsRules): Cell[] {
  const { size, rows } = rules;
  const b: Cell[] = Array(size * size).fill(0);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if ((r + c) % 2 === 0) continue;
      if (r < rows) b[r * size + c] = 2;
      else if (r >= size - rows) b[r * size + c] = 1;
    }
  }
  return b;
}

const DIRS = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
];

function forward(p: Player): number {
  return p === 1 ? -1 : 1;
}

/** All legal moves for a player (captures are compulsory). */
export function legalMoves(board: Cell[], player: Player, rules: DraughtsRules): Move[] {
  const captures: Move[] = [];
  const simple: Move[] = [];
  const { size } = rules;
  for (let i = 0; i < board.length; i++) {
    if (owner(board[i]) !== player) continue;
    captures.push(...captureSequences(board, i, rules));
    if (captures.length) continue;
    const r = Math.floor(i / size);
    const c = i % size;
    const king = isKing(board[i]);
    for (const [dr, dc] of DIRS) {
      if (!king && dr !== forward(player)) continue;
      let nr = r + dr;
      let nc = c + dc;
      while (nr >= 0 && nc >= 0 && nr < size && nc < size && board[nr * size + nc] === 0) {
        const to = nr * size + nc;
        simple.push({ from: i, path: [to], captured: [], promotes: !king && promotes(to, player, rules) });
        if (!(king && rules.flyingKings)) break;
        nr += dr;
        nc += dc;
      }
    }
  }
  if (!captures.length) return simple;
  if (!rules.maxCapture) return captures;
  const most = Math.max(...captures.map((m) => m.captured.length));
  return captures.filter((m) => m.captured.length === most);
}

function promotes(square: number, player: Player, rules: DraughtsRules): boolean {
  const row = Math.floor(square / rules.size);
  return player === 1 ? row === 0 : row === rules.size - 1;
}

/**
 * Depth-first search of capture chains from one piece. Captured pieces stay
 * on the board until the move ends (they can't be jumped twice), as the
 * rules require. A man that reaches the far row mid-chain only promotes at
 * the end of the move.
 */
function captureSequences(board: Cell[], from: number, rules: DraughtsRules): Move[] {
  const piece = board[from];
  const player = owner(piece) as Player;
  const king = isKing(piece);
  const { size } = rules;
  const results: Move[] = [];
  // The moving piece has left its start square, so it counts as empty.
  const empty = (i: number) => board[i] === 0 || i === from;

  const walk = (at: number, path: number[], captured: number[]) => {
    const r = Math.floor(at / size);
    const c = at % size;
    let extended = false;
    for (const [dr, dc] of DIRS) {
      if (!king && !rules.menCaptureBackward && dr !== forward(player)) continue;
      const long = king && rules.flyingKings;
      let nr = r + dr;
      let nc = c + dc;
      // Slide over empty squares (flying kings) to find an enemy piece.
      while (long && nr >= 0 && nc >= 0 && nr < size && nc < size && empty(nr * size + nc)) {
        nr += dr;
        nc += dc;
      }
      if (nr < 0 || nc < 0 || nr >= size || nc >= size) continue;
      const mid = nr * size + nc;
      if (owner(board[mid]) === 0 || owner(board[mid]) === player || captured.includes(mid)) continue;
      let lr = nr + dr;
      let lc = nc + dc;
      while (lr >= 0 && lc >= 0 && lr < size && lc < size) {
        const land = lr * size + lc;
        if (!empty(land)) break;
        extended = true;
        walk(land, [...path, land], [...captured, mid]);
        if (!long) break;
        lr += dr;
        lc += dc;
      }
    }
    if (!extended && captured.length) {
      const end = path[path.length - 1];
      results.push({ from, path, captured, promotes: !king && promotes(end, player, rules) });
    }
  };

  walk(from, [], []);
  return results;
}

export function applyMove(board: Cell[], move: Move): Cell[] {
  const b = [...board];
  const piece = b[move.from];
  b[move.from] = 0;
  for (const c of move.captured) b[c] = 0;
  const to = move.path[move.path.length - 1];
  b[to] = move.promotes ? ((piece === 1 ? 3 : 4) as Cell) : piece;
  return b;
}

/** Material and position from player 1's point of view. */
export function evaluate(board: Cell[], rules: DraughtsRules): number {
  const { size } = rules;
  let score = 0;
  for (let i = 0; i < board.length; i++) {
    const c = board[i];
    if (!c) continue;
    const r = Math.floor(i / size);
    const col = i % size;
    const sign = owner(c) === 1 ? 1 : -1;
    let v = isKing(c) ? 175 : 100;
    if (!isKing(c)) v += (owner(c) === 1 ? size - 1 - r : r) * 3; // advancement
    if (col > 1 && col < size - 2 && r > 1 && r < size - 2) v += 4; // centre control
    if (!isKing(c) && (owner(c) === 1 ? r === size - 1 : r === 0)) v += 6; // back row guard
    score += sign * v;
  }
  return score;
}

const TIMEOUT = Symbol('timeout');

/**
 * Negamax with alpha-beta over immutable boards, deepened one ply at a time
 * until `maxDepth` or the time budget runs out. The best move from the last
 * completed depth is returned, so thinking time stays bounded on any board.
 */
export function bestMove(
  board: Cell[],
  player: Player,
  rules: DraughtsRules,
  maxDepth: number,
  timeMs = 800,
): Move | null {
  let moves = legalMoves(board, player, rules);
  if (!moves.length) return null;
  if (moves.length === 1) return moves[0];
  const deadline = performance.now() + timeMs;
  let nodes = 0;

  const search = (b: Cell[], p: Player, d: number, alpha: number, beta: number): number => {
    if ((++nodes & 1023) === 0 && performance.now() > deadline) throw TIMEOUT;
    const ms = legalMoves(b, p, rules);
    if (!ms.length) return -100000 - d;
    if (d === 0) return (p === 1 ? 1 : -1) * evaluate(b, rules);
    // Captures first improves pruning.
    ms.sort((a, c) => c.captured.length - a.captured.length);
    let best = -Infinity;
    for (const m of ms) {
      const v = -search(applyMove(b, m), p === 1 ? 2 : 1, d - 1, -beta, -alpha);
      if (v > best) best = v;
      if (v > alpha) alpha = v;
      if (alpha >= beta) break;
    }
    return best;
  };

  let best: Move = moves[0];
  for (let depth = 1; depth <= maxDepth; depth++) {
    let depthBest: Move = moves[0];
    let bestScore = -Infinity;
    const scores = new Map<Move, number>();
    try {
      for (const m of moves) {
        const v = -search(applyMove(board, m), player === 1 ? 2 : 1, depth - 1, -Infinity, -bestScore);
        // Small random tie-break so the computer doesn't always play the same game.
        const score = v + Math.random() * 0.5;
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
    // Search the most promising moves first next time.
    moves = [...moves].sort((a, b) => (scores.get(b) ?? -Infinity) - (scores.get(a) ?? -Infinity));
    if (bestScore > 50000) break; // forced win found
  }
  return best;
}

export function count(board: Cell[], player: Player): number {
  return board.filter((c) => owner(c) === player).length;
}
