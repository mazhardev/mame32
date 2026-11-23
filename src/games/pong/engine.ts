import type { DifficultySetting } from '@/types';
import { baseState, clamp } from '../_shared/arcade/kit';
import type { BaseState, Input } from '../_shared/arcade/kit';

/**
 * Pong, played up and down the screen so it suits a phone held upright: your
 * paddle is at the bottom, the computer's at the top. Where the ball meets the
 * paddle sets its angle, and every return speeds it up a little. First to
 * seven wins.
 */
export const W = 360;
export const H = 540;
export const PADDLE_W = 76;
export const PADDLE_H = 12;
export const BALL_R = 7;
export const PLAYER_Y = H - 44;
export const CPU_Y = 44;
export const TARGET = 7;
const SERVE_T = 0.9;
const START_SPEED = 300;
const MAX_SPEED = 660;
const KEY_SPEED = 460;

export interface Cpu {
  /** Paddle speed (px/s). */
  speed: number;
  /** How far off-centre it aims, at most (px). */
  error: number;
  /** Seconds before it reacts to a return. */
  react: number;
}

export const CPU: Record<DifficultySetting, Cpu> = {
  easy: { speed: 210, error: 34, react: 0.28 },
  normal: { speed: 290, error: 22, react: 0.18 },
  hard: { speed: 380, error: 12, react: 0.1 },
};

export interface State extends BaseState {
  cpu: Cpu;
  player: number;
  opponent: number;
  ball: { x: number; y: number; vx: number; vy: number };
  you: number;
  them: number;
  won: boolean;
  serveT: number;
  /** The computer's aim offset for this rally, and its reaction countdown. */
  aim: number;
  reactT: number;
  lastPointerX: number | null;
  rally: number;
  longestRally: number;
}

function serve(s: State, towardPlayer: boolean, random: () => number) {
  const angle = (random() - 0.5) * 0.9;
  s.ball = {
    x: W / 2,
    y: H / 2,
    vx: Math.sin(angle) * START_SPEED,
    vy: Math.cos(angle) * START_SPEED * (towardPlayer ? 1 : -1),
  };
  s.serveT = SERVE_T;
  s.rally = 0;
}

export function create(difficulty: DifficultySetting, random: () => number = Math.random): State {
  const s: State = {
    ...baseState(),
    cpu: CPU[difficulty],
    player: W / 2,
    opponent: W / 2,
    ball: { x: W / 2, y: H / 2, vx: 0, vy: 0 },
    you: 0,
    them: 0,
    won: false,
    serveT: 0,
    aim: 0,
    reactT: 0,
    lastPointerX: null,
    rally: 0,
    longestRally: 0,
  };
  serve(s, true, random);
  return s;
}

const limit = (x: number) => clamp(x, PADDLE_W / 2, W - PADDLE_W / 2);

/** Bounces the ball off a paddle at x; the further from centre, the steeper. */
function returnBall(s: State, paddleX: number, up: boolean) {
  const b = s.ball;
  const speed = Math.min(MAX_SPEED, Math.hypot(b.vx, b.vy) * 1.05);
  const off = clamp((b.x - paddleX) / (PADDLE_W / 2 + BALL_R), -1, 1);
  const angle = off * 1.05;
  b.vx = Math.sin(angle) * speed;
  b.vy = Math.cos(angle) * speed * (up ? -1 : 1);
  s.rally++;
  s.longestRally = Math.max(s.longestRally, s.rally);
  s.events.push('blip');
}

function point(s: State, forPlayer: boolean, random: () => number) {
  if (forPlayer) {
    s.you++;
    s.score += 100;
    s.events.push('coin');
  } else {
    s.them++;
    s.events.push('failure');
  }
  if (s.you >= TARGET || s.them >= TARGET) {
    s.won = s.you >= TARGET;
    s.over = true;
    return;
  }
  serve(s, !forPlayer, random);
}

export function update(s: State, dt: number, input: Input, random: () => number = Math.random) {
  if (s.over) return;
  // Your paddle: keys, or follow the finger / mouse.
  const dir = (input.held.has('right') ? 1 : 0) - (input.held.has('left') ? 1 : 0);
  const ptr = input.pointer;
  if (dir) s.player = limit(s.player + dir * KEY_SPEED * dt);
  else if (ptr.active && (ptr.down || ptr.type === 'mouse' || ptr.type === undefined) && ptr.x !== s.lastPointerX) {
    s.player = limit(ptr.x);
  }
  if (ptr.active) s.lastPointerX = ptr.x;

  // The computer: waits a moment after each return, then chases where it aims.
  const b = s.ball;
  if (b.vy < 0 && s.serveT <= 0) {
    if (s.reactT > 0) s.reactT -= dt;
    else {
      const target = limit(b.x + s.aim);
      const d = target - s.opponent;
      s.opponent += clamp(d, -s.cpu.speed * dt, s.cpu.speed * dt);
    }
  } else {
    // Drift back towards the middle while the ball is going away.
    const d = W / 2 - s.opponent;
    s.opponent += clamp(d, -s.cpu.speed * 0.4 * dt, s.cpu.speed * 0.4 * dt);
  }

  if (s.serveT > 0) {
    s.serveT -= dt;
    return;
  }

  // Move the ball in small steps so a fast ball never passes through a paddle.
  const steps = Math.ceil((Math.hypot(b.vx, b.vy) * dt) / 6) || 1;
  const h = dt / steps;
  for (let i = 0; i < steps && !s.over && s.serveT <= 0; i++) {
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
    if (b.vy > 0 && b.y + BALL_R >= PLAYER_Y - PADDLE_H / 2 && b.y - BALL_R <= PLAYER_Y + PADDLE_H / 2 && Math.abs(b.x - s.player) <= PADDLE_W / 2 + BALL_R) {
      b.y = PLAYER_Y - PADDLE_H / 2 - BALL_R;
      returnBall(s, s.player, true);
      s.aim = (random() * 2 - 1) * s.cpu.error;
      s.reactT = s.cpu.react;
    } else if (b.vy < 0 && b.y - BALL_R <= CPU_Y + PADDLE_H / 2 && b.y + BALL_R >= CPU_Y - PADDLE_H / 2 && Math.abs(b.x - s.opponent) <= PADDLE_W / 2 + BALL_R) {
      b.y = CPU_Y + PADDLE_H / 2 + BALL_R;
      returnBall(s, s.opponent, false);
    }
    if (b.y > H + BALL_R) point(s, false, random);
    else if (b.y < -BALL_R) point(s, true, random);
  }
}
