import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState, circleHit } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { burst, circle, drawSparks, fillRound, starfield, text, updateSparks } from '../_shared/arcade/draw';
import type { Spark } from '../_shared/arcade/draw';

/**
 * Space Shooter: a vertical shoot-'em-up. The ship fires automatically;
 * steer through waves of drones, weavers and gunships, pick up weapon and
 * shield power-ups, and take down a boss every 45 seconds.
 */
export const W = 400;
export const H = 640;

type EnemyKind = 'drone' | 'weaver' | 'gunner' | 'boss';

export interface Enemy {
  kind: EnemyKind;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  t: number;
  fire: number;
  baseX: number;
  r: number;
}

export interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  enemy: boolean;
}

export interface PowerUp {
  x: number;
  y: number;
  kind: 'weapon' | 'shield';
}

export interface State extends BaseState {
  x: number;
  y: number;
  weapon: number;
  shield: number;
  lives: number;
  invuln: number;
  fireT: number;
  enemies: Enemy[];
  bullets: Bullet[];
  powerups: PowerUp[];
  spawnT: number;
  bossT: number;
  bossActive: boolean;
  bossesBeaten: number;
  scroll: number;
  sparks: Spark[];
  aggression: number;
  kills: number;
}

const SETTINGS: Record<DifficultySetting, { aggression: number; lives: number }> = {
  easy: { aggression: 0.7, lives: 4 },
  normal: { aggression: 1, lives: 3 },
  hard: { aggression: 1.4, lives: 3 },
};

const HP: Record<EnemyKind, number> = { drone: 1, weaver: 2, gunner: 5, boss: 60 };
const POINTS: Record<EnemyKind, number> = { drone: 50, weaver: 80, gunner: 150, boss: 2000 };

export function create(difficulty: DifficultySetting): State {
  const c = SETTINGS[difficulty];
  return {
    ...baseState(),
    x: W / 2,
    y: H - 90,
    weapon: 1,
    shield: 3,
    lives: c.lives,
    invuln: 1.5,
    fireT: 0,
    enemies: [],
    bullets: [],
    powerups: [],
    spawnT: 1,
    bossT: 45,
    bossActive: false,
    bossesBeaten: 0,
    scroll: 0,
    sparks: [],
    aggression: c.aggression,
    kills: 0,
  };
}

function spawnEnemy(s: State, kind: EnemyKind, x: number) {
  const hp = kind === 'boss' ? HP.boss * (1 + s.bossesBeaten * 0.5) : HP[kind];
  s.enemies.push({ kind, x, y: kind === 'boss' ? -80 : -30, hp, maxHp: hp, t: 0, fire: 1 + Math.random(), baseX: x, r: kind === 'boss' ? 54 : kind === 'gunner' ? 20 : 15 });
}

/** Player shot pattern for a weapon level. */
export function volley(x: number, y: number, level: number): Bullet[] {
  const shots: Bullet[] = [{ x, y: y - 16, vx: 0, vy: -620, enemy: false }];
  if (level >= 2) shots.push({ x: x - 10, y: y - 8, vx: -60, vy: -600, enemy: false }, { x: x + 10, y: y - 8, vx: 60, vy: -600, enemy: false });
  if (level >= 3) shots.push({ x: x - 16, y, vx: -150, vy: -560, enemy: false }, { x: x + 16, y, vx: 150, vy: -560, enemy: false });
  return shots;
}

function damagePlayer(s: State, random: () => number) {
  if (s.invuln > 0) return;
  s.shield -= 1;
  s.invuln = 1;
  s.weapon = Math.max(1, s.weapon - 1);
  s.events.push('hit');
  burst(s.sparks, s.x, s.y, '#38bdf8', 12, 150, random);
  if (s.shield <= 0) {
    s.lives -= 1;
    s.events.push('explosion');
    burst(s.sparks, s.x, s.y, '#fb923c', 30, 220, random);
    if (s.lives <= 0) s.over = true;
    else {
      s.shield = 3;
      s.invuln = 2.5;
    }
  }
}

export function update(s: State, dt: number, input: Input, random: () => number) {
  updateSparks(s.sparks, dt);
  s.scroll += 60 * dt;
  s.invuln = Math.max(0, s.invuln - dt);
  // Steer with keys, or drag: the ship follows the pointer while it is down.
  const mx = (input.held.has('right') ? 1 : 0) - (input.held.has('left') ? 1 : 0);
  const my = (input.held.has('down') ? 1 : 0) - (input.held.has('up') ? 1 : 0);
  s.x += mx * 300 * dt;
  s.y += my * 300 * dt;
  if (input.pointer.down) {
    const tx = input.pointer.x;
    const ty = input.pointer.y - 50;
    s.x += (tx - s.x) * Math.min(1, dt * 12);
    s.y += (ty - s.y) * Math.min(1, dt * 12);
  }
  s.x = Math.max(16, Math.min(W - 16, s.x));
  s.y = Math.max(H * 0.35, Math.min(H - 24, s.y));

  s.fireT -= dt;
  if (s.fireT <= 0) {
    s.bullets.push(...volley(s.x, s.y, s.weapon));
    s.fireT = 0.14;
  }

  // Enemy waves, paused while a boss is on screen.
  s.bossT -= dt;
  if (s.bossT <= 0 && !s.bossActive) {
    s.bossActive = true;
    spawnEnemy(s, 'boss', W / 2);
    s.events.push('powerup');
  }
  if (!s.bossActive) {
    s.spawnT -= dt;
    if (s.spawnT <= 0) {
      const r = random();
      const kind: EnemyKind = r < 0.5 ? 'drone' : r < 0.82 ? 'weaver' : 'gunner';
      if (kind === 'drone') {
        const x = 40 + random() * (W - 80);
        for (let i = 0; i < 3; i++) spawnEnemy(s, 'drone', x + (i - 1) * 34);
      } else spawnEnemy(s, kind, 50 + random() * (W - 100));
      s.spawnT = (1.4 - Math.min(0.7, s.time / 200)) / s.aggression;
    }
  }

  for (const e of s.enemies) {
    e.t += dt;
    if (e.kind === 'drone') e.y += 170 * dt;
    else if (e.kind === 'weaver') {
      e.y += 120 * dt;
      e.x = e.baseX + Math.sin(e.t * 3) * 60;
    } else if (e.kind === 'gunner') {
      e.y += (e.y < 140 ? 110 : 12) * dt;
    } else {
      e.y += (e.y < 110 ? 60 : 0) * dt;
      e.x = W / 2 + Math.sin(e.t * 0.8) * 120;
    }
    e.fire -= dt * s.aggression;
    if (e.fire <= 0 && e.y > 0) {
      if (e.kind === 'gunner') {
        const a = Math.atan2(s.y - e.y, s.x - e.x);
        s.bullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, enemy: true });
        e.fire = 1.4;
      } else if (e.kind === 'boss') {
        // Alternate a fan of bullets and an aimed burst.
        if (Math.floor(e.t / 3) % 2 === 0) {
          for (let k = -3; k <= 3; k++) {
            const a = Math.PI / 2 + k * 0.22;
            s.bullets.push({ x: e.x, y: e.y + 30, vx: Math.cos(a) * 180, vy: Math.sin(a) * 180, enemy: true });
          }
          e.fire = 1.1;
        } else {
          const a = Math.atan2(s.y - e.y, s.x - e.x);
          s.bullets.push({ x: e.x, y: e.y + 30, vx: Math.cos(a) * 260, vy: Math.sin(a) * 260, enemy: true });
          e.fire = 0.3;
        }
      } else if (e.kind === 'weaver' && random() < 0.35) {
        s.bullets.push({ x: e.x, y: e.y, vx: 0, vy: 230, enemy: true });
        e.fire = 2;
      } else e.fire = 2;
    }
  }
  for (const b of s.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
  }

  // Player bullets against enemies.
  for (const b of s.bullets) {
    if (b.enemy) continue;
    const e = s.enemies.find((en) => en.hp > 0 && circleHit(b.x, b.y, 3, en.x, en.y, en.r));
    if (!e) continue;
    b.y = -999;
    e.hp -= 1;
    if (e.hp <= 0) {
      s.score += POINTS[e.kind];
      s.kills += 1;
      burst(s.sparks, e.x, e.y, e.kind === 'boss' ? '#f472b6' : '#fb923c', e.kind === 'boss' ? 60 : 14, e.kind === 'boss' ? 260 : 150, random);
      s.events.push('explosion');
      if (e.kind === 'boss') {
        s.bossActive = false;
        s.bossesBeaten += 1;
        s.bossT = 45;
        s.powerups.push({ x: e.x, y: e.y, kind: 'weapon' }, { x: e.x + 30, y: e.y, kind: 'shield' });
      } else if (random() < (e.kind === 'gunner' ? 0.5 : 0.06)) {
        s.powerups.push({ x: e.x, y: e.y, kind: random() < 0.6 ? 'weapon' : 'shield' });
      }
    }
  }
  // Enemy bullets and collisions with the ship.
  for (const b of s.bullets) {
    if (b.enemy && circleHit(b.x, b.y, 4, s.x, s.y, 10)) {
      b.y = H + 999;
      damagePlayer(s, random);
    }
  }
  for (const e of s.enemies) {
    if (e.hp > 0 && e.kind !== 'boss' && circleHit(e.x, e.y, e.r, s.x, s.y, 12)) {
      e.hp = 0;
      burst(s.sparks, e.x, e.y, '#fb923c', 12, 150, random);
      damagePlayer(s, random);
    }
  }
  for (const p of s.powerups) {
    p.y += 90 * dt;
    if (circleHit(p.x, p.y, 12, s.x, s.y, 16)) {
      if (p.kind === 'weapon') s.weapon = Math.min(3, s.weapon + 1);
      else s.shield = Math.min(5, s.shield + 1);
      p.y = H + 999;
      s.score += 100;
      s.events.push('powerup');
    }
  }
  s.bullets = s.bullets.filter((b) => b.y > -20 && b.y < H + 20 && b.x > -20 && b.x < W + 20);
  s.enemies = s.enemies.filter((e) => e.hp > 0 && e.y < H + 60);
  s.powerups = s.powerups.filter((p) => p.y < H + 20);
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  ctx.fillStyle = '#020617';
  ctx.fillRect(0, 0, W, H);
  starfield(ctx, W, H, s.scroll, 90);
  for (const p of s.powerups) {
    circle(ctx, p.x, p.y, 11, p.kind === 'weapon' ? '#f59e0b' : '#22d3ee');
    text(ctx, p.kind === 'weapon' ? 'W' : 'S', p.x, p.y + 1, { size: 12, color: '#0f172a' });
  }
  for (const e of s.enemies) {
    if (e.kind === 'boss') {
      fillRound(ctx, e.x - 54, e.y - 26, 108, 52, 20, '#831843');
      fillRound(ctx, e.x - 34, e.y - 14, 68, 28, 12, '#db2777');
      circle(ctx, e.x, e.y, 10, '#fde047');
      ctx.fillStyle = '#374151';
      ctx.fillRect(W / 2 - 100, 14, 200, 8);
      ctx.fillStyle = '#f472b6';
      ctx.fillRect(W / 2 - 100, 14, (200 * e.hp) / e.maxHp, 8);
    } else {
      const color = e.kind === 'drone' ? '#f87171' : e.kind === 'weaver' ? '#a78bfa' : '#f59e0b';
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(e.x, e.y + e.r);
      ctx.lineTo(e.x - e.r, e.y - e.r * 0.6);
      ctx.lineTo(e.x, e.y - e.r * 0.2);
      ctx.lineTo(e.x + e.r, e.y - e.r * 0.6);
      ctx.closePath();
      ctx.fill();
      if (e.kind === 'gunner') circle(ctx, e.x, e.y, 6, '#fef3c7');
    }
  }
  for (const b of s.bullets) {
    if (b.enemy) circle(ctx, b.x, b.y, 4, '#f472b6');
    else {
      ctx.fillStyle = '#fde047';
      ctx.fillRect(b.x - 1.5, b.y - 6, 3, 10);
    }
  }
  if (!s.over && (s.invuln <= 0 || Math.floor(s.invuln * 12) % 2)) {
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(s.x, s.y - 18);
    ctx.lineTo(s.x - 15, s.y + 12);
    ctx.lineTo(s.x, s.y + 6);
    ctx.lineTo(s.x + 15, s.y + 12);
    ctx.closePath();
    ctx.fill();
    circle(ctx, s.x, s.y - 2, 4, '#e0f2fe');
    circle(ctx, s.x, s.y + 12, 3 + Math.random() * 2, '#fb923c');
  }
  drawSparks(ctx, s.sparks);
  text(ctx, String(s.score), 12, 36, { size: 16, align: 'left' });
  text(ctx, `${'▲'.repeat(Math.max(0, s.lives))}  ${'◆'.repeat(Math.max(0, s.shield))}`, W - 12, 36, { size: 12, align: 'right', color: '#7dd3fc' });
}

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create,
  update,
  render,
  hud: (s) => [
    { label: 'Score', value: s.score },
    { label: 'Lives', value: s.lives },
    { label: 'Shield', value: s.shield },
    { label: 'Weapon', value: `L${s.weapon}` },
  ],
  result: (s) => ({
    score: s.score,
    title: 'Ship destroyed',
    details: [
      { label: 'Enemies downed', value: String(s.kills) },
      { label: 'Bosses beaten', value: String(s.bossesBeaten) },
    ],
  }),
  onEnd: (s) => {
    void reportProgress('space-shooter.boss', s.bossesBeaten);
    void reportProgress('space-shooter.three-bosses', s.bossesBeaten);
    void reportProgress('space-shooter.score', s.score);
    void incrementProgress('space-shooter.kills', s.kills);
  },
  touch: { pad: 'dpad' },
  startHint: 'Your ship fires automatically. Steer with the arrow keys or drag on the game.',
};
