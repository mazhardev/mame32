import { alphaBeta, WIN_SCORE } from '../_shared/board/minimax';

export const COLS = 7;
export const ROWS = 6;

export type Disc = 1 | 2;
export type Slot = 0 | Disc;
/** Row-major grid, row 0 is the top. */
export type Grid = Slot[];

export const DEPTH: Record<'easy' | 'normal' | 'hard', number> = {
  easy: 1,
  normal: 4,
  hard: 6,
};

export function emptyGrid(): Grid {
  return Array<Slot>(COLS * ROWS).fill(0);
}

export function at(grid: Grid, col: number, row: number): Slot {
  return grid[row * COLS + col];
}

export function legalColumns(grid: Grid): number[] {
  const cols: number[] = [];
  for (let c = 0; c < COLS; c++) if (grid[c] === 0) cols.push(c);
  return cols;
}

/** Lowest empty row in a column, or -1 when the column is full. */
export function dropRow(grid: Grid, col: number): number {
  for (let row = ROWS - 1; row >= 0; row--) {
    if (at(grid, col, row) === 0) return row;
  }
  return -1;
}

export function drop(grid: Grid, col: number, disc: Disc): number {
  const row = dropRow(grid, col);
  if (row < 0) return -1;
  grid[row * COLS + col] = disc;
  return row;
}

export function undrop(grid: Grid, col: number, row: number) {
  grid[row * COLS + col] = 0;
}

const DIRECTIONS: [number, number][] = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1],
];

export function winningCells(grid: Grid): number[] | null {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const disc = at(grid, col, row);
      if (disc === 0) continue;
      for (const [dc, dr] of DIRECTIONS) {
        const cells = [row * COLS + col];
        let ok = true;
        for (let i = 1; i < 4; i++) {
          const c = col + dc * i;
          const r = row + dr * i;
          if (c < 0 || c >= COLS || r < 0 || r >= ROWS || at(grid, c, r) !== disc) {
            ok = false;
            break;
          }
          cells.push(r * COLS + c);
        }
        if (ok) return cells;
      }
    }
  }
  return null;
}

export function winner(grid: Grid): Disc | null {
  const cells = winningCells(grid);
  return cells ? (grid[cells[0]] as Disc) : null;
}

export function isFull(grid: Grid): boolean {
  return legalColumns(grid).length === 0;
}

export function isGameOver(grid: Grid): boolean {
  return !!winner(grid) || isFull(grid);
}

export function opponent(disc: Disc): Disc {
  return disc === 1 ? 2 : 1;
}

/** Scores a 4-cell window: more of our discs is better, an enemy trio is urgent. */
function scoreWindow(window: Slot[], me: Disc): number {
  const foe = opponent(me);
  const mine = window.filter((s) => s === me).length;
  const theirs = window.filter((s) => s === foe).length;
  if (mine && theirs) return 0;
  if (mine === 4) return 10_000;
  if (mine === 3) return 60;
  if (mine === 2) return 8;
  if (theirs === 4) return -10_000;
  if (theirs === 3) return -80;
  if (theirs === 2) return -8;
  return 0;
}

export function evaluate(grid: Grid, me: Disc): number {
  const w = winner(grid);
  if (w === me) return WIN_SCORE;
  if (w) return -WIN_SCORE;

  let score = 0;
  // Central columns create more four-in-a-row opportunities.
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (at(grid, col, row) === me) score += [1, 2, 4, 6, 4, 2, 1][col];
    }
  }
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      for (const [dc, dr] of DIRECTIONS) {
        const endC = col + dc * 3;
        const endR = row + dr * 3;
        if (endC < 0 || endC >= COLS || endR < 0 || endR >= ROWS) continue;
        const window: Slot[] = [];
        for (let i = 0; i < 4; i++) window.push(at(grid, col + dc * i, row + dr * i));
        score += scoreWindow(window, me);
      }
    }
  }
  return score;
}

/** Centre-out ordering makes alpha-beta prune far more of the tree. */
const ORDER = [3, 2, 4, 1, 5, 0, 6];

export function chooseColumn(
  grid: Grid,
  disc: Disc,
  level: 'easy' | 'normal' | 'hard',
  random = Math.random,
): number | null {
  const legal = legalColumns(grid);
  if (!legal.length) return null;
  if (level === 'easy' && random() < 0.4) return legal[Math.floor(random() * legal.length)];

  const working = grid.slice();
  let current: Disc = disc;
  const stack: number[] = [];

  const result = alphaBeta<number>(
    {
      getMoves: () => legalColumns(working),
      apply: (col) => {
        stack.push(drop(working, col, current));
        current = opponent(current);
      },
      undo: (col) => {
        undrop(working, col, stack.pop() as number);
        current = opponent(current);
      },
      evaluate: () => evaluate(working, disc),
      isTerminal: () => isGameOver(working),
      order: (moves) => ORDER.filter((c) => moves.includes(c)),
    },
    DEPTH[level],
    true,
  );
  return result.move ?? legal[0];
}
