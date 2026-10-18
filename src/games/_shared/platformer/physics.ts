/**
 * Tile-based platformer physics shared by the side-scrolling and arena
 * platformers. Bodies are axis-aligned boxes moved through a grid of tiles
 * that are empty, solid, or one-way (you can jump up through a one-way tile
 * and land on top of it, as on a cloud or a thin ledge).
 *
 * Movement is split into sub-steps of at most half a tile so fast bodies
 * never tunnel through a tile, and each sub-step resolves X before Y.
 */
export const EMPTY = 0;
export const SOLID = 1;
export const ONEWAY = 2;
export type Solidity = typeof EMPTY | typeof SOLID | typeof ONEWAY;

export interface TileQuery {
  /** Tile size in pixels. */
  size: number;
  /** Solidity of a tile; callers decide what lies outside the map. */
  at(col: number, row: number): Solidity;
}

export interface Body {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  onGround: boolean;
}

/** A moving or floating platform that bodies can stand on (one-way, from above). */
export interface Ledge {
  x: number;
  y: number;
  w: number;
}

export interface MoveResult {
  hitLeft: boolean;
  hitRight: boolean;
  hitCeiling: boolean;
  landed: boolean;
  /** Solid tiles the body's head struck while moving up. */
  ceilingTiles: [number, number][];
  /** Tile the body landed on (col, row), or null. */
  floorTile: [number, number] | null;
  /** Index of the ledge landed on, or -1. */
  ledge: number;
}

export interface MoveOptions {
  /** Ignore one-way tiles and ledges (dropping down through them). */
  dropThrough?: boolean;
  /** Extra one-way ledges, such as moving platforms. */
  ledges?: Ledge[];
}

const EPS = 0.001;

function emptyResult(): MoveResult {
  return { hitLeft: false, hitRight: false, hitCeiling: false, landed: false, ceilingTiles: [], floorTile: null, ledge: -1 };
}

function rowsOf(b: Body, size: number): [number, number] {
  return [Math.floor(b.y / size), Math.floor((b.y + b.h - EPS) / size)];
}

function colsOf(b: Body, size: number): [number, number] {
  return [Math.floor(b.x / size), Math.floor((b.x + b.w - EPS) / size)];
}

function moveX(b: Body, dx: number, map: TileQuery, out: MoveResult) {
  if (dx === 0) return;
  const s = map.size;
  b.x += dx;
  const [r0, r1] = rowsOf(b, s);
  if (dx > 0) {
    const col = Math.floor((b.x + b.w - EPS) / s);
    for (let r = r0; r <= r1; r++) {
      if (map.at(col, r) === SOLID) {
        b.x = col * s - b.w;
        b.vx = Math.min(0, b.vx);
        out.hitRight = true;
        return;
      }
    }
  } else {
    const col = Math.floor(b.x / s);
    for (let r = r0; r <= r1; r++) {
      if (map.at(col, r) === SOLID) {
        b.x = (col + 1) * s;
        b.vx = Math.max(0, b.vx);
        out.hitLeft = true;
        return;
      }
    }
  }
}

function moveY(b: Body, dy: number, map: TileQuery, opts: MoveOptions, out: MoveResult) {
  if (dy === 0) return;
  const s = map.size;
  const prevBottom = b.y + b.h;
  b.y += dy;
  const [c0, c1] = colsOf(b, s);
  if (dy > 0) {
    const bottom = b.y + b.h;
    const row = Math.floor((bottom - EPS) / s);
    const top = row * s;
    let land = -1;
    let landCol = -1;
    for (let c = c0; c <= c1; c++) {
      const t = map.at(c, row);
      if (t === SOLID || (t === ONEWAY && !opts.dropThrough && prevBottom <= top + EPS)) {
        land = top;
        landCol = c;
        break;
      }
    }
    let ledgeIndex = -1;
    if (!opts.dropThrough && opts.ledges) {
      opts.ledges.forEach((l, i) => {
        if (prevBottom <= l.y + EPS && bottom >= l.y && b.x + b.w > l.x && b.x < l.x + l.w) {
          if (land < 0 || l.y < land) {
            land = l.y;
            ledgeIndex = i;
          }
        }
      });
    }
    if (land >= 0) {
      b.y = land - b.h;
      b.vy = 0;
      b.onGround = true;
      out.landed = true;
      out.ledge = ledgeIndex;
      out.floorTile = ledgeIndex >= 0 ? null : [landCol, row];
    }
  } else {
    const row = Math.floor(b.y / s);
    let hit = false;
    for (let c = c0; c <= c1; c++) {
      if (map.at(c, row) === SOLID) {
        hit = true;
        out.ceilingTiles.push([c, row]);
      }
    }
    if (hit) {
      b.y = (row + 1) * s;
      b.vy = 0;
      out.hitCeiling = true;
    }
  }
}

/** Moves a body by its velocity for dt seconds, colliding with the tiles. */
export function moveBody(b: Body, dt: number, map: TileQuery, opts: MoveOptions = {}): MoveResult {
  const out = emptyResult();
  b.onGround = false;
  const dist = Math.max(Math.abs(b.vx), Math.abs(b.vy)) * dt;
  const steps = Math.max(1, Math.ceil(dist / (map.size / 2)));
  const dx = (b.vx * dt) / steps;
  for (let i = 0; i < steps; i++) {
    moveX(b, dx, map, out);
    // Re-read vy each step: landing or a ceiling stops vertical movement.
    moveY(b, (b.vy * dt) / steps, map, opts, out);
    if (out.landed || out.hitCeiling) {
      // Finish the horizontal part of the move without more vertical travel.
      for (let j = i + 1; j < steps; j++) moveX(b, dx, map, out);
      break;
    }
  }
  // A body at rest (no gravity applied this step) is still on the ground.
  if (!out.landed && b.vy === 0) b.onGround = standingOn(b, map, opts);
  return out;
}

/** True when the body is standing on something (probes one pixel below its feet). */
export function standingOn(b: Body, map: TileQuery, opts: MoveOptions = {}): boolean {
  const s = map.size;
  const feet = b.y + b.h;
  const row = Math.floor((feet + 0.5) / s);
  if (Math.abs(row * s - feet) > 0.5) {
    // Only a ledge can be under feet that are not on a tile boundary.
    return !!opts.ledges?.some((l) => Math.abs(l.y - feet) < 0.5 && b.x + b.w > l.x && b.x < l.x + l.w);
  }
  const [c0, c1] = colsOf(b, s);
  for (let c = c0; c <= c1; c++) {
    const t = map.at(c, row);
    if (t === SOLID || (t === ONEWAY && !opts.dropThrough)) return true;
  }
  return !!opts.ledges?.some((l) => Math.abs(l.y - feet) < 0.5 && b.x + b.w > l.x && b.x < l.x + l.w);
}

/** Whether a body would collide with a solid tile at its current position. */
export function overlapsSolid(b: Body, map: TileQuery): boolean {
  const s = map.size;
  const [c0, c1] = colsOf(b, s);
  const [r0, r1] = rowsOf(b, s);
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (map.at(c, r) === SOLID) return true;
  return false;
}

/** Tiles (col, row) a box overlaps. */
export function tilesUnder(x: number, y: number, w: number, h: number, size: number): [number, number][] {
  const out: [number, number][] = [];
  for (let r = Math.floor(y / size); r <= Math.floor((y + h - EPS) / size); r++)
    for (let c = Math.floor(x / size); c <= Math.floor((x + w - EPS) / size); c++) out.push([c, r]);
  return out;
}

export function boxesOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/**
 * Ground-walker step: moves a body with gravity, turning it around at walls
 * (and, when `turnAtLedges` is set, at the edge of whatever it stands on).
 * Returns the move result so callers can react to landings.
 */
export function walk(
  b: Body & { dir: number },
  speed: number,
  gravity: number,
  dt: number,
  map: TileQuery,
  opts: MoveOptions & { turnAtLedges?: boolean; maxFall?: number } = {},
): MoveResult {
  b.vx = b.dir * speed;
  b.vy = Math.min(opts.maxFall ?? 500, b.vy + gravity * dt);
  if (opts.turnAtLedges && b.onGround) {
    const s = map.size;
    const aheadX = b.dir > 0 ? b.x + b.w + 1 : b.x - 1;
    const below = Math.floor((b.y + b.h + 1) / s);
    const t = map.at(Math.floor(aheadX / s), below);
    if (t === EMPTY) b.dir = -b.dir;
    b.vx = b.dir * speed;
  }
  const res = moveBody(b, dt, map, opts);
  if (res.hitLeft) b.dir = 1;
  if (res.hitRight) b.dir = -1;
  return res;
}
