/**
 * Hexa Sort: place stacks of coloured hexagon tiles on a honeycomb board.
 * When a stack lands next to stacks with the same top colour, those tiles
 * slide onto it; ten or more of one colour on top clears them. Chains keep
 * going as stacks change. The game ends when a stack has nowhere to go.
 */
export const CLEAR_AT = 10;
export const MAX_COLORS = 8;

/** Axial coordinates (q, r) of the board's cells, a hexagon of `radius` rings. */
export function boardCells(radius: number): [number, number][] {
  const out: [number, number][] = [];
  for (let q = -radius; q <= radius; q++) {
    for (let r = Math.max(-radius, -q - radius); r <= Math.min(radius, -q + radius); r++) out.push([q, r]);
  }
  return out;
}

const DIRS: [number, number][] = [
  [1, 0],
  [1, -1],
  [0, -1],
  [-1, 0],
  [-1, 1],
  [0, 1],
];

export function neighbours(cells: [number, number][], i: number): number[] {
  const [q, r] = cells[i];
  return DIRS.flatMap(([dq, dr]) => {
    const j = cells.findIndex(([a, b]) => a === q + dq && b === r + dr);
    return j >= 0 ? [j] : [];
  });
}

export type Stack = number[];

export interface State {
  radius: number;
  colors: number;
  stacks: Stack[];
  tray: (Stack | null)[];
  score: number;
  cleared: number;
  placed: number;
  bestChain: number;
}

export const top = (s: Stack) => (s.length ? s[s.length - 1] : -1);

/** Length of the run of the top colour. */
export function topRun(s: Stack): number {
  if (!s.length) return 0;
  const c = top(s);
  let n = 0;
  for (let i = s.length - 1; i >= 0 && s[i] === c; i--) n++;
  return n;
}

/** A new stack of 2–6 tiles in one to three colour bands. */
export function dealStack(colors: number, random: () => number): Stack {
  const size = 2 + Math.floor(random() * 5);
  const bands = random() < 0.35 ? 1 : random() < 0.75 ? 2 : 3;
  const out: Stack = [];
  let color = Math.floor(random() * colors);
  for (let b = 0; b < bands && out.length < size; b++) {
    const left = size - out.length;
    const n = b === bands - 1 ? left : Math.max(1, Math.round(left / (bands - b)));
    for (let k = 0; k < n; k++) out.push(color);
    let next = Math.floor(random() * colors);
    if (next === color) next = (next + 1) % colors;
    color = next;
  }
  return out;
}

export function newGame(radius: number, colors: number, random: () => number): State {
  const n = boardCells(radius).length;
  return {
    radius,
    colors,
    stacks: Array.from({ length: n }, () => []),
    tray: [dealStack(colors, random), dealStack(colors, random), dealStack(colors, random)],
    score: 0,
    cleared: 0,
    placed: 0,
    bestChain: 0,
  };
}

export interface Step {
  kind: 'move' | 'clear';
  from?: number;
  to: number;
  count: number;
  color: number;
}

/**
 * Settles the board after a stack lands on `start`: matching tops slide onto
 * the cell being settled, full runs clear, and any cell that changed is
 * settled in turn. Returns the steps taken (for sound and animation).
 */
export function settle(cells: [number, number][], stacks: Stack[], start: number): Step[] {
  const steps: Step[] = [];
  const queue = [start];
  let guard = 0;
  while (queue.length && guard++ < 500) {
    const i = queue.shift() as number;
    const s = stacks[i];
    if (!s.length) continue;
    const color = top(s);
    for (const j of neighbours(cells, i)) {
      if (top(stacks[j]) !== color) continue;
      const n = topRun(stacks[j]);
      stacks[i] = [...stacks[i], ...stacks[j].slice(-n)];
      stacks[j] = stacks[j].slice(0, -n);
      steps.push({ kind: 'move', from: j, to: i, count: n, color });
      queue.push(j);
    }
    const run = topRun(stacks[i]);
    if (run >= CLEAR_AT) {
      stacks[i] = stacks[i].slice(0, -run);
      steps.push({ kind: 'clear', to: i, count: run, color });
      queue.push(i);
      for (const j of neighbours(cells, i)) queue.push(j);
    } else if (steps.length) {
      // Its neighbours may now match one another through this cell's new top.
      for (const j of neighbours(cells, i)) if (top(stacks[j]) === top(stacks[i]) && !queue.includes(j)) queue.push(i);
    }
  }
  return steps;
}

/** Places tray stack `t` on empty cell `i`. Returns the steps, or null if not allowed. */
export function place(s: State, t: number, i: number, random: () => number): { state: State; steps: Step[] } | null {
  const stack = s.tray[t];
  if (!stack || s.stacks[i].length) return null;
  const cells = boardCells(s.radius);
  const stacks = s.stacks.map((x) => x.slice());
  stacks[i] = stack.slice();
  const steps = settle(cells, stacks, i);
  const clears = steps.filter((x) => x.kind === 'clear');
  const tiles = clears.reduce((n, x) => n + x.count, 0);
  // Each extra clear in one chain is worth more.
  const gained = clears.reduce((n, x, k) => n + x.count * 10 * (k + 1), 0);
  let tray = s.tray.map((x, k) => (k === t ? null : x));
  // A new colour joins every 30 stacks placed, up to eight.
  const colors = Math.min(MAX_COLORS, s.colors + (Math.floor((s.placed + 1) / 30) > Math.floor(s.placed / 30) ? 1 : 0));
  if (tray.every((x) => x === null)) tray = [dealStack(colors, random), dealStack(colors, random), dealStack(colors, random)];
  return {
    state: {
      ...s,
      colors,
      stacks,
      tray,
      score: s.score + gained + stack.length,
      cleared: s.cleared + tiles,
      placed: s.placed + 1,
      bestChain: Math.max(s.bestChain, clears.length),
    },
    steps,
  };
}

export const emptyCells = (s: State) => s.stacks.flatMap((x, i) => (x.length ? [] : [i]));
export const isOver = (s: State) => emptyCells(s).length === 0 && s.tray.some((x) => x !== null);

export function validState(v: unknown): v is State {
  if (typeof v !== 'object' || v === null) return false;
  const s = v as Record<string, unknown>;
  const isStack = (x: unknown) => Array.isArray(x) && x.every((c) => Number.isInteger(c) && c >= 0 && c < 8);
  return (
    Number.isInteger(s.radius) &&
    Number.isInteger(s.colors) &&
    Array.isArray(s.stacks) &&
    s.stacks.length === boardCells(s.radius as number).length &&
    s.stacks.every(isStack) &&
    Array.isArray(s.tray) &&
    s.tray.length === 3 &&
    s.tray.every((x) => x === null || isStack(x)) &&
    [s.score, s.cleared, s.placed, s.bestChain].every((n) => Number.isInteger(n))
  );
}
