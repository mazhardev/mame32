/**
 * Side-view vehicle physics for the hill-driving games. The chassis is a
 * rigid body (position, angle and their velocities) resting on two wheels.
 * Each wheel pushes back on the terrain with a spring-damper along the
 * ground normal and drives along the ground tangent, which is enough for
 * hills, jumps, wheelies and flips without a physics library.
 */
export type Ground = (x: number) => number;

export interface VehicleSpec {
  mass: number;
  inertia: number;
  /** Wheel positions relative to the chassis centre (y down). */
  wheels: [number, number][];
  wheelR: number;
  spring: number;
  damping: number;
  engine: number;
  brake: number;
  /** Mid-air rotation torque from the pedals. */
  airTorque: number;
  /** Point that ends the run if it touches the ground (driver's head / cab roof). */
  head: [number, number];
  maxSpeed: number;
}

export interface Body {
  x: number;
  y: number;
  a: number;
  vx: number;
  vy: number;
  w: number;
  /** Wheel spin for drawing. */
  spin: number;
  grounded: boolean;
  crashed: boolean;
}

export const GRAVITY = 900;

export function makeBody(x: number, ground: Ground, spec: VehicleSpec): Body {
  const lowest = Math.max(...spec.wheels.map((w) => w[1])) + spec.wheelR;
  return { x, y: ground(x) - lowest - 2, a: 0, vx: 0, vy: 0, w: 0, spin: 0, grounded: false, crashed: false };
}

export function worldPoint(b: Body, ox: number, oy: number): [number, number] {
  const c = Math.cos(b.a);
  const s = Math.sin(b.a);
  return [b.x + c * ox - s * oy, b.y + s * ox + c * oy];
}

const slope = (g: Ground, x: number) => (g(x + 1) - g(x - 1)) / 2;

/**
 * Advances the body. `throttle` is -1 (brake / reverse) to 1 (gas).
 * Returns the number of wheels touching the ground.
 */
export function step(b: Body, spec: VehicleSpec, ground: Ground, throttle: number, dt: number): number {
  const sub = 8;
  const h = dt / sub;
  let contacts = 0;
  for (let k = 0; k < sub; k++) {
    let fx = 0;
    let fy = spec.mass * GRAVITY;
    let torque = 0;
    contacts = 0;
    for (const [ox, oy] of spec.wheels) {
      const [px, py] = worldPoint(b, ox, oy);
      const gy = ground(px);
      const pen = py + spec.wheelR - gy;
      if (pen <= 0) continue;
      contacts++;
      const s = slope(ground, px);
      const len = Math.hypot(1, s);
      const nx = s / len;
      const ny = -1 / len;
      const tx = 1 / len;
      const ty = s / len;
      // Velocity of the wheel centre (rigid-body point velocity).
      const rx = px - b.x;
      const ry = py - b.y;
      const vpx = b.vx - b.w * ry;
      const vpy = b.vy + b.w * rx;
      const vn = vpx * nx + vpy * ny;
      const N = Math.max(0, spec.spring * pen - spec.damping * vn);
      const vt = vpx * tx + vpy * ty;
      let drive = 0;
      if (throttle > 0 && vt < spec.maxSpeed) drive = spec.engine * throttle;
      else if (throttle < 0) drive = vt > 20 ? -spec.brake : spec.engine * 0.5 * throttle;
      // Rolling resistance and a grip limit relative to the normal force.
      drive -= vt * spec.mass * 0.4;
      const limit = N * 1.1;
      drive = Math.max(-limit, Math.min(limit, drive));
      const cx = nx * N + tx * drive;
      const cy = ny * N + ty * drive;
      fx += cx;
      fy += cy;
      torque += rx * cy - ry * cx;
    }
    if (contacts === 0) torque += -throttle * spec.airTorque;
    b.vx += (fx / spec.mass) * h;
    b.vy += (fy / spec.mass) * h;
    b.w += (torque / spec.inertia) * h;
    b.w *= 1 - 0.6 * h;
    b.x += b.vx * h;
    b.y += b.vy * h;
    b.a += b.w * h;
  }
  b.grounded = contacts > 0;
  b.spin += (b.vx / spec.wheelR) * dt;
  const [hx, hy] = worldPoint(b, spec.head[0], spec.head[1]);
  if (hy >= ground(hx)) b.crashed = true;
  return contacts;
}

/**
 * Rolling hills that get steeper with distance. Deterministic for a seed so
 * the terrain can be sampled anywhere without storing it.
 */
export function hills(seed: number, roughness = 1): Ground {
  const r = (i: number) => {
    const v = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
    return v - Math.floor(v);
  };
  const waves = [0, 1, 2, 3].map((i) => ({ f: 0.0015 + r(i) * 0.004 * (i + 1), p: r(i + 10) * 6.28, a: 18 + r(i + 20) * 30 }));
  return (x: number) => {
    const grow = Math.min(2.4, 0.4 + Math.max(0, x) / 4000) * roughness;
    let y = 0;
    for (const w of waves) y += Math.sin(x * w.f + w.p) * w.a * grow;
    // A flat run-up at the start.
    const ease = Math.min(1, Math.max(0, (x - 150) / 300));
    return 300 - y * ease;
  };
}

export function drawWheel(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, spin: number) {
  ctx.fillStyle = '#111827';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#9ca3af';
  ctx.beginPath();
  ctx.arc(x, y, r * 0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#4b5563';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + Math.cos(spin) * r * 0.45, y + Math.sin(spin) * r * 0.45);
  ctx.lineTo(x - Math.cos(spin) * r * 0.45, y - Math.sin(spin) * r * 0.45);
  ctx.stroke();
}

/** Fills the terrain between screen x 0 and width, given the camera position. */
export function drawGround(ctx: CanvasRenderingContext2D, ground: Ground, camX: number, camY: number, width: number, height: number, top: string, fill: string) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(0, height);
  for (let sx = 0; sx <= width; sx += 6) ctx.lineTo(sx, ground(camX + sx) - camY);
  ctx.lineTo(width, height);
  ctx.fill();
  ctx.strokeStyle = top;
  ctx.lineWidth = 6;
  ctx.beginPath();
  for (let sx = 0; sx <= width; sx += 6) {
    const y = ground(camX + sx) - camY;
    if (sx === 0) ctx.moveTo(sx, y);
    else ctx.lineTo(sx, y);
  }
  ctx.stroke();
}
