import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { circle, gradientBg, starfield, text } from '../_shared/arcade/draw';

/**
 * Missile Defense: enemy missiles streak down towards six cities. Tap a
 * point in the sky to fire an interceptor from the nearest battery with
 * ammunition; its blast destroys any missile inside it. Survive wave after
 * wave — the game ends when every city has fallen.
 */
export const W = 640;
export const H = 420;
export const GROUND = H - 34;
export const BLAST_R = 42;

export interface Missile {
  x0: number;
  y0: number;
  x: number;
  y: number;
  tx: number;
  ty: number;
  speed: number;
  split: boolean;
}

export interface Interceptor {
  x0: number;
  y0: number;
  x: number;
  y: number;
  tx: number;
  ty: number;
}

export interface Blast {
  x: number;
  y: number;
  r: number;
  t: number;
  enemy: boolean;
}

export interface State extends BaseState {
  cities: { x: number; alive: boolean }[];
  batteries: { x: number; ammo: number; alive: boolean }[];
  missiles: Missile[];
  interceptors: Interceptor[];
  blasts: Blast[];
  wave: number;
  toSpawn: number;
  spawnT: number;
  speedBase: number;
  cursor: { x: number; y: number };
  kills: number;
  betweenWaves: number;
  waveBonus: number;
}

const SETTINGS: Record<DifficultySetting, { speed: number }> = {
  easy: { speed: 26 },
  normal: { speed: 34 },
  hard: { speed: 44 },
};

const CITY_X = [110, 170, 230, 410, 470, 530];
const BATTERY_X = [40, 320, 600];

export function create(difficulty: DifficultySetting): State {
  const s: State = {
    ...baseState(),
    cities: CITY_X.map((x) => ({ x, alive: true })),
    batteries: BATTERY_X.map((x) => ({ x, ammo: 10, alive: true })),
    missiles: [],
    interceptors: [],
    blasts: [],
    wave: 1,
    toSpawn: 0,
    spawnT: 1,
    speedBase: SETTINGS[difficulty].speed,
    cursor: { x: W / 2, y: H / 2 },
    kills: 0,
    betweenWaves: 0,
    waveBonus: 0,
  };
  startWave(s);
  return s;
}

function startWave(s: State) {
  s.toSpawn = 8 + s.wave * 3;
  s.spawnT = 1;
  for (const b of s.batteries) {
    b.ammo = 10;
    b.alive = true;
  }
}

/** The battery that fires at x: the nearest one with ammunition left. */
export function pickBattery(s: State, x: number): number {
  let best = -1;
  let bestD = Infinity;
  s.batteries.forEach((b, i) => {
    if (!b.alive || b.ammo <= 0) return;
    const d = Math.abs(b.x - x);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  return best;
}

export function fire(s: State, x: number, y: number): boolean {
  const ty = Math.min(y, GROUND - 30);
  const i = pickBattery(s, x);
  if (i < 0) return false;
  const b = s.batteries[i];
  b.ammo -= 1;
  s.interceptors.push({ x0: b.x, y0: GROUND - 10, x: b.x, y: GROUND - 10, tx: x, ty });
  s.events.push('shoot');
  return true;
}

function launchMissile(s: State, random: () => number, from?: { x: number; y: number }) {
  const targets = [...s.cities.filter((c) => c.alive).map((c) => c.x), ...s.batteries.filter((b) => b.alive).map((b) => b.x)];
  if (!targets.length) return;
  const tx = targets[Math.floor(random() * targets.length)];
  const x0 = from?.x ?? random() * W;
  const y0 = from?.y ?? 0;
  s.missiles.push({
    x0,
    y0,
    x: x0,
    y: y0,
    tx,
    ty: GROUND,
    speed: s.speedBase * (1 + s.wave * 0.12) * (0.8 + random() * 0.4),
    split: !from && s.wave >= 3 && random() < 0.15,
  });
}

export function update(s: State, dt: number, input: Input, random: () => number) {
  // Aim with the pointer, or steer the crosshair with the keys.
  const kx = (input.held.has('right') ? 1 : 0) - (input.held.has('left') ? 1 : 0);
  const ky = (input.held.has('down') ? 1 : 0) - (input.held.has('up') ? 1 : 0);
  s.cursor.x = Math.max(0, Math.min(W, s.cursor.x + kx * 320 * dt));
  s.cursor.y = Math.max(0, Math.min(GROUND - 30, s.cursor.y + ky * 320 * dt));
  if (input.pointer.pressed) {
    s.cursor = { x: input.pointer.x, y: input.pointer.y };
    fire(s, input.pointer.x, input.pointer.y);
  }
  if (input.pressed.has('action')) fire(s, s.cursor.x, s.cursor.y);

  if (s.betweenWaves > 0) {
    s.betweenWaves -= dt;
    if (s.betweenWaves <= 0) {
      s.wave += 1;
      startWave(s);
    }
  } else {
    s.spawnT -= dt;
    if (s.spawnT <= 0 && s.toSpawn > 0) {
      launchMissile(s, random);
      s.toSpawn -= 1;
      s.spawnT = Math.max(0.35, 1.5 - s.wave * 0.1) * (0.6 + random() * 0.8);
    }
  }

  for (const m of s.missiles) {
    const dx = m.tx - m.x0;
    const dy = m.ty - m.y0;
    const len = Math.hypot(dx, dy);
    m.x += (dx / len) * m.speed * dt;
    m.y += (dy / len) * m.speed * dt;
    // Some missiles split into three halfway down.
    if (m.split && m.y > H * 0.35) {
      m.split = false;
      for (let k = 0; k < 2; k++) launchMissile(s, random, { x: m.x, y: m.y });
    }
  }
  const arrived: Interceptor[] = [];
  for (const it of s.interceptors) {
    const dx = it.tx - it.x;
    const dy = it.ty - it.y;
    const left = Math.hypot(dx, dy);
    const step = 480 * dt;
    if (left <= step) {
      it.x = it.tx;
      it.y = it.ty;
      arrived.push(it);
    } else {
      it.x += (dx / left) * step;
      it.y += (dy / left) * step;
    }
  }
  for (const it of arrived) s.blasts.push({ x: it.tx, y: it.ty, r: 0, t: 0, enemy: false });
  s.interceptors = s.interceptors.filter((it) => !arrived.includes(it));

  for (const b of s.blasts) {
    b.t += dt;
    b.r = BLAST_R * Math.sin(Math.min(1, b.t / 1.2) * Math.PI);
  }
  // Missiles caught in a player blast are destroyed (and explode too).
  const destroyed: Missile[] = [];
  for (const m of s.missiles) {
    if (s.blasts.some((b) => !b.enemy && Math.hypot(m.x - b.x, m.y - b.y) < b.r)) destroyed.push(m);
  }
  for (const m of destroyed) {
    s.blasts.push({ x: m.x, y: m.y, r: 0, t: 0, enemy: false });
    s.score += 25;
    s.kills += 1;
    s.events.push('explosion');
  }
  // Missiles that reach the ground destroy what they hit.
  const landed = s.missiles.filter((m) => !destroyed.includes(m) && m.y >= m.ty);
  for (const m of landed) {
    s.blasts.push({ x: m.tx, y: GROUND, r: 0, t: 0, enemy: true });
    const city = s.cities.find((c) => c.alive && Math.abs(c.x - m.tx) < 20);
    if (city) city.alive = false;
    const bat = s.batteries.find((b) => b.alive && Math.abs(b.x - m.tx) < 20);
    if (bat) {
      bat.alive = false;
      bat.ammo = 0;
    }
    s.events.push('hit');
  }
  s.missiles = s.missiles.filter((m) => !destroyed.includes(m) && !landed.includes(m));
  s.blasts = s.blasts.filter((b) => b.t < 1.2);

  if (!s.cities.some((c) => c.alive)) {
    s.over = true;
    s.events.push('gameOver');
    return;
  }
  // Wave cleared: bonus for surviving cities and unused ammunition.
  if (s.betweenWaves <= 0 && s.toSpawn === 0 && s.missiles.length === 0 && s.interceptors.length === 0) {
    const cities = s.cities.filter((c) => c.alive).length;
    const ammo = s.batteries.reduce((a, b) => a + b.ammo, 0);
    s.waveBonus = cities * 100 + ammo * 5;
    s.score += s.waveBonus;
    s.betweenWaves = 2.5;
    s.events.push('levelComplete');
  }
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  gradientBg(ctx, W, H, '#0b1026', '#312e81');
  starfield(ctx, W, GROUND - 60, 0, 60);
  ctx.fillStyle = '#a16207';
  ctx.fillRect(0, GROUND, W, H - GROUND);
  for (const c of s.cities) {
    if (c.alive) {
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(c.x - 16, GROUND - 14, 8, 14);
      ctx.fillRect(c.x - 6, GROUND - 22, 10, 22);
      ctx.fillRect(c.x + 6, GROUND - 16, 10, 16);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(c.x - 3, GROUND - 18, 3, 3);
      ctx.fillRect(c.x + 9, GROUND - 12, 3, 3);
    } else {
      ctx.fillStyle = '#44403c';
      ctx.fillRect(c.x - 16, GROUND - 5, 32, 5);
    }
  }
  for (const b of s.batteries) {
    ctx.fillStyle = b.alive ? '#65a30d' : '#44403c';
    ctx.beginPath();
    ctx.moveTo(b.x - 26, GROUND);
    ctx.lineTo(b.x, GROUND - 22);
    ctx.lineTo(b.x + 26, GROUND);
    ctx.fill();
    if (b.alive) text(ctx, String(b.ammo), b.x, GROUND + 16, { size: 12, color: '#fef3c7' });
  }
  ctx.lineWidth = 1.5;
  for (const m of s.missiles) {
    ctx.strokeStyle = '#f87171';
    ctx.beginPath();
    ctx.moveTo(m.x0, m.y0);
    ctx.lineTo(m.x, m.y);
    ctx.stroke();
    circle(ctx, m.x, m.y, 2.5, '#fff');
  }
  for (const it of s.interceptors) {
    ctx.strokeStyle = '#60a5fa';
    ctx.beginPath();
    ctx.moveTo(it.x0, it.y0);
    ctx.lineTo(it.x, it.y);
    ctx.stroke();
    ctx.strokeStyle = '#93c5fd';
    ctx.beginPath();
    ctx.moveTo(it.tx - 5, it.ty - 5);
    ctx.lineTo(it.tx + 5, it.ty + 5);
    ctx.moveTo(it.tx + 5, it.ty - 5);
    ctx.lineTo(it.tx - 5, it.ty + 5);
    ctx.stroke();
  }
  for (const b of s.blasts) {
    const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, Math.max(1, b.r));
    g.addColorStop(0, '#fff');
    g.addColorStop(0.5, b.enemy ? '#f97316' : '#fde047');
    g.addColorStop(1, 'rgba(239,68,68,0.2)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(b.x, b.y, Math.max(0, b.r), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(s.cursor.x, s.cursor.y, 8, 0, Math.PI * 2);
  ctx.moveTo(s.cursor.x - 13, s.cursor.y);
  ctx.lineTo(s.cursor.x + 13, s.cursor.y);
  ctx.moveTo(s.cursor.x, s.cursor.y - 13);
  ctx.lineTo(s.cursor.x, s.cursor.y + 13);
  ctx.stroke();
  text(ctx, `Wave ${s.wave}`, 14, 18, { size: 14, align: 'left', color: '#c7d2fe' });
  if (s.betweenWaves > 0) text(ctx, `Wave cleared! +${s.waveBonus}`, W / 2, H / 2 - 30, { size: 24, color: '#bbf7d0' });
}

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create,
  update,
  render,
  hud: (s) => [
    { label: 'Score', value: s.score },
    { label: 'Wave', value: s.wave },
    { label: 'Cities', value: s.cities.filter((c) => c.alive).length },
  ],
  result: (s) => ({
    score: s.score,
    title: 'The last city has fallen',
    details: [
      { label: 'Waves survived', value: String(s.wave - 1) },
      { label: 'Missiles destroyed', value: String(s.kills) },
    ],
  }),
  onEnd: (s) => {
    void reportProgress('missile-defense.wave-5', s.wave);
    void reportProgress('missile-defense.wave-10', s.wave);
    void reportProgress('missile-defense.kills', s.kills);
    void incrementProgress('missile-defense.total', s.kills);
  },
  pointerStarts: true,
  touch: { pad: 'none' },
  startHint: 'Tap or click the sky to fire an interceptor. Keyboard: arrows aim, Space fires.',
};
