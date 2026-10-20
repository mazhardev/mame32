/**
 * Blast Maze grid helpers: the 15 × 13 maze, lane-based movement with
 * corner assist, blast shapes, path finding and the danger map used by
 * computer bombers. Pure functions over plain data.
 */
export const COLS = 15;
export const ROWS = 13;
export const T = 16;
export const W = COLS * T;
export const H = ROWS * T;

export const FLOOR = 0;
export const WALL = 1;
export const SOFT = 2;

export const DX = [0, 1, 0, -1] as const;
export const DY = [-1, 0, 1, 0] as const;

export const idx = (c: number, r: number) => r * COLS + c;
export const inside = (c: number, r: number) => c >= 0 && r >= 0 && c < COLS && r < ROWS;
export const mid = (n: number) => n * T + T / 2;
export const tileX = (x: number) => Math.floor(x / T);

/** Border walls plus the fixed pillars at every even row and column. */
export function baseGrid(): Uint8Array {
  const g = new Uint8Array(COLS * ROWS);
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (c === 0 || r === 0 || c === COLS - 1 || r === ROWS - 1 || (c % 2 === 0 && r % 2 === 0)) g[idx(c, r)] = WALL;
    }
  }
  return g;
}

export function cell(g: Uint8Array, c: number, r: number): number {
  return inside(c, r) ? g[idx(c, r)] : WALL;
}

const ASSIST = 7;

/**
 * Moves a point along the maze lanes by up to `dist` pixels in direction
 * (dx, dy) — exactly one of them is non-zero. A mover off-centre across
 * the direction of travel is first eased into the lane (corner assist), and
 * it stops at a tile centre in front of anything blocked.
 */
export function slide(p: { x: number; y: number }, dx: number, dy: number, dist: number, blocked: (c: number, r: number) => boolean): boolean {
  const horiz = dx !== 0;
  const s = horiz ? dx : dy;
  // Coordinates along (a) and across (b) the direction of travel.
  let a = horiz ? p.x : p.y;
  let b = horiz ? p.y : p.x;
  const at = (along: number, across: number) => (horiz ? blocked(along, across) : blocked(across, along));
  const lane = Math.round((b - T / 2) / T);
  const lb = lane * T + T / 2;
  const off = b - lb;
  let moved = false;
  if (Math.abs(off) > 0.001) {
    if (Math.abs(off) > ASSIST) return false;
    const ahead = Math.floor((a + s * (T / 2 + 0.5)) / T);
    if (at(ahead, lane)) return false;
    const m = Math.min(dist, Math.abs(off));
    b -= Math.sign(off) * m;
    dist -= m;
    moved = m > 0;
    if (Math.abs(b - lb) < 0.001) b = lb;
  }
  if (dist > 0 && Math.abs(b - lb) < 0.001) {
    b = lb;
    const t = Math.floor(a / T);
    const ta = t * T + T / 2;
    let na = a + s * dist;
    if (s > 0 && at(t + 1, lane)) na = Math.min(na, Math.max(a, ta));
    if (s < 0 && at(t - 1, lane)) na = Math.max(na, Math.min(a, ta));
    if (Math.abs(na - a) > 1e-6) moved = true;
    a = na;
  }
  if (horiz) {
    p.x = a;
    p.y = b;
  } else {
    p.y = a;
    p.x = b;
  }
  return moved;
}

export interface BlastTile {
  c: number;
  r: number;
  /** -1 for the centre, otherwise the direction of the arm. */
  dir: number;
  end: boolean;
}

/**
 * Tiles a bomb at (c, r) with range `fire` sets alight. Arms stop at walls,
 * include the first soft block they reach (which burns) and stop at other
 * bombs (which are set off).
 */
export function blast(g: Uint8Array, c: number, r: number, fire: number, bombAt: (c: number, r: number) => boolean): BlastTile[] {
  const out: BlastTile[] = [{ c, r, dir: -1, end: false }];
  for (let d = 0; d < 4; d++) {
    for (let k = 1; k <= fire; k++) {
      const cc = c + DX[d] * k;
      const rr = r + DY[d] * k;
      const v = cell(g, cc, rr);
      if (v === WALL) break;
      const stop = v === SOFT || bombAt(cc, rr);
      out.push({ c: cc, r: rr, dir: d, end: stop || k === fire });
      if (stop) break;
    }
  }
  return out;
}

/** Breadth-first distances (in tiles) from (c, r) over tiles that are not blocked. */
export function distances(c: number, r: number, blocked: (c: number, r: number) => boolean): Int16Array {
  const dist = new Int16Array(COLS * ROWS).fill(-1);
  const q: number[] = [idx(c, r)];
  dist[idx(c, r)] = 0;
  for (let h = 0; h < q.length; h++) {
    const i = q[h];
    const cc = i % COLS;
    const rr = (i - cc) / COLS;
    for (let d = 0; d < 4; d++) {
      const nc = cc + DX[d];
      const nr = rr + DY[d];
      if (!inside(nc, nr) || dist[idx(nc, nr)] >= 0 || blocked(nc, nr)) continue;
      dist[idx(nc, nr)] = dist[i] + 1;
      q.push(idx(nc, nr));
    }
  }
  return dist;
}

/** First step (direction) of a shortest path from (c, r) to `target`, or -1. */
export function stepToward(c: number, r: number, target: number, blocked: (c: number, r: number) => boolean): number {
  const dist = distances(target % COLS, Math.floor(target / COLS), (x, y) => !(x === c && y === r) && blocked(x, y));
  if (dist[idx(c, r)] < 0) return -1;
  let best = -1;
  let bestD = dist[idx(c, r)];
  for (let d = 0; d < 4; d++) {
    const nc = c + DX[d];
    const nr = r + DY[d];
    if (!inside(nc, nr)) continue;
    const v = dist[idx(nc, nr)];
    if (v >= 0 && v < bestD) {
      bestD = v;
      best = d;
    }
  }
  return best;
}
