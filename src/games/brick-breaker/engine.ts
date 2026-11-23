import type { DifficultySetting } from '@/types';
import { baseState, clamp } from '../_shared/arcade/kit';
import type { BaseState, Input } from '../_shared/arcade/kit';

/**
 * Brick Breaker: keep the ball in play with the paddle and clear all forty
 * bricks with three balls. The ball waits on the paddle until you launch it.
 * Where it meets the paddle sets its angle, and it speeds up as the wall
 * thins out.
 */
export const W = 360;
export const H = 540;
export const COLS = 8;
export const ROWS = 5;
export const BRICK_W = 40;
export const BRICK_H = 18;
export const BRICK_GAP = 4;
export const BRICKS_TOP = 70;
export const BALL_R = 7;
export const PADDLE_Y = H - 46;
export const PADDLE_H = 12;
export const LIVES = 3;
const KEY_SPEED = 480;

export interface Cfg {
  paddleW: number;
  speed: number;
  maxSpeed: number;
}

export const CFG: Record<DifficultySetting, Cfg> = {
  easy: { paddleW: 96, speed: 290, maxSpeed: 470 },
  normal: { paddleW: 80, speed: 330, maxSpeed: 540 },
  hard: { paddleW: 66, speed: 380, maxSpeed: 620 },
};

export interface Brick {
  x: number;
  y: number;
  row: number;
  alive: boolean;
}

export interface State extends BaseState {
  cfg: Cfg;
  paddle: number;
  ball: { x: number; y: number; vx: number; vy: number };
  /** The ball sits on the paddle until launched. */
  held: boolean;
  bricks: Brick[];
  lives: number;
  won: boolean;
  combo: number;
  bestCombo: number;
  lastPointerX: number | null;
  /** Brief flash where a brick broke. */
  pops: { x: number; y: number; t: number; row: number }[];
}

export function layout(): Brick[] {
  const left = (W - (COLS * BRICK_W + (COLS - 1) * BRICK_GAP)) / 2;
  return Array.from({ length: COLS * ROWS }, (_, i) => {
    const row = Math.floor(i / COLS);
    const col = i % COLS;
    return { x: left + col * (BRICK_W + BRICK_GAP), y: BRICKS_TOP + row * (BRICK_H + BRICK_GAP), row, alive: true };
  });
}

export function create(difficulty: DifficultySetting): State {
  const cfg = CFG[difficulty];
  return {
    ...baseState(),
    cfg,
    paddle: W / 2,
    ball: { x: W / 2, y: PADDLE_Y - PADDLE_H / 2 - BALL_R, vx: 0, vy: 0 },
    held: true,
    bricks: layout(),
    lives: LIVES,
    won: false,
    combo: 0,
    bestCombo: 0,
    lastPointerX: null,
    pops: [],
  };
}

export const bricksLeft = (s: State) => s.bricks.filter((b) => b.alive).length;

export function launch(s: State, random: () => number = Math.random) {
  if (!s.held || s.over) return;
  s.held = false;
  const angle = (random() - 0.5) * 0.7;
  s.ball.vx = Math.sin(angle) * s.cfg.speed;
  s.ball.vy = -Math.cos(angle) * s.cfg.speed;
  s.events.push('whoosh');
}

/** Ball speed grows as bricks are cleared. */
function targetSpeed(s: State) {
  const done = 1 - bricksLeft(s) / s.bricks.length;
  return s.cfg.speed + (s.cfg.maxSpeed - s.cfg.speed) * done;
}

function setSpeed(s: State, speed: number) {
  const b = s.ball;
  const v = Math.hypot(b.vx, b.vy) || 1;
  b.vx *= speed / v;
  b.vy *= speed / v;
}

/** Circle against a brick: which side it hit, or null. */
function hitBrick(bx: number, by: number, br: Brick): 'x' | 'y' | null {
  const cx = clamp(bx, br.x, br.x + BRICK_W);
  const cy = clamp(by, br.y, br.y + BRICK_H);
  const dx = bx - cx;
  const dy = by - cy;
  if (dx * dx + dy * dy > BALL_R * BALL_R) return null;
  // Hit the side if it came in from the left or right of the brick.
  const overlapX = Math.min(bx + BALL_R - br.x, br.x + BRICK_W - (bx - BALL_R));
  const overlapY = Math.min(by + BALL_R - br.y, br.y + BRICK_H - (by - BALL_R));
  return overlapX < overlapY ? 'x' : 'y';
}

function step(s: State, h: number) {
  const b = s.ball;
  b.x += b.vx * h;
  b.y += b.vy * h;
  if (b.x < BALL_R) {
    b.x = BALL_R;
    b.vx = Math.abs(b.vx);
    s.events.push('tick');
  } else if (b.x > W - BALL_R) {
    b.x = W - BALL_R;
    b.vx = -Math.abs(b.vx);
    s.events.push('tick');
  }
  if (b.y < BALL_R) {
    b.y = BALL_R;
    b.vy = Math.abs(b.vy);
    s.events.push('tick');
  }
  // Paddle.
  const half = s.cfg.paddleW / 2;
  if (b.vy > 0 && b.y + BALL_R >= PADDLE_Y - PADDLE_H / 2 && b.y - BALL_R <= PADDLE_Y + PADDLE_H / 2 && Math.abs(b.x - s.paddle) <= half + BALL_R) {
    b.y = PADDLE_Y - PADDLE_H / 2 - BALL_R;
    const off = clamp((b.x - s.paddle) / (half + BALL_R), -1, 1);
    const speed = Math.hypot(b.vx, b.vy);
    const angle = off * 1.1;
    b.vx = Math.sin(angle) * speed;
    b.vy = -Math.cos(angle) * speed;
    s.combo = 0;
    s.events.push('blip');
  }
  // Bricks: at most one per step.
  for (const br of s.bricks) {
    if (!br.alive) continue;
    const side = hitBrick(b.x, b.y, br);
    if (!side) continue;
    br.alive = false;
    s.combo++;
    s.bestCombo = Math.max(s.bestCombo, s.combo);
    s.score += 50 + (ROWS - 1 - br.row) * 10 + Math.min(5, s.combo - 1) * 10;
    s.pops.push({ x: br.x + BRICK_W / 2, y: br.y + BRICK_H / 2, t: 0.25, row: br.row });
    if (side === 'x') b.vx = -b.vx;
    else b.vy = -b.vy;
    s.events.push('pop');
    setSpeed(s, targetSpeed(s));
    if (bricksLeft(s) === 0) {
      s.won = true;
      s.over = true;
    }
    break;
  }
  // Lost the ball.
  if (b.y > H + BALL_R) {
    s.lives--;
    s.combo = 0;
    s.events.push('failure');
    if (s.lives <= 0) {
      s.over = true;
      return;
    }
    s.held = true;
  }
}

export function update(s: State, dt: number, input: Input, random: () => number = Math.random) {
  if (s.over) return;
  const dir = (input.held.has('right') ? 1 : 0) - (input.held.has('left') ? 1 : 0);
  const ptr = input.pointer;
  const half = s.cfg.paddleW / 2;
  if (dir) s.paddle = clamp(s.paddle + dir * KEY_SPEED * dt, half, W - half);
  else if (ptr.active && (ptr.down || ptr.type === 'mouse' || ptr.type === undefined) && ptr.x !== s.lastPointerX) {
    s.paddle = clamp(ptr.x, half, W - half);
  }
  if (ptr.active) s.lastPointerX = ptr.x;

  for (const p of s.pops) p.t -= dt;
  s.pops = s.pops.filter((p) => p.t > 0);

  if (s.held) {
    s.ball.x = s.paddle;
    s.ball.y = PADDLE_Y - PADDLE_H / 2 - BALL_R;
    if (input.pressed.has('action') || input.pressed.has('up') || ptr.released) launch(s, random);
    return;
  }
  const b = s.ball;
  const steps = Math.ceil((Math.hypot(b.vx, b.vy) * dt) / 5) || 1;
  for (let i = 0; i < steps && !s.over && !s.held; i++) step(s, dt / steps);
}
