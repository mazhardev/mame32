/** Peg solitaire on the 33-hole cross-shaped board (7×7 without corners). */
export const N = 7;
export type Hole = -1 | 0 | 1;
export interface Jump {
  from: number;
  over: number;
  to: number;
}

const inBoard = (r: number, c: number) => r >= 0 && c >= 0 && r < N && c < N && ((r >= 2 && r <= 4) || (c >= 2 && c <= 4));
export const CENTRE = 24;

function blank(): Hole[] {
  return Array.from({ length: N * N }, (_, i) => (inBoard(Math.floor(i / N), i % N) ? 0 : -1));
}

/** Starting layouts as lists of [row, col] pegs; Classic fills every hole but the centre. */
const LAYOUTS: Record<string, [number, number][] | 'classic'> = {
  plus: [
    [1, 3],
    [2, 3],
    [3, 1],
    [3, 2],
    [3, 3],
    [3, 4],
    [3, 5],
    [4, 3],
    [5, 3],
  ],
  pyramid: [[1, 3], [2, 2], [2, 3], [2, 4], [3, 1], [3, 2], [3, 3], [3, 4], [3, 5], [4, 0], [4, 1], [4, 2], [4, 3], [4, 4], [4, 5], [4, 6]],
  classic: 'classic',
};
export type LayoutName = keyof typeof LAYOUTS;

export function layout(name: LayoutName): Hole[] {
  const b = blank();
  const spec = LAYOUTS[name];
  if (spec === 'classic') {
    for (let i = 0; i < b.length; i++) if (b[i] === 0 && i !== CENTRE) b[i] = 1;
  } else {
    for (const [r, c] of spec) b[r * N + c] = 1;
  }
  return b;
}

export function jumpsFrom(b: Hole[], from: number): Jump[] {
  if (b[from] !== 1) return [];
  const r = Math.floor(from / N);
  const c = from % N;
  const out: Jump[] = [];
  for (const [dr, dc] of [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ]) {
    const r2 = r + dr * 2;
    const c2 = c + dc * 2;
    if (!inBoard(r2, c2)) continue;
    const over = (r + dr) * N + c + dc;
    const to = r2 * N + c2;
    if (b[over] === 1 && b[to] === 0) out.push({ from, over, to });
  }
  return out;
}

export function allJumps(b: Hole[]): Jump[] {
  const out: Jump[] = [];
  for (let i = 0; i < b.length; i++) out.push(...jumpsFrom(b, i));
  return out;
}

export function apply(b: Hole[], j: Jump): Hole[] {
  const next = [...b];
  next[j.from] = 0;
  next[j.over] = 0;
  next[j.to] = 1;
  return next;
}

export const pegCount = (b: Hole[]) => b.filter((h) => h === 1).length;

/**
 * Depth-first search for a sequence leaving one peg (optionally in the
 * centre). Dead positions are memoised, which keeps the small layouts instant.
 * Returns null if unsolvable or the node budget runs out.
 */
export function solve(b: Hole[], centre = false, budget = 200_000): Jump[] | null {
  const dead = new Set<string>();
  let nodes = 0;
  const path: Jump[] = [];
  const dfs = (s: Hole[]): boolean => {
    if (++nodes > budget) return false;
    if (pegCount(s) === 1) return !centre || s[CENTRE] === 1;
    const key = s.join('');
    if (dead.has(key)) return false;
    for (const j of allJumps(s)) {
      path.push(j);
      if (dfs(apply(s, j))) return true;
      path.pop();
    }
    dead.add(key);
    return false;
  };
  return dfs(b) ? path : null;
}
