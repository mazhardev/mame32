import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState, circleHit } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { burst, circle, drawSparks, fillRound, gradientBg, text, updateSparks } from '../_shared/arcade/draw';
import type { Spark } from '../_shared/arcade/draw';

/**
 * Jetpack Runner: hold to fire the jetpack and rise, let go to fall. Fly
 * down an endless lab corridor past electric zappers and homing rockets
 * (announced by a warning sign), collecting coins on the way.
 */
export const W = 640;
export const H = 360;
const FLOOR = H - 30;
const CEIL = 30;
const PX = 140;
const PR = 16;

export interface Zapper {
  x: number;
  y: number;
  len: number;
  angle: number;
  spin: number;
}

export interface Rocket {
  x: number;
  y: number;
  warn: number;
}

export interface Coin {
  x: number;
  y: number;
  taken: boolean;
}

export interface State extends BaseState {
  y: number;
  vy: number;
  thrusting: boolean;
  speed: number;
  accel: number;
  maxSpeed: number;
  distance: number;
  zappers: Zapper[];
  rockets: Rocket[];
  coins: Coin[];
  coinCount: number;
  nextObstacle: number;
  nextRocket: number;
  rocketRate: number;
  sparks: Spark[];
  flame: number;
}

const SETTINGS: Record<DifficultySetting, { speed: number; accel: number; max: number; rocket: number }> = {
  easy: { speed: 230, accel: 4, max: 420, rocket: 9 },
  normal: { speed: 270, accel: 6, max: 520, rocket: 6 },
  hard: { speed: 310, accel: 9, max: 620, rocket: 4 },
};

export const GRAVITY = 1650;
export const THRUST = 3200;

export function create(difficulty: DifficultySetting): State {
  const c = SETTINGS[difficulty];
  return {
    ...baseState(),
    y: FLOOR - PR,
    vy: 0,
    thrusting: false,
    speed: c.speed,
    accel: c.accel,
    maxSpeed: c.max,
    distance: 0,
    zappers: [],
    rockets: [],
    coins: [],
    coinCount: 0,
    nextObstacle: 1.4,
    nextRocket: c.rocket,
    rocketRate: c.rocket,
    sparks: [],
    flame: 0,
  };
}

/** Distance from point (px, py) to the zapper's segment. */
export function zapperDistance(z: Zapper, px: number, py: number): number {
  const dx = (Math.cos(z.angle) * z.len) / 2;
  const dy = (Math.sin(z.angle) * z.len) / 2;
  const ax = z.x - dx;
  const ay = z.y - dy;
  const bx = z.x + dx;
  const by = z.y + dy;
  const t = Math.max(0, Math.min(1, ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2)));
  return Math.hypot(px - (ax + t * (bx - ax)), py - (ay + t * (by - ay)));
}

function spawnObstacle(s: State, random: () => number) {
  if (random() < 0.7) {
    const len = 80 + random() * 90;
    const angle = [0, Math.PI / 2, Math.PI / 4, -Math.PI / 4][Math.floor(random() * 4)];
    const margin = len / 2 + 10;
    const y = CEIL + margin + random() * (FLOOR - CEIL - margin * 2);
    s.zappers.push({ x: W + 80, y, len, angle, spin: s.distance > 4000 && random() < 0.3 ? (random() < 0.5 ? -1.4 : 1.4) : 0 });
  } else {
    // A coin ribbon.
    const y0 = CEIL + 50 + random() * (FLOOR - CEIL - 100);
    const wave = random() < 0.5;
    for (let i = 0; i < 10; i++) s.coins.push({ x: W + 40 + i * 26, y: y0 + (wave ? Math.sin(i / 1.6) * 30 : 0), taken: false });
  }
  s.nextObstacle = (0.8 + random() * 0.8) * (300 / s.speed) + 0.45;
}

export function update(s: State, dt: number, input: Input, random: () => number) {
  s.thrusting = input.held.has('action') || input.held.has('up') || input.pointer.down;
  s.vy += (s.thrusting ? -THRUST + GRAVITY : GRAVITY) * dt;
  s.vy = Math.max(-440, Math.min(650, s.vy));
  s.y += s.vy * dt;
  if (s.y > FLOOR - PR) {
    s.y = FLOOR - PR;
    s.vy = 0;
  }
  if (s.y < CEIL + PR) {
    s.y = CEIL + PR;
    s.vy = Math.max(0, s.vy);
  }
  s.flame = s.thrusting ? (s.flame + dt * 30) % 6 : 0;

  s.speed = Math.min(s.maxSpeed, s.speed + s.accel * dt);
  const dx = s.speed * dt;
  s.distance += dx;
  for (const z of s.zappers) {
    z.x -= dx;
    z.angle += z.spin * dt;
  }
  for (const c of s.coins) c.x -= dx;
  s.nextObstacle -= dt;
  if (s.nextObstacle <= 0) spawnObstacle(s, random);

  // Rockets: a warning tracks your height, then the rocket flies straight.
  s.nextRocket -= dt;
  if (s.nextRocket <= 0) {
    s.rockets.push({ x: W + 40, y: s.y, warn: 1.1 });
    s.nextRocket = s.rocketRate * (0.6 + random() * 0.8) * (s.distance > 6000 ? 0.7 : 1);
  }
  for (const r of s.rockets) {
    if (r.warn > 0) {
      r.warn -= dt;
      r.y += (s.y - r.y) * Math.min(1, dt * 4);
      if (r.warn <= 0) s.events.push('whoosh');
    } else r.x -= (s.speed + 360) * dt;
  }

  for (const z of s.zappers) {
    if (zapperDistance(z, PX, s.y) < PR + 5) crash(s, random);
  }
  for (const r of s.rockets) {
    if (r.warn <= 0 && circleHit(PX, s.y, PR, r.x, r.y, 10)) crash(s, random);
  }
  for (const c of s.coins) {
    if (!c.taken && circleHit(PX, s.y, PR + 4, c.x, c.y, 8)) {
      c.taken = true;
      s.coinCount += 1;
      s.events.push('coin');
    }
  }
  s.zappers = s.zappers.filter((z) => z.x > -120);
  s.rockets = s.rockets.filter((r) => r.x > -40);
  s.coins = s.coins.filter((c) => c.x > -20 && !c.taken);
  updateSparks(s.sparks, dt, 400);
  s.score = Math.floor(s.distance / 25) + s.coinCount * 5;
}

function crash(s: State, random: () => number) {
  if (s.over) return;
  s.over = true;
  s.events.push('explosion');
  burst(s.sparks, PX, s.y, '#fb923c', 20, 240, random);
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  gradientBg(ctx, W, H, '#1f2937', '#111827');
  // Lab wall panels scroll past.
  ctx.strokeStyle = 'rgba(148,163,184,0.12)';
  ctx.lineWidth = 2;
  for (let x = -((s.distance * 0.5) % 120); x < W; x += 120) {
    ctx.strokeRect(x + 10, CEIL + 20, 100, FLOOR - CEIL - 40);
  }
  ctx.fillStyle = '#374151';
  ctx.fillRect(0, 0, W, CEIL);
  ctx.fillRect(0, FLOOR, W, H - FLOOR);
  ctx.fillStyle = '#fbbf24';
  for (let x = -((s.distance) % 40); x < W; x += 40) ctx.fillRect(x, FLOOR, 20, 4);

  for (const c of s.coins) circle(ctx, c.x, c.y, 7, '#facc15');
  for (const z of s.zappers) {
    const dx = (Math.cos(z.angle) * z.len) / 2;
    const dy = (Math.sin(z.angle) * z.len) / 2;
    ctx.strokeStyle = `rgba(125,211,252,${0.55 + Math.sin(s.time * 30) * 0.3})`;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(z.x - dx, z.y - dy);
    ctx.lineTo(z.x + dx, z.y + dy);
    ctx.stroke();
    ctx.strokeStyle = '#e0f2fe';
    ctx.lineWidth = 2;
    ctx.stroke();
    circle(ctx, z.x - dx, z.y - dy, 9, '#475569');
    circle(ctx, z.x + dx, z.y + dy, 9, '#475569');
  }
  for (const r of s.rockets) {
    if (r.warn > 0) {
      if (Math.floor(r.warn * 8) % 2) {
        circle(ctx, W - 26, r.y, 14, '#ef4444');
        text(ctx, '!', W - 26, r.y + 1, { size: 18 });
      }
    } else {
      fillRound(ctx, r.x - 16, r.y - 6, 32, 12, 6, '#e5e7eb');
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(r.x - 16, r.y - 6, 8, 12);
      circle(ctx, r.x + 20, r.y, 5 + Math.random() * 3, '#fb923c');
    }
  }
  // Pilot with jetpack.
  if (!s.over) {
    fillRound(ctx, PX - 20, s.y - 12, 10, 22, 4, '#9ca3af');
    if (s.thrusting) {
      ctx.fillStyle = ['#fde047', '#fb923c', '#f97316'][Math.floor(s.flame) % 3];
      ctx.beginPath();
      ctx.moveTo(PX - 20, s.y + 10);
      ctx.lineTo(PX - 15, s.y + 24 + (s.flame % 3) * 3);
      ctx.lineTo(PX - 10, s.y + 10);
      ctx.fill();
    }
    fillRound(ctx, PX - 11, s.y - 12, 22, 26, 8, '#22c55e');
    circle(ctx, PX, s.y - 16, 9, '#fcd34d');
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(PX + 1, s.y - 19, 7, 4);
  }
  drawSparks(ctx, s.sparks);
  text(ctx, `${Math.round(s.distance / 25)} m`, W - 16, 18, { size: 16, align: 'right', color: '#e5e7eb' });
  text(ctx, `🪙 ${s.coinCount}`, 16, 18, { size: 15, align: 'left', color: '#e5e7eb' });
}

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create,
  update,
  render,
  hud: (s) => [
    { label: 'Score', value: s.score },
    { label: 'Distance', value: `${Math.round(s.distance / 25)} m` },
    { label: 'Coins', value: s.coinCount },
  ],
  result: (s) => ({
    score: s.score,
    title: 'Zapped!',
    details: [
      { label: 'Distance', value: `${Math.round(s.distance / 25)} m` },
      { label: 'Coins', value: String(s.coinCount) },
    ],
  }),
  onEnd: (s) => {
    void reportProgress('jetpack-runner.distance', Math.round(s.distance / 25));
    void reportProgress('jetpack-runner.far', Math.round(s.distance / 25));
    void reportProgress('jetpack-runner.coins', s.coinCount);
    void incrementProgress('jetpack-runner.flights');
  },
  touch: { pad: 'none', buttons: [{ action: 'action', label: 'Fly' }] },
  startHint: 'Hold Space, click or touch to fire the jetpack. Let go to drop.',
};
