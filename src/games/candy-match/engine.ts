/**
 * Candy Match rules engine. Pure functions over an immutable-by-convention
 * State: nothing here touches React, timers or storage.
 *
 * Board model
 *  - A w×h grid of cells. Cells can be holes (not playable), and playable
 *    cells can carry jelly (under the piece), a lock (on the piece), icing or
 *    chocolate (blocks that take the whole cell).
 *  - Pieces are candies (colour + special) or ingredients, which cannot be
 *    matched and must ride down to the bottom of their column.
 *
 * Gravity
 *  - Pieces fall straight down, passing through holes. Icing, chocolate and
 *    locked candies do not move, so the cells under them are refilled by
 *    pieces sliding in diagonally from the neighbouring columns.
 *  - New pieces enter at the top playable cell of each column.
 *
 * Specials: 4 in a line → striped (row/col), L/T → wrapped (3×3 blast),
 * 5 in a line → rainbow. Swapping two specials combines them.
 */
export type Special = 'none' | 'row' | 'col' | 'wrap' | 'rainbow';

export interface Candy {
  id: number;
  kind: 'candy';
  color: number;
  special: Special;
}

export interface Ingredient {
  id: number;
  kind: 'ingredient';
  type: number;
}

export type Piece = Candy | Ingredient;

export interface Cell {
  playable: boolean;
  /** Jelly layers under the piece (0–2). */
  jelly: number;
  /** Icing layers (0–2). Icing fills the cell; there is no piece. */
  icing: number;
  /** Chocolate fills the cell and spreads when left alone. */
  chocolate: boolean;
  /** A locked piece cannot be swapped and does not fall. */
  lock: boolean;
}

export interface State {
  w: number;
  h: number;
  colors: number;
  cells: Cell[];
  pieces: (Piece | null)[];
  ingredients: { target: number; spawned: number; collected: number };
}

export interface Fired {
  cell: number;
  special: Special;
  color: number;
}

export interface Step {
  kind: 'match' | 'shuffle' | 'chocolate' | 'convert';
  /** Cells whose piece popped this step. */
  popped: number[];
  /** Specials created this step. */
  created: { cell: number; piece: Candy }[];
  /** Specials that went off, for effects. */
  fired: Fired[];
  /** Cells where an obstacle (icing, chocolate, lock) was hit. */
  obstacleHits: number[];
  /** Board after the pops, before anything falls. */
  cleared: State;
  /** Board after gravity and refill. */
  state: State;
  /** New pieces → rows they fall from above the board. */
  spawned: Map<number, number>;
  /** Exit cells an ingredient left from. */
  ingredientsOut: number[];
  points: number;
  /** Colour of every candy cleared (for collection goals). */
  colors: number[];
  /** Cascade depth, 1 for the player's own match. */
  combo: number;
}

export const POINTS = { candy: 20, special: 60, obstacle: 40, jelly: 30, ingredient: 500 };

let nextId = 1;
export const newCandy = (color: number, special: Special = 'none'): Candy => ({ id: nextId++, kind: 'candy', color, special });
const newIngredient = (type: number): Ingredient => ({ id: nextId++, kind: 'ingredient', type });

/* ------------------------------------------------------------------ cells */

export const blankCell = (playable = true): Cell => ({ playable, jelly: 0, icing: 0, chocolate: false, lock: false });

/** A cell that can hold a piece (no hole, icing or chocolate). */
export function isFree(s: State, i: number): boolean {
  const c = s.cells[i];
  return c.playable && c.icing === 0 && !c.chocolate;
}

export function isMovable(s: State, i: number): boolean {
  return isFree(s, i) && !s.cells[i].lock && s.pieces[i] !== null;
}

export function adjacent(s: State, a: number, b: number): boolean {
  const dr = Math.abs(Math.floor(a / s.w) - Math.floor(b / s.w));
  const dc = Math.abs((a % s.w) - (b % s.w));
  return dr + dc === 1;
}

function neighbours(s: State, i: number): number[] {
  const r = Math.floor(i / s.w);
  const c = i % s.w;
  const out: number[] = [];
  if (r > 0) out.push(i - s.w);
  if (r < s.h - 1) out.push(i + s.w);
  if (c > 0) out.push(i - 1);
  if (c < s.w - 1) out.push(i + 1);
  return out;
}

/** Bottom playable cell of each column: where ingredients leave the board. */
export function exitCells(s: State): number[] {
  const out: number[] = [];
  for (let c = 0; c < s.w; c++) {
    for (let r = s.h - 1; r >= 0; r--) {
      if (s.cells[r * s.w + c].playable) {
        out.push(r * s.w + c);
        break;
      }
    }
  }
  return out;
}

const cloneState = (s: State): State => ({
  ...s,
  cells: s.cells.map((c) => ({ ...c })),
  pieces: s.pieces.slice(),
  ingredients: { ...s.ingredients },
});

const candyAt = (s: State, i: number): Candy | null => {
  const p = s.pieces[i];
  return p && p.kind === 'candy' ? p : null;
};

/* ------------------------------------------------------------ counting */

export function countJelly(s: State): number {
  return s.cells.reduce((n, c) => n + (c.playable ? c.jelly : 0), 0);
}
export function countIcing(s: State): number {
  return s.cells.reduce((n, c) => n + (c.playable ? c.icing : 0), 0);
}
export function countChocolate(s: State): number {
  return s.cells.reduce((n, c) => n + (c.playable && c.chocolate ? 1 : 0), 0);
}
export function countLocks(s: State): number {
  return s.cells.reduce((n, c) => n + (c.playable && c.lock ? 1 : 0), 0);
}

/* ------------------------------------------------------------- matching */

interface Run {
  cells: number[];
  horizontal: boolean;
}

function matchColor(s: State, i: number): number {
  if (!isFree(s, i)) return -1;
  const p = candyAt(s, i);
  return p && p.special !== 'rainbow' ? p.color : -1;
}

/** Every horizontal and vertical run of three or more same-coloured candies. */
export function findRuns(s: State): Run[] {
  const runs: Run[] = [];
  const scan = (len: number, lines: number, at: (line: number, k: number) => number, horizontal: boolean) => {
    for (let line = 0; line < lines; line++) {
      let start = 0;
      for (let k = 1; k <= len; k++) {
        const col = matchColor(s, at(line, start));
        if (k < len && col >= 0 && matchColor(s, at(line, k)) === col) continue;
        if (k - start >= 3 && col >= 0) runs.push({ cells: Array.from({ length: k - start }, (_, j) => at(line, start + j)), horizontal });
        start = k;
      }
    }
  };
  scan(s.w, s.h, (r, c) => r * s.w + c, true);
  scan(s.h, s.w, (c, r) => r * s.w + c, false);
  return runs;
}

function swappedState(s: State, a: number, b: number): State {
  const pieces = s.pieces.slice();
  [pieces[a], pieces[b]] = [pieces[b], pieces[a]];
  return { ...s, pieces };
}

/** Two neighbouring pieces that may change places at all. */
export function canSwap(s: State, a: number, b: number): boolean {
  return adjacent(s, a, b) && isMovable(s, a) && isMovable(s, b);
}

/** Whether swapping a and b is a scoring move. */
export function isValidSwap(s: State, a: number, b: number): boolean {
  if (!canSwap(s, a, b)) return false;
  const pa = candyAt(s, a);
  const pb = candyAt(s, b);
  if (pa && pb) {
    if (pa.special === 'rainbow' || pb.special === 'rainbow') return true;
    if (pa.special !== 'none' && pb.special !== 'none') return true;
  }
  const next = swappedState(s, a, b);
  return findRuns(next).some((run) => run.cells.includes(a) || run.cells.includes(b));
}

export function allMoves(s: State): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < s.pieces.length; i++) {
    const right = i % s.w < s.w - 1 ? i + 1 : -1;
    const down = i + s.w < s.pieces.length ? i + s.w : -1;
    if (right >= 0 && isValidSwap(s, i, right)) out.push([i, right]);
    if (down >= 0 && isValidSwap(s, i, down)) out.push([i, down]);
  }
  return out;
}

export function findMove(s: State): [number, number] | null {
  for (let i = 0; i < s.pieces.length; i++) {
    const right = i % s.w < s.w - 1 ? i + 1 : -1;
    const down = i + s.w < s.pieces.length ? i + s.w : -1;
    if (right >= 0 && isValidSwap(s, i, right)) return [i, right];
    if (down >= 0 && isValidSwap(s, i, down)) return [i, down];
  }
  return null;
}

/* -------------------------------------------------------------- gravity */

function spawnPiece(s: State, random: () => number): Piece {
  const ing = s.ingredients;
  if (ing.spawned < ing.target) {
    const onBoard = s.pieces.filter((p) => p?.kind === 'ingredient').length;
    const chance = onBoard === 0 ? 0.5 : onBoard === 1 ? 0.06 : 0;
    if (random() < chance) {
      ing.spawned++;
      return newIngredient(ing.spawned % 2);
    }
  }
  return newCandy(Math.floor(random() * s.colors));
}

/**
 * Lets pieces fall and refills from the top. Mutates `s` (a working copy)
 * and returns, for each new piece, how many rows it fell from above the
 * board so the UI can animate the drop.
 */
function settle(s: State, random: () => number): Map<number, number> {
  const { w, h } = s;
  const top: number[] = [];
  for (let c = 0; c < w; c++) {
    let r = 0;
    while (r < h && !s.cells[r * w + c].playable) r++;
    top.push(r);
  }
  const spawnedIn = Array<number>(w).fill(0);
  const spawned = new Map<number, number>(); // id → spawn order in its column
  const movable = (j: number) => isFree(s, j) && !s.cells[j].lock && s.pieces[j] !== null;

  for (let guard = 0; guard < 400; guard++) {
    // Straight falls (through holes) and spawns until nothing moves.
    let changed = true;
    while (changed) {
      changed = false;
      for (let r = h - 1; r >= 0; r--) {
        for (let c = 0; c < w; c++) {
          const i = r * w + c;
          if (!isFree(s, i) || s.pieces[i]) continue;
          let r2 = r - 1;
          while (r2 >= 0 && !s.cells[r2 * w + c].playable) r2--;
          if (r2 < 0) {
            const p = spawnPiece(s, random);
            s.pieces[i] = p;
            spawned.set(p.id, spawnedIn[c]++);
            changed = true;
            continue;
          }
          const j = r2 * w + c;
          if (movable(j)) {
            s.pieces[i] = s.pieces[j];
            s.pieces[j] = null;
            changed = true;
          }
        }
      }
    }
    // One diagonal slide into a cell nothing can reach from straight above.
    let slid = false;
    for (let r = h - 1; r >= 1 && !slid; r--) {
      for (let c = 0; c < w && !slid; c++) {
        const i = r * w + c;
        if (!isFree(s, i) || s.pieces[i]) continue;
        for (const dc of [-1, 1]) {
          const c2 = c + dc;
          if (c2 < 0 || c2 >= w) continue;
          const j = (r - 1) * w + c2;
          if (movable(j) && s.pieces[j]?.kind === 'candy') {
            s.pieces[i] = s.pieces[j];
            s.pieces[j] = null;
            slid = true;
            break;
          }
        }
      }
    }
    if (!slid) break;
  }

  const drops = new Map<number, number>();
  s.pieces.forEach((p, i) => {
    if (!p || !spawned.has(p.id)) return;
    const r = Math.floor(i / w);
    const c = i % w;
    drops.set(p.id, Math.max(1, r - top[c] + 1 + spawned.get(p.id)!));
  });
  return drops;
}

/** Removes ingredients sitting on exit cells. Mutates `s`. */
function collectIngredients(s: State): number[] {
  const out: number[] = [];
  for (const i of exitCells(s)) {
    if (s.pieces[i]?.kind === 'ingredient') {
      s.pieces[i] = null;
      s.ingredients.collected++;
      out.push(i);
    }
  }
  return out;
}

/* ---------------------------------------------------------------- blasts */

function inBounds(s: State, r: number, c: number) {
  return r >= 0 && c >= 0 && r < s.h && c < s.w;
}

function area(s: State, cell: number, radius: number): number[] {
  const r = Math.floor(cell / s.w);
  const c = cell % s.w;
  const out: number[] = [];
  for (let y = r - radius; y <= r + radius; y++)
    for (let x = c - radius; x <= c + radius; x++) if (inBounds(s, y, x)) out.push(y * s.w + x);
  return out;
}

const rowCells = (s: State, r: number) => (r >= 0 && r < s.h ? Array.from({ length: s.w }, (_, x) => r * s.w + x) : []);
const colCells = (s: State, c: number) => (c >= 0 && c < s.w ? Array.from({ length: s.h }, (_, y) => y * s.w + c) : []);

function mostCommonColor(s: State): number {
  const counts = Array<number>(s.colors).fill(0);
  s.pieces.forEach((p, i) => {
    if (p?.kind === 'candy' && p.special !== 'rainbow' && isFree(s, i)) counts[p.color]++;
  });
  let best = 0;
  counts.forEach((n, c) => n > counts[best] && (best = c));
  return best;
}

function cellsOfColor(s: State, color: number): number[] {
  const out: number[] = [];
  s.pieces.forEach((p, i) => p?.kind === 'candy' && p.color === color && p.special !== 'rainbow' && isFree(s, i) && out.push(i));
  return out;
}

function blast(s: State, cell: number, special: Special, color: number): number[] {
  const r = Math.floor(cell / s.w);
  const c = cell % s.w;
  if (special === 'row') return rowCells(s, r);
  if (special === 'col') return colCells(s, c);
  if (special === 'wrap') return area(s, cell, 1);
  if (special === 'rainbow') return [cell, ...cellsOfColor(s, color)];
  return [cell];
}

/* ------------------------------------------------------------ resolving */

interface HitResult {
  step: Omit<Step, 'state' | 'spawned' | 'ingredientsOut' | 'kind' | 'combo'>;
  chocolateCleared: number;
}

/**
 * Applies one wave of hits: matched cells (which also damage neighbouring
 * icing and chocolate) plus any other hit cells, expanded through every
 * special caught in them. Returns the board before gravity.
 */
function applyHits(
  start: State,
  hits: Set<number>,
  matched: Set<number>,
  created: { cell: number; piece: Candy }[],
  multiplier: number,
): HitResult {
  const s = cloneState(start);
  const createdCells = new Set(created.map((c) => c.cell));
  const all = new Set(hits);
  matched.forEach((i) => all.add(i));

  // Fire every special inside the hit area, repeatedly.
  const fired: Fired[] = [];
  const firedCells = new Set<number>();
  let grew = true;
  while (grew) {
    grew = false;
    for (const i of [...all]) {
      // A special caught in the match still goes off, even where a new one is made.
      if (firedCells.has(i) || !isFree(s, i) || s.cells[i].lock) continue;
      const p = candyAt(s, i);
      if (!p || p.special === 'none') continue;
      firedCells.add(i);
      const color = p.special === 'rainbow' ? mostCommonColor(s) : p.color;
      fired.push({ cell: i, special: p.special, color });
      for (const j of blast(s, i, p.special, color)) {
        if (!all.has(j)) {
          all.add(j);
          grew = true;
        }
      }
    }
  }

  // Matches also crack icing and chocolate next to them.
  const obstacleHits = new Set<number>();
  matched.forEach((i) =>
    neighbours(s, i).forEach((j) => {
      const c = s.cells[j];
      if (c.playable && (c.icing > 0 || c.chocolate)) obstacleHits.add(j);
    }),
  );

  const popped: number[] = [];
  const colors: number[] = [];
  let points = 0;
  let chocolateCleared = 0;
  let candies = 0;

  for (const i of all) {
    const cell = s.cells[i];
    if (!cell.playable) continue;
    if (cell.chocolate || cell.icing > 0) {
      obstacleHits.add(i);
      continue;
    }
    if (cell.lock) {
      cell.lock = false;
      points += POINTS.obstacle;
      obstacleHits.add(i);
      if (cell.jelly > 0) {
        cell.jelly--;
        points += POINTS.jelly;
      }
      continue;
    }
    const p = s.pieces[i];
    if (createdCells.has(i)) {
      if (p?.kind === 'candy') colors.push(p.color);
      if (cell.jelly > 0) {
        cell.jelly--;
        points += POINTS.jelly;
      }
      continue;
    }
    if (p?.kind === 'candy') {
      colors.push(p.color);
      s.pieces[i] = null;
      popped.push(i);
      candies++;
      if (cell.jelly > 0) {
        cell.jelly--;
        points += POINTS.jelly;
      }
    }
  }

  for (const j of obstacleHits) {
    const c = s.cells[j];
    if (c.chocolate) {
      c.chocolate = false;
      chocolateCleared++;
      points += POINTS.obstacle;
    } else if (c.icing > 0) {
      c.icing--;
      points += POINTS.obstacle;
    }
  }

  created.forEach(({ cell, piece }) => (s.pieces[cell] = piece));
  points += candies * POINTS.candy * multiplier + created.length * POINTS.special;
  return {
    step: { popped, created, fired, obstacleHits: [...obstacleHits], cleared: s, points, colors },
    chocolateCleared,
  };
}

/** Gravity, refill and ingredient exits after a wave of hits. */
function finishStep(
  hit: HitResult,
  kind: Step['kind'],
  combo: number,
  random: () => number,
): Step {
  const s = cloneState(hit.step.cleared);
  const spawned = settle(s, random);
  const ingredientsOut: number[] = [];
  for (let guard = 0; guard < 10; guard++) {
    const out = collectIngredients(s);
    if (!out.length) break;
    ingredientsOut.push(...out);
    settle(s, random).forEach((v, k) => spawned.set(k, v));
  }
  return {
    ...hit.step,
    kind,
    combo,
    state: s,
    spawned,
    ingredientsOut,
    points: hit.step.points + ingredientsOut.length * POINTS.ingredient,
  };
}

/** Special pieces made from a set of runs (bombs at crossings, stripes, rainbows). */
function specialsFromRuns(s: State, runs: Run[], moveCells: number[]): { cell: number; piece: Candy }[] {
  const created: { cell: number; piece: Candy }[] = [];
  const taken = new Set<number>();
  const counts = new Map<number, number>();
  runs.forEach((run) => run.cells.forEach((i) => counts.set(i, (counts.get(i) ?? 0) + 1)));
  const used = new Set<Run>();
  const longest = (cell: number) => Math.max(...runs.filter((r) => r.cells.includes(cell)).map((r) => r.cells.length));
  counts.forEach((n, cell) => {
    if (n < 2 || taken.has(cell) || s.cells[cell].lock) return;
    // A cross that includes a line of five still makes a rainbow.
    const special: Special = longest(cell) >= 5 ? 'rainbow' : 'wrap';
    created.push({ cell, piece: newCandy(candyAt(s, cell)!.color, special) });
    taken.add(cell);
    runs.filter((r) => r.cells.includes(cell)).forEach((r) => used.add(r));
  });
  for (const run of runs) {
    if (used.has(run) || run.cells.length < 4) continue;
    const free = run.cells.filter((i) => !s.cells[i].lock && !taken.has(i));
    if (!free.length) continue;
    const at = free.find((i) => moveCells.includes(i)) ?? free[Math.floor(free.length / 2)];
    const special: Special = run.cells.length >= 5 ? 'rainbow' : run.horizontal ? 'col' : 'row';
    created.push({ cell: at, piece: newCandy(candyAt(s, at)!.color, special) });
    taken.add(at);
  }
  return created;
}

interface Tally {
  chocolateCleared: number;
}

/** Plays out every cascade from the current board. */
function cascade(
  start: State,
  steps: Step[],
  moveCells: number[],
  random: () => number,
  tally: Tally,
  firstCombo: number,
): State {
  let s = start;
  let combo = firstCombo;
  for (let guard = 0; guard < 80; guard++) {
    const runs = findRuns(s);
    if (!runs.length) break;
    const matched = new Set<number>();
    runs.forEach((run) => run.cells.forEach((i) => matched.add(i)));
    const created = specialsFromRuns(s, runs, moveCells);
    const hit = applyHits(s, new Set(), matched, created, combo);
    tally.chocolateCleared += hit.chocolateCleared;
    const step = finishStep(hit, 'match', combo, random);
    steps.push(step);
    s = step.state;
    moveCells = [];
    combo++;
  }
  return s;
}

/** Chocolate grows into a neighbouring candy when a move cleared none of it. */
function spreadChocolate(s: State, random: () => number): Step | null {
  if (countChocolate(s) === 0) return null;
  const targets = new Set<number>();
  s.cells.forEach((c, i) => {
    if (!c.playable || !c.chocolate) return;
    neighbours(s, i).forEach((j) => {
      const p = candyAt(s, j);
      if (isFree(s, j) && !s.cells[j].lock && p && p.special === 'none') targets.add(j);
    });
  });
  if (!targets.size) return null;
  const list = [...targets];
  const at = list[Math.floor(random() * list.length)];
  const next = cloneState(s);
  next.pieces[at] = null;
  next.cells[at].chocolate = true;
  return {
    kind: 'chocolate',
    popped: [at],
    created: [],
    fired: [],
    obstacleHits: [at],
    cleared: next,
    state: next,
    spawned: new Map(),
    ingredientsOut: [],
    points: 0,
    colors: [],
    combo: 0,
  };
}

/** Rearranges the movable candies into a board with no matches and a move. */
export function shuffle(s: State, random: () => number): State {
  const cells: number[] = [];
  s.pieces.forEach((p, i) => p?.kind === 'candy' && isFree(s, i) && !s.cells[i].lock && cells.push(i));
  for (let attempt = 0; attempt < 400; attempt++) {
    const next = cloneState(s);
    const pieces = cells.map((i) => s.pieces[i]!);
    for (let k = pieces.length - 1; k > 0; k--) {
      const j = Math.floor(random() * (k + 1));
      [pieces[k], pieces[j]] = [pieces[j], pieces[k]];
    }
    cells.forEach((i, k) => (next.pieces[i] = pieces[k]));
    // After many failed orderings, recolour plain candies too.
    if (attempt > 150) {
      cells.forEach((i) => {
        const p = next.pieces[i] as Candy;
        if (p.special === 'none') next.pieces[i] = newCandy(Math.floor(random() * s.colors));
      });
    }
    if (!findRuns(next).length && findMove(next)) return next;
  }
  return s;
}

function shuffleStep(s: State, random: () => number): Step {
  const next = shuffle(s, random);
  return {
    kind: 'shuffle',
    popped: [],
    created: [],
    fired: [],
    obstacleHits: [],
    cleared: next,
    state: next,
    spawned: new Map(),
    ingredientsOut: [],
    points: 0,
    colors: [],
    combo: 0,
  };
}

/** After a move: chocolate growth, then a reshuffle if no move is left. */
function endOfMove(s: State, steps: Step[], tally: Tally, startHadChocolate: boolean, random: () => number) {
  if (startHadChocolate && tally.chocolateCleared === 0) {
    const grow = spreadChocolate(s, random);
    if (grow) {
      steps.push(grow);
      s = grow.state;
    }
  }
  if (!findMove(s)) steps.push(shuffleStep(s, random));
}

/** The opening hit of a swap between two specials (or a rainbow and a candy). */
function comboHit(s: State, a: number, b: number): { board: State; hits: Set<number> } | null {
  const pa = candyAt(s, b)!; // the piece that moved from a now sits at b
  const pb = candyAt(s, a)!;
  if (!pa || !pb) return null;
  const sa = pa.special;
  const sb = pb.special;
  const rainbow = sa === 'rainbow' || sb === 'rainbow';
  if (!rainbow && (sa === 'none' || sb === 'none')) return null;

  const board = cloneState(s);
  const hits = new Set<number>([a, b]);
  const disarm = (i: number) => {
    const p = candyAt(board, i);
    if (p) board.pieces[i] = { ...p, special: 'none' };
  };

  if (sa === 'rainbow' && sb === 'rainbow') {
    board.cells.forEach((c, i) => c.playable && hits.add(i));
    disarm(a);
    disarm(b);
    return { board, hits };
  }
  if (rainbow) {
    const [rainCell, other] = sa === 'rainbow' ? [b, pb] : [a, pa];
    const otherCell = rainCell === a ? b : a;
    disarm(rainCell);
    const targets = cellsOfColor(board, other.color);
    if (other.special === 'none') {
      targets.forEach((i) => hits.add(i));
    } else {
      // Every candy of that colour becomes the other special, then they all fire.
      targets.forEach((i, k) => {
        const p = candyAt(board, i)!;
        const special: Special =
          other.special === 'wrap' ? 'wrap' : k % 2 === 0 ? 'row' : 'col';
        if (p.special === 'none' || i === otherCell) board.pieces[i] = { ...p, special };
        hits.add(i);
      });
    }
    return { board, hits };
  }

  const r = Math.floor(b / s.w);
  const c = b % s.w;
  disarm(a);
  disarm(b);
  const pair = [sa, sb];
  const stripes = (x: Special) => x === 'row' || x === 'col';
  if (pair.every((x) => x === 'wrap')) {
    area(board, b, 2).forEach((i) => hits.add(i));
  } else if (pair.some((x) => x === 'wrap')) {
    for (let k = -1; k <= 1; k++) {
      rowCells(board, r + k).forEach((i) => hits.add(i));
      colCells(board, c + k).forEach((i) => hits.add(i));
    }
  } else if (pair.every(stripes)) {
    rowCells(board, r).forEach((i) => hits.add(i));
    colCells(board, c).forEach((i) => hits.add(i));
  }
  return { board, hits };
}

/** Effects for a combo, so the UI can draw the right blast. */
function comboEffects(s: State, a: number, b: number, hits: Set<number>): Fired[] {
  const pa = candyAt(s, b);
  const pb = candyAt(s, a);
  const color = pa?.special === 'rainbow' ? (pb?.color ?? 0) : (pa?.color ?? 0);
  if (pa?.special === 'rainbow' || pb?.special === 'rainbow') return [{ cell: b, special: 'rainbow', color }];
  if (hits.size >= s.w * 3) return [{ cell: b, special: 'wrap', color }, { cell: b, special: 'row', color }, { cell: b, special: 'col', color }];
  if (pa?.special === 'wrap' && pb?.special === 'wrap') return [{ cell: b, special: 'wrap', color }];
  return [{ cell: b, special: 'row', color }, { cell: b, special: 'col', color }];
}

/**
 * Plays a swap and everything that follows. Returns the steps for animation,
 * or null if the swap is not a legal move.
 */
export function playMove(start: State, a: number, b: number, random: () => number): Step[] | null {
  if (!isValidSwap(start, a, b)) return null;
  return resolveSwap(start, a, b, random);
}

function resolveSwap(start: State, a: number, b: number, random: () => number): Step[] {
  const hadChocolate = countChocolate(start) > 0;
  const tally: Tally = { chocolateCleared: 0 };
  let s = swappedState(start, a, b);
  const steps: Step[] = [];
  const combo = comboHit(s, a, b);
  if (combo) {
    const effects = comboEffects(s, a, b, combo.hits);
    const hit = applyHits(combo.board, combo.hits, new Set(), [], 1);
    hit.step.fired.unshift(...effects);
    tally.chocolateCleared += hit.chocolateCleared;
    const step = finishStep(hit, 'match', 1, random);
    steps.push(step);
    s = step.state;
  }
  s = cascade(s, steps, combo ? [] : [a, b], random, tally, steps.length + 1);
  endOfMove(s, steps, tally, hadChocolate, random);
  return steps;
}

/** Booster: swap any two neighbouring pieces, match or not. */
export function freeSwap(start: State, a: number, b: number, random: () => number): Step[] | null {
  if (!canSwap(start, a, b)) return null;
  const s = swappedState(start, a, b);
  if (comboHit(s, a, b) || findRuns(s).length) return resolveSwap(start, a, b, random);
  // Nothing matched: just the swap itself (and a reshuffle if that left no move).
  const steps: Step[] = [
    {
      kind: 'convert',
      popped: [],
      created: [],
      fired: [],
      obstacleHits: [],
      cleared: s,
      state: s,
      spawned: new Map(),
      ingredientsOut: [],
      points: 0,
      colors: [],
      combo: 0,
    },
  ];
  if (!findMove(s)) steps.push(shuffleStep(s, random));
  return steps;
}

/** Booster: smash one cell (fires a special, cracks an obstacle). */
export function hammer(start: State, cell: number, random: () => number): Step[] | null {
  const c = start.cells[cell];
  if (!c?.playable) return null;
  const p = start.pieces[cell];
  if (isFree(start, cell) && !c.lock && (!p || p.kind === 'ingredient')) return null;
  const tally: Tally = { chocolateCleared: 0 };
  const hit = applyHits(start, new Set([cell]), new Set(), [], 1);
  tally.chocolateCleared += hit.chocolateCleared;
  const steps = [finishStep(hit, 'match', 1, random)];
  const s = cascade(steps[0].state, steps, [], random, tally, 2);
  if (!findMove(s)) steps.push(shuffleStep(s, random));
  return steps;
}

export function shuffleBooster(s: State, random: () => number): Step[] {
  return [shuffleStep(s, random)];
}

/**
 * The end-of-level celebration: every move left over turns a candy into a
 * striped one, then every special on the board goes off.
 */
export function sugarRush(start: State, movesLeft: number, random: () => number): Step[] {
  const steps: Step[] = [];
  const s = cloneState(start);
  const plain: number[] = [];
  s.pieces.forEach((p, i) => p?.kind === 'candy' && p.special === 'none' && isFree(s, i) && !s.cells[i].lock && plain.push(i));
  for (let k = plain.length - 1; k > 0; k--) {
    const j = Math.floor(random() * (k + 1));
    [plain[k], plain[j]] = [plain[j], plain[k]];
  }
  const created = plain.slice(0, Math.min(movesLeft, 20)).map((cell) => {
    const p = s.pieces[cell] as Candy;
    const piece = newCandy(p.color, random() < 0.5 ? 'row' : 'col');
    s.pieces[cell] = piece;
    return { cell, piece };
  });
  if (created.length) {
    steps.push({
      kind: 'convert',
      popped: [],
      created,
      fired: [],
      obstacleHits: [],
      cleared: s,
      state: s,
      spawned: new Map(),
      ingredientsOut: [],
      points: created.length * POINTS.special,
      colors: [],
      combo: 0,
    });
  }
  let board: State = s;
  const tally: Tally = { chocolateCleared: 0 };
  for (let guard = 0; guard < 40; guard++) {
    const specials: number[] = [];
    board.pieces.forEach((p, i) => p?.kind === 'candy' && p.special !== 'none' && isFree(board, i) && !board.cells[i].lock && specials.push(i));
    if (!specials.length) break;
    const hit = applyHits(board, new Set(specials.slice(0, 4)), new Set(), [], 1);
    const step = finishStep(hit, 'match', 1, random);
    steps.push(step);
    board = cascade(step.state, steps, [], random, tally, 2);
  }
  return steps;
}

/* -------------------------------------------------------------- creation */

export interface Layout {
  w: number;
  h: number;
  colors: number;
  cells: Cell[];
  ingredients: number;
}

/** A fresh board for a level: no ready-made matches and at least one move. */
export function createState(layout: Layout, random: () => number): State {
  const base: State = {
    w: layout.w,
    h: layout.h,
    colors: layout.colors,
    cells: layout.cells.map((c) => ({ ...c })),
    pieces: Array(layout.w * layout.h).fill(null),
    ingredients: { target: layout.ingredients, spawned: 0, collected: 0 },
  };
  for (let attempt = 0; attempt < 200; attempt++) {
    const s = cloneState(base);
    for (let i = 0; i < s.pieces.length; i++) {
      if (!isFree(s, i)) continue;
      const r = Math.floor(i / s.w);
      const c = i % s.w;
      const bad = new Set<number>();
      const left = [i - 1, i - 2].map((j) => (c >= 2 ? matchColor(s, j) : -1));
      const up = [i - s.w, i - 2 * s.w].map((j) => (r >= 2 ? matchColor(s, j) : -1));
      if (left[0] >= 0 && left[0] === left[1]) bad.add(left[0]);
      if (up[0] >= 0 && up[0] === up[1]) bad.add(up[0]);
      const choices = Array.from({ length: s.colors }, (_, k) => k).filter((k) => !bad.has(k));
      s.pieces[i] = newCandy(choices[Math.floor(random() * choices.length)]);
    }
    // Ingredient levels start with one ingredient in the top row.
    if (layout.ingredients > 0) {
      const tops = exitCells(s)
        .map((e) => e % s.w)
        .map((c) => {
          for (let r = 0; r < s.h; r++) if (s.cells[r * s.w + c].playable) return isFree(s, r * s.w + c) && !s.cells[r * s.w + c].lock ? r * s.w + c : -1;
          return -1;
        })
        .filter((i) => i >= 0);
      if (tops.length) {
        const at = tops[Math.floor(random() * tops.length)];
        s.pieces[at] = newIngredient(0);
        s.ingredients.spawned = 1;
      }
    }
    if (!findRuns(s).length && findMove(s)) return s;
  }
  return shuffle(cloneState(base), random);
}

/* ------------------------------------------------------------ save data */

/** Gives restored pieces fresh ids so they never clash with new ones. */
export function revive(s: State): State {
  return {
    ...cloneState(s),
    pieces: s.pieces.map((p) => (p === null ? null : p.kind === 'candy' ? newCandy(p.color, p.special) : newIngredient(p.type))),
  };
}
