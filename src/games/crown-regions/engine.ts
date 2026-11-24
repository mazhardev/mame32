/**
 * Crown Regions: an n × n grid split into n coloured regions. Place n crowns
 * so that every row, every column and every region holds exactly one, and no
 * two crowns touch, not even diagonally.
 *
 * Puzzles are generated: place a valid set of crowns, grow a region out from
 * each one at random, then keep the layout only if the solver finds exactly
 * one solution. So every puzzle can be solved by logic alone.
 */
export const EMPTY = 0;
export const MARK = 1;
export const CROWN = 2;
export type Cell = typeof EMPTY | typeof MARK | typeof CROWN;

export interface Puzzle {
  n: number;
  /** Region id (0 … n−1) for each cell, row by row. */
  regions: number[];
  /** Column of the crown in each row. */
  solution: number[];
}

/** A random valid crown placement: one per row and column, none touching. */
function placeCrowns(n: number, random: () => number): number[] | null {
  const cols: number[] = [];
  const used = new Set<number>();
  const go = (row: number): boolean => {
    if (row === n) return true;
    const order = Array.from({ length: n }, (_, i) => i).sort(() => random() - 0.5);
    for (const c of order) {
      if (used.has(c)) continue;
      if (row > 0 && Math.abs(cols[row - 1] - c) <= 1) continue;
      cols.push(c);
      used.add(c);
      if (go(row + 1)) return true;
      cols.pop();
      used.delete(c);
    }
    return false;
  };
  return go(0) ? cols : null;
}

/** Grows one region out from each crown until every cell belongs to one. */
function growRegions(n: number, crowns: number[], random: () => number): number[] {
  const regions = new Array<number>(n * n).fill(-1);
  crowns.forEach((c, r) => (regions[r * n + c] = r));
  let left = n * n - n;
  while (left > 0) {
    // Pick a random cell that has an assigned neighbour and join that neighbour's region.
    const frontier: [number, number][] = [];
    for (let i = 0; i < n * n; i++) {
      if (regions[i] >= 0) continue;
      const x = i % n;
      const y = Math.floor(i / n);
      const around = [x > 0 ? i - 1 : -1, x < n - 1 ? i + 1 : -1, y > 0 ? i - n : -1, y < n - 1 ? i + n : -1];
      for (const j of around) if (j >= 0 && regions[j] >= 0) frontier.push([i, regions[j]]);
    }
    const [cell, region] = frontier[Math.floor(random() * frontier.length)];
    regions[cell] = region;
    left--;
  }
  return regions;
}

/** Number of solutions, counting no further than `limit`. */
export function countSolutions(n: number, regions: number[], limit = 2): number {
  const usedCol = new Array<boolean>(n).fill(false);
  const usedRegion = new Array<boolean>(n).fill(false);
  let count = 0;
  const go = (row: number, prev: number) => {
    if (count >= limit) return;
    if (row === n) {
      count++;
      return;
    }
    for (let c = 0; c < n; c++) {
      const reg = regions[row * n + c];
      if (usedCol[c] || usedRegion[reg] || (row > 0 && Math.abs(prev - c) <= 1)) continue;
      usedCol[c] = usedRegion[reg] = true;
      go(row + 1, c);
      usedCol[c] = usedRegion[reg] = false;
    }
  };
  go(0, -9);
  return count;
}

export function generate(n: number, random: () => number): Puzzle {
  for (let attempt = 0; ; attempt++) {
    const crowns = placeCrowns(n, random);
    if (!crowns) continue;
    const regions = growRegions(n, crowns, random);
    if (countSolutions(n, regions) === 1) return { n, regions, solution: crowns };
  }
}

/** Crowns that break a rule: same row, column or region, or touching. */
export function conflicts(p: Puzzle, cells: Cell[]): Set<number> {
  const { n } = p;
  const crowns: number[] = [];
  cells.forEach((v, i) => v === CROWN && crowns.push(i));
  const bad = new Set<number>();
  for (let a = 0; a < crowns.length; a++) {
    for (let b = a + 1; b < crowns.length; b++) {
      const i = crowns[a];
      const j = crowns[b];
      const xi = i % n;
      const yi = Math.floor(i / n);
      const xj = j % n;
      const yj = Math.floor(j / n);
      if (xi === xj || yi === yj || p.regions[i] === p.regions[j] || (Math.abs(xi - xj) <= 1 && Math.abs(yi - yj) <= 1)) {
        bad.add(i);
        bad.add(j);
      }
    }
  }
  return bad;
}

export const crownCount = (cells: Cell[]) => cells.filter((v) => v === CROWN).length;

export function isSolved(p: Puzzle, cells: Cell[]): boolean {
  return crownCount(cells) === p.n && conflicts(p, cells).size === 0;
}

/** Tap cycle: empty → ✕ → crown → empty. */
export function cycle(v: Cell): Cell {
  return v === EMPTY ? MARK : v === MARK ? CROWN : EMPTY;
}

/**
 * Cells a crown rules out: its row, column and region, and the eight cells
 * around it. Used for the optional auto-✕.
 */
export function blockedBy(p: Puzzle, cell: number): number[] {
  const { n } = p;
  const x = cell % n;
  const y = Math.floor(cell / n);
  const out: number[] = [];
  for (let i = 0; i < n * n; i++) {
    if (i === cell) continue;
    const xi = i % n;
    const yi = Math.floor(i / n);
    if (xi === x || yi === y || p.regions[i] === p.regions[cell] || (Math.abs(xi - x) <= 1 && Math.abs(yi - y) <= 1)) out.push(i);
  }
  return out;
}

/** A hint: a crown from the solution that is not yet placed (or a wrong crown to remove). */
export function hint(p: Puzzle, cells: Cell[]): { cell: number; kind: 'place' | 'remove' } | null {
  const { n } = p;
  for (let i = 0; i < n * n; i++) {
    if (cells[i] === CROWN && p.solution[Math.floor(i / n)] !== i % n) return { cell: i, kind: 'remove' };
  }
  for (let r = 0; r < n; r++) {
    const i = r * n + p.solution[r];
    if (cells[i] !== CROWN) return { cell: i, kind: 'place' };
  }
  return null;
}

/** Region borders for drawing: which sides of a cell face another region. */
export function borders(p: Puzzle, i: number): { top: boolean; right: boolean; bottom: boolean; left: boolean } {
  const { n, regions } = p;
  const x = i % n;
  const y = Math.floor(i / n);
  const r = regions[i];
  return {
    top: y === 0 || regions[i - n] !== r,
    right: x === n - 1 || regions[i + 1] !== r,
    bottom: y === n - 1 || regions[i + n] !== r,
    left: x === 0 || regions[i - 1] !== r,
  };
}

export function validCells(value: unknown, n: number): value is Cell[] {
  return Array.isArray(value) && value.length === n * n && value.every((v) => v === EMPTY || v === MARK || v === CROWN);
}
