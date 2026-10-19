import { EMPTY, ONEWAY, SOLID, moveBody } from '../_shared/platformer/physics';
import type { Body, Ledge, MoveResult, Solidity, TileQuery } from '../_shared/platformer/physics';
import { ROWS, TILE, isSolidGlyph } from './levels';
import type { LevelData } from './levels';

/**
 * Pip's movement. Kept free of enemies and scoring so the same function
 * drives the game and the level-solver that proves every level can be
 * finished.
 */
export const PHYS = {
  maxSpeed: 150,
  accelGround: 560,
  accelAir: 420,
  friction: 900,
  turn: 1500,
  jump: 400,
  /** Extra take-off speed per unit of running speed (running jumps go higher). */
  jumpRun: 0.2,
  gravityHold: 1000,
  gravity: 2000,
  maxFall: 460,
  coyote: 0.08,
  buffer: 0.12,
  spring: 620,
  stomp: 300,
  stompHold: 420,
};

export const SMALL = { w: 12, h: 14 };
export const BIG = { w: 12, h: 26 };

export interface Player extends Body {
  facing: 1 | -1;
  coyote: number;
  buffer: number;
  /** Rising from a jump that can still be cut short by letting go. */
  jumping: boolean;
  big: boolean;
  /** Index of the moving platform being ridden, or -1. */
  ledge: number;
  /** Time left falling through one-way ledges. */
  drop: number;
}

export interface PadInput {
  left: boolean;
  right: boolean;
  jump: boolean;
  jumpPressed: boolean;
  downPressed: boolean;
}

export interface World {
  map: TileQuery;
  grid: string[];
  cols: number;
  ledges: Ledge[];
  /** Movement of each ledge since the previous step. */
  ledgeMoves: { dx: number; dy: number }[];
}

export type PlayerEvent = 'jump' | 'spring';

export function newPlayer(x: number, bottom: number, big = false): Player {
  const size = big ? BIG : SMALL;
  return {
    x: x - size.w / 2,
    y: bottom - size.h,
    w: size.w,
    h: size.h,
    vx: 0,
    vy: 0,
    onGround: true,
    facing: 1,
    coyote: 0,
    buffer: 0,
    jumping: false,
    big,
    ledge: -1,
    drop: 0,
  };
}

export function glyphAt(grid: string[], cols: number, c: number, r: number): string {
  if (c < 0 || c >= cols || r < 0 || r >= ROWS) return '.';
  return grid[r * cols + c];
}

/** Tile solidity for a level grid: walls at both ends, open above and below. */
export function gridMap(grid: string[], cols: number, extraWall = -1): TileQuery {
  return {
    size: TILE,
    at(c, r): Solidity {
      if (c < 0 || c >= cols || c === extraWall) return SOLID;
      if (r < 0 || r >= ROWS) return EMPTY;
      const g = grid[r * cols + c];
      return isSolidGlyph(g) ? SOLID : g === '=' ? ONEWAY : EMPTY;
    },
  };
}

export function worldFor(level: LevelData, grid: string[], ledges: Ledge[], ledgeMoves: { dx: number; dy: number }[], wallCol = -1): World {
  return { map: gridMap(grid, level.cols, wallCol), grid, cols: level.cols, ledges, ledgeMoves };
}

function approach(v: number, target: number, step: number): number {
  return v < target ? Math.min(target, v + step) : Math.max(target, v - step);
}

/** Advances Pip by dt. Returns the tile collision result and any movement events. */
export function stepPlayer(p: Player, input: PadInput, dt: number, world: World): { res: MoveResult; events: PlayerEvent[] } {
  const events: PlayerEvent[] = [];

  // Ride the platform under our feet.
  if (p.ledge >= 0) {
    const m = world.ledgeMoves[p.ledge];
    if (m) {
      p.x += m.dx;
      p.y += m.dy;
    }
  }

  p.coyote = p.onGround ? PHYS.coyote : p.coyote - dt;
  p.buffer = input.jumpPressed ? PHYS.buffer : p.buffer - dt;
  p.drop -= dt;

  // Down on a one-way ledge drops through it.
  if (input.downPressed && p.onGround && onOneWay(p, world)) {
    p.drop = 0.22;
    p.ledge = -1;
    p.onGround = false;
    p.coyote = 0;
  }

  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  if (dir !== 0) {
    p.facing = dir as 1 | -1;
    if (p.onGround && p.vx !== 0 && Math.sign(p.vx) !== dir) p.vx += dir * PHYS.turn * dt;
    else p.vx += dir * (p.onGround ? PHYS.accelGround : PHYS.accelAir) * dt;
    p.vx = Math.max(-PHYS.maxSpeed, Math.min(PHYS.maxSpeed, p.vx));
  } else {
    p.vx = approach(p.vx, 0, (p.onGround ? PHYS.friction : 160) * dt);
  }

  if (p.buffer > 0 && (p.onGround || p.coyote > 0) && p.drop <= 0) {
    p.vy = -(PHYS.jump + Math.abs(p.vx) * PHYS.jumpRun);
    p.jumping = true;
    p.buffer = 0;
    p.coyote = 0;
    p.onGround = false;
    p.ledge = -1;
    events.push('jump');
  }

  const g = p.vy < 0 && p.jumping && input.jump ? PHYS.gravityHold : PHYS.gravity;
  p.vy = Math.min(PHYS.maxFall, p.vy + g * dt);
  if (p.vy >= 0) p.jumping = false;

  const res = moveBody(p, dt, world.map, { dropThrough: p.drop > 0, ledges: world.ledges });
  p.ledge = res.landed ? res.ledge : p.onGround ? p.ledge : -1;

  if (res.landed && res.floorTile && glyphAt(world.grid, world.cols, res.floorTile[0], res.floorTile[1]) === 'J') {
    p.vy = -PHYS.spring;
    p.jumping = true;
    p.onGround = false;
    events.push('spring');
  }
  return { res, events };
}

function onOneWay(p: Player, world: World): boolean {
  if (p.ledge >= 0) return true;
  const row = Math.round((p.y + p.h) / TILE);
  const c0 = Math.floor(p.x / TILE);
  const c1 = Math.floor((p.x + p.w - 0.001) / TILE);
  let oneway = false;
  for (let c = c0; c <= c1; c++) {
    const t = world.map.at(c, row);
    if (t === SOLID) return false;
    if (t === ONEWAY) oneway = true;
  }
  return oneway;
}

/** Changes Pip's size, keeping the feet in place. */
export function setBig(p: Player, big: boolean) {
  const size = big ? BIG : SMALL;
  const bottom = p.y + p.h;
  p.big = big;
  p.w = size.w;
  p.h = size.h;
  p.y = bottom - size.h;
}

/** Whether Pip touches lava, or stands on or brushes spikes. */
export function hazardUnder(p: Body, grid: string[], cols: number): 'lava' | 'spikes' | null {
  const c0 = Math.floor((p.x + 2) / TILE);
  const c1 = Math.floor((p.x + p.w - 2) / TILE);
  const r0 = Math.floor((p.y + 3) / TILE);
  const r1 = Math.floor((p.y + p.h - 1) / TILE);
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      if (glyphAt(grid, cols, c, r) === '~') return 'lava';
    }
  }
  // Spikes: the tile under the feet, or directly beside the body.
  const feet = Math.floor((p.y + p.h + 1) / TILE);
  for (let c = c0; c <= c1; c++) if (glyphAt(grid, cols, c, feet) === '^') return 'spikes';
  const left = Math.floor((p.x - 1) / TILE);
  const right = Math.floor((p.x + p.w + 1) / TILE);
  for (let r = r0; r <= r1; r++) {
    if (glyphAt(grid, cols, left, r) === '^' || glyphAt(grid, cols, right, r) === '^') return 'spikes';
  }
  return null;
}
