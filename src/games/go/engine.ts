/**
 * Go rules with Tromp-Taylor area scoring: a player's score is their stones
 * plus the empty regions that touch only their colour. Suicide is illegal and
 * simple ko is enforced.
 */
export type Color = 1 | 2; // 1 = black, 2 = white
export const PASS = -1;

export interface GoState {
  n: number;
  board: Int8Array;
  turn: Color;
  /** Point that cannot be played this turn because of ko, or -1. */
  ko: number;
  passes: number;
  captures: Record<Color, number>;
}

export function newGame(n: number): GoState {
  return { n, board: new Int8Array(n * n), turn: 1, ko: -1, passes: 0, captures: { 1: 0, 2: 0 } };
}

const neighboursCache = new Map<number, number[][]>();
export function neighbours(n: number): number[][] {
  let t = neighboursCache.get(n);
  if (!t) {
    t = Array.from({ length: n * n }, (_, i) => {
      const r = Math.floor(i / n);
      const c = i % n;
      const out: number[] = [];
      if (r > 0) out.push(i - n);
      if (r < n - 1) out.push(i + n);
      if (c > 0) out.push(i - 1);
      if (c < n - 1) out.push(i + 1);
      return out;
    });
    neighboursCache.set(n, t);
  }
  return t;
}

/** The stones of the group at `i` and whether it has any liberty (stops early). */
function groupAt(board: Int8Array, adj: number[][], i: number, stop: boolean): { stones: number[]; libs: number } {
  const color = board[i];
  const stones = [i];
  const seen = new Uint8Array(board.length);
  seen[i] = 1;
  let libs = 0;
  for (let k = 0; k < stones.length; k++) {
    for (const j of adj[stones[k]]) {
      if (seen[j]) continue;
      seen[j] = 1;
      if (board[j] === 0) {
        libs++;
        if (stop) return { stones, libs };
      } else if (board[j] === color) stones.push(j);
    }
  }
  return { stones, libs };
}

export function liberties(s: GoState, i: number): number {
  return groupAt(s.board, neighbours(s.n), i, false).libs;
}

export interface PlayResult {
  state: GoState;
  captured: number[];
}

/** Plays a move for the side to move. Returns null if the move is illegal. */
export function play(s: GoState, i: number): PlayResult | null {
  const other: Color = s.turn === 1 ? 2 : 1;
  if (i === PASS) {
    return { state: { ...s, board: s.board, turn: other, ko: -1, passes: s.passes + 1 }, captured: [] };
  }
  if (s.board[i] !== 0 || i === s.ko) return null;
  const adj = neighbours(s.n);
  const board = s.board.slice();
  board[i] = s.turn;
  const captured: number[] = [];
  for (const j of adj[i]) {
    if (board[j] !== other) continue;
    const g = groupAt(board, adj, j, true);
    if (g.libs === 0) {
      const full = groupAt(board, adj, j, false);
      for (const st of full.stones) {
        board[st] = 0;
        captured.push(st);
      }
    }
  }
  const own = groupAt(board, adj, i, false);
  if (own.libs === 0) return null; // suicide
  // Simple ko: a single stone capturing a single stone, leaving itself in atari.
  const ko = captured.length === 1 && own.stones.length === 1 && own.libs === 1 ? captured[0] : -1;
  return {
    state: {
      n: s.n,
      board,
      turn: other,
      ko,
      passes: 0,
      captures: { ...s.captures, [s.turn]: s.captures[s.turn] + captured.length } as Record<Color, number>,
    },
    captured,
  };
}

export function isLegal(s: GoState, i: number): boolean {
  return i === PASS || play(s, i) !== null;
}

/** Area score: stones on the board plus empty regions bordered by one colour only. */
export function score(board: Int8Array, n: number): { black: number; white: number; territory: Int8Array } {
  const adj = neighbours(n);
  const territory = new Int8Array(n * n);
  const seen = new Uint8Array(n * n);
  let black = 0;
  let white = 0;
  for (let i = 0; i < n * n; i++) {
    if (board[i] === 1) black++;
    else if (board[i] === 2) white++;
    if (board[i] !== 0 || seen[i]) continue;
    const region = [i];
    seen[i] = 1;
    let borders = 0; // bit 1 = black, bit 2 = white
    for (let k = 0; k < region.length; k++) {
      for (const j of adj[region[k]]) {
        if (board[j] === 0) {
          if (!seen[j]) {
            seen[j] = 1;
            region.push(j);
          }
        } else borders |= board[j];
      }
    }
    if (borders === 1 || borders === 2) {
      for (const p of region) territory[p] = borders;
      if (borders === 1) black += region.length;
      else white += region.length;
    }
  }
  return { black, white, territory };
}

/** An empty point surrounded only by `color` — filling it would waste an eye. */
function isEye(board: Int8Array, adj: number[][], i: number, color: Color): boolean {
  if (board[i] !== 0) return false;
  for (const j of adj[i]) if (board[j] !== color) return false;
  return true;
}

/**
 * Monte Carlo move choice with AMAF (all-moves-as-first) statistics: random
 * playouts are run to the end, and every point a colour played during a
 * winning playout is credited. Cheap, and plays sensible shape on small boards.
 */
export function chooseMove(s: GoState, komi: number, playouts: number, timeMs: number, rand: () => number = Math.random): number {
  const n = s.n;
  const adj = neighbours(n);
  const me = s.turn;
  const candidates: number[] = [];
  for (let i = 0; i < n * n; i++) if (s.board[i] === 0 && !isEye(s.board, adj, i, me) && isLegal(s, i)) candidates.push(i);
  if (!candidates.length) return PASS;

  const wins = new Float64Array(n * n);
  const visits = new Float64Array(n * n);
  const amafWins = new Float64Array(n * n);
  const amafVisits = new Float64Array(n * n);
  const deadline = performance.now() + timeMs;
  const played = new Int8Array(n * n);
  let total = 0;
  let totalWins = 0;

  for (let p = 0; p < playouts && (p < 50 || performance.now() < deadline); p++) {
    const first = candidates[Math.floor(rand() * candidates.length)];
    let st = play(s, first)?.state;
    if (!st) continue;
    played.fill(0);
    played[first] = me;
    let passes = 0;
    const limit = n * n * 3;
    for (let k = 0; k < limit && passes < 2; k++) {
      // Try random empty points until one is legal and not an own eye.
      const empties: number[] = [];
      for (let i = 0; i < n * n; i++) if (st.board[i] === 0 && !isEye(st.board, adj, i, st.turn)) empties.push(i);
      let moved = false;
      while (empties.length) {
        const idx = Math.floor(rand() * empties.length);
        const i = empties[idx];
        empties[idx] = empties[empties.length - 1];
        empties.pop();
        const r = play(st, i);
        if (!r) continue;
        if (!played[i]) played[i] = st.turn;
        st = r.state;
        moved = true;
        break;
      }
      if (moved) passes = 0;
      else {
        passes++;
        st = { ...st, turn: st.turn === 1 ? 2 : 1, ko: -1 };
      }
    }
    const sc = score(st.board, n);
    const blackWins = sc.black - sc.white - komi > 0;
    const won = (me === 1) === blackWins ? 1 : 0;
    total++;
    totalWins += won;
    visits[first]++;
    wins[first] += won;
    for (let i = 0; i < n * n; i++) {
      if (played[i] === me) {
        amafVisits[i]++;
        amafWins[i] += won;
      }
    }
  }

  // Blend direct and AMAF win rates; AMAF dominates when direct samples are few.
  let best = candidates[0];
  let bestValue = -1;
  for (const i of candidates) {
    const beta = amafVisits[i] / (amafVisits[i] + visits[i] + visits[i] * amafVisits[i] / 300 + 1e-9);
    const direct = visits[i] ? wins[i] / visits[i] : 0.5;
    const amaf = amafVisits[i] ? amafWins[i] / amafVisits[i] : 0.5;
    const value = (1 - beta) * direct + beta * amaf;
    if (value > bestValue) {
      bestValue = value;
      best = i;
    }
  }
  // Resign-like situations: passing is as good as anything when every line loses or wins.
  const winRate = total ? totalWins / total : 0.5;
  if (bestValue < 0.03 || winRate > 0.995) return PASS;
  return best;
}
