import { hamiltonianPath } from '../_shared/puzzle/hamilton';

/**
 * Number Path: draw one line through every square of the grid, starting at 1
 * and passing the numbered squares in order, finishing on the last number.
 *
 * A puzzle is a random path through every square with some squares numbered
 * along it. The generator then searches for other paths that fit the numbers
 * and, while it finds one, adds a number where the two paths differ, so each
 * puzzle ends up with a single solution.
 */
export interface Puzzle {
  w: number;
  h: number;
  /** Numbered squares in order: clues[0] is "1". */
  clues: number[];
  solution: number[];
}

const neighbours = (w: number, h: number, c: number) => {
  const x = c % w;
  const y = Math.floor(c / w);
  const out: number[] = [];
  if (x > 0) out.push(c - 1);
  if (x < w - 1) out.push(c + 1);
  if (y > 0) out.push(c - w);
  if (y < h - 1) out.push(c + w);
  return out;
};

/**
 * Finds up to `limit` paths that fit the clues (stopping early after `budget`
 * search steps). Returns the paths found and whether the search finished.
 */
export function findPaths(w: number, h: number, clues: number[], limit = 2, budget = 400_000): { paths: number[][]; complete: boolean } {
  const total = w * h;
  const order = new Map<number, number>();
  clues.forEach((c, i) => order.set(c, i));
  const visited = new Uint8Array(total);
  const path: number[] = [clues[0]];
  visited[clues[0]] = 1;
  const found: number[][] = [];
  let steps = 0;

  // Every unvisited square must still be reachable from the head.
  const connected = (head: number, left: number) => {
    const seen = new Uint8Array(total);
    const stack = [head];
    seen[head] = 1;
    let count = 0;
    while (stack.length) {
      const c = stack.pop() as number;
      for (const n of neighbours(w, h, c)) {
        if (seen[n] || visited[n]) continue;
        seen[n] = 1;
        count++;
        stack.push(n);
      }
    }
    return count === left;
  };

  const go = (next: number) => {
    if (found.length >= limit || steps > budget) return;
    steps++;
    const head = path[path.length - 1];
    if (path.length === total) {
      if (head === clues[clues.length - 1]) found.push(path.slice());
      return;
    }
    if (!connected(head, total - path.length)) return;
    for (const n of neighbours(w, h, head)) {
      if (visited[n]) continue;
      const k = order.get(n);
      if (k !== undefined && k !== next) continue;
      // The last clue must be the very last square.
      if (k === clues.length - 1 && path.length !== total - 1) continue;
      visited[n] = 1;
      path.push(n);
      go(k !== undefined ? next + 1 : next);
      path.pop();
      visited[n] = 0;
      if (found.length >= limit || steps > budget) return;
    }
  };
  go(1);
  return { paths: found, complete: steps <= budget };
}

export function generate(w: number, h: number, clueCount: number, random: () => number): Puzzle {
  const solution = hamiltonianPath(w, h, random);
  const total = w * h;
  // Spread the starting clues along the path: first, last and evenly between.
  const at = new Set<number>([0, total - 1]);
  for (let k = 1; k < clueCount - 1; k++) {
    const base = Math.round((k * (total - 1)) / (clueCount - 1));
    const jitter = Math.round((random() - 0.5) * (total / clueCount) * 0.6);
    at.add(Math.min(total - 2, Math.max(1, base + jitter)));
  }
  const fits = (path: number[], clues: number[]) => {
    let k = 0;
    for (const c of path) {
      const at = clues.indexOf(c);
      if (at >= 0) {
        if (at !== k) return false;
        k++;
      }
    }
    return k === clues.length;
  };
  for (let guard = 0; guard < total * 2; guard++) {
    const clues = [...at].sort((a, b) => a - b).map((i) => solution[i]);
    const { paths, complete } = findPaths(w, h, clues);
    const other = paths.find((p) => p.some((c, i) => c !== solution[i]));
    if (!other && complete) return { w, h, clues, solution };
    if (!other) {
      // The search ran out of budget: number one more square and try again.
      at.add(Math.floor(random() * (total - 2)) + 1);
      continue;
    }
    // Number the first square (along the solution, from where the paths part)
    // that the other path would then reach out of order.
    const from = other.findIndex((c, i) => c !== solution[i]);
    for (let i = from; i < total - 1; i++) {
      if (at.has(i)) continue;
      const withIt = [...at, i].sort((a, b) => a - b).map((j) => solution[j]);
      if (!fits(other, withIt)) {
        at.add(i);
        break;
      }
    }
  }
  return { w, h, clues: solution.filter((_, i) => at.has(i)), solution };
}

/** Number shown on a square (1-based), or 0. */
export function clueNumber(p: Puzzle, cell: number): number {
  return p.clues.indexOf(cell) + 1;
}

/** How many numbers the path has reached so far. */
export function reached(p: Puzzle, path: number[]): number {
  let k = 0;
  for (const c of path) if (c === p.clues[k]) k++;
  return k;
}

/**
 * Extends the path into `cell`, or backs up if `cell` is already on it.
 * Returns the new path, or null if the move is not allowed.
 */
export function step(p: Puzzle, path: number[], cell: number): number[] | null {
  if (!path.length) return cell === p.clues[0] ? [cell] : null;
  const at = path.indexOf(cell);
  if (at >= 0) return at === path.length - 1 ? null : path.slice(0, at + 1);
  const head = path[path.length - 1];
  if (!neighbours(p.w, p.h, head).includes(cell)) return null;
  const k = p.clues.indexOf(cell);
  if (k >= 0 && k !== reached(p, path)) return null;
  // The last number can only be stepped on as the very last square.
  if (k === p.clues.length - 1 && path.length !== p.w * p.h - 1) return null;
  return [...path, cell];
}

export function isSolved(p: Puzzle, path: number[]): boolean {
  return path.length === p.w * p.h && path[path.length - 1] === p.clues[p.clues.length - 1] && reached(p, path) === p.clues.length;
}

export function validPath(p: Puzzle, value: unknown): value is number[] {
  if (!Array.isArray(value) || value.length > p.w * p.h) return false;
  let cur: number[] = [];
  for (const c of value) {
    if (!Number.isInteger(c)) return false;
    const next = step(p, cur, c);
    if (!next || next.length !== cur.length + 1) return false;
    cur = next;
  }
  return true;
}
