/**
 * Tile-grid physics shared by the platform games (Pip Quest, Snow Rollers,
 * Bubble Buddies). A grid stores one collision value per tile; bodies are
 * axis-aligned boxes moved in small sub-steps so fast objects never tunnel.
 *
 *  - SOLID tiles block from every side.
 *  - ONEWAY tiles (ledges, clouds) are only landed on from above; you can
 *    jump up through them, and hold Down to drop through on some games.
 */
export const EMPTY = 0;
export const SOLID = 1;
export const ONEWAY = 2;

export interface Grid {
  cols: number;
  rows: number;
  /** Tile size in logical pixels. */
  t: number;
  /** Collision value per tile, row-major. */
  cells: Uint8Array;
  /** Columns outside the grid are walls (true) or open air (false). */
  sideWalls: boolean;
  /** Rows wrap: falling out of the bottom re-enters at the top. */
  wrapY: boolean;
}

export interface Body {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  ground: boolean;
}

export interface MoveResult {
  /** Tile bumped from below while rising, if any. */
  head: [number, number] | null;
  wall: -1 | 0 | 1;
  landed: boolean;
}

export function makeGrid(cols: number, rows: number, t: number, opts: Partial<Pick<Grid, 'sideWalls' | 'wrapY'>> = {}): Grid {
  return { cols, rows, t, cells: new Uint8Array(cols * rows), sideWalls: opts.sideWalls ?? true, wrapY: opts.wrapY ?? false };
}

export function cellAt(g: Grid, c: number, r: number): number {
  if (c < 0 || c >= g.cols) return g.sideWalls ? SOLID : EMPTY;
  if (g.wrapY) r = ((r % g.rows) + g.rows) % g.rows;
  else if (r < 0 || r >= g.rows) return EMPTY;
  return g.cells[r * g.cols + c];
}

export function setCell(g: Grid, c: number, r: number, v: number) {
  if (c >= 0 && c < g.cols && r >= 0 && r < g.rows) g.cells[r * g.cols + c] = v;
}

const EPS = 0.001;

/**
 * Moves a body by its velocity for `dt` seconds, resolving collisions with the
 * grid. `drop` lets it fall through one-way tiles.
 */
export function moveBody(g: Grid, b: Body, dt: number, drop = false): MoveResult {
  const res: MoveResult = { head: null, wall: 0, landed: false };
  const dist = Math.max(Math.abs(b.vx), Math.abs(b.vy)) * dt;
  const n = Math.max(1, Math.ceil(dist / (g.t / 4)));
  const sdt = dt / n;
  for (let i = 0; i < n; i++) {
    // Horizontal.
    const dx = b.vx * sdt;
    if (dx !== 0) {
      b.x += dx;
      const r0 = Math.floor(b.y / g.t);
      const r1 = Math.floor((b.y + b.h - EPS) / g.t);
      if (dx > 0) {
        const c = Math.floor((b.x + b.w - EPS) / g.t);
        for (let r = r0; r <= r1; r++) {
          if (cellAt(g, c, r) === SOLID) {
            b.x = c * g.t - b.w;
            b.vx = 0;
            res.wall = 1;
            break;
          }
        }
      } else {
        const c = Math.floor(b.x / g.t);
        for (let r = r0; r <= r1; r++) {
          if (cellAt(g, c, r) === SOLID) {
            b.x = (c + 1) * g.t;
            b.vx = 0;
            res.wall = -1;
            break;
          }
        }
      }
    }
    // Vertical.
    const dy = b.vy * sdt;
    if (dy !== 0) {
      const prevBottom = b.y + b.h;
      b.y += dy;
      const c0 = Math.floor(b.x / g.t);
      const c1 = Math.floor((b.x + b.w - EPS) / g.t);
      if (dy > 0) {
        const r = Math.floor((b.y + b.h - EPS) / g.t);
        const top = r * g.t;
        for (let c = c0; c <= c1; c++) {
          const v = cellAt(g, c, r);
          if (v === SOLID || (v === ONEWAY && !drop && prevBottom <= top + 0.5 + EPS)) {
            b.y = top - b.h;
            b.vy = 0;
            res.landed = true;
            break;
          }
        }
      } else {
        const r = Math.floor(b.y / g.t);
        let best = -1;
        let bestD = Infinity;
        for (let c = c0; c <= c1; c++) {
          if (cellAt(g, c, r) === SOLID) {
            // The tile nearest the body's centre is the one that gets bumped.
            const d = Math.abs((c + 0.5) * g.t - (b.x + b.w / 2));
            if (d < bestD) {
              bestD = d;
              best = c;
            }
          }
        }
        if (best >= 0) {
          b.y = (r + 1) * g.t;
          b.vy = 0;
          res.head = [best, r];
        }
      }
    }
    if (g.wrapY) {
      const span = g.rows * g.t;
      if (b.y >= span) b.y -= span;
      else if (b.y + b.h < 0) b.y += span;
    }
  }
  b.ground = standing(g, b, drop);
  return res;
}

/** Whether a body rests on a tile (or on a one-way tile when not dropping). */
export function standing(g: Grid, b: Body, drop = false): boolean {
  const bottom = b.y + b.h;
  const r = Math.floor((bottom + 0.5) / g.t);
  if (Math.abs(r * g.t - bottom) > 0.75) return false;
  const c0 = Math.floor(b.x / g.t);
  const c1 = Math.floor((b.x + b.w - EPS) / g.t);
  for (let c = c0; c <= c1; c++) {
    const v = cellAt(g, c, r);
    if (v === SOLID || (v === ONEWAY && !drop)) return true;
  }
  return false;
}

/** Whether the tile just ahead of a walking body's feet is open (a ledge). */
export function edgeAhead(g: Grid, b: Body, dir: number): boolean {
  const c = Math.floor((dir > 0 ? b.x + b.w + 1 : b.x - 1) / g.t);
  const r = Math.floor((b.y + b.h + 1) / g.t);
  return cellAt(g, c, r) === EMPTY;
}

export function overlaps(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/** Reads an ASCII map (rows top to bottom) into a grid; `legend` maps characters to collision values. */
export function parseRows(rows: string[], t: number, legend: Record<string, number>, opts: Partial<Pick<Grid, 'sideWalls' | 'wrapY'>> = {}) {
  const cols = Math.max(...rows.map((r) => r.length));
  const g = makeGrid(cols, rows.length, t, opts);
  const marks: { ch: string; c: number; r: number }[] = [];
  rows.forEach((line, r) => {
    for (let c = 0; c < cols; c++) {
      const ch = line[c] ?? '.';
      const v = legend[ch];
      if (v !== undefined) setCell(g, c, r, v);
      else if (ch !== '.' && ch !== ' ') marks.push({ ch, c, r });
    }
  });
  return { grid: g, marks };
}
