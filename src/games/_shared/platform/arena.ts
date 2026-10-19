import { EMPTY, ONEWAY, SOLID, cellAt, edgeAhead, moveBody, parseRows } from './tiles';
import type { Body, Grid } from './tiles';

/**
 * Single-screen arena stages (Snow Rollers, Bubble Buddies): a 16×14 tile
 * room with walls, a floor and one-way ledges, plus the enemy movement both
 * games share — walking, turning, hopping up to the ledge above the player
 * and dropping down to chase them.
 */
export const AT = 16;
export const ACOLS = 16;
export const AROWS = 14;
export const AW = ACOLS * AT;
export const AH = AROWS * AT;

export interface Arena {
  grid: Grid;
  /** Places an enemy can start (tile column/row it stands in). */
  spawns: { c: number; r: number }[];
  player: { c: number; r: number };
}

/** '#' solid, '=' ledge, 'P' player start; enemies start on any ledge above the floor. */
export function buildArena(rows: string[], opts: { wrapY?: boolean } = {}): Arena {
  const { grid, marks } = parseRows(rows, AT, { '#': SOLID, '=': ONEWAY }, { sideWalls: true, wrapY: opts.wrapY ?? false });
  const p = marks.find((m) => m.ch === 'P') ?? { c: 2, r: AROWS - 2 };
  const spawns: { c: number; r: number }[] = [];
  for (let r = 1; r < AROWS - 3; r++) {
    for (let c = 1; c < ACOLS - 1; c++) {
      if (cellAt(grid, c, r) === EMPTY && cellAt(grid, c, r - 1) === EMPTY && cellAt(grid, c, r + 1) !== EMPTY) spawns.push({ c, r });
    }
  }
  return { grid, spawns, player: { c: p.c, r: p.r } };
}

export interface Walker {
  b: Body;
  dir: number;
  /** Seconds until the next decision. */
  think: number;
  /** Walking off ledges on purpose (to chase someone below). */
  dropping: boolean;
}

export interface WalkOptions {
  speed: number;
  jump: number;
  gravity: number;
  /** Chance per decision to hop up when the target is above. */
  hop: number;
}

/** Is there a ledge within reach above (1–3 rows up) at this column? */
function ledgeAbove(g: Grid, b: Body): boolean {
  const c = Math.floor((b.x + b.w / 2) / g.t);
  const r = Math.floor((b.y + b.h - 1) / g.t);
  for (let k = 1; k <= 4; k++) {
    const v = cellAt(g, c, r - k);
    if (v === SOLID) return false;
    if (v === ONEWAY) return true;
  }
  return false;
}

/** Advances a walking enemy one step towards (or around) a target. */
export function stepWalker(g: Grid, w: Walker, dt: number, target: { x: number; y: number }, random: () => number, o: WalkOptions) {
  const b = w.b;
  w.think -= dt;
  if (b.ground) {
    if (w.think <= 0) {
      w.think = 0.5 + random() * 0.9;
      const above = target.y < b.y - 20;
      const below = target.y > b.y + 20;
      if (above && random() < o.hop && ledgeAbove(g, b)) {
        b.vy = -o.jump;
        b.ground = false;
      } else {
        w.dropping = below && random() < 0.6;
        if (random() < 0.45) w.dir = target.x < b.x ? -1 : 1;
      }
    }
    if (b.ground && !w.dropping && edgeAhead(g, b, w.dir)) w.dir = -w.dir;
  }
  b.vx = w.dir * o.speed;
  b.vy = Math.min(420, b.vy + o.gravity * dt);
  const res = moveBody(g, b, dt);
  if (res.wall) w.dir = -res.wall;
  if (res.landed) w.dropping = false;
}

/** A flier that drifts diagonally and bounces off every wall, floor and ceiling. */
export function stepFlier(g: Grid, b: Body, dt: number) {
  const vx = b.vx;
  const vy = b.vy;
  const res = moveBody(g, b, dt, true);
  if (res.wall) b.vx = -vx;
  if (res.landed || res.head) b.vy = -vy;
  if (!g.wrapY) {
    if (b.y < 0) {
      b.y = 0;
      b.vy = Math.abs(vy);
    }
  }
}

export function makeBody(x: number, y: number, w: number, h: number) {
  return { x, y, w, h, vx: 0, vy: 0, ground: false } satisfies Body;
}

/** Keeps a body on screen at the top of a non-wrapping arena. */
export function clampTop(b: Body) {
  if (b.y < 0) {
    b.y = 0;
    if (b.vy < 0) b.vy = 0;
  }
}
