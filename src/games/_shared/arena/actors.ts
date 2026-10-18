import { ONEWAY, SOLID, moveBody } from '../platformer/physics';
import type { Body, MoveResult, TileQuery } from '../platformer/physics';
import { H, ROWS, T, W } from './stage';

/**
 * Actors for single-screen arena games: the hero (snappy arcade movement:
 * full speed at once, a fixed jump you can cut short), walking enemies that
 * climb to ledges above and drop to floors below to hunt the hero, flying
 * enemies that bounce around the room, and loot that falls and lands.
 */

/* --------------------------------------------------------------- hero */

export const HERO = { speed: 86, jump: 378, gravity: 1150, fall: 330, coyote: 0.07 };

export interface Hero extends Body {
  facing: 1 | -1;
  coyote: number;
  drop: number;
  jumping: boolean;
}

export interface HeroInput {
  left: boolean;
  right: boolean;
  jump: boolean;
  jumpPressed: boolean;
  downPressed: boolean;
}

export function newHero(col: number, row: number, facing: 1 | -1 = 1): Hero {
  return {
    x: col * T + 1,
    y: (row + 1) * T - 14,
    w: 14,
    h: 14,
    vx: 0,
    vy: 0,
    onGround: true,
    facing,
    coyote: 0,
    drop: 0,
    jumping: false,
  };
}

/** Keeps a body inside a wrapping room: off the bottom, back in at the top. */
export function wrapBody(b: Body, wrap: boolean) {
  if (!wrap) return;
  if (b.y > H) b.y -= H;
  else if (b.y + b.h < 0) b.y += H;
}

function onOneWay(b: Body, map: TileQuery): boolean {
  const row = Math.round((b.y + b.h) / T);
  let oneway = false;
  for (let c = Math.floor(b.x / T); c <= Math.floor((b.x + b.w - 0.01) / T); c++) {
    const t = map.at(c, row);
    if (t === SOLID) return false;
    if (t === ONEWAY) oneway = true;
  }
  return oneway;
}

export function stepHero(h: Hero, inp: HeroInput, dt: number, map: TileQuery, wrap: boolean, speedMul = 1): MoveResult {
  const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
  if (dir) h.facing = dir as 1 | -1;
  h.vx = dir * HERO.speed * speedMul;
  h.coyote = h.onGround ? HERO.coyote : h.coyote - dt;
  h.drop -= dt;
  if (inp.downPressed && h.onGround && onOneWay(h, map)) {
    h.drop = 0.2;
    h.onGround = false;
    h.coyote = 0;
  }
  if (inp.jumpPressed && (h.onGround || h.coyote > 0) && h.drop <= 0) {
    h.vy = -HERO.jump;
    h.jumping = true;
    h.coyote = 0;
    h.onGround = false;
  }
  // Letting go of jump early makes a shorter hop.
  const cut = h.jumping && !inp.jump && h.vy < 0;
  h.vy = Math.min(HERO.fall, h.vy + HERO.gravity * (cut ? 2.4 : 1) * dt);
  if (h.vy >= 0) h.jumping = false;
  const res = moveBody(h, dt, map, { dropThrough: h.drop > 0 });
  wrapBody(h, wrap);
  return res;
}

/* --------------------------------------------------------------- mobs */

export interface Mob extends Body {
  dir: number;
  /** Seconds until the next change-of-mind. */
  think: number;
  /** Seconds before the mob may jump again. */
  jumpCD: number;
}

export interface WalkerParams {
  speed: number;
  /** Take-off speed; HERO.jump climbs three rows. */
  jump: number;
  wrap: boolean;
  random: () => number;
  /** 0–1: how keenly the mob follows the hero between floors. */
  chase?: number;
}

/** Is there a ledge 2–4 rows above that a jump from here would land on? */
export function ledgeAbove(m: Body, map: TileQuery, maxRows = 3): boolean {
  const c = Math.floor((m.x + m.w / 2) / T);
  const feet = Math.round((m.y + m.h) / T);
  for (let up = 2; up <= maxRows + 1; up++) {
    const t = map.at(c, feet - up);
    if (t === SOLID) return false;
    if (t === ONEWAY) return true;
  }
  return false;
}

function floorAhead(m: Body & { dir: number }, map: TileQuery): boolean {
  const x = m.dir > 0 ? m.x + m.w + 1 : m.x - 1;
  const below = Math.floor((m.y + m.h + 1) / T);
  return map.at(Math.floor(x / T), below) !== 0;
}

/**
 * Walking enemy. Paces its floor, faces the hero when level with it, jumps
 * up to a ledge above when the hero is higher, walks off edges when the hero
 * is lower and otherwise turns back at them.
 */
export function stepWalker(m: Mob, target: { x: number; y: number }, dt: number, map: TileQuery, p: WalkerParams): MoveResult {
  const chase = p.chase ?? 0.7;
  m.vy = Math.min(HERO.fall, m.vy + HERO.gravity * dt);
  m.jumpCD -= dt;
  if (m.onGround) {
    m.think -= dt;
    const dy = target.y - m.y;
    if (m.think <= 0) {
      m.think = 0.7 + p.random() * 1.4;
      if (Math.abs(dy) < T || p.random() < chase * 0.6) m.dir = target.x < m.x ? -1 : 1;
      else if (p.random() < 0.3) m.dir = -m.dir;
    }
    if (m.jumpCD <= 0 && dy < -T && ledgeAbove(m, map) && p.random() < chase) {
      m.vy = -p.jump;
      m.onGround = false;
      m.jumpCD = 1.4 + p.random() * 1.2;
    } else if (m.jumpCD <= 0 && p.random() < 0.004 && ledgeAbove(m, map)) {
      // Now and then a mob hops up for no reason at all.
      m.vy = -p.jump;
      m.onGround = false;
      m.jumpCD = 2;
    }
    if (m.onGround && !floorAhead(m, map) && !(dy > T && p.random() < chase + 0.2)) m.dir = -m.dir;
  }
  m.vx = m.dir * p.speed;
  const res = moveBody(m, dt, map);
  if (res.hitLeft) m.dir = 1;
  if (res.hitRight) m.dir = -1;
  wrapBody(m, p.wrap);
  return res;
}

/** Flying enemy: drifts diagonally, bouncing off walls, floors and ceilings (ledges do not stop it). */
export function stepFlyer(m: Mob, dt: number, map: TileQuery, speed: number, wrap: boolean): MoveResult {
  if (m.vx === 0) m.vx = m.dir * speed;
  if (m.vy === 0) m.vy = speed * 0.7;
  const sx = Math.sign(m.vx);
  const sy = Math.sign(m.vy);
  m.vx = sx * speed;
  m.vy = sy * speed * 0.7;
  const res = moveBody(m, dt, map, { dropThrough: true });
  if (res.hitLeft || res.hitRight) m.vx = -sx * speed;
  if (res.landed || res.hitCeiling) m.vy = -sy * speed * 0.7;
  m.dir = Math.sign(m.vx) || m.dir;
  // On rooms without a lid, keep flyers on screen.
  if (!wrap) {
    if (m.y < 2) {
      m.y = 2;
      m.vy = Math.abs(m.vy);
    }
  } else wrapBody(m, wrap);
  return res;
}

/* --------------------------------------------------------------- loot */

export interface Loot extends Body {
  kind: string;
  value: number;
  /** Seconds left before it vanishes. */
  life: number;
}

export function dropLoot(list: Loot[], kind: string, value: number, x: number, y: number, vx = 0, vy = -220): Loot {
  const l: Loot = { kind, value, x: x - 6, y: y - 6, w: 12, h: 12, vx, vy, onGround: false, life: 9 };
  list.push(l);
  return l;
}

export function stepLoot(l: Loot, dt: number, map: TileQuery, wrap: boolean) {
  l.life -= dt;
  l.vy = Math.min(HERO.fall, l.vy + HERO.gravity * dt);
  if (l.onGround) l.vx *= Math.max(0, 1 - dt * 8);
  const res = moveBody(l, dt, map);
  if (res.hitLeft || res.hitRight) l.vx = -l.vx * 0.5;
  wrapBody(l, wrap);
  if (!wrap) l.y = Math.min(l.y, H - T - l.h);
}

/* ------------------------------------------------------------- chaser */

/** The hurry-up nuisance: drifts straight at the hero through walls and floors. */
export interface Chaser {
  x: number;
  y: number;
  t: number;
}

export function newChaser(heroX: number): Chaser {
  return { x: heroX < W / 2 ? W - 24 : 24, y: 12, t: 0 };
}

export function stepChaser(c: Chaser, hero: Body, dt: number, speed = 46) {
  c.t += dt;
  const dx = hero.x + hero.w / 2 - c.x;
  const dy = hero.y + hero.h / 2 - c.y;
  const d = Math.hypot(dx, dy) || 1;
  c.x += (dx / d) * speed * dt;
  c.y += (dy / d) * speed * dt + Math.sin(c.t * 3) * 10 * dt;
}

export const chaserHits = (c: Chaser, b: Body) => Math.abs(c.x - (b.x + b.w / 2)) < 11 && Math.abs(c.y - (b.y + b.h / 2)) < 11;

export const ROOM = { W, H, ROWS, T };
