import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { burst, circle, drawSparks, gradientBg, text, updateSparks } from '../_shared/arcade/draw';
import type { Spark } from '../_shared/arcade/draw';

/**
 * Keep the Ball Up: tap the ball to kick it into the air. Where you tap
 * matters — hitting the left side sends it right and vice versa. The ball
 * bounces off the side walls; if it touches the ground the round is over.
 */
export const W = 360;
export const H = 560;
export const GROUND = H - 40;
export const R = 30;
const KICK = 780;

export interface State extends BaseState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  spin: number;
  gravity: number;
  wind: number;
  kicks: number;
  sparks: Spark[];
}

const GRAVITY: Record<DifficultySetting, number> = { easy: 900, normal: 1150, hard: 1350 };

export function create(difficulty: DifficultySetting): State {
  return {
    ...baseState(),
    x: W / 2,
    y: GROUND - 160,
    vx: 0,
    vy: -200,
    spin: 0,
    gravity: GRAVITY[difficulty],
    wind: difficulty === 'hard' ? 1 : 0,
    kicks: 0,
    sparks: [],
  };
}

/** A tap within reach of the ball kicks it up and away from the tap. */
export function kick(s: State, px: number, py: number, random: () => number = Math.random): boolean {
  const dx = s.x - px;
  const dy = s.y - py;
  if (dx * dx + dy * dy > (R + 26) * (R + 26)) return false;
  s.vy = -KICK - Math.min(120, s.kicks * 3);
  s.vx = (dx / R) * 260;
  s.spin = s.vx / 40;
  s.kicks += 1;
  s.score = s.kicks;
  s.events.push('hit');
  burst(s.sparks, px, py, '#fde68a', 8, 140, random);
  return true;
}

export function update(s: State, dt: number, input: Input, random: () => number) {
  if (input.pointer.pressed) kick(s, input.pointer.x, input.pointer.y, random);
  // Keyboard players kick with Space when the ball is in the lower half.
  if (input.pressed.has('action') && s.y > H * 0.45) kick(s, s.x + (random() - 0.5) * R, s.y + R * 0.6, random);

  if (s.wind) s.vx += Math.sin(s.time * 0.7) * 60 * dt;
  s.vy += s.gravity * dt;
  s.x += s.vx * dt;
  s.y += s.vy * dt;
  if (s.x < R) {
    s.x = R;
    s.vx = Math.abs(s.vx) * 0.8;
  } else if (s.x > W - R) {
    s.x = W - R;
    s.vx = -Math.abs(s.vx) * 0.8;
  }
  if (s.y < R) {
    s.y = R;
    s.vy = Math.abs(s.vy) * 0.5;
  }
  if (s.y + R >= GROUND) {
    s.y = GROUND - R;
    s.over = true;
    s.events.push('gameOver');
  }
  updateSparks(s.sparks, dt, 400);
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  gradientBg(ctx, W, H, '#7dd3fc', '#e0f2fe');
  ctx.fillStyle = '#22c55e';
  ctx.fillRect(0, GROUND, W, H - GROUND);
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  const shadow = Math.max(0.25, 1 - (GROUND - s.y) / H);
  ctx.beginPath();
  ctx.ellipse(s.x, GROUND + 6, R * shadow, 6 * shadow, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate(s.time * s.spin);
  circle(ctx, 0, 0, R, '#fff');
  ctx.fillStyle = '#111827';
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * R * 0.62, Math.sin(a) * R * 0.62, R * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  circle(ctx, 0, 0, R * 0.24, '#111827');
  ctx.restore();
  drawSparks(ctx, s.sparks);
  text(ctx, String(s.kicks), W / 2, 60, { size: 48, color: '#0c4a6e' });
}

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create,
  update,
  render,
  hud: (s) => [{ label: 'Kicks', value: s.kicks }],
  result: (s) => ({ score: s.kicks, title: 'It hit the ground!', details: [{ label: 'Kicks', value: String(s.kicks) }] }),
  onEnd: (s) => {
    void reportProgress('keep-the-ball-up.kicks-10', s.kicks);
    void reportProgress('keep-the-ball-up.kicks-50', s.kicks);
    void incrementProgress('keep-the-ball-up.total', s.kicks);
  },
  touch: { pad: 'none' },
  pointerStarts: true,
  startHint: 'Tap the ball to kick it up. Tap its left side to send it right, and vice versa.',
};
