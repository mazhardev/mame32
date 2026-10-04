import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState, circleRectHit } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { burst, circle, drawSparks, fillRound, gradientBg, text, updateSparks } from '../_shared/arcade/draw';
import type { Spark } from '../_shared/arcade/draw';

/**
 * Jumping Ball: the ball bounces on its own with small hops. Tap to turn the
 * next bounce into a big leap. Low hurdles can be cleared with a well-timed
 * small hop; tall walls need a big leap; floating bars must be passed under,
 * so leaping at the wrong time is just as dangerous as not leaping.
 */
export const W = 480;
export const H = 360;
export const GROUND = 300;
const BALL_X = 110;
const R = 14;
const GRAVITY = 1500;
const SMALL_HOP = 420;
const BIG_LEAP = 720;

type Kind = 'hurdle' | 'wall' | 'bar';
export interface Obstacle {
  kind: Kind;
  x: number;
  w: number;
  y: number;
  h: number;
  passed: boolean;
}

export interface State extends BaseState {
  y: number;
  vy: number;
  /** A tap was queued and the next bounce will be a big leap. */
  charged: boolean;
  speed: number;
  baseSpeed: number;
  obstacles: Obstacle[];
  coins: { x: number; y: number; taken: boolean }[];
  spawnIn: number;
  distance: number;
  cleared: number;
  coinCount: number;
  sparks: Spark[];
}

const SPEED: Record<DifficultySetting, number> = { easy: 200, normal: 250, hard: 300 };

export function create(difficulty: DifficultySetting): State {
  return {
    ...baseState(),
    y: GROUND - R,
    vy: -SMALL_HOP,
    charged: false,
    speed: SPEED[difficulty],
    baseSpeed: SPEED[difficulty],
    obstacles: [],
    coins: [],
    spawnIn: 1.2,
    distance: 0,
    cleared: 0,
    coinCount: 0,
    sparks: [],
  };
}

export function spawn(s: State, random: () => number) {
  const r = random();
  const x = W + 40;
  if (r < 0.45) s.obstacles.push({ kind: 'hurdle', x, w: 22, y: GROUND - 34, h: 34, passed: false });
  else if (r < 0.8) s.obstacles.push({ kind: 'wall', x, w: 26, y: GROUND - 92, h: 92, passed: false });
  else s.obstacles.push({ kind: 'bar', x, w: 90, y: GROUND - 150, h: 18, passed: false });
  if (random() < 0.5) s.coins.push({ x: x + 120, y: GROUND - 60 - random() * 120, taken: false });
}

export function update(s: State, dt: number, input: Input, random: () => number) {
  if (input.pressed.has('action') || input.pressed.has('up') || input.pointer.pressed) s.charged = true;

  s.vy += GRAVITY * dt;
  s.y += s.vy * dt;
  if (s.y >= GROUND - R) {
    s.y = GROUND - R;
    s.vy = -(s.charged ? BIG_LEAP : SMALL_HOP);
    if (s.charged) s.events.push('jump');
    s.charged = false;
  }

  s.speed = s.baseSpeed + Math.min(220, s.time * 4);
  const dx = s.speed * dt;
  s.distance += dx;
  s.spawnIn -= dt;
  if (s.spawnIn <= 0) {
    spawn(s, random);
    s.spawnIn = (0.95 + random() * 0.9) * (s.baseSpeed / s.speed) * 1.4;
  }
  for (const o of s.obstacles) {
    o.x -= dx;
    if (circleRectHit(BALL_X, s.y, R - 2, o)) {
      s.over = true;
      s.events.push('gameOver');
      burst(s.sparks, BALL_X, s.y, '#f97316', 20, 200, random);
      return;
    }
    if (!o.passed && o.x + o.w < BALL_X - R) {
      o.passed = true;
      s.cleared += 1;
      s.score += 10;
    }
  }
  for (const c of s.coins) {
    c.x -= dx;
    if (!c.taken && Math.hypot(c.x - BALL_X, c.y - s.y) < R + 10) {
      c.taken = true;
      s.coinCount += 1;
      s.score += 25;
      s.events.push('coin');
      burst(s.sparks, c.x, c.y, '#facc15', 8, 120, random);
    }
  }
  s.obstacles = s.obstacles.filter((o) => o.x + o.w > -20);
  s.coins = s.coins.filter((c) => c.x > -20 && !c.taken);
  updateSparks(s.sparks, dt, 300);
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  gradientBg(ctx, W, H, '#bae6fd', '#e0f2fe');
  const off = s.distance % 60;
  ctx.fillStyle = '#4ade80';
  ctx.fillRect(0, GROUND, W, H - GROUND);
  ctx.fillStyle = '#16a34a';
  for (let x = -off; x < W; x += 60) ctx.fillRect(x, GROUND, 30, 6);
  for (const o of s.obstacles) {
    const color = o.kind === 'hurdle' ? '#f59e0b' : o.kind === 'wall' ? '#ef4444' : '#7c3aed';
    fillRound(ctx, o.x, o.y, o.w, o.h, 5, color);
  }
  for (const c of s.coins) circle(ctx, c.x, c.y, 9, '#facc15');
  const squash = s.y >= GROUND - R - 2 ? 0.8 : 1;
  ctx.save();
  ctx.translate(BALL_X, s.y + R * (1 - squash));
  ctx.scale(1 / squash, squash);
  circle(ctx, 0, 0, R, s.charged ? '#f97316' : '#2563eb');
  circle(ctx, -4, -5, 4, 'rgba(255,255,255,0.7)');
  ctx.restore();
  drawSparks(ctx, s.sparks);
  text(ctx, String(s.score), W / 2, 30, { size: 24, color: '#0f172a' });
}

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create,
  update,
  render,
  hud: (s) => [
    { label: 'Score', value: s.score },
    { label: 'Cleared', value: s.cleared },
    { label: 'Coins', value: s.coinCount },
  ],
  result: (s) => ({
    score: s.score,
    title: 'Bounced out!',
    details: [
      { label: 'Obstacles cleared', value: String(s.cleared) },
      { label: 'Coins', value: String(s.coinCount) },
    ],
  }),
  onEnd: (s) => {
    void reportProgress('jumping-ball.clear-20', s.cleared);
    void reportProgress('jumping-ball.score-500', s.score);
    void reportProgress('jumping-ball.coins-10', s.coinCount);
    void incrementProgress('jumping-ball.total', s.cleared);
  },
  touch: { pad: 'none' },
  startHint: 'The ball hops by itself. Tap (or Space) to make the next bounce a big leap.',
};
