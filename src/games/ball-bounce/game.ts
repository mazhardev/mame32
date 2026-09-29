import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState, clamp } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { burst, circle, drawSparks, fillRound, gradientBg, text, updateSparks } from '../_shared/arcade/draw';
import type { Spark } from '../_shared/arcade/draw';

/**
 * Ball Bounce: the ball never stops bouncing and always rolls forward.
 * Speed up, slow down or slam down mid-air so that every bounce lands on
 * the next platform. Spikes, crumbling ledges and springy pads keep the
 * timing interesting.
 */
export const W = 640;
export const H = 360;
export const BALL_R = 11;
export const GRAVITY = 1500;
export const BOUNCE = 620;
export const SPRING = 1.3;
const ACCEL = 700;
const SLAM = 950;

export type Kind = 'plain' | 'spike' | 'crumble' | 'spring';

export interface Platform {
  x: number;
  y: number;
  w: number;
  kind: Kind;
  /** Spike strip, in platform-local x. */
  spike?: [number, number];
  used: boolean;
  gone: boolean;
}

export interface State extends BaseState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  vmin: number;
  vmax: number;
  platforms: Platform[];
  gems: { x: number; y: number; taken: boolean }[];
  cam: number;
  landed: number;
  gemCount: number;
  squash: number;
  slammed: boolean;
  cause: 'fell' | 'spiked' | null;
  sparks: Spark[];
  genY: number;
  genBounce: number;
  genCount: number;
  difficulty: DifficultySetting;
}

const SPEEDS: Record<DifficultySetting, [number, number, number]> = {
  easy: [110, 190, 300],
  normal: [120, 210, 330],
  hard: [140, 240, 370],
};

/** Time from a bounce at y0 with upward speed v until the ball falls back to y1. */
export function flightTime(v: number, y0: number, y1: number): number {
  const disc = v * v + 2 * GRAVITY * (y1 - y0);
  if (disc < 0) return NaN;
  return (v + Math.sqrt(disc)) / GRAVITY;
}

/** The part of a platform the ball may land on. */
export function safeSpan(p: Platform): [number, number][] {
  if (p.kind !== 'spike' || !p.spike) return [[p.x, p.x + p.w]];
  const spans: [number, number][] = [];
  if (p.spike[0] > 0) spans.push([p.x, p.x + p.spike[0]]);
  if (p.spike[1] < p.w) spans.push([p.x + p.spike[1], p.x + p.w]);
  return spans;
}

/**
 * Adds the next platform. It is placed so that, bouncing from anywhere on
 * the previous platform, some speed within the ball's range reaches it.
 */
export function generate(s: State, random: () => number) {
  const n = s.genCount;
  const prev = s.platforms[s.platforms.length - 1];
  const w = Math.max(56, 130 - n * 1.2) * (0.8 + random() * 0.4);
  const y = clamp(s.genY + (random() * 2 - 1) * 70, 150, 320);
  const t = flightTime(s.genBounce, prev.y, y) || (2 * s.genBounce) / GRAVITY;
  // Aim the gap at a comfortable speed from the middle of the previous platform.
  const speed = s.vmin + (s.vmax - s.vmin) * (0.25 + random() * 0.5);
  const centre = prev.x + prev.w / 2 + speed * t;
  let kind: Kind = 'plain';
  const r = random();
  const hard = Math.min(0.5, n * 0.012);
  if (n > 3 && r < hard * 0.6) kind = 'spike';
  else if (n > 3 && r < hard * 0.9) kind = 'crumble';
  else if (n > 3 && r < hard * 0.9 + 0.08) kind = 'spring';
  const p: Platform = { x: centre - w / 2, y, w, kind, used: false, gone: false };
  if (kind === 'spike') {
    // Spikes cover one side or the middle, always leaving room to land.
    const sw = Math.min(w - 48, 26 + random() * 30);
    const where = random();
    // A middle strip needs a decent landing zone on both sides.
    const middle = where >= 0.66 && w - sw >= 76;
    const start = middle ? (w - sw) / 2 : where < 0.33 ? 0 : w - sw;
    p.spike = [start, start + sw];
  }
  s.platforms.push(p);
  if (random() < 0.35) s.gems.push({ x: (prev.x + prev.w / 2 + centre) / 2, y: Math.min(prev.y, y) - 90 - random() * 40, taken: false });
  s.genY = y;
  s.genBounce = kind === 'spring' ? BOUNCE * SPRING : BOUNCE;
  s.genCount += 1;
}

export function create(difficulty: DifficultySetting, random: () => number): State {
  const [vmin, vstart, vmax] = SPEEDS[difficulty];
  const s: State = {
    ...baseState(),
    x: 100,
    y: 250 - BALL_R,
    vx: vstart,
    vy: -BOUNCE,
    vmin,
    vmax,
    platforms: [{ x: 40, y: 250, w: 160, kind: 'plain', used: true, gone: false }],
    gems: [],
    cam: 0,
    landed: 0,
    gemCount: 0,
    squash: 0,
    slammed: false,
    cause: null,
    sparks: [],
    genY: 250,
    genBounce: BOUNCE,
    genCount: 0,
    difficulty,
  };
  for (let i = 0; i < 6; i++) generate(s, random);
  return s;
}

function control(s: State, input: Input, dt: number) {
  let dir = (input.held.has('right') ? 1 : 0) - (input.held.has('left') ? 1 : 0);
  const p = input.pointer;
  // Holding the pointer on the right third speeds up, on the left third slows down.
  if (p.down && !dir) dir = p.x > (W * 2) / 3 ? 1 : p.x < W / 3 ? -1 : 0;
  const cruise = (s.vmin + s.vmax) / 2;
  const target = dir > 0 ? s.vmax : dir < 0 ? s.vmin : cruise;
  s.vx += clamp(target - s.vx, -ACCEL * dt, ACCEL * dt);
  // Slam: drop straight down onto the platform below.
  const slam = input.pressed.has('action') || input.pressed.has('down') || (p.pressed && p.x >= W / 3 && p.x <= (W * 2) / 3);
  if (slam && !s.slammed && s.vy > -BOUNCE * 0.9) {
    s.vy = Math.max(s.vy, SLAM);
    s.slammed = true;
    s.events.push('whoosh');
  }
}

export function update(s: State, dt: number, input: Input, random: () => number) {
  updateSparks(s.sparks, dt, 500);
  control(s, input, dt);
  s.squash = Math.max(0, s.squash - dt * 5);

  const prevBottom = s.y + BALL_R;
  s.vy += GRAVITY * dt;
  s.x += s.vx * dt;
  s.y += s.vy * dt;
  const bottom = s.y + BALL_R;

  if (s.vy > 0)
    for (const p of s.platforms) {
      if (p.gone || prevBottom > p.y + 1 || bottom < p.y || s.x < p.x - 4 || s.x > p.x + p.w + 4) continue;
      s.y = p.y - BALL_R;
      const local = s.x - p.x;
      if (p.kind === 'spike' && p.spike && local >= p.spike[0] - 3 && local <= p.spike[1] + 3) {
        s.cause = 'spiked';
        s.over = true;
        s.events.push('gameOver');
        burst(s.sparks, s.x, s.y, '#f43f5e', 20, 180);
        return;
      }
      s.vy = -BOUNCE * (p.kind === 'spring' ? SPRING : 1);
      s.slammed = false;
      s.squash = 1;
      if (!p.used) {
        p.used = true;
        s.landed += 1;
        s.score += 1;
        s.events.push(p.kind === 'spring' ? 'powerup' : 'blip');
      }
      if (p.kind === 'crumble') {
        p.gone = true;
        burst(s.sparks, s.x, p.y, '#a16207', 12, 120);
      }
      break;
    }

  for (const g of s.gems)
    if (!g.taken && Math.hypot(g.x - s.x, g.y - s.y) < BALL_R + 10) {
      g.taken = true;
      s.gemCount += 1;
      s.score += 5;
      s.events.push('coin');
      burst(s.sparks, g.x, g.y, '#22d3ee', 10, 120);
    }

  if (s.y > H + 60) {
    s.cause = 'fell';
    s.over = true;
    s.events.push('gameOver');
    return;
  }

  s.cam = s.x - 170;
  while (s.platforms[s.platforms.length - 1].x < s.cam + W * 2) generate(s, random);
  s.platforms = s.platforms.filter((p, i) => p.x + p.w > s.cam - 100 || i === s.platforms.length - 1);
  s.gems = s.gems.filter((g) => g.x > s.cam - 50);
}

/* -------------------------------------------------------------- render */

export function render(ctx: CanvasRenderingContext2D, s: State) {
  gradientBg(ctx, W, H, '#fde68a', '#fbcfe8');
  // Parallax hills.
  for (const [speed, color, base] of [
    [0.2, '#f9a8d4', 250],
    [0.45, '#c4b5fd', 290],
  ] as const) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 16) {
      const wx = x + s.cam * speed;
      ctx.lineTo(x, base - Math.sin(wx / 110) * 30 - Math.sin(wx / 47) * 10);
    }
    ctx.lineTo(W, H);
    ctx.fill();
  }
  ctx.save();
  ctx.translate(-s.cam, 0);
  const colors: Record<Kind, string> = { plain: '#6366f1', spike: '#475569', crumble: '#a16207', spring: '#10b981' };
  for (const p of s.platforms) {
    if (p.gone) continue;
    fillRound(ctx, p.x, p.y, p.w, 14, 7, colors[p.kind]);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(p.x + 6, p.y + 3, p.w - 12, 3);
    if (p.kind === 'crumble') {
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 1.5;
      for (let x = p.x + 14; x < p.x + p.w - 6; x += 18) {
        ctx.beginPath();
        ctx.moveTo(x, p.y + 2);
        ctx.lineTo(x - 4, p.y + 8);
        ctx.lineTo(x + 2, p.y + 13);
        ctx.stroke();
      }
    }
    if (p.kind === 'spring') {
      ctx.strokeStyle = '#064e3b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = p.x + 10; x < p.x + p.w - 10; x += 8) {
        ctx.moveTo(x, p.y - 1);
        ctx.lineTo(x + 4, p.y - 6);
        ctx.lineTo(x + 8, p.y - 1);
      }
      ctx.stroke();
    }
    if (p.kind === 'spike' && p.spike) {
      ctx.fillStyle = '#e11d48';
      for (let x = p.x + p.spike[0]; x < p.x + p.spike[1] - 1; x += 9) {
        ctx.beginPath();
        ctx.moveTo(x, p.y);
        ctx.lineTo(x + 4.5, p.y - 11);
        ctx.lineTo(x + 9, p.y);
        ctx.fill();
      }
    }
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.fillRect(p.x + 8, p.y + 14, p.w - 16, H - p.y);
  }
  for (const g of s.gems) {
    if (g.taken) continue;
    const bob = Math.sin(s.time * 4 + g.x) * 3;
    ctx.fillStyle = '#06b6d4';
    ctx.beginPath();
    ctx.moveTo(g.x, g.y - 9 + bob);
    ctx.lineTo(g.x + 7, g.y + bob);
    ctx.lineTo(g.x, g.y + 9 + bob);
    ctx.lineTo(g.x - 7, g.y + bob);
    ctx.fill();
  }
  if (s.cause !== 'spiked') {
    const sq = s.squash * 0.35;
    ctx.save();
    ctx.translate(s.x, s.y + sq * BALL_R);
    ctx.scale(1 + sq, 1 - sq);
    circle(ctx, 0, 0, BALL_R, s.slammed ? '#dc2626' : '#f97316');
    circle(ctx, -3.5, -4, 3.5, 'rgba(255,255,255,0.6)');
    ctx.restore();
  }
  drawSparks(ctx, s.sparks);
  ctx.restore();
  text(ctx, String(s.score), 16, 22, { size: 20, align: 'left', color: '#1e1b4b' });
  const pct = (s.vx - s.vmin) / (s.vmax - s.vmin);
  fillRound(ctx, W - 116, 14, 100, 10, 5, 'rgba(30,27,75,0.2)');
  fillRound(ctx, W - 116, 14, 12 + 88 * pct, 10, 5, '#4f46e5');
  text(ctx, 'speed', W - 132, 19, { size: 11, align: 'right', color: '#1e1b4b' });
}

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create,
  update,
  render,
  hud: (s) => [
    { label: 'Score', value: s.score },
    { label: 'Platforms', value: s.landed },
    { label: 'Gems', value: s.gemCount },
  ],
  result: (s) => ({
    score: s.score,
    title: s.cause === 'spiked' ? 'Popped on the spikes!' : 'Missed the platform!',
    details: [
      { label: 'Platforms', value: String(s.landed) },
      { label: 'Gems', value: String(s.gemCount) },
    ],
  }),
  onEnd: (s) => {
    void reportProgress('ball-bounce.platforms-25', s.landed);
    void reportProgress('ball-bounce.platforms-100', s.landed);
    void reportProgress('ball-bounce.score', s.score);
    void incrementProgress('ball-bounce.gems', s.gemCount);
  },
  touch: { pad: 'horizontal', buttons: [{ action: 'action', label: 'Slam' }] },
  pointerStarts: false,
  startHint: '→ / D speeds up, ← / A slows down, Space or ↓ slams down. Land every bounce on a platform!',
};
