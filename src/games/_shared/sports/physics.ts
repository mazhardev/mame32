import type { Vec2 } from '@/utils/collision';

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}

/** Launch velocity from an angle (radians, 0 = right, positive = up) and speed. */
export function launchVelocity(angle: number, speed: number): Vec2 {
  return { x: Math.cos(angle) * speed, y: -Math.sin(angle) * speed };
}

/** Semi-implicit Euler step under constant gravity (positive y is down). */
export function integrate(ball: Ball, dt: number, gravity: number): void {
  ball.vy += gravity * dt;
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;
}

/**
 * Bounces a ball off a fixed point (a rim edge, a post). Pushes the ball out of
 * the point and reflects the velocity component along the contact normal.
 * Returns true when a collision happened.
 */
export function bounceOffPoint(ball: Ball, p: Vec2, restitution: number): boolean {
  const dx = ball.x - p.x;
  const dy = ball.y - p.y;
  const distSq = dx * dx + dy * dy;
  if (distSq >= ball.r * ball.r || distSq === 0) return false;
  const dist = Math.sqrt(distSq);
  const nx = dx / dist;
  const ny = dy / dist;
  ball.x = p.x + nx * ball.r;
  ball.y = p.y + ny * ball.r;
  const along = ball.vx * nx + ball.vy * ny;
  if (along < 0) {
    ball.vx -= (1 + restitution) * along * nx;
    ball.vy -= (1 + restitution) * along * ny;
  }
  return true;
}

/**
 * Bounces a ball off a vertical wall segment at `x` spanning [top, bottom].
 * `side` is the side the ball approaches from (-1 = from the left).
 */
export function bounceOffVertical(
  ball: Ball,
  x: number,
  top: number,
  bottom: number,
  side: -1 | 1,
  restitution: number,
): boolean {
  if (ball.y < top || ball.y > bottom) return false;
  if (side === -1 && ball.x + ball.r > x && ball.vx > 0 && ball.x < x) {
    ball.x = x - ball.r;
    ball.vx = -ball.vx * restitution;
    return true;
  }
  if (side === 1 && ball.x - ball.r < x && ball.vx < 0 && ball.x > x) {
    ball.x = x + ball.r;
    ball.vx = -ball.vx * restitution;
    return true;
  }
  return false;
}

/** Bounces a ball off a horizontal floor at `y`, with rolling friction. */
export function bounceOffFloor(
  ball: Ball,
  y: number,
  restitution: number,
  friction = 0.85,
): boolean {
  if (ball.y + ball.r < y || ball.vy <= 0) return false;
  ball.y = y - ball.r;
  ball.vy = -ball.vy * restitution;
  ball.vx *= friction;
  if (Math.abs(ball.vy) < 30) ball.vy = 0;
  return true;
}

/**
 * A meter that sweeps back and forth between 0 and 1. Used for power and aim
 * timing: the player locks it at the right moment.
 */
export class OscillatingMeter {
  value = 0;
  private dir = 1;

  constructor(public speed: number) {}

  update(dt: number): void {
    this.value += this.dir * this.speed * dt;
    if (this.value >= 1) {
      this.value = 2 - this.value;
      this.dir = -1;
    } else if (this.value <= 0) {
      this.value = -this.value;
      this.dir = 1;
    }
  }

  reset(): void {
    this.value = 0;
    this.dir = 1;
  }
}
