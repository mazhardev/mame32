import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState, circleHit, clamp } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { burst, circle, drawSparks, gradientBg, text, updateSparks } from '../_shared/arcade/draw';
import type { Spark } from '../_shared/arcade/draw';

/**
 * Avoid Obstacles: steer a small orb around an arena full of bouncing hazards.
 * A new hazard joins every few seconds. Collect the green shields for a few
 * seconds of protection. Survival time is the score.
 */
export const W = 420;
export const H = 420;
const R = 9;
const SPEED = 230;

export interface Hazard {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  /** Seconds before it becomes dangerous (it fades in). */
  warm: number;
}

export interface State extends BaseState {
  x: number;
  y: number;
  hazards: Hazard[];
  nextHazard: number;
  every: number;
  hazardSpeed: number;
  shield: number;
  pickup: { x: number; y: number } | null;
  pickupIn: number;
  shieldsUsed: number;
  sparks: Spark[];
}

const SETTINGS: Record<DifficultySetting, { every: number; speed: number }> = {
  easy: { every: 5, speed: 110 },
  normal: { every: 4, speed: 140 },
  hard: { every: 3, speed: 170 },
};

export function addHazard(s: State, random: () => number) {
  // Spawn away from the player so a new hazard is never unfair.
  let x = 0;
  let y = 0;
  for (let i = 0; i < 20; i++) {
    x = 20 + random() * (W - 40);
    y = 20 + random() * (H - 40);
    if (Math.hypot(x - s.x, y - s.y) > 140) break;
  }
  const a = random() * Math.PI * 2;
  const v = s.hazardSpeed * (0.8 + random() * 0.5);
  s.hazards.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: 10 + random() * 10, warm: 0.8 });
}

export function create(difficulty: DifficultySetting, random: () => number = Math.random): State {
  const c = SETTINGS[difficulty];
  const s: State = {
    ...baseState(),
    x: W / 2,
    y: H / 2,
    hazards: [],
    nextHazard: c.every,
    every: c.every,
    hazardSpeed: c.speed,
    shield: 0,
    pickup: null,
    pickupIn: 8,
    shieldsUsed: 0,
    sparks: [],
  };
  for (let i = 0; i < 3; i++) addHazard(s, random);
  return s;
}

export function update(s: State, dt: number, input: Input, random: () => number) {
  let dx = 0;
  let dy = 0;
  if (input.held.has('left')) dx -= 1;
  if (input.held.has('right')) dx += 1;
  if (input.held.has('up')) dy -= 1;
  if (input.held.has('down')) dy += 1;
  if (dx || dy) {
    const len = Math.hypot(dx, dy);
    s.x += (dx / len) * SPEED * dt;
    s.y += (dy / len) * SPEED * dt;
  } else if (input.pointer.active) {
    // The orb glides towards the pointer, capped at its normal speed.
    const px = input.pointer.x - s.x;
    const py = input.pointer.y - s.y;
    const d = Math.hypot(px, py);
    if (d > 2) {
      const step = Math.min(d, SPEED * 1.3 * dt);
      s.x += (px / d) * step;
      s.y += (py / d) * step;
    }
  }
  s.x = clamp(s.x, R, W - R);
  s.y = clamp(s.y, R, H - R);

  s.nextHazard -= dt;
  if (s.nextHazard <= 0) {
    addHazard(s, random);
    s.nextHazard = s.every;
  }
  s.pickupIn -= dt;
  if (!s.pickup && s.pickupIn <= 0) s.pickup = { x: 30 + random() * (W - 60), y: 30 + random() * (H - 60) };
  if (s.pickup && circleHit(s.x, s.y, R, s.pickup.x, s.pickup.y, 10)) {
    s.pickup = null;
    s.pickupIn = 10 + random() * 6;
    s.shield = 4;
    s.shieldsUsed += 1;
    s.events.push('powerup');
  }
  s.shield = Math.max(0, s.shield - dt);

  for (const h of s.hazards) {
    h.warm = Math.max(0, h.warm - dt);
    h.x += h.vx * dt;
    h.y += h.vy * dt;
    if (h.x < h.r || h.x > W - h.r) {
      h.vx *= -1;
      h.x = clamp(h.x, h.r, W - h.r);
    }
    if (h.y < h.r || h.y > H - h.r) {
      h.vy *= -1;
      h.y = clamp(h.y, h.r, H - h.r);
    }
    if (h.warm === 0 && s.shield === 0 && circleHit(s.x, s.y, R - 1, h.x, h.y, h.r - 1)) {
      s.over = true;
      s.events.push('gameOver');
      burst(s.sparks, s.x, s.y, '#38bdf8', 24, 220, random);
    }
  }
  s.score = Math.floor(s.time * 10);
  updateSparks(s.sparks, dt);
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  gradientBg(ctx, W, H, '#111827', '#1f2937');
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  for (let i = 0; i <= W; i += 30) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, H);
    ctx.moveTo(0, i);
    ctx.lineTo(W, i);
    ctx.stroke();
  }
  if (s.pickup) {
    circle(ctx, s.pickup.x, s.pickup.y, 11, '#22c55e');
    text(ctx, '+', s.pickup.x, s.pickup.y + 1, { size: 16 });
  }
  for (const h of s.hazards) {
    ctx.globalAlpha = h.warm > 0 ? 0.35 : 1;
    circle(ctx, h.x, h.y, h.r, '#f43f5e');
    ctx.globalAlpha = 1;
  }
  if (s.shield > 0) {
    ctx.strokeStyle = s.shield < 1 && Math.floor(s.time * 8) % 2 ? 'transparent' : '#4ade80';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(s.x, s.y, R + 7, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (!s.over) circle(ctx, s.x, s.y, R, '#38bdf8');
  drawSparks(ctx, s.sparks);
  text(ctx, `${s.time.toFixed(1)}s`, W / 2, 26, { size: 20 });
}

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create,
  update,
  render,
  hud: (s) => [
    { label: 'Time', value: `${s.time.toFixed(1)}s` },
    { label: 'Hazards', value: s.hazards.length },
  ],
  result: (s) => ({
    score: s.score,
    title: 'Hit!',
    details: [
      { label: 'Survived', value: `${s.time.toFixed(1)} s` },
      { label: 'Hazards on screen', value: String(s.hazards.length) },
    ],
  }),
  onEnd: (s) => {
    void reportProgress('avoid-obstacles.survive-30', Math.floor(s.time));
    void reportProgress('avoid-obstacles.survive-60', Math.floor(s.time));
    void reportProgress('avoid-obstacles.shields-3', s.shieldsUsed);
    void incrementProgress('avoid-obstacles.total', Math.floor(s.time));
  },
  touch: { pad: 'dpad' },
  startHint: 'Move with the arrow keys or drag the pointer. Avoid the red orbs; green gives a shield.',
};
