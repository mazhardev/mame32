import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { burst, drawSparks, starfield, text, updateSparks } from '../_shared/arcade/draw';
import type { Spark } from '../_shared/arcade/draw';

/**
 * Lunar Lander: rotate and fire the main engine to set the lander down
 * gently on a flat pad. Narrow pads score more. Fuel carries over between
 * landings; a crash (or a hard, tilted or off-pad landing) ends the game.
 */
export const W = 640;
export const H = 420;

export interface Pad {
  x1: number;
  x2: number;
  y: number;
  bonus: number;
}

export interface State extends BaseState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  fuel: number;
  thrusting: boolean;
  terrain: [number, number][];
  pads: Pad[];
  landings: number;
  landedT: number;
  sparks: Spark[];
  gravity: number;
  message: string;
  perfect: number;
}

const SETTINGS: Record<DifficultySetting, { gravity: number; fuel: number }> = {
  easy: { gravity: 22, fuel: 1400 },
  normal: { gravity: 30, fuel: 1100 },
  hard: { gravity: 38, fuel: 900 },
};

export const THRUST = 72;
export const TURN = 2.6;
export const SAFE = { vy: 40, vx: 28, angle: 0.22 };

export function makeTerrain(random: () => number): { terrain: [number, number][]; pads: Pad[] } {
  const points: [number, number][] = [];
  const pads: Pad[] = [];
  const padCount = 2 + Math.floor(random() * 2);
  // Pick pad positions spread across the width.
  const slots = [0.12, 0.35, 0.58, 0.8].sort(() => random() - 0.5).slice(0, padCount).sort((a, b) => a - b);
  let x = 0;
  let y = H - 60 - random() * 80;
  points.push([0, y]);
  for (const slot of slots) {
    const px = slot * W;
    while (x + 30 < px) {
      x += 20 + random() * 30;
      y = Math.max(H * 0.42, Math.min(H - 20, y + (random() - 0.5) * 70));
      points.push([Math.min(x, px), y]);
    }
    const width = 34 + Math.floor(random() * 3) * 22;
    pads.push({ x1: px, x2: px + width, y, bonus: width < 50 ? 5 : width < 70 ? 3 : 2 });
    points.push([px, y], [px + width, y]);
    x = px + width;
  }
  while (x < W) {
    x += 20 + random() * 30;
    y = Math.max(H * 0.42, Math.min(H - 20, y + (random() - 0.5) * 70));
    points.push([Math.min(x, W), y]);
  }
  return { terrain: points, pads };
}

export function groundY(terrain: [number, number][], x: number): number {
  for (let i = 1; i < terrain.length; i++) {
    const [x1, y1] = terrain[i - 1];
    const [x2, y2] = terrain[i];
    if (x >= x1 && x <= x2) return x2 === x1 ? y1 : y1 + ((y2 - y1) * (x - x1)) / (x2 - x1);
  }
  return H;
}

function reset(s: State, random: () => number) {
  const t = makeTerrain(random);
  s.terrain = t.terrain;
  s.pads = t.pads;
  s.x = 60 + random() * (W - 120);
  s.y = 50;
  s.vx = (random() - 0.5) * 60;
  s.vy = 0;
  s.angle = 0;
}

export function create(difficulty: DifficultySetting, random: () => number = Math.random): State {
  const c = SETTINGS[difficulty];
  const s: State = {
    ...baseState(),
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    angle: 0,
    fuel: c.fuel,
    thrusting: false,
    terrain: [],
    pads: [],
    landings: 0,
    landedT: 0,
    sparks: [],
    gravity: c.gravity,
    message: '',
    perfect: 0,
  };
  reset(s, random);
  return s;
}

/** Decides the outcome of touching the ground at the lander's position. */
export function touchdown(s: State): 'landed' | 'crashed' {
  const pad = s.pads.find((p) => s.x - 10 >= p.x1 && s.x + 10 <= p.x2);
  const soft = Math.abs(s.vy) <= SAFE.vy && Math.abs(s.vx) <= SAFE.vx && Math.abs(s.angle) <= SAFE.angle;
  return pad && soft ? 'landed' : 'crashed';
}

export function update(s: State, dt: number, input: Input, random: () => number) {
  updateSparks(s.sparks, dt, 40);
  if (s.landedT > 0) {
    s.landedT -= dt;
    if (s.landedT <= 0) reset(s, random);
    return;
  }
  if (input.held.has('left')) s.angle -= TURN * dt;
  if (input.held.has('right')) s.angle += TURN * dt;
  s.angle = Math.max(-1.6, Math.min(1.6, s.angle));
  s.thrusting = (input.held.has('up') || input.held.has('action')) && s.fuel > 0;
  if (s.thrusting) {
    s.vx += Math.sin(s.angle) * THRUST * dt;
    s.vy -= Math.cos(s.angle) * THRUST * dt;
    s.fuel = Math.max(0, s.fuel - 60 * dt);
  }
  s.vy += s.gravity * dt;
  s.x += s.vx * dt;
  s.y += s.vy * dt;
  if (s.x < 0) s.x += W;
  if (s.x > W) s.x -= W;
  if (s.y + 12 >= groundY(s.terrain, s.x)) {
    const pad = s.pads.find((p) => s.x - 10 >= p.x1 && s.x + 10 <= p.x2);
    if (touchdown(s) === 'landed' && pad) {
      const gentle = Math.abs(s.vy) < 15;
      const points = 50 * pad.bonus + Math.round(s.fuel / 20) + (gentle ? 50 : 0);
      s.score += points;
      s.landings += 1;
      if (gentle) s.perfect += 1;
      s.fuel = Math.min(s.fuel + 150, 2000);
      s.message = gentle ? `Perfect landing! +${points}` : `Landed ×${pad.bonus}! +${points}`;
      s.landedT = 1.6;
      s.y = pad.y - 12;
      s.vx = 0;
      s.vy = 0;
      s.events.push('levelComplete');
    } else {
      s.over = true;
      s.message = 'Crashed!';
      s.events.push('explosion');
      burst(s.sparks, s.x, s.y, '#fb923c', 30, 180, random);
    }
  }
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  ctx.fillStyle = '#05060f';
  ctx.fillRect(0, 0, W, H);
  starfield(ctx, W, H * 0.7, 0, 80);
  ctx.fillStyle = '#9ca3af';
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (const [x, y] of s.terrain) ctx.lineTo(x, y);
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 2;
  ctx.beginPath();
  s.terrain.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
  for (const p of s.pads) {
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(p.x1, p.y - 2, p.x2 - p.x1, 4);
    text(ctx, `×${p.bonus}`, (p.x1 + p.x2) / 2, p.y + 14, { size: 12, color: '#bbf7d0' });
  }
  if (!s.over) {
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.angle);
    if (s.thrusting) {
      ctx.fillStyle = Math.random() < 0.5 ? '#fde047' : '#fb923c';
      ctx.beginPath();
      ctx.moveTo(-5, 10);
      ctx.lineTo(0, 22 + Math.random() * 10);
      ctx.lineTo(5, 10);
      ctx.fill();
    }
    ctx.fillStyle = '#e5e7eb';
    ctx.beginPath();
    ctx.arc(0, -3, 9, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(-10, -3, 20, 9);
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-8, 6);
    ctx.lineTo(-13, 12);
    ctx.moveTo(8, 6);
    ctx.lineTo(13, 12);
    ctx.stroke();
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-3, -8, 6, 5);
    ctx.restore();
  }
  drawSparks(ctx, s.sparks);
  // Instruments: green when within the safe landing limits.
  const ok = (v: boolean) => (v ? '#4ade80' : '#f87171');
  text(ctx, `H-speed ${Math.round(s.vx)}`, 14, 18, { size: 13, align: 'left', color: ok(Math.abs(s.vx) <= SAFE.vx) });
  text(ctx, `V-speed ${Math.round(s.vy)}`, 14, 36, { size: 13, align: 'left', color: ok(Math.abs(s.vy) <= SAFE.vy) });
  text(ctx, `Tilt ${Math.round((s.angle * 180) / Math.PI)}°`, 14, 54, { size: 13, align: 'left', color: ok(Math.abs(s.angle) <= SAFE.angle) });
  ctx.fillStyle = '#374151';
  ctx.fillRect(W - 130, 12, 110, 10);
  ctx.fillStyle = s.fuel < 200 ? '#ef4444' : '#38bdf8';
  ctx.fillRect(W - 130, 12, Math.min(110, (s.fuel / 1400) * 110), 10);
  text(ctx, 'Fuel', W - 140, 17, { size: 12, align: 'right', color: '#cbd5e1' });
  if (s.landedT > 0 || s.over) text(ctx, s.message, W / 2, 110, { size: 24, color: s.over ? '#fca5a5' : '#bbf7d0' });
}

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create,
  update,
  render,
  hud: (s) => [
    { label: 'Score', value: s.score },
    { label: 'Landings', value: s.landings },
    { label: 'Fuel', value: Math.round(s.fuel) },
  ],
  result: (s) => ({
    score: s.score,
    title: 'Mission over',
    details: [
      { label: 'Safe landings', value: String(s.landings) },
      { label: 'Perfect landings', value: String(s.perfect) },
    ],
  }),
  onEnd: (s) => {
    void reportProgress('lunar-lander.first', s.landings >= 1 ? 1 : 0);
    void reportProgress('lunar-lander.five', s.landings);
    void reportProgress('lunar-lander.perfect', s.perfect);
    void incrementProgress('lunar-lander.total', s.landings);
  },
  touch: { pad: 'horizontal', buttons: [{ action: 'action', label: 'Thrust' }] },
  startHint: '← → rotate, ↑ or Space fires the engine. Land slowly and level on a green pad.',
};
