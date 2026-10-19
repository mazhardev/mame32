import { H, T, W } from '../_shared/arena/stage';
import type { DifficultySetting } from '@/types';
import type { Boss, BossKind, CritterKind, State } from './types';

/**
 * Bubble Bay's three bosses bounce around the room. Freshly blown bubbles
 * burst against them, wearing them down; when one is beaten it is sealed in
 * a giant bubble — pop it to win.
 *
 *  King Crab   — throws spinning shells at Ollie.
 *  Thunder Ray — warns, then sends a lightning beam across its row.
 *  Kraken      — sprays ink in every direction and calls in helpers.
 */
export const BOSS_INFO: Record<BossKind, { name: string; hp: number; w: number; h: number; speed: number }> = {
  crab: { name: 'King Crab', hp: 24, w: 44, h: 34, speed: 62 },
  ray: { name: 'Thunder Ray', hp: 32, w: 52, h: 30, speed: 76 },
  kraken: { name: 'The Kraken', hp: 40, w: 52, h: 48, speed: 52 },
};

const HP_SCALE: Record<DifficultySetting, number> = { easy: 0.75, normal: 1, hard: 1.25 };

export function makeBoss(kind: BossKind, difficulty: DifficultySetting): Boss {
  const info = BOSS_INFO[kind];
  const hp = Math.round(info.hp * HP_SCALE[difficulty]);
  return {
    kind,
    x: W - T - info.w - 20,
    y: 2 * T,
    w: info.w,
    h: info.h,
    vx: -info.speed,
    vy: info.speed * 0.7,
    hp,
    maxHp: hp,
    state: 'move',
    hurt: 0,
    attackCD: 2.5,
    summonCD: 6,
    beam: null,
    t: 0,
  };
}

/** The giant bubble a beaten boss floats in. */
export const bossBubbleRadius = (b: Boss) => Math.max(b.w, b.h) / 2 + 8;

export function updateBoss(s: State, b: Boss, dt: number, random: () => number, summon: (kind: CritterKind) => void) {
  b.t += dt;
  b.hurt = Math.max(0, b.hurt - dt);
  if (b.state === 'trapped') {
    // Float gently up to the middle of the room and wait to be popped.
    const tx = W / 2 - b.w / 2;
    const ty = 4 * T;
    b.x += (tx - b.x) * Math.min(1, dt * 1.2);
    b.y += (ty - b.y) * Math.min(1, dt * 1.2) + Math.sin(b.t * 2) * 6 * dt;
    return;
  }
  if (b.state === 'popped') return;

  const info = BOSS_INFO[b.kind];
  const rage = 1 + (1 - b.hp / b.maxHp) * 0.7;
  const speed = info.speed * rage;
  b.vx = Math.sign(b.vx || -1) * speed;
  b.vy = Math.sign(b.vy || 1) * speed * 0.7;
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  // Bounce around inside the room.
  if (b.x < T) {
    b.x = T;
    b.vx = speed;
  }
  if (b.x + b.w > W - T) {
    b.x = W - T - b.w;
    b.vx = -speed;
  }
  if (b.y < T) {
    b.y = T;
    b.vy = speed * 0.7;
  }
  if (b.y + b.h > H - T) {
    b.y = H - T - b.h;
    b.vy = -speed * 0.7;
  }

  const hero = s.hero;
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  b.attackCD -= dt;
  b.summonCD -= dt;
  if (b.attackCD <= 0) {
    switch (b.kind) {
      case 'crab': {
        b.attackCD = 2.2 / rage;
        const dx = hero.x + hero.w / 2 - cx;
        const dy = hero.y + hero.h / 2 - cy;
        const d = Math.hypot(dx, dy) || 1;
        s.inks.push({ kind: 'shell', x: cx - 5, y: cy - 5, w: 10, h: 10, vx: (dx / d) * 120, vy: (dy / d) * 120, life: 4 });
        s.events.push('shoot');
        break;
      }
      case 'ray':
        b.attackCD = 2.8 / rage;
        b.beam = { y: cy, warn: 0.75, life: 0.32 };
        break;
      case 'kraken': {
        b.attackCD = 3 / rage;
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2 + b.t;
          s.inks.push({ kind: 'ink', x: cx - 5, y: cy - 5, w: 10, h: 10, vx: Math.cos(a) * 85, vy: Math.sin(a) * 85, life: 4 });
        }
        s.events.push('shoot');
        break;
      }
    }
  }
  if (b.kind === 'kraken' && b.summonCD <= 0) {
    b.summonCD = 8 / rage;
    const alive = s.critters.filter((c) => c.state !== 'out').length;
    if (alive < 3) summon(random() < 0.5 ? 'crab' : 'eel');
  }
  if (b.beam) {
    if (b.beam.warn > 0) {
      b.beam.warn -= dt;
      if (b.beam.warn <= 0) {
        s.events.push('explosion');
        s.shake = 0.2;
      }
    } else {
      b.beam.life -= dt;
      if (b.beam.life <= 0) b.beam = null;
    }
  }
}

/** Damage from a bubble; returns true when this one beats the boss. */
export function hurtBoss(s: State, b: Boss): boolean {
  if (b.state !== 'move') return false;
  b.hp = Math.max(0, b.hp - 1);
  b.hurt = 0.12;
  s.events.push('hit');
  if (b.hp <= 0) {
    b.state = 'trapped';
    b.beam = null;
    s.events.push('powerup');
    return true;
  }
  return false;
}
