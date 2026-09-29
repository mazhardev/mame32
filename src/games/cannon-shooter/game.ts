import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState, circleRectHit, clamp } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { burst, circle, drawSparks, fillRound, gradientBg, text, updateSparks } from '../_shared/arcade/draw';
import type { Spark } from '../_shared/arcade/draw';

/**
 * Cannon Shooter: boulders with hit points bounce around the valley. Slide
 * the cannon underneath them — it fires on its own — and break them down.
 * Big boulders split in two when destroyed. Don't let one land on you.
 */
export const W = 360;
export const H = 600;
export const GROUND = 556;
const GRAVITY = 620;
const CANNON_W = 44;
const CANNON_H = 34;
const BULLET_SPEED = 720;

export const RADII = [13, 19, 27, 37];
/** How high each size of boulder bounces off the ground. */
export const BOUNCE = [170, 230, 290, 350];
const COLORS = ['#f472b6', '#a78bfa', '#38bdf8', '#fb923c'];

export interface Rock {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  hp: number;
  maxHp: number;
  flash: number;
}

export interface State extends BaseState {
  cannonX: number;
  bullets: { x: number; y: number }[];
  rocks: Rock[];
  fireT: number;
  level: number;
  toSpawn: number[];
  spawnT: number;
  lives: number;
  invuln: number;
  clearT: number;
  hpMult: number;
  sparks: Spark[];
  smashed: number;
  recoil: number;
  followPointer: boolean;
  lastPointerX: number;
}

const HP_MULT: Record<DifficultySetting, number> = { easy: 0.7, normal: 1, hard: 1.35 };

/** Boulder sizes for a level: more and bigger boulders as levels go on. */
export function levelPlan(level: number, random: () => number): number[] {
  const count = Math.min(7, 2 + Math.floor(level / 2));
  const plan: number[] = [];
  for (let i = 0; i < count; i++) {
    const big = random() < Math.min(0.75, 0.2 + level * 0.06);
    plan.push(big ? 3 : 1 + Math.floor(random() * 2));
  }
  return plan;
}

export const fireInterval = (level: number) => Math.max(0.05, 0.085 * 0.96 ** (level - 1));
export const damage = (level: number) => 1 + Math.floor((level - 1) / 3);

function startLevel(s: State, random: () => number) {
  s.toSpawn = levelPlan(s.level, random);
  s.spawnT = 0.6;
}

export function create(difficulty: DifficultySetting, random: () => number): State {
  const s: State = {
    ...baseState(),
    cannonX: W / 2,
    bullets: [],
    rocks: [],
    fireT: 0,
    level: 1,
    toSpawn: [],
    spawnT: 0,
    lives: 3,
    invuln: 0,
    clearT: 0,
    hpMult: HP_MULT[difficulty],
    sparks: [],
    smashed: 0,
    recoil: 0,
    followPointer: false,
    lastPointerX: 0,
  };
  startLevel(s, random);
  return s;
}

export function makeRock(s: State, size: number, random: () => number): Rock {
  const rad = RADII[size];
  const hp = Math.max(1, Math.round((6 + s.level * 5) * (0.45 + size * 0.35) * s.hpMult));
  // Boulders drop in from the top, so each one is visible before it lands.
  return {
    x: rad + 20 + random() * (W - 2 * rad - 40),
    y: -rad,
    vx: (random() < 0.5 ? -1 : 1) * (55 + random() * 30),
    vy: 40,
    size,
    hp,
    maxHp: hp,
    flash: 0,
  };
}

/** Upward speed that makes a boulder of this size bounce to its height. */
const bounceSpeed = (size: number) => Math.sqrt(2 * GRAVITY * BOUNCE[size]);

export function stepRock(r: Rock, dt: number) {
  const rad = RADII[r.size];
  r.vy += GRAVITY * dt;
  r.x += r.vx * dt;
  r.y += r.vy * dt;
  if (r.y + rad >= GROUND && r.vy > 0) {
    r.y = GROUND - rad;
    r.vy = -bounceSpeed(r.size);
  }
  if (r.x - rad < 0 && r.vx < 0) r.vx = Math.abs(r.vx);
  if (r.x + rad > W && r.vx > 0) r.vx = -Math.abs(r.vx);
  r.flash = Math.max(0, r.flash - dt);
}

export function breakRock(s: State, i: number) {
  const r = s.rocks[i];
  s.rocks.splice(i, 1);
  s.smashed += 1;
  s.score += r.maxHp;
  burst(s.sparks, r.x, r.y, COLORS[r.size], 10 + r.size * 5, 120 + r.size * 30);
  s.events.push(r.size > 0 ? 'explosion' : 'pop');
  if (r.size > 0) {
    const hp = Math.max(1, Math.ceil(r.maxHp / 2));
    for (const dir of [-1, 1])
      s.rocks.push({ x: r.x + dir * 6, y: r.y, vx: dir * 75, vy: -260, size: r.size - 1, hp, maxHp: hp, flash: 0 });
  }
}

function steer(s: State, input: Input, dt: number) {
  const dir = (input.held.has('right') ? 1 : 0) - (input.held.has('left') ? 1 : 0);
  const p = input.pointer;
  // Whichever was used last — keys or the pointer — is in charge.
  if (dir) s.followPointer = false;
  else if (p.active && (p.down || p.x !== s.lastPointerX)) s.followPointer = true;
  s.lastPointerX = p.x;
  if (dir) s.cannonX += dir * 380 * dt;
  else if (s.followPointer) s.cannonX += clamp(p.x - s.cannonX, -900 * dt, 900 * dt);
  s.cannonX = clamp(s.cannonX, CANNON_W / 2, W - CANNON_W / 2);
}

export function update(s: State, dt: number, input: Input, random: () => number) {
  updateSparks(s.sparks, dt, 400);
  steer(s, input, dt);
  s.recoil = Math.max(0, s.recoil - dt * 8);

  if (s.clearT > 0) {
    s.clearT -= dt;
    if (s.clearT <= 0) {
      s.level += 1;
      startLevel(s, random);
    }
    return;
  }

  // Auto-fire.
  s.fireT -= dt;
  if (s.fireT <= 0) {
    s.fireT += fireInterval(s.level);
    s.bullets.push({ x: s.cannonX, y: GROUND - CANNON_H - 8 });
    s.recoil = 1;
  }
  const dmg = damage(s.level);
  for (const b of s.bullets) b.y -= BULLET_SPEED * dt;
  s.bullets = s.bullets.filter((b) => {
    if (b.y < -10) return false;
    for (let i = 0; i < s.rocks.length; i++) {
      const r = s.rocks[i];
      if (Math.abs(b.x - r.x) < RADII[r.size] + 3 && Math.abs(b.y - r.y) < RADII[r.size] + 6) {
        r.hp -= dmg;
        r.flash = 0.06;
        s.score += 1;
        if (r.hp <= 0) breakRock(s, i);
        return false;
      }
    }
    return true;
  });

  // Spawning, a few boulders at a time.
  s.spawnT -= dt;
  const maxAlive = 2 + Math.floor(s.level / 3);
  if (s.toSpawn.length && s.spawnT <= 0 && s.rocks.length < maxAlive) {
    s.rocks.push(makeRock(s, s.toSpawn.shift()!, random));
    s.spawnT = 2.5;
  }

  for (const r of s.rocks) stepRock(r, dt);

  s.invuln = Math.max(0, s.invuln - dt);
  if (s.invuln <= 0) {
    const body = { x: s.cannonX - CANNON_W / 2 + 4, y: GROUND - CANNON_H + 6, w: CANNON_W - 8, h: CANNON_H - 6 };
    if (s.rocks.some((r) => circleRectHit(r.x, r.y, RADII[r.size] - 2, body))) {
      s.lives -= 1;
      s.invuln = 2;
      s.events.push('hit');
      burst(s.sparks, s.cannonX, GROUND - 20, '#f87171', 20, 160);
      if (s.lives <= 0) s.over = true;
    }
  }

  if (!s.toSpawn.length && !s.rocks.length) {
    s.score += 25 * s.level;
    s.clearT = 1.6;
    s.bullets = [];
    s.events.push('levelComplete');
  }
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  gradientBg(ctx, W, H, '#0c4a6e', '#38bdf8');
  // Distant hills.
  ctx.fillStyle = '#0e7490';
  ctx.beginPath();
  ctx.moveTo(0, GROUND);
  for (let x = 0; x <= W; x += 20) ctx.lineTo(x, GROUND - 60 - Math.sin(x / 50) * 25 - Math.sin(x / 23) * 8);
  ctx.lineTo(W, GROUND);
  ctx.fill();
  ctx.fillStyle = '#365314';
  ctx.fillRect(0, GROUND, W, H - GROUND);
  ctx.fillStyle = '#4d7c0f';
  ctx.fillRect(0, GROUND, W, 6);

  ctx.fillStyle = '#fef08a';
  for (const b of s.bullets) fillRound(ctx, b.x - 2.5, b.y - 7, 5, 14, 2.5, '#fef08a');

  for (const r of s.rocks) {
    const rad = RADII[r.size];
    circle(ctx, r.x, r.y, rad, r.flash > 0 ? '#fff' : COLORS[r.size]);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.arc(r.x + rad * 0.25, r.y + rad * 0.25, rad * 0.75, 0, Math.PI * 2);
    ctx.fill();
    circle(ctx, r.x - rad * 0.35, r.y - rad * 0.35, rad * 0.2, 'rgba(255,255,255,0.35)');
    text(ctx, String(r.hp), r.x, r.y + 1, { size: Math.max(11, rad * 0.75) });
  }

  // The cannon, blinking while it recovers from a hit.
  if (s.invuln <= 0 || Math.floor(s.invuln * 10) % 2 === 0) {
    const x = s.cannonX;
    const kick = s.recoil * 3;
    fillRound(ctx, x - 7, GROUND - CANNON_H - 10 + kick, 14, 26, 4, '#1f2937');
    fillRound(ctx, x - CANNON_W / 2, GROUND - CANNON_H + 12, CANNON_W, 16, 6, '#e11d48');
    circle(ctx, x - 12, GROUND - 7, 7, '#111827');
    circle(ctx, x + 12, GROUND - 7, 7, '#111827');
    circle(ctx, x - 12, GROUND - 7, 2.5, '#9ca3af');
    circle(ctx, x + 12, GROUND - 7, 2.5, '#9ca3af');
  }
  drawSparks(ctx, s.sparks);

  text(ctx, String(s.score), 12, 20, { size: 18, align: 'left' });
  text(ctx, `Level ${s.level}`, W / 2, 20, { size: 14, color: '#e0f2fe' });
  for (let i = 0; i < s.lives; i++) text(ctx, '♥', W - 16 - i * 18, 20, { size: 16, color: '#f43f5e' });
  if (s.clearT > 0) text(ctx, `Level ${s.level} clear!`, W / 2, H / 2 - 40, { size: 26, color: '#fef08a' });
}

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create,
  update,
  render,
  hud: (s) => [
    { label: 'Score', value: s.score },
    { label: 'Level', value: s.level },
    { label: 'Lives', value: s.lives },
    { label: 'Power', value: `${damage(s.level)}×` },
  ],
  result: (s) => ({
    score: s.score,
    title: 'Flattened!',
    details: [
      { label: 'Level reached', value: String(s.level) },
      { label: 'Boulders smashed', value: String(s.smashed) },
    ],
  }),
  onEnd: (s) => {
    void reportProgress('cannon-shooter.level-5', s.level);
    void reportProgress('cannon-shooter.level-10', s.level);
    void reportProgress('cannon-shooter.score', s.score);
    void incrementProgress('cannon-shooter.smashed', s.smashed);
  },
  touch: { pad: 'horizontal' },
  pointerStarts: true,
  startHint: 'The cannon fires by itself. Move it with ←/→, A/D, the mouse or your finger.',
};
