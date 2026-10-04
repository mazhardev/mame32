/**
 * Arcade top-down car physics. Velocity is split into the part along the
 * car's heading and the part sideways to it; grip bleeds away the sideways
 * part, so low grip means drifting. Steering scales with speed and reverses
 * when going backwards, like a real car.
 */
export interface Car {
  x: number;
  y: number;
  angle: number;
  vx: number;
  vy: number;
  /** Visual and collision radius. */
  r: number;
  color: string;
}

export interface CarParams {
  accel: number;
  brake: number;
  maxSpeed: number;
  reverseSpeed: number;
  /** Sideways velocity removed per second (0–∞); lower = slidier. */
  grip: number;
  /** Radians per second at full lock and full speed. */
  turn: number;
  drag: number;
}

export interface Controls {
  /** -1 (brake / reverse) to 1 (full throttle). */
  throttle: number;
  /** -1 left to 1 right. */
  steer: number;
  handbrake?: boolean;
}

export const CAR: CarParams = { accel: 260, brake: 420, maxSpeed: 330, reverseSpeed: 90, grip: 8, turn: 2.8, drag: 0.35 };

export function makeCar(x: number, y: number, angle: number, color: string, r = 11): Car {
  return { x, y, angle, vx: 0, vy: 0, r, color };
}

export const speedOf = (c: Car) => Math.hypot(c.vx, c.vy);

export function forwardSpeed(c: Car): number {
  return c.vx * Math.cos(c.angle) + c.vy * Math.sin(c.angle);
}

/** Angle between where the car points and where it is going. */
export function slipAngle(c: Car): number {
  const v = speedOf(c);
  if (v < 30) return 0;
  const a = Math.atan2(c.vy, c.vx);
  return Math.atan2(Math.sin(a - c.angle), Math.cos(a - c.angle));
}

export function drive(c: Car, ctl: Controls, p: CarParams, dt: number, surface = 1) {
  const fx = Math.cos(c.angle);
  const fy = Math.sin(c.angle);
  const rx = -fy;
  const ry = fx;
  let vf = c.vx * fx + c.vy * fy;
  let vr = c.vx * rx + c.vy * ry;
  if (ctl.throttle > 0) vf += ctl.throttle * p.accel * surface * dt;
  else if (ctl.throttle < 0) vf += (vf > 5 ? p.brake : p.accel * 0.6) * ctl.throttle * dt;
  const top = p.maxSpeed * (surface < 1 ? 0.45 + surface * 0.4 : 1);
  vf = Math.max(-p.reverseSpeed, Math.min(top + Math.max(0, vf - top) * 0.9, vf));
  if (vf > top) vf -= (vf - top) * Math.min(1, 3 * dt);
  vf *= 1 - p.drag * dt * (surface < 1 ? 3 : 1);
  const grip = p.grip * (ctl.handbrake ? 0.12 : 1) * (surface < 1 ? 0.7 : 1);
  vr *= Math.max(0, 1 - grip * dt);
  // Steering authority grows with speed up to a point.
  const authority = Math.max(-1, Math.min(1, vf / 110));
  c.angle += ctl.steer * p.turn * authority * dt * (ctl.handbrake ? 1.35 : 1);
  c.vx = fx * vf + rx * vr;
  c.vy = fy * vf + ry * vr;
  c.x += c.vx * dt;
  c.y += c.vy * dt;
}

/** Elastic-ish bump between two cars that overlap. */
export function bump(a: Car, b: Car) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.hypot(dx, dy);
  const min = a.r + b.r;
  if (d === 0 || d >= min) return false;
  const nx = dx / d;
  const ny = dy / d;
  const push = (min - d) / 2;
  a.x -= nx * push;
  a.y -= ny * push;
  b.x += nx * push;
  b.y += ny * push;
  const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  if (rel < 0) {
    const j = -rel * 0.6;
    a.vx -= nx * j;
    a.vy -= ny * j;
    b.vx += nx * j;
    b.vy += ny * j;
  }
  return true;
}

export function drawCar(ctx: CanvasRenderingContext2D, c: Car, opts: { length?: number; width?: number; outline?: string } = {}) {
  const L = opts.length ?? c.r * 2.1;
  const Wd = opts.width ?? c.r * 1.15;
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(c.angle);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(-L / 2 + 2, -Wd / 2 + 2, L, Wd);
  ctx.fillStyle = c.color;
  ctx.beginPath();
  ctx.roundRect?.(-L / 2, -Wd / 2, L, Wd, 4);
  if (!ctx.roundRect) ctx.rect(-L / 2, -Wd / 2, L, Wd);
  ctx.fill();
  if (opts.outline) {
    ctx.strokeStyle = opts.outline;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(15,23,42,0.75)';
  ctx.fillRect(L * 0.02, -Wd / 2 + 2, L * 0.22, Wd - 4);
  ctx.fillStyle = '#fef9c3';
  ctx.fillRect(L / 2 - 3, -Wd / 2 + 1, 3, 3);
  ctx.fillRect(L / 2 - 3, Wd / 2 - 4, 3, 3);
  ctx.restore();
}
