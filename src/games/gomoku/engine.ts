export const SIZE = 15;
export type Stone = 0 | 1 | 2;
const DIRS: [number, number][] = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

const at = (b: Stone[], r: number, c: number): Stone | -1 =>
  r < 0 || c < 0 || r >= SIZE || c >= SIZE ? -1 : b[r * SIZE + c];

/** The winning line through `i` (5+ in a row), or null. */
export function winningLine(b: Stone[], i: number): number[] | null {
  const p = b[i];
  if (!p) return null;
  const r0 = Math.floor(i / SIZE);
  const c0 = i % SIZE;
  for (const [dr, dc] of DIRS) {
    const line = [i];
    for (const s of [1, -1]) {
      let r = r0 + dr * s;
      let c = c0 + dc * s;
      while (at(b, r, c) === p) {
        line.push(r * SIZE + c);
        r += dr * s;
        c += dc * s;
      }
    }
    if (line.length >= 5) return line;
  }
  return null;
}

/**
 * How valuable a line is for `p` if they place at (r, c): counts stones in a
 * row and how many ends are open. Five wins outright; open fours are next.
 */
function lineValue(b: Stone[], r0: number, c0: number, dr: number, dc: number, p: Stone): number {
  let count = 1;
  let open = 0;
  for (const s of [1, -1]) {
    let r = r0 + dr * s;
    let c = c0 + dc * s;
    while (at(b, r, c) === p) {
      count++;
      r += dr * s;
      c += dc * s;
    }
    if (at(b, r, c) === 0) open++;
  }
  if (count >= 5) return 1_000_000;
  if (open === 0) return 0;
  const table: Record<number, [number, number]> = {
    4: [5_000, 100_000],
    3: [400, 5_000],
    2: [40, 400],
    1: [2, 20],
  };
  return table[count][open - 1];
}

export function pointScore(b: Stone[], i: number, me: Stone, defence = 0.9): number {
  if (b[i]) return -1;
  const them = me === 1 ? 2 : 1;
  const r = Math.floor(i / SIZE);
  const c = i % SIZE;
  let attack = 0;
  let block = 0;
  for (const [dr, dc] of DIRS) {
    attack += lineValue(b, r, c, dr, dc, me);
    block += lineValue(b, r, c, dr, dc, them);
  }
  // Slight preference for the centre on an empty board.
  const centre = 14 - Math.abs(r - 7) - Math.abs(c - 7);
  return attack + block * defence + centre * 0.01;
}

/** Empty points next to existing stones — the only sensible candidates. */
export function candidates(b: Stone[]): number[] {
  if (b.every((s) => !s)) return [Math.floor((SIZE * SIZE) / 2)];
  const out: number[] = [];
  for (let i = 0; i < b.length; i++) {
    if (b[i]) continue;
    const r = Math.floor(i / SIZE);
    const c = i % SIZE;
    let near = false;
    for (let dr = -2; dr <= 2 && !near; dr++) for (let dc = -2; dc <= 2 && !near; dc++) if (at(b, r + dr, c + dc) > 0) near = true;
    if (near) out.push(i);
  }
  return out;
}

/**
 * Chooses a move. Easy picks among the top few; Normal takes the best; Hard
 * also checks each top candidate for an immediate threat it would allow.
 */
export function chooseMove(b: Stone[], me: Stone, level: 'easy' | 'normal' | 'hard'): number {
  const cands = candidates(b);
  const scored = cands.map((i) => [i, pointScore(b, i, me, level === 'easy' ? 0.6 : 0.95)] as const).sort((a, c) => c[1] - a[1]);
  if (level === 'easy' && scored[0][1] < 1_000_000) {
    const top = scored.slice(0, 4);
    return top[Math.floor(Math.random() * top.length)][0];
  }
  if (level === 'hard' && scored[0][1] < 1_000_000) {
    const them = me === 1 ? 2 : 1;
    let best = scored[0][0];
    let bestValue = -Infinity;
    for (const [i, s] of scored.slice(0, 8)) {
      const next = [...b];
      next[i] = me;
      const reply = Math.max(...candidates(next).map((j) => pointScore(next, j, them, 0.95)));
      const value = s - reply * 0.8;
      if (value > bestValue) {
        bestValue = value;
        best = i;
      }
    }
    return best;
  }
  return scored[0][0];
}
