import type { DifficultySetting } from '@/types';
import { baseState } from '../_shared/arcade/kit';
import type { BaseState, Input } from '../_shared/arcade/kit';

/**
 * Block Drop rules: seven falling pieces in a 10 × 20 well. Pieces come from a
 * shuffled bag of all seven, so a long run without a straight piece cannot
 * happen. A piece that lands can still slide for a moment (lock delay). Full
 * rows clear; clear twenty lines to win. The speed rises every five lines and
 * starts faster on harder settings.
 */
export const COLS = 10;
export const ROWS = 20;
export const GOAL = 20;

export type Shape = number[][];
export const SHAPES: Shape[] = [
  [[1, 1, 1, 1]],
  [
    [1, 1],
    [1, 1],
  ],
  [
    [0, 1, 0],
    [1, 1, 1],
  ],
  [
    [0, 1, 1],
    [1, 1, 0],
  ],
  [
    [1, 1, 0],
    [0, 1, 1],
  ],
  [
    [1, 0, 0],
    [1, 1, 1],
  ],
  [
    [0, 0, 1],
    [1, 1, 1],
  ],
];

export function rotate(shape: Shape): Shape {
  return shape[0].map((_, x) => shape.map((row) => row[x]).reverse());
}

export function clearLines(board: number[][]) {
  const remaining = board.filter((row) => row.some((v) => v === 0));
  const count = board.length - remaining.length;
  return {
    count,
    board: [...Array.from({ length: count }, () => Array<number>(COLS).fill(0)), ...remaining],
  };
}

/** Seconds per row at each level, and the level you start on. */
const START_LEVEL: Record<DifficultySetting, number> = { easy: 1, normal: 2, hard: 4 };
export const fallTime = (level: number) => Math.max(0.08, 0.8 * Math.pow(0.84, level - 1));
const LOCK_DELAY = 0.45;
const MAX_LOCK_RESETS = 14;
const DAS = 0.16;
const ARR = 0.05;
const SOFT = 0.035;
const CLEAR_T = 0.22;
/** Logical pixels of finger travel that move a piece one column. */
export const SWIPE_STEP = 22;

export interface Piece {
  shape: Shape;
  /** 1–7, also the colour. */
  kind: number;
  x: number;
  y: number;
}

export interface State extends BaseState {
  board: number[][];
  piece: Piece;
  next: number;
  bag: number[];
  lines: number;
  level: number;
  startLevel: number;
  won: boolean;
  fall: number;
  lockT: number;
  lockResets: number;
  /** Auto-repeat for held left/right. */
  das: number;
  dir: -1 | 0 | 1;
  /** Rows being cleared (flash), and time left on the flash. */
  clearing: number[];
  clearT: number;
  /** Finger tracking for swipes and taps on the board. */
  touch: { on: boolean; x: number; y: number; cols: number; t: number; moved: boolean; dropped: boolean };
  stats: { tetrises: number; hardDrops: number };
}

function takeFromBag(s: State, random: () => number): number {
  if (!s.bag.length) {
    const bag = [1, 2, 3, 4, 5, 6, 7];
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    s.bag = bag;
  }
  return s.bag.pop() as number;
}

export function fits(board: number[][], shape: Shape, x: number, y: number): boolean {
  return shape.every((row, dy) =>
    row.every((v, dx) => {
      if (!v) return true;
      const bx = x + dx;
      const by = y + dy;
      return bx >= 0 && bx < COLS && by < ROWS && (by < 0 || board[by][bx] === 0);
    }),
  );
}

function spawn(s: State, random: () => number) {
  const kind = s.next;
  s.next = takeFromBag(s, random);
  const shape = SHAPES[kind - 1].map((r) => r.slice());
  s.piece = { shape, kind, x: Math.floor((COLS - shape[0].length) / 2), y: 0 };
  s.fall = 0;
  s.lockT = 0;
  s.lockResets = 0;
  if (!fits(s.board, shape, s.piece.x, s.piece.y)) {
    s.over = true;
    s.won = false;
  }
}

export function create(difficulty: DifficultySetting, random: () => number = Math.random): State {
  const s: State = {
    ...baseState(),
    board: Array.from({ length: ROWS }, () => Array<number>(COLS).fill(0)),
    piece: { shape: SHAPES[0], kind: 1, x: 0, y: 0 },
    next: 1,
    bag: [],
    lines: 0,
    level: START_LEVEL[difficulty],
    startLevel: START_LEVEL[difficulty],
    won: false,
    fall: 0,
    lockT: 0,
    lockResets: 0,
    das: 0,
    dir: 0,
    clearing: [],
    clearT: 0,
    touch: { on: false, x: 0, y: 0, cols: 0, t: 0, moved: false, dropped: false },
    stats: { tetrises: 0, hardDrops: 0 },
  };
  s.next = takeFromBag(s, random);
  spawn(s, random);
  return s;
}

const grounded = (s: State) => !fits(s.board, s.piece.shape, s.piece.x, s.piece.y + 1);

/** A successful move or turn on the ground buys a little more time before locking. */
function nudgeLock(s: State) {
  if (grounded(s) && s.lockResets < MAX_LOCK_RESETS) {
    s.lockT = 0;
    s.lockResets++;
  }
}

export function move(s: State, dx: number, dy = 0): boolean {
  const p = s.piece;
  if (s.over || s.clearing.length || !fits(s.board, p.shape, p.x + dx, p.y + dy)) return false;
  p.x += dx;
  p.y += dy;
  if (dx) {
    nudgeLock(s);
    s.events.push('tick');
  }
  return true;
}

/** Turn clockwise, shifting sideways (or up one) if the wall or the stack is in the way. */
export function turn(s: State): boolean {
  const p = s.piece;
  if (s.over || s.clearing.length) return false;
  const next = rotate(p.shape);
  for (const [ox, oy] of [
    [0, 0],
    [-1, 0],
    [1, 0],
    [-2, 0],
    [2, 0],
    [-3, 0],
    [0, -1],
  ]) {
    if (fits(s.board, next, p.x + ox, p.y + oy)) {
      p.shape = next;
      p.x += ox;
      p.y += oy;
      nudgeLock(s);
      s.events.push('blip');
      return true;
    }
  }
  return false;
}

/** How far the piece would fall straight down. */
export function dropDistance(s: State): number {
  let d = 0;
  while (fits(s.board, s.piece.shape, s.piece.x, s.piece.y + d + 1)) d++;
  return d;
}

export function hardDrop(s: State) {
  if (s.over || s.clearing.length) return;
  const d = dropDistance(s);
  s.piece.y += d;
  s.score += d * 2;
  s.stats.hardDrops++;
  s.events.push('hit');
  lock(s);
}

function lock(s: State) {
  const p = s.piece;
  p.shape.forEach((row, dy) =>
    row.forEach((v, dx) => {
      if (v && p.y + dy >= 0) s.board[p.y + dy][p.x + dx] = p.kind;
    }),
  );
  const full = s.board.map((row, y) => (row.every((v) => v) ? y : -1)).filter((y) => y >= 0);
  s.piece = { ...p, shape: [] };
  if (full.length) {
    s.clearing = full;
    s.clearT = CLEAR_T;
    s.events.push(full.length >= 4 ? 'powerup' : 'success');
  } else {
    s.events.push('click');
  }
}

/** Finishes a line clear: scores it, removes the rows and brings in the next piece. */
function finishClear(s: State, random: () => number) {
  const n = s.clearing.length;
  s.board = clearLines(s.board).board;
  s.clearing = [];
  s.lines += n;
  s.score += [0, 100, 300, 500, 800][n] * s.level;
  if (n >= 4) s.stats.tetrises++;
  const level = s.startLevel + Math.floor(s.lines / 5);
  if (level > s.level) {
    s.level = level;
    s.events.push('levelComplete');
  }
  if (s.lines >= GOAL) {
    s.won = true;
    s.over = true;
    return;
  }
  spawn(s, random);
}

function handleTouch(s: State, input: Input) {
  const ptr = input.pointer;
  const t = s.touch;
  if (ptr.pressed) {
    s.touch = { on: true, x: ptr.x, y: ptr.y, cols: 0, t: s.time, moved: false, dropped: false };
    return;
  }
  if (!t.on) return;
  if (ptr.down) {
    // Drag sideways: the piece follows the finger a column at a time.
    const cols = Math.trunc((ptr.x - t.x) / SWIPE_STEP);
    while (t.cols < cols && move(s, 1)) t.cols++;
    while (t.cols > cols && move(s, -1)) t.cols--;
    if (cols !== 0) t.moved = true;
    t.cols = cols;
    // A quick flick down drops the piece.
    const dy = ptr.y - t.y;
    if (!t.dropped && dy > 60 && dy > Math.abs(ptr.x - t.x) * 1.5 && s.time - t.t < 0.35) {
      t.dropped = true;
      t.moved = true;
      hardDrop(s);
    }
  }
  if (ptr.released || !ptr.down) {
    const dist = Math.hypot(ptr.x - t.x, ptr.y - t.y);
    if (!t.moved && dist < 14 && s.time - t.t < 0.4) turn(s);
    s.touch.on = false;
  }
}

export function update(s: State, dt: number, input: Input, random: () => number = Math.random) {
  if (s.over) return;
  if (s.clearing.length) {
    s.clearT -= dt;
    if (s.clearT <= 0) finishClear(s, random);
    return;
  }
  if (!s.piece.shape.length) spawn(s, random);
  if (s.over) return;

  const p = input.pressed;
  if (p.has('up') || p.has('action2')) turn(s);
  if (p.has('action')) {
    hardDrop(s);
    return;
  }
  // Left and right: one step on press, then auto-repeat while held.
  const dir: -1 | 0 | 1 = input.held.has('left') ? -1 : input.held.has('right') ? 1 : 0;
  if (p.has('left') || p.has('right')) {
    move(s, p.has('left') ? -1 : 1);
    s.das = DAS;
  } else if (dir !== 0 && dir === s.dir) {
    s.das -= dt;
    while (s.das <= 0) {
      move(s, dir);
      s.das += ARR;
    }
  }
  s.dir = dir;
  handleTouch(s, input);
  if (!s.piece.shape.length || s.clearing.length) return;

  // Gravity (faster while soft-dropping).
  const soft = input.held.has('down');
  const step = soft ? Math.min(SOFT, fallTime(s.level)) : fallTime(s.level);
  if (grounded(s)) {
    s.lockT += dt;
    if (s.lockT >= LOCK_DELAY) lock(s);
    return;
  }
  s.fall += dt;
  while (s.fall >= step && !grounded(s)) {
    s.fall -= step;
    s.piece.y++;
    if (soft) s.score += 1;
  }
}
