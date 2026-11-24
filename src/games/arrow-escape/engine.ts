/**
 * Arrow Escape: the board is packed with arrows. Tap an arrow and it slides
 * off the board in the direction it points, unless another arrow is in the
 * way: then it bumps back and you lose a heart. Clear every arrow.
 *
 * Boards are built in reverse: each new arrow must have a clear run to the
 * edge past the arrows already placed. Removing them in the opposite order to
 * placement always works, so every board can be cleared.
 */
export type Dir = 0 | 1 | 2 | 3; // up, right, down, left
export const DX = [0, 1, 0, -1];
export const DY = [-1, 0, 1, 0];

export interface Arrow {
  /** Head cell (the end that points). */
  x: number;
  y: number;
  dir: Dir;
  /** Cells, including the head, running back from it. */
  length: number;
}

export interface Board {
  w: number;
  h: number;
  arrows: Arrow[];
}

export function cells(a: Arrow): [number, number][] {
  return Array.from({ length: a.length }, (_, i) => [a.x - DX[a.dir] * i, a.y - DY[a.dir] * i] as [number, number]);
}

/** Occupancy grid: arrow index per cell, or -1. `gone` arrows are ignored. */
export function occupancy(b: Board, gone: ReadonlySet<number> = new Set()): Int16Array {
  const grid = new Int16Array(b.w * b.h).fill(-1);
  b.arrows.forEach((a, i) => {
    if (gone.has(i)) return;
    for (const [x, y] of cells(a)) grid[y * b.w + x] = i;
  });
  return grid;
}

/** The first arrow in this arrow's way, or -1 if its run to the edge is clear. */
export function blocker(b: Board, i: number, gone: ReadonlySet<number> = new Set()): number {
  const grid = occupancy(b, gone);
  const a = b.arrows[i];
  let x = a.x + DX[a.dir];
  let y = a.y + DY[a.dir];
  while (x >= 0 && y >= 0 && x < b.w && y < b.h) {
    const o = grid[y * b.w + x];
    if (o >= 0 && o !== i) return o;
    x += DX[a.dir];
    y += DY[a.dir];
  }
  return -1;
}

/** Squares the arrow could slide before touching its blocker. */
export function freeRun(b: Board, i: number, gone: ReadonlySet<number>): number {
  const a = b.arrows[i];
  const grid = occupancy(b, gone);
  let x = a.x + DX[a.dir];
  let y = a.y + DY[a.dir];
  let n = 0;
  while (x >= 0 && y >= 0 && x < b.w && y < b.h && grid[y * b.w + x] < 0) {
    n++;
    x += DX[a.dir];
    y += DY[a.dir];
  }
  return n;
}

export function generate(w: number, h: number, fill: number, random: () => number): Board {
  const b: Board = { w, h, arrows: [] };
  const used = new Uint8Array(w * h);
  // How many placed arrows would have to wait for a piece on each square.
  const lane = new Uint8Array(w * h);
  const target = Math.round(w * h * fill);
  let filled = 0;
  for (let step = 0; step < w * h * 2 && filled < target; step++) {
    // Try a handful of placements and keep the one that blocks the most
    // arrows already placed, so the solving order matters.
    let best: Arrow | null = null;
    let bestScore = -1;
    for (let k = 0; k < 40; k++) {
      const dir = Math.floor(random() * 4) as Dir;
      const length = 1 + Math.floor(random() * 3);
      const x = Math.floor(random() * w);
      const y = Math.floor(random() * h);
      const a: Arrow = { x, y, dir, length };
      const body = cells(a);
      if (body.some(([cx, cy]) => cx < 0 || cy < 0 || cx >= w || cy >= h || used[cy * w + cx])) continue;
      let cx = x + DX[dir];
      let cy = y + DY[dir];
      let clear = true;
      while (cx >= 0 && cy >= 0 && cx < w && cy < h) {
        if (used[cy * w + cx]) {
          clear = false;
          break;
        }
        cx += DX[dir];
        cy += DY[dir];
      }
      if (!clear) continue;
      const score = body.reduce((n, [bx, by]) => n + lane[by * w + bx], 0) * 3 + length + random();
      if (score > bestScore) {
        bestScore = score;
        best = a;
      }
    }
    if (!best) continue;
    for (const [bx, by] of cells(best)) used[by * w + bx] = 1;
    // Mark this arrow's exit lane.
    let lx = best.x + DX[best.dir];
    let ly = best.y + DY[best.dir];
    while (lx >= 0 && ly >= 0 && lx < w && ly < h) {
      lane[ly * w + lx]++;
      lx += DX[best.dir];
      ly += DY[best.dir];
    }
    b.arrows.push(best);
    filled += best.length;
  }
  // Shuffle the list so the solving order is not the reverse of the list order.
  for (let i = b.arrows.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [b.arrows[i], b.arrows[j]] = [b.arrows[j], b.arrows[i]];
  }
  return b;
}

/** Arrows that can leave right now. */
export function movable(b: Board, gone: ReadonlySet<number>): number[] {
  return b.arrows.flatMap((_, i) => (!gone.has(i) && blocker(b, i, gone) < 0 ? [i] : []));
}

/** True if the arrows still on the board can all be cleared (greedy removal works for this rule). */
export function solvable(b: Board, gone: ReadonlySet<number>): boolean {
  const left = new Set(gone);
  for (;;) {
    const m = movable(b, left);
    if (!m.length) return left.size === b.arrows.length;
    m.forEach((i) => left.add(i));
  }
}

export const LEVEL_SIZES = { easy: [5, 0.7], normal: [6, 0.78], hard: [7, 0.84] } as const;
