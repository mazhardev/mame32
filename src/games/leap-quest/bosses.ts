import { moveBody } from '../_shared/platformer/physics';
import type { TileQuery } from '../_shared/platformer/physics';
import { TILE } from './levels';
import type { BossKind } from './levels';
import { GRAVITY } from './enemies';
import type { Boss, Shot, State } from './types';

/**
 * The four guardians, one at the end of each world. Each takes a few stomps
 * (sparks chip away a quarter of a stomp each) and has its own pattern:
 *
 *  Bramble Boar — paces, paws the ground, then charges into the wall and
 *                 stands dazed for a moment.
 *  Crystal Mole — burrows towards Pip, bursts out throwing crystal shards,
 *                 then walks about before digging in again.
 *  Storm Owl    — hovers high dropping feather darts, then dives and glides
 *                 low along the floor, where it can be stomped.
 *  Magma Golem  — plods, leaps at Pip and lands with a shockwave of rolling
 *                 rocks, then lobs lava.
 */
export const BOSS_INFO: Record<BossKind, { name: string; stomps: number; w: number; h: number }> = {
  boar: { name: 'Bramble Boar', stomps: 3, w: 36, h: 26 },
  mole: { name: 'Crystal Mole', stomps: 4, w: 30, h: 26 },
  owl: { name: 'Storm Owl', stomps: 4, w: 32, h: 26 },
  golem: { name: 'Magma Golem', stomps: 5, w: 40, h: 40 },
};

/** Damage of one stomp; a spark does 1. */
export const STOMP_DAMAGE = 4;

export function makeBoss(kind: BossKind, x: number, bottom: number, extraStomps = 0): Boss {
  const info = BOSS_INFO[kind];
  const hp = (info.stomps + extraStomps) * STOMP_DAMAGE;
  return {
    kind,
    x: x - info.w / 2,
    y: bottom - info.h,
    w: info.w,
    h: info.h,
    vx: 0,
    vy: 0,
    onGround: false,
    dir: -1,
    hp,
    maxHp: hp,
    state: kind === 'mole' ? 'walk' : kind === 'owl' ? 'hover' : 'walk',
    timer: 1.5,
    hurt: 0,
    dying: 0,
    count: 0,
  };
}

/** Whether a stomp on the boss right now does damage. */
export function bossVulnerable(b: Boss): boolean {
  if (b.dying > 0 || b.hurt > 0) return false;
  if (b.kind === 'mole') return b.state !== 'under' && b.state !== 'dig';
  return true;
}

/** Whether touching the boss right now hurts Pip. */
export function bossHarmful(b: Boss): boolean {
  if (b.dying > 0) return false;
  if (b.kind === 'mole') return b.state !== 'under' && b.state !== 'dig';
  return true;
}

function shot(kind: Shot['kind'], x: number, y: number, vx: number, vy: number, size = 10, life = 4): Shot {
  return { kind, x: x - size / 2, y: y - size / 2, w: size, h: size, vx, vy, onGround: false, life };
}

const groundY = 13 * TILE;

export function updateBoss(s: State, b: Boss, dt: number, map: TileQuery, random: () => number) {
  b.hurt = Math.max(0, b.hurt - dt);
  if (b.dying > 0) {
    b.dying += dt;
    return;
  }
  const p = s.player;
  const px = p.x + p.w / 2;
  const cx = b.x + b.w / 2;
  const toward = px < cx ? -1 : 1;
  const arenaL = (s.level.arenaX ?? 0) + TILE;
  const arenaR = s.level.cols * TILE - TILE;
  const rage = 1 + (1 - b.hp / b.maxHp) * 0.5;
  b.timer -= dt;

  const gravityMove = () => {
    b.vy = Math.min(520, b.vy + GRAVITY * dt);
    return moveBody(b, dt, map);
  };

  switch (b.kind) {
    case 'boar': {
      if (b.state === 'walk') {
        b.dir = toward;
        b.vx = b.dir * 45 * rage;
        if (b.timer <= 0) {
          b.state = 'paw';
          b.timer = 0.7;
        }
      } else if (b.state === 'paw') {
        b.vx = 0;
        if (b.timer <= 0) {
          b.state = 'charge';
          b.dir = toward;
          s.events.push('whoosh');
        }
      } else if (b.state === 'charge') {
        b.vx = b.dir * 230 * rage;
      } else if (b.state === 'stun') {
        b.vx = 0;
        if (b.timer <= 0) {
          b.state = 'walk';
          b.timer = 1.6;
        }
      }
      const res = gravityMove();
      if (b.state === 'charge' && (res.hitLeft || res.hitRight)) {
        b.state = 'stun';
        b.timer = 1.3;
        s.shake = 0.35;
        s.events.push('hit');
      }
      break;
    }

    case 'mole': {
      if (b.state === 'walk') {
        b.dir = toward;
        b.vx = b.dir * 40 * rage;
        gravityMove();
        if (b.timer <= 0) {
          b.state = 'dig';
          b.timer = 0.6;
        }
      } else if (b.state === 'dig') {
        b.vx = 0;
        if (b.timer <= 0) {
          b.state = 'under';
          b.timer = 2.2;
        }
      } else if (b.state === 'under') {
        b.dir = toward;
        b.x += b.dir * 85 * rage * dt;
        b.x = Math.max(arenaL, Math.min(arenaR - b.w, b.x));
        if (b.timer <= 0) {
          b.state = 'pop';
          b.vy = -430;
          b.onGround = false;
          s.events.push('explosion');
          const n = rage > 1.25 ? 5 : 3;
          for (let i = 0; i < n; i++) {
            const spread = (i - (n - 1) / 2) * 75;
            s.hostile.push(shot('shard', cx, b.y, spread, -330 - Math.abs(spread) * 0.3, 9));
          }
        }
      } else if (b.state === 'pop') {
        b.vx = 0;
        const res = gravityMove();
        if (res.landed) {
          b.state = 'walk';
          b.timer = 2.4;
        }
      }
      break;
    }

    case 'owl': {
      const hoverY = 3.2 * TILE;
      if (b.state === 'hover') {
        b.dir = toward;
        b.vx = b.dir * Math.min(80, Math.abs(px - cx) * 2);
        b.vy = (hoverY + Math.sin(s.levelTime * 3) * 6 - b.y) * 4;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.count += dt;
        if (b.count > 0.9 / rage) {
          b.count = 0;
          s.hostile.push(shot('feather', cx, b.y + b.h, 0, 115 * rage, 8, 5));
        }
        if (b.timer <= 0) {
          b.state = 'dive';
          const dx = px - cx;
          const dy = groundY - (b.y + b.h);
          const d = Math.hypot(dx, dy) || 1;
          b.vx = (dx / d) * 240 * rage;
          b.vy = (dy / d) * 240 * rage;
          s.events.push('whoosh');
        }
      } else if (b.state === 'dive') {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        if (b.y + b.h >= groundY - 2) {
          b.y = groundY - 2 - b.h;
          b.state = 'glide';
          b.timer = 1.1;
          b.dir = b.vx < 0 ? -1 : 1;
        }
      } else if (b.state === 'glide') {
        b.vx = b.dir * 120;
        b.x += b.vx * dt;
        if (b.timer <= 0) b.state = 'rise';
      } else if (b.state === 'rise') {
        b.vy = -150;
        b.y += b.vy * dt;
        b.x += b.dir * 40 * dt;
        if (b.y <= hoverY) {
          b.state = 'hover';
          b.timer = 2.6 / rage + random() * 0.6;
        }
      }
      if (b.x < arenaL) {
        b.x = arenaL;
        b.dir = 1;
      }
      if (b.x + b.w > arenaR) {
        b.x = arenaR - b.w;
        b.dir = -1;
      }
      break;
    }

    case 'golem': {
      if (b.state === 'walk') {
        b.dir = toward;
        b.vx = b.dir * 30 * rage;
        gravityMove();
        if (b.timer <= 0) {
          b.state = 'leap';
          b.vy = -540;
          b.vx = Math.max(-170, Math.min(170, (px - cx) / 1.05));
          b.onGround = false;
          s.events.push('jump');
        }
      } else if (b.state === 'leap') {
        const res = gravityMove();
        if (res.landed) {
          s.shake = 0.45;
          s.events.push('explosion');
          for (const d of [-1, 1]) s.hostile.push(shot('rock', cx + d * (b.w / 2 + 6), b.y + b.h - 7, d * 150, 0, 12, 4));
          b.state = 'throw';
          b.count = 0;
          b.timer = 0.5;
        }
      } else if (b.state === 'throw') {
        b.vx = 0;
        gravityMove();
        if (b.timer <= 0) {
          b.count++;
          const dx = px - cx;
          s.hostile.push(shot('lava', cx, b.y + 6, dx / 1.1 + (random() - 0.5) * 40, -380, 11, 4));
          s.events.push('shoot');
          b.timer = 0.45;
          if (b.count >= (rage > 1.25 ? 4 : 3)) {
            b.state = 'walk';
            b.timer = 1.8 / rage;
          }
        }
      }
      break;
    }
  }
}

/** Applies damage; returns true if the boss was beaten by it. */
export function damageBoss(s: State, b: Boss, amount: number): boolean {
  if (!bossVulnerable(b)) return false;
  b.hp = Math.max(0, b.hp - amount);
  b.hurt = amount >= STOMP_DAMAGE ? 0.9 : 0.15;
  s.events.push(amount >= STOMP_DAMAGE ? 'explosion' : 'hit');
  if (b.kind === 'boar' && amount >= STOMP_DAMAGE) {
    b.state = 'walk';
    b.timer = 1.2;
  }
  if (b.kind === 'owl' && amount >= STOMP_DAMAGE && b.state === 'glide') b.state = 'rise';
  if (b.hp <= 0) {
    b.dying = 0.001;
    b.vx = 0;
    return true;
  }
  return false;
}
