import { moveBody, walk } from '../_shared/platformer/physics';
import type { TileQuery } from '../_shared/platformer/physics';
import { ROWS, TILE } from './levels';
import type { EnemyKind, LevelData, Spawn } from './levels';
import type { Enemy, Item, ItemKind, Shot } from './types';

export const GRAVITY = 1400;

export const ENEMY_SIZE: Record<EnemyKind, { w: number; h: number }> = {
  beetle: { w: 14, h: 12 },
  snail: { w: 14, h: 14 },
  hedgehog: { w: 14, h: 12 },
  frog: { w: 14, h: 12 },
  bee: { w: 14, h: 12 },
  bat: { w: 14, h: 10 },
};

const SPEED: Record<EnemyKind, number> = { beetle: 38, snail: 28, hedgehog: 32, frog: 80, bee: 30, bat: 95 };

/** Hedgehogs are covered in spines: landing on one hurts. */
export const stompable = (e: Enemy) => e.kind !== 'hedgehog' && e.state !== 'dead' && e.state !== 'flat';

export function spawnEnemy(sp: Spawn, map: TileQuery): Enemy {
  const size = ENEMY_SIZE[sp.kind];
  const e: Enemy = {
    kind: sp.kind,
    x: sp.x - size.w / 2,
    y: sp.y - size.h,
    w: size.w,
    h: size.h,
    vx: 0,
    vy: 0,
    onGround: false,
    dir: -1,
    state: sp.kind === 'bat' ? 'hang' : 'walk',
    timer: 0.6,
    homeX: sp.x,
    homeY: sp.y,
    chain: 0,
    grace: 0,
  };
  if (sp.kind === 'bat') {
    // Hang from the nearest ceiling above.
    let r = Math.floor(e.y / TILE);
    while (r > 0 && map.at(Math.floor((e.x + e.w / 2) / TILE), r - 1) !== 1) r--;
    e.y = r * TILE;
  }
  return e;
}

/** Moves one enemy. `px` / `py` are the centre of the player, for enemies that react to Pip. */
export function updateEnemy(e: Enemy, dt: number, map: TileQuery, speedMul: number, px: number, py: number) {
  e.grace = Math.max(0, e.grace - dt);
  switch (e.state) {
    case 'dead':
      e.vy += GRAVITY * dt;
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      return;
    case 'flat':
      e.timer -= dt;
      return;
    case 'shell':
      e.timer -= dt;
      e.vx = 0;
      e.vy = Math.min(460, e.vy + GRAVITY * dt);
      moveBody(e, dt, map);
      if (e.timer <= 0) {
        // Out of the shell and off again.
        e.state = 'walk';
        e.y -= ENEMY_SIZE.snail.h - e.h;
        e.h = ENEMY_SIZE.snail.h;
        e.dir = px < e.x ? -1 : 1;
      }
      return;
    case 'slide':
      walk(e, 250, GRAVITY, dt, map, { maxFall: 460 });
      return;
    case 'hang':
      if (Math.abs(px - (e.x + e.w / 2)) < 90 && py > e.y) {
        e.state = 'swoop';
        e.dir = px < e.x ? -1 : 1;
        e.vx = e.dir * SPEED.bat * speedMul;
        e.vy = 150;
        e.timer = 0;
      }
      return;
    case 'swoop':
      // Dives towards Pip, levels out and climbs away.
      e.timer += dt;
      e.vy -= 200 * dt;
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      return;
  }

  const speed = SPEED[e.kind] * speedMul;
  switch (e.kind) {
    case 'beetle':
    case 'snail':
      walk(e, speed, GRAVITY, dt, map, { maxFall: 460 });
      break;
    case 'hedgehog':
      walk(e, speed, GRAVITY, dt, map, { maxFall: 460, turnAtLedges: true });
      break;
    case 'frog': {
      e.vy = Math.min(460, e.vy + GRAVITY * dt);
      if (e.onGround) {
        e.vx = 0;
        e.timer -= dt;
        if (e.timer <= 0) {
          e.dir = px < e.x + e.w / 2 ? -1 : 1;
          e.vx = e.dir * speed;
          e.vy = -360;
          e.timer = 1.1;
        }
      }
      const res = moveBody(e, dt, map);
      if (res.hitLeft || res.hitRight) e.vx = -e.vx;
      if (res.landed) e.vx = 0;
      break;
    }
    case 'bee': {
      e.timer += dt;
      e.x += e.dir * speed * dt;
      if (e.x + e.w / 2 > e.homeX + 56) e.dir = -1;
      if (e.x + e.w / 2 < e.homeX - 56) e.dir = 1;
      e.y = e.homeY - e.h + Math.sin(e.timer * 3) * 14;
      break;
    }
  }
}

export function isGone(e: Enemy, camera: number, viewW: number): boolean {
  if (e.y > ROWS * TILE + 40) return true;
  if (e.state === 'flat' && e.timer <= 0) return true;
  if (e.state === 'swoop' && (e.y < -40 || e.x < camera - 60 || e.x > camera + viewW + 60)) return true;
  if (e.state === 'slide' && (e.x < camera - viewW || e.x > camera + viewW * 2)) return true;
  return false;
}

/* --------------------------------------------------------------- items */

const ITEM_SIZE = { w: 12, h: 12 };

export function spawnItem(kind: ItemKind, c: number, r: number): Item {
  return {
    kind,
    x: c * TILE + (TILE - ITEM_SIZE.w) / 2,
    y: r * TILE + 2,
    w: ITEM_SIZE.w,
    h: ITEM_SIZE.h,
    vx: 0,
    vy: 0,
    onGround: false,
    dir: 1,
    emerge: 0.55,
  };
}

export function updateItem(it: Item, dt: number, map: TileQuery) {
  if (it.emerge > 0) {
    it.emerge -= dt;
    it.y -= (TILE / 0.55) * dt;
    return;
  }
  if (it.kind === 'pepper') {
    it.vy = Math.min(460, it.vy + GRAVITY * dt);
    moveBody(it, dt, map);
    return;
  }
  const speed = it.kind === 'feather' ? 64 : 58;
  it.vx = it.dir * speed;
  it.vy = Math.min(460, it.vy + GRAVITY * dt);
  const res = moveBody(it, dt, map);
  if (res.hitLeft) it.dir = 1;
  if (res.hitRight) it.dir = -1;
  if (res.landed && it.kind === 'feather') it.vy = -330;
}

/* --------------------------------------------------------------- shots */

/** Moves a projectile. Returns false when it should disappear. */
export function updateShot(sh: Shot, dt: number, map: TileQuery): boolean {
  sh.life -= dt;
  if (sh.life <= 0) return false;
  switch (sh.kind) {
    case 'spark': {
      sh.vy = Math.min(420, sh.vy + 1150 * dt);
      const res = moveBody(sh, dt, map);
      if (res.hitLeft || res.hitRight) return false;
      if (res.landed) sh.vy = -230;
      return true;
    }
    case 'acorn':
      sh.x += sh.vx * dt;
      // Cannon acorns fly through the air and stop at walls.
      return map.at(Math.floor((sh.x + sh.w / 2) / TILE), Math.floor((sh.y + sh.h / 2) / TILE)) !== 1;
    case 'feather':
      sh.y += sh.vy * dt;
      sh.x += Math.sin(sh.life * 5) * 40 * dt;
      return sh.y < ROWS * TILE && map.at(Math.floor((sh.x + sh.w / 2) / TILE), Math.floor((sh.y + sh.h) / TILE)) !== 1;
    case 'rock': {
      sh.vy = Math.min(460, sh.vy + GRAVITY * dt);
      const res = moveBody(sh, dt, map);
      return !(res.hitLeft || res.hitRight);
    }
    case 'shard':
    case 'lava': {
      sh.vy = Math.min(460, sh.vy + 900 * dt);
      const res = moveBody(sh, dt, map);
      return !(res.landed || res.hitLeft || res.hitRight);
    }
  }
}

/* --------------------------------------------------- level hazards */

export const WHEEL_ARM = [12, 22, 32];
export const WHEEL_BALL = 5;

/** Fireballs of every fire wheel at time t. */
export function wheelBalls(level: LevelData, t: number): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  level.wheels.forEach((w, i) => {
    const dir = i % 2 === 0 ? 1 : -1;
    const a = t * 1.7 * dir + i;
    for (const d of WHEEL_ARM) out.push({ x: w.x + Math.cos(a) * d, y: w.y + Math.sin(a) * d });
  });
  return out;
}

const LAVA_PERIOD = 2.8;
const LAVA_UP = 430;
const LAVA_G = 1000;
const LAVA_AIR = (2 * LAVA_UP) / LAVA_G;

/** Lava sprites leap out of the lava in turn. Returns null while one is under the surface. */
export function lavaSpriteAt(level: LevelData, i: number, t: number): { x: number; y: number; rising: boolean } | null {
  const sp = level.lavaSprites[i];
  const p = (t + i * 0.9) % LAVA_PERIOD;
  if (p > LAVA_AIR) return null;
  const rise = LAVA_UP * p - (LAVA_G / 2) * p * p;
  return { x: sp.x, y: sp.y - rise, rising: p < LAVA_AIR / 2 };
}
