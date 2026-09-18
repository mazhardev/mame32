export type Dir = 'up' | 'down' | 'left' | 'right';
export type Grid = number[][];

export interface MoveResult {
  grid: Grid;
  moved: boolean;
  gained: number;
  merged: number;
}

export function emptyGrid(size: number): Grid {
  return Array.from({ length: size }, () => Array<number>(size).fill(0));
}

export function cloneGrid(grid: Grid): Grid {
  return grid.map((row) => row.slice());
}

export function emptyCells(grid: Grid): [number, number][] {
  const cells: [number, number][] = [];
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid.length; c++) if (grid[r][c] === 0) cells.push([r, c]);
  }
  return cells;
}

/** Adds a 2 (90%) or 4 (10%) to a random empty cell. */
export function spawnTile(grid: Grid, random = Math.random): boolean {
  const cells = emptyCells(grid);
  if (!cells.length) return false;
  const [r, c] = cells[Math.floor(random() * cells.length)];
  grid[r][c] = random() < 0.9 ? 2 : 4;
  return true;
}

/**
 * Collapses one row to the left: slide, merge equal neighbours once, slide again.
 * Every direction is expressed as a rotation of this single operation.
 */
function collapse(row: number[]): { row: number[]; gained: number; merged: number } {
  const size = row.length;
  const filtered = row.filter((v) => v !== 0);
  const out: number[] = [];
  let gained = 0;
  let merged = 0;
  for (let i = 0; i < filtered.length; i++) {
    if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
      const value = filtered[i] * 2;
      out.push(value);
      gained += value;
      merged += 1;
      i += 1;
    } else {
      out.push(filtered[i]);
    }
  }
  while (out.length < size) out.push(0);
  return { row: out, gained, merged };
}

function rotate(grid: Grid): Grid {
  const size = grid.length;
  const out = emptyGrid(size);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) out[c][size - 1 - r] = grid[r][c];
  }
  return out;
}

/* Rotation counts that turn each direction into a plain left-collapse.
   rotate() turns clockwise, so the original 'down' becomes 'left' after one turn. */
const ROTATIONS: Record<Dir, number> = { left: 0, down: 1, right: 2, up: 3 };

export function move(grid: Grid, dir: Dir): MoveResult {
  let working = cloneGrid(grid);
  const turns = ROTATIONS[dir];
  for (let i = 0; i < turns; i++) working = rotate(working);

  let gained = 0;
  let merged = 0;
  const collapsed = working.map((row) => {
    const result = collapse(row);
    gained += result.gained;
    merged += result.merged;
    return result.row;
  });

  let restored = collapsed;
  for (let i = 0; i < (4 - turns) % 4; i++) restored = rotate(restored);

  const moved = JSON.stringify(restored) !== JSON.stringify(grid);
  return { grid: restored, moved, gained, merged };
}

export function canMove(grid: Grid): boolean {
  if (emptyCells(grid).length > 0) return true;
  const size = grid.length;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const v = grid[r][c];
      if (c + 1 < size && grid[r][c + 1] === v) return true;
      if (r + 1 < size && grid[r + 1][c] === v) return true;
    }
  }
  return false;
}

export function highestTile(grid: Grid): number {
  return Math.max(...grid.flat());
}

export function hasReached(grid: Grid, target: number): boolean {
  return highestTile(grid) >= target;
}

export function newGame(size: number, random = Math.random): Grid {
  const grid = emptyGrid(size);
  spawnTile(grid, random);
  spawnTile(grid, random);
  return grid;
}

export const SIZE_BY_DIFFICULTY = { easy: 5, normal: 4, hard: 4 } as const;
/** Hard is the classic rules with a higher goal; easy gets a roomier board. */
export const TARGET_BY_DIFFICULTY = { easy: 1024, normal: 2048, hard: 4096 } as const;
