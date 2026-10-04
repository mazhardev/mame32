import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState, clamp } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { circle, fillRound, gradientBg, text } from '../_shared/arcade/draw';

/**
 * Balance Game: keep a pole standing on a cart. The pole is an inverted
 * pendulum — moving the cart accelerates its base, which tips the pole the
 * other way. Random gusts push the pole. If it leans past 60° it falls.
 */
export const W = 440;
export const H = 360;
const TRACK_Y = 290;
const POLE = 150;
export const FALL_ANGLE = Math.PI / 3;

export interface State extends BaseState {
  cartX: number;
  cartV: number;
  /** Pole angle from vertical, radians; positive leans right. */
  angle: number;
  omega: number;
  gust: number;
  gustIn: number;
  gustStrength: number;
  instability: number;
}

const SETTINGS: Record<DifficultySetting, { gust: number; instability: number }> = {
  easy: { gust: 0.7, instability: 5 },
  normal: { gust: 1.1, instability: 7 },
  hard: { gust: 1.6, instability: 9 },
};

export function create(difficulty: DifficultySetting, random: () => number = Math.random): State {
  const c = SETTINGS[difficulty];
  return {
    ...baseState(),
    cartX: W / 2,
    cartV: 0,
    angle: (random() - 0.5) * 0.08,
    omega: 0,
    gust: 0,
    gustIn: 2,
    gustStrength: c.gust,
    instability: c.instability,
  };
}

/**
 * One physics step. Pole: ω' = k·sin θ − (a / L)·cos θ, where a is the cart's
 * acceleration, so pushing the cart under the lean rights the pole.
 */
export function step(s: State, dt: number, accel: number) {
  s.cartV = clamp(s.cartV + accel * dt, -420, 420);
  s.cartV *= 1 - 1.5 * dt;
  s.cartX += s.cartV * dt;
  if (s.cartX < 50 || s.cartX > W - 50) {
    s.cartX = clamp(s.cartX, 50, W - 50);
    s.cartV = 0;
  }
  const alpha = s.instability * Math.sin(s.angle) - (accel / 90) * Math.cos(s.angle) + s.gust;
  s.omega += alpha * dt;
  s.omega *= 1 - 0.4 * dt;
  s.angle += s.omega * dt;
}

export function update(s: State, dt: number, input: Input, random: () => number) {
  let push = 0;
  if (input.held.has('left')) push -= 1;
  if (input.held.has('right')) push += 1;
  if (!push && input.pointer.down) push = input.pointer.x < W / 2 ? -1 : 1;

  s.gustIn -= dt;
  if (s.gustIn <= 0) {
    s.gust = (random() < 0.5 ? -1 : 1) * s.gustStrength * (0.6 + random() * 0.8) * Math.min(2, 1 + s.time / 60);
    s.gustIn = 1.5 + random() * 2.5;
  }
  s.gust *= 1 - 1.8 * dt;

  // Sub-steps keep the pendulum stable at low frame rates.
  const n = 4;
  for (let i = 0; i < n; i++) step(s, dt / n, push * 900);
  s.score = Math.floor(s.time * 10);
  if (Math.abs(s.angle) > FALL_ANGLE) {
    s.over = true;
    s.events.push('gameOver');
  }
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  gradientBg(ctx, W, H, '#fef9c3', '#fde68a');
  ctx.fillStyle = '#a16207';
  ctx.fillRect(30, TRACK_Y + 22, W - 60, 6);
  const tilt = Math.abs(s.angle) / FALL_ANGLE;
  fillRound(ctx, s.cartX - 40, TRACK_Y, 80, 24, 6, '#1d4ed8');
  circle(ctx, s.cartX - 24, TRACK_Y + 26, 8, '#1f2937');
  circle(ctx, s.cartX + 24, TRACK_Y + 26, 8, '#1f2937');
  const tipX = s.cartX + Math.sin(s.angle) * POLE;
  const tipY = TRACK_Y - Math.cos(s.angle) * POLE;
  ctx.strokeStyle = tilt > 0.7 ? '#dc2626' : '#78350f';
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(s.cartX, TRACK_Y);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();
  circle(ctx, tipX, tipY, 14, tilt > 0.7 ? '#ef4444' : '#f59e0b');
  if (Math.abs(s.gust) > 0.3) text(ctx, s.gust > 0 ? '💨 →' : '← 💨', W / 2, 90, { size: 22, color: '#92400e' });
  text(ctx, `${s.time.toFixed(1)}s`, W / 2, 40, { size: 26, color: '#78350f' });
}

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create,
  update,
  render,
  hud: (s) => [
    { label: 'Time', value: `${s.time.toFixed(1)}s` },
    { label: 'Lean', value: `${Math.round((Math.abs(s.angle) * 180) / Math.PI)}°` },
  ],
  result: (s) => ({ score: s.score, title: 'It fell!', details: [{ label: 'Balanced for', value: `${s.time.toFixed(1)} s` }] }),
  onEnd: (s) => {
    void reportProgress('balance-game.survive-20', Math.floor(s.time));
    void reportProgress('balance-game.survive-60', Math.floor(s.time));
    void incrementProgress('balance-game.total', Math.floor(s.time));
  },
  touch: { pad: 'horizontal' },
  startHint: 'Move the cart under the pole to keep it upright: if it leans right, drive right.',
};
