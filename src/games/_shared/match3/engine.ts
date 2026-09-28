/**
 * Match-three engine shared by Match Three and Candy Match.
 *
 * The board is a w×h grid of pieces. Swapping two neighbours is allowed
 * when it creates a line of three or more of one colour (or involves a
 * rainbow piece). Matches clear, special pieces are created from bigger
 * matches, pieces fall, and new ones drop in until the board is stable.
 *
 * Specials:
 *  - a line of 4 makes a *stripe* piece that clears its whole row or column;
 *  - an L or T shape makes a *bomb* that clears a 3×3 area;
 *  - a line of 5 makes a *rainbow* that clears every piece of the colour it
 *    is swapped with.
 */
export type Special = 'none' | 'row' | 'col' | 'bomb' | 'rainbow';

export interface Piece {
  id: number;
  color: number;
  special: Special;
}

export type Board = (Piece | null)[];

export interface Config {
  w: number;
  h: number;
  colors: number;
  specials: boolean;
}

let nextId = 1;
const newPiece = (color: number, special: Special = 'none'): Piece => ({ id: nextId++, color, special });

export const index = (cfg: Config, r: number, c: number) => r * cfg.w + c;

export function adjacent(cfg: Config, a: number, b: number): boolean {
  const dr = Math.abs(Math.floor(a / cfg.w) - Math.floor(b / cfg.w));
  const dc = Math.abs((a % cfg.w) - (b % cfg.w));
  return dr + dc === 1;
}

/** A random board with no ready-made matches and at least one legal move. */
export function createBoard(cfg: Config, random: () => number): Board {
  for (;;) {
    const board: Board = [];
    for (let r = 0; r < cfg.h; r++) {
      for (let c = 0; c < cfg.w; c++) {
        let color: number;
        do color = Math.floor(random() * cfg.colors);
        while (
          (c >= 2 && board[r * cfg.w + c - 1]!.color === color && board[r * cfg.w + c - 2]!.color === color) ||
          (r >= 2 && board[(r - 1) * cfg.w + c]!.color === color && board[(r - 2) * cfg.w + c]!.color === color)
        );
        board.push(newPiece(color));
      }
    }
    if (findMove(cfg, board)) return board;
  }
}

interface Run {
  cells: number[];
  horizontal: boolean;
}

/** Every horizontal and vertical run of three or more same-coloured pieces. */
export function findRuns(cfg: Config, board: Board): Run[] {
  const runs: Run[] = [];
  const color = (i: number) => {
    const p = board[i];
    return p && p.special !== 'rainbow' ? p.color : -1;
  };
  for (let r = 0; r < cfg.h; r++) {
    let start = 0;
    for (let c = 1; c <= cfg.w; c++) {
      const same = c < cfg.w && color(r * cfg.w + c) >= 0 && color(r * cfg.w + c) === color(r * cfg.w + start);
      if (same) continue;
      if (c - start >= 3 && color(r * cfg.w + start) >= 0)
        runs.push({ cells: Array.from({ length: c - start }, (_, k) => r * cfg.w + start + k), horizontal: true });
      start = c;
    }
  }
  for (let c = 0; c < cfg.w; c++) {
    let start = 0;
    for (let r = 1; r <= cfg.h; r++) {
      const same = r < cfg.h && color(r * cfg.w + c) >= 0 && color(r * cfg.w + c) === color(start * cfg.w + c);
      if (same) continue;
      if (r - start >= 3 && color(start * cfg.w + c) >= 0)
        runs.push({ cells: Array.from({ length: r - start }, (_, k) => (start + k) * cfg.w + c), horizontal: false });
      start = r;
    }
  }
  return runs;
}

function swapped(board: Board, a: number, b: number): Board {
  const next = board.slice();
  [next[a], next[b]] = [next[b], next[a]];
  return next;
}

/** Whether swapping a and b is a legal move. */
export function isValidSwap(cfg: Config, board: Board, a: number, b: number): boolean {
  if (!adjacent(cfg, a, b) || !board[a] || !board[b]) return false;
  if (board[a]!.special === 'rainbow' || board[b]!.special === 'rainbow') return true;
  // Two specials swapped together always combine.
  if (board[a]!.special !== 'none' && board[b]!.special !== 'none') return true;
  const next = swapped(board, a, b);
  return findRuns(cfg, next).some((run) => run.cells.includes(a) || run.cells.includes(b));
}

export function findMove(cfg: Config, board: Board): [number, number] | null {
  for (let i = 0; i < board.length; i++) {
    const right = i % cfg.w < cfg.w - 1 ? i + 1 : -1;
    const down = i + cfg.w < board.length ? i + cfg.w : -1;
    if (right >= 0 && isValidSwap(cfg, board, i, right)) return [i, right];
    if (down >= 0 && isValidSwap(cfg, board, i, down)) return [i, down];
  }
  return null;
}

export interface Step {
  /** Cells cleared this step. */
  cleared: number[];
  /** Colour of every cleared piece, for collection goals. */
  clearedColors: number[];
  /** Specials created this step (cell → piece). */
  created: { cell: number; piece: Piece }[];
  /** Board after gravity and refill. */
  board: Board;
  /** For each piece id on the new board that fell, how many rows it dropped. */
  drops: Map<number, number>;
  points: number;
}

/** Cells a special clears when it is triggered at `cell`. */
function blast(cfg: Config, board: Board, cell: number, special: Special, targetColor = -1): number[] {
  const r = Math.floor(cell / cfg.w);
  const c = cell % cfg.w;
  if (special === 'row') return Array.from({ length: cfg.w }, (_, x) => r * cfg.w + x);
  if (special === 'col') return Array.from({ length: cfg.h }, (_, y) => y * cfg.w + c);
  if (special === 'bomb') {
    const out: number[] = [];
    for (let y = r - 1; y <= r + 1; y++)
      for (let x = c - 1; x <= c + 1; x++) if (y >= 0 && x >= 0 && y < cfg.h && x < cfg.w) out.push(y * cfg.w + x);
    return out;
  }
  if (special === 'rainbow') {
    const out = [cell];
    board.forEach((p, i) => p && p.color === targetColor && out.push(i));
    return out;
  }
  return [cell];
}

/**
 * Expands a set of cleared cells through any specials inside it (a stripe
 * caught in a blast fires too), until nothing new is added.
 */
function chain(cfg: Config, board: Board, initial: Set<number>): Set<number> {
  const out = new Set(initial);
  const fired = new Set<number>();
  let grew = true;
  while (grew) {
    grew = false;
    for (const i of [...out]) {
      const p = board[i];
      if (!p || p.special === 'none' || fired.has(i)) continue;
      fired.add(i);
      const color = p.special === 'rainbow' ? mostCommonColor(board) : -1;
      for (const j of blast(cfg, board, i, p.special, color)) {
        if (!out.has(j)) {
          out.add(j);
          grew = true;
        }
      }
    }
  }
  return out;
}

function mostCommonColor(board: Board): number {
  const counts = new Map<number, number>();
  board.forEach((p) => p && p.special !== 'rainbow' && counts.set(p.color, (counts.get(p.color) ?? 0) + 1));
  let best = 0;
  let bestN = -1;
  counts.forEach((n, color) => {
    if (n > bestN) {
      best = color;
      bestN = n;
    }
  });
  return best;
}

function gravity(cfg: Config, board: Board, random: () => number): { board: Board; drops: Map<number, number> } {
  const next: Board = Array(board.length).fill(null);
  const drops = new Map<number, number>();
  for (let c = 0; c < cfg.w; c++) {
    let write = cfg.h - 1;
    for (let r = cfg.h - 1; r >= 0; r--) {
      const p = board[r * cfg.w + c];
      if (!p) continue;
      next[write * cfg.w + c] = p;
      if (write !== r) drops.set(p.id, write - r);
      write--;
    }
    // New pieces fall in from above the board.
    const missing = write + 1;
    for (let r = write; r >= 0; r--) {
      const p = newPiece(Math.floor(random() * cfg.colors));
      next[r * cfg.w + c] = p;
      drops.set(p.id, missing);
    }
  }
  return { board: next, drops };
}

/**
 * Plays a swap and every cascade that follows. Returns the steps for
 * animation, or null if the swap is not legal. `swapCells` marks where a
 * special created by the player's move should appear.
 */
export function playSwap(cfg: Config, start: Board, a: number, b: number, random: () => number): Step[] | null {
  if (!isValidSwap(cfg, start, a, b)) return null;
  let board = swapped(start, a, b);
  const steps: Step[] = [];
  const pa = board[b]!; // the piece that moved from a to b
  const pb = board[a]!;

  // Special swaps: rainbow with anything, or two specials together.
  if (pa.special === 'rainbow' || pb.special === 'rainbow' || (pa.special !== 'none' && pb.special !== 'none')) {
    let initial: Set<number>;
    if (pa.special === 'rainbow' && pb.special === 'rainbow') {
      initial = new Set(board.map((_, i) => i));
    } else if (pa.special === 'rainbow' || pb.special === 'rainbow') {
      const [rainCell, other] = pa.special === 'rainbow' ? [b, pb] : [a, pa];
      initial = new Set(blast(cfg, board, rainCell, 'rainbow', other.color));
      // A rainbow swapped with a special turns every matching piece into that special.
      if (other.special !== 'none' && other.special !== 'rainbow') {
        board = board.map((p) => (p && p.color === other.color && p.special === 'none' ? { ...p, special: other.special } : p));
      }
      initial.add(pa.special === 'rainbow' ? a : b);
    } else {
      // Stripe + stripe: a cross; bomb with anything: a bigger blast.
      const specials = [pa.special, pb.special];
      initial = new Set<number>();
      if (specials.includes('bomb')) {
        const r = Math.floor(b / cfg.w);
        const c = b % cfg.w;
        for (let y = r - 2; y <= r + 2; y++)
          for (let x = c - 2; x <= c + 2; x++) if (y >= 0 && x >= 0 && y < cfg.h && x < cfg.w) initial.add(y * cfg.w + x);
      } else {
        blast(cfg, board, b, 'row').forEach((i) => initial.add(i));
        blast(cfg, board, b, 'col').forEach((i) => initial.add(i));
      }
      initial.add(a);
      initial.add(b);
    }
    board = board.map((p, i) => (initial.has(i) && p && (i === a || i === b) ? { ...p, special: 'none' } : p));
    steps.push(resolveStep(cfg, board, chain(cfg, board, initial), [], random, 1));
    board = steps[0].board;
  }

  let moveCells = [a, b];
  let multiplier = steps.length + 1;
  for (let guard = 0; guard < 60; guard++) {
    const runs = findRuns(cfg, board);
    if (!runs.length) break;
    const matched = new Set<number>();
    runs.forEach((run) => run.cells.forEach((i) => matched.add(i)));
    const created: { cell: number; piece: Piece }[] = [];
    if (cfg.specials) {
      // Cells shared by a horizontal and a vertical run make a bomb.
      const counts = new Map<number, number>();
      runs.forEach((run) => run.cells.forEach((i) => counts.set(i, (counts.get(i) ?? 0) + 1)));
      const usedRuns = new Set<Run>();
      counts.forEach((n, cell) => {
        if (n < 2) return;
        created.push({ cell, piece: newPiece(board[cell]!.color, 'bomb') });
        runs.filter((r) => r.cells.includes(cell)).forEach((r) => usedRuns.add(r));
      });
      for (const run of runs) {
        if (usedRuns.has(run) || run.cells.length < 4) continue;
        // Put the special where the player moved, if that is in the run.
        const at = run.cells.find((i) => moveCells.includes(i)) ?? run.cells[Math.floor(run.cells.length / 2)];
        const special: Special = run.cells.length >= 5 ? 'rainbow' : run.horizontal ? 'col' : 'row';
        created.push({ cell: at, piece: newPiece(board[at]!.color, special) });
      }
    }
    const cleared = chain(cfg, board, matched);
    const step = resolveStep(cfg, board, cleared, created, random, multiplier);
    steps.push(step);
    board = step.board;
    moveCells = [];
    multiplier++;
  }

  // No moves left: reshuffle into a playable board (kept as a final step).
  if (!findMove(cfg, board)) {
    const fresh = createBoard(cfg, random);
    steps.push({ cleared: [], clearedColors: [], created: [], board: fresh, drops: new Map(), points: 0 });
  }
  return steps;
}

function resolveStep(
  cfg: Config,
  board: Board,
  cleared: Set<number>,
  created: { cell: number; piece: Piece }[],
  random: () => number,
  multiplier: number,
): Step {
  const next = board.slice();
  const clearedColors: number[] = [];
  const createdCells = new Set(created.map((c) => c.cell));
  cleared.forEach((i) => {
    if (next[i]) clearedColors.push(next[i]!.color);
    if (!createdCells.has(i)) next[i] = null;
  });
  created.forEach(({ cell, piece }) => (next[cell] = piece));
  const { board: settled, drops } = gravity(cfg, next, random);
  return {
    cleared: [...cleared].filter((i) => !createdCells.has(i)),
    clearedColors,
    created,
    board: settled,
    drops,
    points: cleared.size * 10 * multiplier + created.length * 30,
  };
}

export function validBoard(cfg: Config, value: unknown): value is Board {
  return (
    Array.isArray(value) &&
    value.length === cfg.w * cfg.h &&
    value.every(
      (p) =>
        p &&
        typeof p === 'object' &&
        Number.isInteger(p.color) &&
        p.color >= 0 &&
        p.color < cfg.colors &&
        ['none', 'row', 'col', 'bomb', 'rainbow'].includes(p.special),
    )
  );
}

/** Gives restored pieces fresh ids so they never clash with new ones. */
export function reviveBoard(board: Board): Board {
  return board.map((p) => (p ? newPiece(p.color, p.special) : null));
}
