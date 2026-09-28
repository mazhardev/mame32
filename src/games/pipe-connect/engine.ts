import type { DifficultySetting } from '@/types';

/**
 * Pipe Connect: every tile holds pipe openings (bit flags N/E/S/W). Tiles
 * can only be rotated. The puzzle is solved when water from the source in
 * the middle reaches every tile and no pipe end is left open.
 *
 * Puzzles come from a random spanning tree of the grid, so the solved
 * network uses every tile and contains no loops.
 */
export const N = 1;
export const E = 2;
export const S = 4;
export const W = 8;

export const SIZES: Record<DifficultySetting, number> = { easy: 5, normal: 7, hard: 9 };

/** Rotates openings clockwise by `turns` quarter turns. */
export function rotate(mask: number, turns: number): number {
  let m = mask;
  for (let t = 0; t < ((turns % 4) + 4) % 4; t++) m = ((m << 1) | (m >> 3)) & 15;
  return m;
}

export interface Puzzle {
  n: number;
  source: number;
  /** Openings of each tile in the solved orientation. */
  solution: number[];
}

const STEPS = [
  { bit: N, opp: S, dx: 0, dy: -1 },
  { bit: E, opp: W, dx: 1, dy: 0 },
  { bit: S, opp: N, dx: 0, dy: 1 },
  { bit: W, opp: E, dx: -1, dy: 0 },
];

/** Randomised Prim's algorithm: grows a spanning tree from the source. */
export function generate(n: number, random: () => number): Puzzle {
  const source = Math.floor(n / 2) * n + Math.floor(n / 2);
  const mask = Array<number>(n * n).fill(0);
  const inTree = new Uint8Array(n * n);
  inTree[source] = 1;
  const frontier: [number, number][] = [];
  const addFrontier = (c: number) => {
    const x = c % n;
    const y = Math.floor(c / n);
    for (let d = 0; d < 4; d++) {
      const nx = x + STEPS[d].dx;
      const ny = y + STEPS[d].dy;
      if (nx < 0 || ny < 0 || nx >= n || ny >= n) continue;
      const nb = ny * n + nx;
      if (!inTree[nb]) frontier.push([c, d]);
    }
  };
  addFrontier(source);
  while (frontier.length) {
    const i = Math.floor(random() * frontier.length);
    const [c, d] = frontier[i];
    frontier[i] = frontier[frontier.length - 1];
    frontier.pop();
    const nb = c + STEPS[d].dy * n + STEPS[d].dx;
    if (inTree[nb]) continue;
    // Avoid four-way crossings; they make the puzzle feel arbitrary.
    if ((mask[c] | STEPS[d].bit) === 15) continue;
    inTree[nb] = 1;
    mask[c] |= STEPS[d].bit;
    mask[nb] |= STEPS[d].opp;
    addFrontier(nb);
  }
  // A skipped crossing can, rarely, strand a tile; start again if so.
  if (inTree.some((v) => !v)) return generate(n, random);
  return { n, source, solution: mask };
}

/** Distinct orientations of a tile: straight pipes look the same after 180°. */
export function symmetry(mask: number): number {
  return rotate(mask, 1) === mask ? 1 : rotate(mask, 2) === mask ? 2 : 4;
}

/** Random starting rotations; at least half the tiles start visibly wrong. */
export function scramble(puzzle: Puzzle, random: () => number): number[] {
  for (;;) {
    const turns = puzzle.solution.map(() => Math.floor(random() * 4));
    const wrong = puzzle.solution.filter((m, i) => rotate(m, turns[i]) !== m).length;
    if (wrong >= puzzle.solution.length / 2) return turns;
  }
}

export function current(puzzle: Puzzle, turns: number[]): number[] {
  return puzzle.solution.map((m, i) => rotate(m, turns[i]));
}

/** Tiles reachable from the source through matching openings. */
export function flooded(n: number, source: number, masks: number[]): Set<number> {
  const seen = new Set([source]);
  const queue = [source];
  for (let qi = 0; qi < queue.length; qi++) {
    const c = queue[qi];
    const x = c % n;
    const y = Math.floor(c / n);
    for (const st of STEPS) {
      if (!(masks[c] & st.bit)) continue;
      const nx = x + st.dx;
      const ny = y + st.dy;
      if (nx < 0 || ny < 0 || nx >= n || ny >= n) continue;
      const nb = ny * n + nx;
      if (!(masks[nb] & st.opp) || seen.has(nb)) continue;
      seen.add(nb);
      queue.push(nb);
    }
  }
  return seen;
}

/** Openings that do not meet a matching opening on the neighbouring tile. */
export function looseEnds(n: number, masks: number[]): number {
  let loose = 0;
  masks.forEach((m, c) => {
    const x = c % n;
    const y = Math.floor(c / n);
    for (const st of STEPS) {
      if (!(m & st.bit)) continue;
      const nx = x + st.dx;
      const ny = y + st.dy;
      if (nx < 0 || ny < 0 || nx >= n || ny >= n || !(masks[ny * n + nx] & st.opp)) loose++;
    }
  });
  return loose;
}

export function isSolved(puzzle: Puzzle, turns: number[]): boolean {
  const masks = current(puzzle, turns);
  return flooded(puzzle.n, puzzle.source, masks).size === masks.length && looseEnds(puzzle.n, masks) === 0;
}

/** Fewest clockwise clicks needed to reach any solved orientation. */
export function minClicks(puzzle: Puzzle, turns: number[]): number {
  return puzzle.solution.reduce((sum, m, i) => {
    const sym = symmetry(m);
    const off = ((turns[i] % sym) + sym) % sym;
    return sum + (off === 0 ? 0 : sym - off);
  }, 0);
}

export function scoreFor(n: number, clicks: number, par: number, ms: number): number {
  const base = n * n * 15;
  return Math.max(100, Math.round(base - Math.max(0, clicks - par) * 4 - Math.max(0, ms / 1000 - n * n) * 2));
}
