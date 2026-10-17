import { createRng } from '@/utils/random';
import type { Rng } from '@/utils/random';
import { blankCell, countChocolate, countIcing, countJelly } from './engine';
import type { Cell, Layout, State } from './engine';
import { CALIBRATION } from './calibration';

/**
 * The Candy Match saga: 120 levels across 8 worlds. Each world introduces
 * one mechanic and mixes it with what came before. Layouts are generated
 * from a fixed seed per level, so a level is always the same board shape
 * and obstacles; the candies themselves are random each attempt.
 *
 * Move limits (and score targets) come from calibration.ts, which
 * scripts/calibrate-candy.ts produces by letting a simple bot play every
 * level many times. Re-run it after changing anything here.
 */
export const W = 9;
export const H = 9;
export const LEVELS_PER_WORLD = 15;

export type Mechanic = 'basic' | 'icing' | 'ingredients' | 'locks' | 'chocolate' | 'jelly2' | 'mixed' | 'finale';

export interface World {
  name: string;
  mechanic: Mechanic;
  /** Accent colour for the map. */
  color: string;
  blurb: string;
}

export const WORLDS: World[] = [
  { name: 'Sugar Meadow', mechanic: 'basic', color: '#f472b6', blurb: 'Learn the sweet basics: scores, collections and jelly.' },
  { name: 'Frosting Falls', mechanic: 'icing', color: '#60a5fa', blurb: 'Icing blocks the board. Match next to it to crack it.' },
  { name: 'Nutty Canyon', mechanic: 'ingredients', color: '#f59e0b', blurb: 'Bring hazelnuts and cherries down to the bottom.' },
  { name: 'Licorice Lanes', mechanic: 'locks', color: '#a78bfa', blurb: 'Locked candies stay put until a match sets them free.' },
  { name: 'Cocoa Caves', mechanic: 'chocolate', color: '#b45309', blurb: 'Chocolate spreads every turn you leave it alone.' },
  { name: 'Jelly Jungle', mechanic: 'jelly2', color: '#22c55e', blurb: 'Double jelly and thick icing on twisted boards.' },
  { name: 'Peppermint Peaks', mechanic: 'mixed', color: '#14b8a6', blurb: 'Everything at once — and a sixth colour of candy.' },
  { name: 'Starlight Bakery', mechanic: 'finale', color: '#eab308', blurb: 'The final kitchen. Every trick, every obstacle.' },
];

export const LEVEL_COUNT = WORLDS.length * LEVELS_PER_WORLD;

export type Goal =
  | { kind: 'score'; target: number }
  | { kind: 'collect'; color: number; count: number }
  | { kind: 'jelly' }
  | { kind: 'icing' }
  | { kind: 'chocolate' }
  | { kind: 'ingredients'; count: number };

export interface Level {
  index: number;
  world: number;
  moves: number;
  layout: Layout;
  goals: Goal[];
}

/* ---------------------------------------------------------------- shapes */

const SHAPES: Record<string, string[]> = {
  full: ['#########', '#########', '#########', '#########', '#########', '#########', '#########', '#########', '#########'],
  rounded: ['.#######.', '#########', '#########', '#########', '#########', '#########', '#########', '#########', '.#######.'],
  diamond: ['...###...', '..#####..', '.#######.', '#########', '#########', '#########', '.#######.', '..#####..', '...###...'],
  hourglass: ['#########', '#########', '.#######.', '..#####..', '...###...', '..#####..', '.#######.', '#########', '#########'],
  plus: ['...###...', '...###...', '..#####..', '#########', '#########', '#########', '..#####..', '...###...', '...###...'],
  ring: ['#########', '#########', '#########', '###...###', '###...###', '###...###', '#########', '#########', '#########'],
  twin: ['####.####', '####.####', '####.####', '####.####', '#########', '####.####', '####.####', '####.####', '####.####'],
  heart: ['.##...##.', '####.####', '#########', '#########', '#########', '.#######.', '..#####..', '...###...', '...###...'],
  steps: ['###...###', '####.####', '#########', '#########', '#########', '#########', '#########', '.#######.', '..#####..'],
  narrow: ['.#######.', '.#######.', '.#######.', '.#######.', '.#######.', '.#######.', '.#######.', '.#######.', '.#######.'],
  bowl: ['#.......#', '##.....##', '###...###', '#########', '#########', '#########', '#########', '.#######.', '..#####..'],
};

export const SHAPE_NAMES = Object.keys(SHAPES);

const at = (r: number, c: number) => r * W + c;

class Builder {
  cells: Cell[];
  constructor(
    shape: string,
    private rng: Rng,
  ) {
    const rows = SHAPES[shape];
    this.cells = [];
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) this.cells.push(blankCell(rows[r][c] === '#'));
  }

  playable(r: number, c: number) {
    return r >= 0 && c >= 0 && r < H && c < W && this.cells[at(r, c)].playable;
  }

  /** Top two playable cells of each column stay open so it can always refill. */
  nearTop(r: number, c: number) {
    let seen = 0;
    for (let y = 0; y <= r; y++) if (this.playable(y, c)) seen++;
    return seen <= 2;
  }

  isBottom(r: number, c: number) {
    for (let y = r + 1; y < H; y++) if (this.playable(y, c)) return false;
    return true;
  }

  /** Applies `fn` to (r, c) and its left-right mirror. */
  mirror(r: number, c: number, fn: (cell: Cell, r: number, c: number) => void) {
    for (const cc of new Set([c, W - 1 - c])) if (this.playable(r, cc)) fn(this.cells[at(r, cc)], r, cc);
  }

  /** `count` symmetric random cells matching `ok`, in rows [r0, r1]. */
  scatter(count: number, r0: number, r1: number, ok: (cell: Cell, r: number, c: number) => boolean, fn: (cell: Cell) => void) {
    let placed = 0;
    for (let tries = 0; tries < 400 && placed < count; tries++) {
      const r = this.rng.int(r0, r1 + 1);
      const c = this.rng.int(0, Math.ceil(W / 2));
      if (!this.playable(r, c) || !ok(this.cells[at(r, c)], r, c)) continue;
      this.mirror(r, c, (cell, rr, cc) => {
        if (ok(cell, rr, cc)) {
          fn(cell);
          placed++;
        }
      });
    }
    return placed;
  }

  jelly(pattern: string, layers: (r: number, c: number) => number) {
    // Skip dead-end cells (one open neighbour): jelly there is luck, not skill.
    const open = (r: number, c: number) =>
      [this.playable(r - 1, c), this.playable(r + 1, c), this.playable(r, c - 1), this.playable(r, c + 1)].filter(Boolean).length;
    const put = (r: number, c: number) => {
      if (this.playable(r, c) && open(r, c) >= 2) this.cells[at(r, c)].jelly = Math.max(this.cells[at(r, c)].jelly, layers(r, c));
    };
    for (let r = 0; r < H; r++) {
      for (let c = 0; c < W; c++) {
        const dr = Math.abs(r - 4);
        const dc = Math.abs(c - 4);
        const hit =
          pattern === 'all' ? true
          : pattern === 'bottom' ? r >= 6
          : pattern === 'lower' ? r >= 4
          : pattern === 'center' ? dr <= 1 && dc <= 2
          : pattern === 'core' ? dr <= 2 && dc <= 2
          : pattern === 'border' ? r === 0 || c === 0 || r === H - 1 || c === W - 1 || !this.playable(r - 1, c) || !this.playable(r + 1, c)
          : pattern === 'cross' ? dr <= 0 || dc <= 0
          : pattern === 'x' ? dr === dc || r + c === 8 || Math.abs(dr - dc) === 1
          : pattern === 'checker' ? (r + c) % 2 === 0
          : pattern === 'sides' ? c <= 1 || c >= W - 2
          : pattern === 'corners' ? (r <= 2 || r >= 6) && (c <= 2 || c >= 6)
          : false;
        if (hit) put(r, c);
      }
    }
  }
}

/* --------------------------------------------------------------- levels */

const JELLY_PATTERNS = ['bottom', 'center', 'border', 'cross', 'lower', 'x', 'core', 'sides', 'corners', 'checker'];

/** Goal rotation per world (indexed by level within the world). */
const GOALS: Goal['kind'][][] = [
  ['collect', 'score', 'jelly', 'collect', 'jelly', 'score', 'jelly', 'collect', 'jelly', 'score', 'collect', 'jelly', 'collect', 'jelly', 'jelly'],
  ['icing', 'icing', 'jelly', 'collect', 'icing', 'score', 'jelly', 'icing', 'collect', 'icing', 'jelly', 'icing', 'collect', 'jelly', 'icing'],
  ['ingredients', 'ingredients', 'jelly', 'ingredients', 'collect', 'ingredients', 'icing', 'ingredients', 'jelly', 'ingredients', 'collect', 'ingredients', 'jelly', 'ingredients', 'ingredients'],
  ['jelly', 'collect', 'jelly', 'ingredients', 'jelly', 'score', 'collect', 'jelly', 'icing', 'jelly', 'ingredients', 'collect', 'jelly', 'icing', 'jelly'],
  ['chocolate', 'chocolate', 'jelly', 'chocolate', 'collect', 'chocolate', 'ingredients', 'chocolate', 'jelly', 'chocolate', 'icing', 'chocolate', 'jelly', 'collect', 'chocolate'],
  ['jelly', 'jelly', 'icing', 'ingredients', 'jelly', 'collect', 'jelly', 'icing', 'jelly', 'chocolate', 'jelly', 'ingredients', 'icing', 'jelly', 'jelly'],
  ['jelly', 'ingredients', 'icing', 'collect', 'chocolate', 'jelly', 'score', 'ingredients', 'jelly', 'icing', 'chocolate', 'jelly', 'collect', 'ingredients', 'jelly'],
  ['jelly', 'icing', 'ingredients', 'chocolate', 'jelly', 'collect', 'ingredients', 'jelly', 'icing', 'chocolate', 'jelly', 'ingredients', 'collect', 'icing', 'jelly'],
];

/** Board shape for a level: plain boards early on, then the full variety. */
function shapeFor(world: number, k: number, rng: Rng): string {
  if (world === 0) return k < 5 ? 'full' : (['rounded', 'full', 'narrow', 'diamond', 'rounded'] as const)[k % 5];
  return SHAPE_NAMES[rng.int(0, SHAPE_NAMES.length)];
}

/**
 * Everything about a level except its calibrated move limit and score target.
 * `ease` (0–4, chosen by calibration) thins out obstacles on levels that
 * proved too hard.
 */
export function designLevel(index: number, ease = 0): Omit<Level, 'moves'> & { scoreGoal: boolean } {
  const world = Math.floor(index / LEVELS_PER_WORLD);
  const k = index % LEVELS_PER_WORLD;
  const t = k / (LEVELS_PER_WORLD - 1);
  const rng = createRng(`candy-saga-${index}`);
  const mech = WORLDS[world].mechanic;
  const kind = GOALS[world][k];
  const shape = shapeFor(world, k, rng);
  const b = new Builder(shape, rng);

  const colors = world === 0 && k < 6 ? 4 : world >= 6 && k % 3 === 2 && kind !== 'chocolate' && ease === 0 ? 6 : 5;
  const thin = (n: number) => Math.max(1, Math.round(n * (1 - 0.2 * ease)));
  const late = world + t; // grows through the saga
  const goals: Goal[] = [];
  let ingredients = 0;

  // Obstacles from the world's mechanic (and the earlier ones, later on).
  const wantIcing = mech === 'icing' || kind === 'icing' || (world >= 5 && rng.bool(0.5));
  const wantLocks = mech === 'locks' || (world >= 6 && rng.bool(0.4));
  // Locks in an ingredient's path are too cruel once a level has needed easing.
  const lockRows: [number, number] = kind === 'ingredients' ? (ease > 0 ? [H - 3, H - 2] : [3, H - 1]) : [1, H - 1];
  const wantChocolate = kind === 'chocolate' || (mech === 'chocolate' && rng.bool(0.3));
  const thick = (world >= 5 || (world === 1 && k >= 7)) && ease < 3;

  if (kind === 'ingredients') {
    ingredients = world === 2 && k < 5 ? 1 : late > 6 && ease < 2 ? 3 : 2;
    goals.push({ kind: 'ingredients', count: ingredients });
  }
  const keepExits = (r: number, c: number) => !(ingredients > 0 && b.isBottom(r, c));

  if (kind === 'jelly') {
    const pattern = world === 0 ? (['bottom', 'center', 'border', 'cross', 'lower'] as const)[k % 5] : JELLY_PATTERNS[rng.int(0, JELLY_PATTERNS.length)];
    const doubleChance = (world === 0 ? 0 : world === 5 ? 0.6 : Math.min(0.5, 0.1 * world)) * Math.max(0, 1 - 0.35 * ease);
    b.jelly(pattern, () => (rng.bool(doubleChance) ? 2 : 1));
    goals.push({ kind: 'jelly' });
  }

  if (wantIcing) {
    const n = thin((kind === 'icing' ? 8 : 5) + 8 * t + (world >= 5 ? 4 : 0));
    const band = rng.bool(0.5);
    b.scatter(
      n,
      band ? 4 : 2,
      H - 1,
      (cell, r, c) => cell.icing === 0 && !cell.chocolate && !b.nearTop(r, c) && keepExits(r, c),
      (cell) => (cell.icing = thick && rng.bool(0.5) ? 2 : 1),
    );
    if (kind === 'icing') goals.push({ kind: 'icing' });
  }

  if (wantLocks) {
    const n = thin(6 + 6 * t + (world >= 6 ? 3 : 0));
    b.scatter(
      n,
      lockRows[0],
      lockRows[1],
      (cell, r, c) => cell.icing === 0 && !cell.chocolate && !cell.lock && keepExits(r, c),
      (cell) => (cell.lock = true),
    );
  }

  if (wantChocolate) {
    const n = thin(2 + 4 * t + (world >= 6 ? 2 : 0));
    b.scatter(
      n,
      5,
      H - 1,
      (cell, r, c) => cell.icing === 0 && !cell.chocolate && !cell.lock && !b.nearTop(r, c) && keepExits(r, c),
      (cell) => (cell.chocolate = true),
    );
    if (kind === 'chocolate') goals.push({ kind: 'chocolate' });
  }

  if (kind === 'collect') {
    const n = world === 0 && k < 4 ? 1 : late > 5 && ease < 2 ? 3 : 2;
    const picks = rng.shuffle(Array.from({ length: colors }, (_, c) => c)).slice(0, n);
    const base = n === 1 ? 24 : n === 2 ? 18 : 14;
    picks.forEach((color) => goals.push({ kind: 'collect', color, count: Math.round(base + 10 * t + 1.5 * world) }));
  }

  // The finale adds a second objective to some levels.
  if (mech === 'finale' && kind === 'jelly' && k % 2 === 0) {
    b.scatter(4, 3, H - 1, (cell, r, c) => cell.icing === 0 && !cell.chocolate && !b.nearTop(r, c), (cell) => (cell.icing = 1));
    goals.push({ kind: 'icing' });
  }

  const scoreGoal = kind === 'score';
  if (scoreGoal) goals.push({ kind: 'score', target: 0 });

  return {
    index,
    world,
    layout: { w: W, h: H, colors, cells: b.cells, ingredients },
    goals,
    scoreGoal,
  };
}

/** Fallback limits used before calibration has run. */
export function defaultMoves(index: number): number {
  return Math.max(16, 30 - Math.floor(index / 15));
}

export function level(index: number): Level {
  const cal = CALIBRATION[index];
  const d = designLevel(index, cal ? cal[2] : 0);
  const moves = cal ? cal[0] : defaultMoves(index);
  const goals = d.goals.map((g) => (g.kind === 'score' ? { ...g, target: cal ? cal[1] : 4000 } : g));
  return { index: d.index, world: d.world, moves, layout: d.layout, goals };
}

/* ---------------------------------------------------------------- goals */

export interface Tracker {
  score: number;
  /** Candies cleared by colour. */
  collected: number[];
  state: State;
}

export interface GoalStatus {
  goal: Goal;
  /** What is left to do (0 when done). */
  left: number;
  /** Fraction complete. */
  progress: number;
  done: boolean;
}

export function goalStatus(lvl: Level, start: State, tr: Tracker): GoalStatus[] {
  return lvl.goals.map((goal) => {
    let left: number;
    let total: number;
    switch (goal.kind) {
      case 'score':
        left = Math.max(0, goal.target - tr.score);
        total = goal.target;
        break;
      case 'collect':
        left = Math.max(0, goal.count - (tr.collected[goal.color] ?? 0));
        total = goal.count;
        break;
      case 'jelly':
        left = countJelly(tr.state);
        total = countJelly(start);
        break;
      case 'icing':
        left = countIcing(tr.state);
        total = countIcing(start);
        break;
      case 'chocolate':
        left = countChocolate(tr.state);
        total = Math.max(left, countChocolate(start));
        break;
      case 'ingredients':
        left = Math.max(0, goal.count - tr.state.ingredients.collected);
        total = goal.count;
        break;
    }
    return { goal, left, progress: total === 0 ? 1 : 1 - left / total, done: left === 0 };
  });
}

export function allDone(status: GoalStatus[]): boolean {
  return status.every((g) => g.done);
}

export function overallProgress(status: GoalStatus[]): number {
  return status.length ? status.reduce((a, g) => a + g.progress, 0) / status.length : 1;
}

/** Stars from the share of moves left at the finish. */
export function stars(movesLeft: number, moves: number): number {
  return movesLeft >= moves * 0.3 ? 3 : movesLeft >= moves * 0.12 ? 2 : 1;
}
