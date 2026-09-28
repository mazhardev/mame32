import type { DifficultySetting } from '@/types';

/**
 * Tower of Hanoi. `pegs[p]` lists disc sizes on peg p from bottom to top;
 * disc 1 is the smallest. All discs start on peg 0 and must end on peg 2.
 */
export type Pegs = [number[], number[], number[]];

export const DISCS: Record<DifficultySetting, number> = { easy: 3, normal: 5, hard: 7 };
export const TARGET = 2;

export function initial(discs: number): Pegs {
  return [Array.from({ length: discs }, (_, i) => discs - i), [], []];
}

export function minMoves(discs: number): number {
  return 2 ** discs - 1;
}

export function top(peg: number[]): number | undefined {
  return peg[peg.length - 1];
}

export function canMove(pegs: Pegs, from: number, to: number): boolean {
  if (from === to) return false;
  const disc = top(pegs[from]);
  if (disc === undefined) return false;
  const under = top(pegs[to]);
  return under === undefined || under > disc;
}

export function move(pegs: Pegs, from: number, to: number): Pegs | null {
  if (!canMove(pegs, from, to)) return null;
  const next = pegs.map((p) => p.slice()) as Pegs;
  next[to].push(next[from].pop()!);
  return next;
}

export function isSolved(pegs: Pegs, discs: number): boolean {
  return pegs[TARGET].length === discs;
}

/** Peg holding each disc, indexed by disc size. */
function positions(pegs: Pegs): number[] {
  const pos: number[] = [];
  pegs.forEach((peg, p) => peg.forEach((d) => (pos[d] = p)));
  return pos;
}

/**
 * The first move of the shortest solution from any legal position.
 *
 * Work from the largest disc down: while a disc already sits on its goal
 * peg it can be ignored. The largest misplaced disc must move to the goal,
 * which first needs every smaller disc stacked on the spare peg — so the
 * smaller discs get the spare peg as their new goal, recursively.
 */
export function nextOptimalMove(pegs: Pegs, discs: number, goal = TARGET): [number, number] | null {
  const pos = positions(pegs);
  let target = goal;
  let pending: [number, number] | null = null;
  for (let d = discs; d >= 1; d--) {
    if (pos[d] === target) continue;
    // Disc d must go from pos[d] to target; smaller discs go to the spare.
    pending = [pos[d], target];
    target = 3 - pos[d] - target;
  }
  return pending;
}

/** Moves the optimal solution still needs from this position. */
export function movesRemaining(pegs: Pegs, discs: number, goal = TARGET): number {
  const pos = positions(pegs);
  let target = goal;
  let total = 0;
  for (let d = discs; d >= 1; d--) {
    if (pos[d] === target) continue;
    // Moving disc d costs 1 plus parking the d-1 smaller discs.
    total += 2 ** (d - 1);
    target = 3 - pos[d] - target;
  }
  return total;
}

export function scoreFor(discs: number, moves: number, hints: number): number {
  const best = minMoves(discs);
  const base = best * 30 + 200;
  return Math.max(50, base - (moves - best) * 10 - hints * 40);
}

export function validPegs(value: unknown, discs: number): value is Pegs {
  if (!Array.isArray(value) || value.length !== 3) return false;
  const seen = new Set<number>();
  for (const peg of value) {
    if (!Array.isArray(peg)) return false;
    for (let i = 0; i < peg.length; i++) {
      const d = peg[i];
      if (!Number.isInteger(d) || d < 1 || d > discs || seen.has(d)) return false;
      if (i > 0 && peg[i - 1] < d) return false;
      seen.add(d);
    }
  }
  return seen.size === discs;
}

export function validSave(
  v: unknown,
): v is { discs: number; pegs: Pegs; moves: number; hints: number } {
  if (typeof v !== 'object' || v === null) return false;
  const s = v as Record<string, unknown>;
  const discs = s.discs;
  if (discs !== 3 && discs !== 5 && discs !== 7) return false;
  return (
    validPegs(s.pegs, discs) &&
    !isSolved(s.pegs, discs) &&
    Number.isInteger(s.moves) &&
    (s.moves as number) >= 0 &&
    Number.isInteger(s.hints) &&
    (s.hints as number) >= 0
  );
}
