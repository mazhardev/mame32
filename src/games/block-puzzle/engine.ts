import type { DifficultySetting } from '@/types';

/**
 * Block Puzzle: place pieces from a tray of three onto the board. Any full
 * row or column clears. When all three are placed the tray refills; the
 * game ends when none of the remaining pieces fits anywhere.
 */
export interface Shape {
  id: string;
  /** Cell offsets as [row, col]. */
  cells: [number, number][];
  rows: number;
  cols: number;
  color: number;
}

function shape(id: string, rows: string[], color: number): Shape {
  const cells: [number, number][] = [];
  rows.forEach((r, y) => [...r].forEach((ch, x) => ch === '#' && cells.push([y, x])));
  return { id, cells, rows: rows.length, cols: Math.max(...rows.map((r) => r.length)), color };
}

export const SHAPES: Shape[] = [
  shape('dot', ['#'], 0),
  shape('i2h', ['##'], 1),
  shape('i2v', ['#', '#'], 1),
  shape('i3h', ['###'], 2),
  shape('i3v', ['#', '#', '#'], 2),
  shape('i4h', ['####'], 3),
  shape('i4v', ['#', '#', '#', '#'], 3),
  shape('i5h', ['#####'], 4),
  shape('i5v', ['#', '#', '#', '#', '#'], 4),
  shape('o2', ['##', '##'], 5),
  shape('o3', ['###', '###', '###'], 6),
  shape('l3a', ['#.', '##'], 7),
  shape('l3b', ['.#', '##'], 7),
  shape('l3c', ['##', '#.'], 7),
  shape('l3d', ['##', '.#'], 7),
  shape('l5a', ['#..', '#..', '###'], 8),
  shape('l5b', ['..#', '..#', '###'], 8),
  shape('l5c', ['###', '#..', '#..'], 8),
  shape('l5d', ['###', '..#', '..#'], 8),
];

const byId = new Map(SHAPES.map((s) => [s.id, s]));
export const shapeById = (id: string) => byId.get(id);

/** Relative draw weights per difficulty: harder modes deal more big pieces. */
const WEIGHTS: Record<DifficultySetting, Record<string, number>> = {
  easy: { dot: 4, i2: 4, i3: 4, i4: 2, i5: 1, o2: 4, o3: 1, l3: 4, l5: 1 },
  normal: { dot: 2, i2: 3, i3: 3, i4: 3, i5: 2, o2: 3, o3: 2, l3: 3, l5: 2 },
  hard: { dot: 1, i2: 2, i3: 3, i4: 3, i5: 3, o2: 3, o3: 3, l3: 2, l5: 3 },
};

export const BOARD: Record<DifficultySetting, number> = { easy: 9, normal: 10, hard: 10 };

function family(id: string) {
  return id.replace(/[hv]$|[abcd]$/, '');
}

export function dealTray(difficulty: DifficultySetting, random: () => number): string[] {
  const weights = WEIGHTS[difficulty];
  const pool = SHAPES.map((s) => ({ s, w: weights[family(s.id)] / SHAPES.filter((t) => family(t.id) === family(s.id)).length }));
  const total = pool.reduce((a, p) => a + p.w, 0);
  const tray: string[] = [];
  for (let i = 0; i < 3; i++) {
    let r = random() * total;
    const pick = pool.find((p) => (r -= p.w) < 0) ?? pool[pool.length - 1];
    tray.push(pick.s.id);
  }
  return tray;
}

export function fits(board: number[], n: number, s: Shape, row: number, col: number): boolean {
  if (row < 0 || col < 0 || row + s.rows > n || col + s.cols > n) return false;
  return s.cells.every(([dy, dx]) => board[(row + dy) * n + col + dx] < 0);
}

export function canPlaceAnywhere(board: number[], n: number, s: Shape): boolean {
  for (let r = 0; r <= n - s.rows; r++) for (let c = 0; c <= n - s.cols; c++) if (fits(board, n, s, r, c)) return true;
  return false;
}

export interface PlaceResult {
  board: number[];
  cleared: number[];
  lines: number;
  points: number;
}

/**
 * Places a shape and clears every completed row and column. Points: one
 * per placed cell, plus 10 per cleared cell, with a bonus for clearing
 * several lines at once (×lines) and for a streak of clearing turns.
 */
export function place(board: number[], n: number, s: Shape, row: number, col: number, streak = 0): PlaceResult | null {
  if (!fits(board, n, s, row, col)) return null;
  const next = board.slice();
  for (const [dy, dx] of s.cells) next[(row + dy) * n + col + dx] = s.color;
  const full = new Set<number>();
  let lines = 0;
  for (let r = 0; r < n; r++) {
    if (Array.from({ length: n }, (_, c) => next[r * n + c]).every((v) => v >= 0)) {
      lines++;
      for (let c = 0; c < n; c++) full.add(r * n + c);
    }
  }
  for (let c = 0; c < n; c++) {
    if (Array.from({ length: n }, (_, r) => next[r * n + c]).every((v) => v >= 0)) {
      lines++;
      for (let r = 0; r < n; r++) full.add(r * n + c);
    }
  }
  full.forEach((i) => (next[i] = -1));
  const clearPoints = full.size * 10 * lines;
  const streakBonus = lines ? streak * 20 : 0;
  return { board: next, cleared: [...full], lines, points: s.cells.length + clearPoints + streakBonus };
}

export function isGameOver(board: number[], n: number, tray: (string | null)[]): boolean {
  const left = tray.filter((t): t is string => !!t);
  return left.length > 0 && left.every((id) => !canPlaceAnywhere(board, n, shapeById(id)!));
}

export interface BlockSave {
  n: number;
  board: number[];
  tray: (string | null)[];
  score: number;
  lines: number;
  streak: number;
}

export function validSave(v: unknown): v is BlockSave {
  if (typeof v !== 'object' || v === null) return false;
  const s = v as Record<string, unknown>;
  if (s.n !== 9 && s.n !== 10) return false;
  const n = s.n;
  if (!Array.isArray(s.board) || s.board.length !== n * n) return false;
  if (!s.board.every((x) => Number.isInteger(x) && x >= -1 && x < 9)) return false;
  if (!Array.isArray(s.tray) || s.tray.length !== 3) return false;
  if (!s.tray.every((t) => t === null || (typeof t === 'string' && byId.has(t)))) return false;
  return [s.score, s.lines, s.streak].every((x) => Number.isInteger(x) && (x as number) >= 0);
}
