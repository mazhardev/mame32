/**
 * Hex on an n×n rhombus. Red (1) links the top and bottom edges; Blue (2)
 * links the left and right edges. There are no draws: a full board always
 * contains exactly one winning chain.
 */
export type Cell = 0 | 1 | 2;

export function neighbours(i: number, n: number): number[] {
  const r = Math.floor(i / n);
  const c = i % n;
  const out: number[] = [];
  const steps: [number, number][] = [
    [-1, 0],
    [-1, 1],
    [0, -1],
    [0, 1],
    [1, -1],
    [1, 0],
  ];
  for (const [dr, dc] of steps) {
    const rr = r + dr;
    const cc = c + dc;
    if (rr >= 0 && cc >= 0 && rr < n && cc < n) out.push(rr * n + cc);
  }
  return out;
}

const onStart = (i: number, n: number, p: 1 | 2) => (p === 1 ? i < n : i % n === 0);
const onEnd = (i: number, n: number, p: 1 | 2) => (p === 1 ? i >= n * (n - 1) : i % n === n - 1);

/** The winning chain for `p`, or null. */
export function winningChain(b: Cell[], n: number, p: 1 | 2): number[] | null {
  const prev = new Map<number, number>();
  const queue: number[] = [];
  for (let i = 0; i < n * n; i++) {
    if (b[i] === p && onStart(i, n, p)) {
      prev.set(i, -1);
      queue.push(i);
    }
  }
  while (queue.length) {
    const i = queue.shift() as number;
    if (onEnd(i, n, p)) {
      const chain = [i];
      let k = prev.get(i) as number;
      while (k !== -1) {
        chain.push(k);
        k = prev.get(k) as number;
      }
      return chain;
    }
    for (const j of neighbours(i, n)) {
      if (b[j] === p && !prev.has(j)) {
        prev.set(j, i);
        queue.push(j);
      }
    }
  }
  return null;
}

/**
 * Fewest empty cells `p` still needs to connect their edges (0–1 BFS: own
 * stones are free, empty cells cost one, opponent stones are walls).
 */
export function distance(b: Cell[], n: number, p: 1 | 2): number {
  const INF = 1e9;
  const dist = new Array<number>(n * n).fill(INF);
  const deque: number[] = [];
  for (let i = 0; i < n * n; i++) {
    if (!onStart(i, n, p) || (b[i] !== 0 && b[i] !== p)) continue;
    dist[i] = b[i] === p ? 0 : 1;
    if (dist[i] === 0) deque.unshift(i);
    else deque.push(i);
  }
  let best = INF;
  while (deque.length) {
    const i = deque.shift() as number;
    if (dist[i] >= best) continue;
    if (onEnd(i, n, p)) {
      best = dist[i];
      continue;
    }
    for (const j of neighbours(i, n)) {
      if (b[j] !== 0 && b[j] !== p) continue;
      const d = dist[i] + (b[j] === p ? 0 : 1);
      if (d < dist[j]) {
        dist[j] = d;
        if (b[j] === p) deque.unshift(j);
        else deque.push(j);
      }
    }
  }
  return best;
}

/** Positive when `me` is closer to connecting than the opponent. */
function evaluate(b: Cell[], n: number, me: 1 | 2): number {
  const them = me === 1 ? 2 : 1;
  const mine = distance(b, n, me);
  const theirs = distance(b, n, them);
  if (mine === 0) return 1e6;
  if (theirs === 0) return -1e6;
  return theirs * 10 - mine * 11;
}

function centrality(i: number, n: number): number {
  const r = Math.floor(i / n);
  const c = i % n;
  const m = (n - 1) / 2;
  return -(Math.abs(r - m) + Math.abs(c - m) + Math.abs(r + c - 2 * m)) * 0.05;
}

export type HexLevel = 'easy' | 'normal' | 'hard';

/**
 * Picks a move for `me`. Every empty cell is scored by the resulting race of
 * shortest-path distances; Hard also looks at the opponent's best reply to
 * the strongest candidates.
 */
export function chooseMove(b: Cell[], n: number, me: 1 | 2, level: HexLevel): number {
  const empties: number[] = [];
  for (let i = 0; i < n * n; i++) if (!b[i]) empties.push(i);
  if (empties.length === n * n) {
    const mid = Math.floor(n / 2);
    return mid * n + mid;
  }
  const them = me === 1 ? 2 : 1;
  const scored = empties
    .map((i) => {
      const next = [...b];
      next[i] = me;
      return [i, evaluate(next, n, me) + centrality(i, n) + Math.random() * (level === 'easy' ? 12 : 0.5)] as const;
    })
    .sort((x, y) => y[1] - x[1]);
  if (level !== 'hard' || scored[0][1] >= 1e6) return scored[0][0];

  let best = scored[0][0];
  let bestValue = -Infinity;
  for (const [i] of scored.slice(0, 7)) {
    const next = [...b];
    next[i] = me;
    let worst = Infinity;
    const replies = empties.filter((j) => j !== i);
    for (const j of replies) {
      const after = [...next];
      after[j] = them;
      const v = evaluate(after, n, me);
      if (v < worst) worst = v;
    }
    const value = worst + centrality(i, n);
    if (value > bestValue) {
      bestValue = value;
      best = i;
    }
  }
  return best;
}
