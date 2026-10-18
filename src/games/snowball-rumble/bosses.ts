import { moveBody } from '../_shared/platformer/physics';
import type { TileQuery } from '../_shared/platformer/physics';
import { HERO } from '../_shared/arena/actors';
import { H, T, W } from '../_shared/arena/stage';
import type { DifficultySetting } from '@/types';
import type { Boss, BossKind, FoeKind, State } from './types';

/**
 * Snowball Rumble's three bosses. Snowballs thrown at a boss chip away at
 * it; a rolling snowball is what really hurts. Each boss keeps calling in
 * minions, which are the ammunition: freeze them, then roll them into it.
 *
 *  Frost Troll — stomps about the bottom floor and leaps, shaking the room.
 *  Ember Djinn — floats high throwing fans of fire, then sinks to the
 *                floor for a while, where rolling snowballs can reach it.
 *  Storm King  — a thundercloud that calls lightning down on Pebble's
 *                column and swoops low now and then.
 */
export const BOSS_INFO: Record<BossKind, { name: string; hp: number; w: number; h: number; minion: FoeKind[] }> = {
  troll: { name: 'Frost Troll', hp: 48, w: 40, h: 40, minion: ['goblin'] },
  djinn: { name: 'Ember Djinn', hp: 60, w: 40, h: 40, minion: ['imp', 'goblin'] },
  king: { name: 'Storm King', hp: 80, w: 56, h: 36, minion: ['bat', 'goblin', 'hopper'] },
};

const HP_SCALE: Record<DifficultySetting, number> = { easy: 0.75, normal: 1, hard: 1.25 };

/** Damage of a rolling snowball; a thrown snowball does 1. */
export const ROLL_DAMAGE = 12;

export function makeBoss(kind: BossKind, difficulty: DifficultySetting): Boss {
  const info = BOSS_INFO[kind];
  const hp = Math.round(info.hp * HP_SCALE[difficulty]);
  const floorY = H - T - info.h;
  return {
    kind,
    x: W / 2 - info.w / 2 + (kind === 'troll' ? 70 : 0),
    y: kind === 'troll' ? floorY : 3 * T,
    w: info.w,
    h: info.h,
    vx: 0,
    vy: 0,
    onGround: kind === 'troll',
    dir: -1,
    hp,
    maxHp: hp,
    state: kind === 'troll' ? 'walk' : 'hover',
    timer: 2.5,
    hurt: 0,
    dying: 0,
    spawnCD: 2.5,
    attackCD: 2,
  };
}

/** Low enough for a rolling snowball on the bottom floor to hit it. */
export const bossIsLow = (b: Boss) => b.y + b.h > H - T - 24;

export function updateBoss(s: State, b: Boss, dt: number, map: TileQuery, random: () => number, spawn: (kind: FoeKind) => void) {
  b.hurt = Math.max(0, b.hurt - dt);
  if (b.dying > 0) {
    b.dying += dt;
    return;
  }
  const hero = s.hero;
  const hx = hero.x + hero.w / 2;
  const cx = b.x + b.w / 2;
  const rage = 1 + (1 - b.hp / b.maxHp) * 0.6;
  const info = BOSS_INFO[b.kind];
  b.timer -= dt;
  b.spawnCD -= dt;
  b.attackCD -= dt;

  // Minions: the ammunition.
  const minions = s.foes.filter((f) => f.state !== 'out').length;
  if (b.spawnCD <= 0) {
    b.spawnCD = 4.5 / rage;
    if (minions < (b.kind === 'king' ? 4 : 3)) spawn(info.minion[Math.floor(random() * info.minion.length)]);
  }

  const floorY = H - T - b.h;
  switch (b.kind) {
    case 'troll': {
      b.vy = Math.min(HERO.fall * 1.5, b.vy + HERO.gravity * dt);
      if (b.state === 'walk') {
        b.dir = hx < cx ? -1 : 1;
        b.vx = b.dir * 32 * rage;
        if (b.timer <= 0 && b.onGround) {
          b.state = 'leap';
          b.vy = -470;
          b.vx = Math.max(-110, Math.min(110, (hx - cx) * 0.9));
          b.onGround = false;
          s.events.push('jump');
        }
      }
      const res = moveBody(b, dt, map);
      if (res.hitLeft) b.dir = 1;
      if (res.hitRight) b.dir = -1;
      if (b.state === 'leap' && res.landed) {
        b.state = 'walk';
        b.timer = 2.4 / rage;
        s.shake = 0.4;
        s.events.push('explosion');
      }
      break;
    }
    case 'djinn': {
      if (b.state === 'hover') {
        const targetY = 3 * T + Math.sin(s.stageTime * 1.4) * 14;
        b.vx = Math.sign(hx - cx) * Math.min(70, Math.abs(hx - cx));
        b.x += b.vx * dt;
        b.y += (targetY - b.y) * Math.min(1, dt * 3);
        if (b.attackCD <= 0) {
          b.attackCD = 1.7 / rage;
          for (const k of [-1, 0, 1]) fire(s, cx, b.y + b.h - 6, k * 60, 95);
          s.events.push('shoot');
        }
        if (b.timer <= 0) {
          b.state = 'sink';
          b.timer = 1;
        }
      } else if (b.state === 'sink') {
        b.y = Math.min(floorY, b.y + 150 * dt);
        if (b.y >= floorY) {
          b.state = 'low';
          b.timer = 2.8;
        }
      } else if (b.state === 'low') {
        b.dir = hx < cx ? -1 : 1;
        b.x += b.dir * 26 * dt;
        if (b.timer <= 0) b.state = 'rise';
      } else if (b.state === 'rise') {
        b.y -= 120 * dt;
        if (b.y <= 3 * T) {
          b.state = 'hover';
          b.timer = 4.5 / rage;
        }
      }
      break;
    }
    case 'king': {
      if (b.state === 'hover') {
        b.x += Math.sin(s.stageTime * 0.9) * 60 * dt;
        b.y += (2 * T - b.y) * Math.min(1, dt * 2);
        if (b.attackCD <= 0) {
          b.attackCD = 2.6 / rage;
          s.bolts.push({ x: hx, warn: 0.9, life: 0.35 });
        }
        if (b.timer <= 0) {
          b.state = 'swoop';
          b.timer = 1.1;
          s.events.push('whoosh');
        }
      } else if (b.state === 'swoop') {
        b.y = Math.min(floorY, b.y + 170 * dt);
        b.x += Math.sign(hx - cx) * 40 * dt;
        if (b.y >= floorY) {
          b.state = 'low';
          b.timer = 2.2;
        }
      } else if (b.state === 'low') {
        if (b.timer <= 0) b.state = 'rise';
      } else if (b.state === 'rise') {
        b.y -= 110 * dt;
        if (b.y <= 2 * T) {
          b.state = 'hover';
          b.timer = 5 / rage;
        }
      }
      break;
    }
  }
  b.x = Math.max(T, Math.min(W - T - b.w, b.x));
}

function fire(s: State, x: number, y: number, vx: number, vy: number) {
  s.fires.push({ x: x - 5, y: y - 5, w: 10, h: 10, vx, vy, life: 4 });
}

/** Applies damage; returns true when this blow finishes the boss. */
export function damageBoss(s: State, b: Boss, amount: number): boolean {
  if (b.dying > 0) return false;
  b.hp = Math.max(0, b.hp - amount);
  b.hurt = 0.25;
  s.events.push(amount >= ROLL_DAMAGE ? 'explosion' : 'hit');
  if (b.hp <= 0) {
    b.dying = 0.001;
    return true;
  }
  return false;
}
