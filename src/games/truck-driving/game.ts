import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { burst, drawSparks, fillRound, gradientBg, text, updateSparks } from '../_shared/arcade/draw';
import type { Spark } from '../_shared/arcade/draw';
import { GRAVITY, drawGround, drawWheel, hills, makeBody, step, worldPoint } from '../_shared/hill/vehicle';
import type { Body, Ground, VehicleSpec } from '../_shared/hill/vehicle';

/**
 * Truck Driving: deliver a load of crates over hilly roads. The crates sit
 * loose on the flatbed: they slide when the truck tilts, brakes hard or
 * lands from a bump, and anything that slides off the end is lost. Reach the
 * depot flag with at least one crate before the clock runs out.
 */
export const W = 600;
export const H = 380;
export const BED_FROM = -46;
export const BED_TO = 14;

export const TRUCK: VehicleSpec = {
  mass: 1,
  inertia: 1200,
  wheels: [
    [-38, 18],
    [-6, 18],
    [40, 18],
  ],
  wheelR: 13,
  spring: 1000,
  damping: 50,
  engine: 520,
  brake: 760,
  airTorque: 1200,
  head: [36, -30],
  maxSpeed: 300,
};

export interface Crate {
  /** Position along the bed (chassis x), and its sliding speed. */
  u: number;
  v: number;
  lost: boolean;
  color: string;
}

export interface State extends BaseState {
  level: number;
  ground: Ground;
  truck: Body;
  crates: Crate[];
  routeEnd: number;
  timeLeft: number;
  delivered: number;
  lastVy: number;
  lastVx: number;
  /** Low-pass filtered acceleration, so single-frame bumps do not fling crates. */
  accel: number;
  between: number;
  camY: number;
  roughness: number;
  sparks: Spark[];
}

const ROUGH: Record<DifficultySetting, number> = { easy: 0.6, normal: 0.8, hard: 1 };
const COLORS = ['#b45309', '#a16207', '#92400e', '#c2410c'];

export function startLevel(s: State, random: () => number) {
  s.ground = hills(Math.floor(random() * 1000) + s.level * 31, s.roughness * Math.min(1.3, 0.55 + s.level * 0.12));
  s.truck = makeBody(80, s.ground, TRUCK);
  const n = Math.min(4, 2 + Math.floor(s.level / 2));
  s.crates = Array.from({ length: n }, (_, i) => ({ u: BED_FROM + 8 + i * ((BED_TO - BED_FROM - 16) / Math.max(1, n - 1)), v: 0, lost: false, color: COLORS[i % COLORS.length] }));
  s.routeEnd = 80 + 2500 + s.level * 800;
  s.timeLeft = 45 + s.level * 12;
  s.lastVy = 0;
  s.lastVx = 0;
  s.accel = 0;
  s.camY = s.truck.y - H / 2;
}

export function create(difficulty: DifficultySetting, random: () => number = Math.random): State {
  const s = { ...baseState(), level: 1, crates: [], delivered: 0, between: 0, roughness: ROUGH[difficulty], sparks: [] } as unknown as State;
  startLevel(s, random);
  return s;
}

/**
 * Crate sliding with simple friction. Along the bed a crate feels gravity
 * (from the tilt) and the truck's acceleration (inertia pushes it the other
 * way). It stays put until that push beats static friction, then slides
 * against kinetic friction. A hard landing adds a jolt.
 */
const MU_STATIC = 0.65;
const MU_KINETIC = 0.45;

export function slideCrates(s: State, dt: number, accelAlong: number, jolt: number) {
  const normal = GRAVITY * Math.max(0.2, Math.cos(s.truck.a));
  for (const c of s.crates) {
    if (c.lost) continue;
    const push = GRAVITY * Math.sin(s.truck.a) - accelAlong + jolt * (c.u > (BED_FROM + BED_TO) / 2 ? 1 : -1);
    if (c.v === 0) {
      if (Math.abs(push) <= MU_STATIC * normal) continue;
      c.v = Math.sign(push) * 1;
    }
    const before = c.v;
    c.v += (push - Math.sign(c.v) * MU_KINETIC * normal) * dt;
    // Friction stops it rather than pushing it back the other way.
    if (Math.sign(c.v) !== Math.sign(before) && Math.abs(push) <= MU_STATIC * normal) c.v = 0;
    c.u += c.v * dt;
    if (c.u < BED_FROM - 6 || c.u > BED_TO + 6) {
      c.lost = true;
      s.events.push('failure');
    }
  }
  const order = s.crates.filter((c) => !c.lost).sort((a, b) => a.u - b.u);
  for (let i = 1; i < order.length; i++) {
    if (order[i].u - order[i - 1].u < 14) {
      const mid = (order[i].u + order[i - 1].u) / 2;
      order[i - 1].u = mid - 7;
      order[i].u = mid + 7;
      const v = (order[i].v + order[i - 1].v) / 2;
      order[i].v = order[i - 1].v = v;
    }
  }
}

export const cratesLeft = (s: State) => s.crates.filter((c) => !c.lost).length;

export function update(s: State, dt: number, input: Input, random: () => number) {
  if (s.between > 0) {
    s.between -= dt;
    if (s.between <= 0) {
      s.level += 1;
      startLevel(s, random);
    }
    return;
  }
  const gas = input.held.has('right') || input.held.has('up') || (input.pointer.down && input.pointer.x > W / 2);
  const brake = input.held.has('left') || input.held.has('down') || (input.pointer.down && input.pointer.x <= W / 2);
  const t = s.truck;
  step(t, TRUCK, s.ground, gas ? 1 : brake ? -1 : 0, dt);
  s.accel += (((t.vx - s.lastVx) / dt) * Math.cos(t.a) - s.accel) * Math.min(1, dt * 8);
  const jolt = t.vy - s.lastVy < -320 && t.grounded ? 700 : 0;
  s.lastVx = t.vx;
  s.lastVy = t.vy;
  slideCrates(s, dt, s.accel, jolt);
  s.timeLeft -= dt;
  s.camY += (t.y - H * 0.55 - s.camY) * Math.min(1, dt * 3);
  if (t.x >= s.routeEnd && cratesLeft(s) > 0) {
    const left = cratesLeft(s);
    s.delivered += left;
    s.score += left * 500 + Math.round(s.timeLeft) * 10 + s.level * 100;
    s.between = 2;
    s.events.push('levelComplete');
    return;
  }
  if (t.crashed || cratesLeft(s) === 0 || s.timeLeft <= 0) {
    s.over = true;
    s.events.push(t.crashed ? 'explosion' : 'gameOver');
    if (t.crashed) {
      const [hx, hy] = worldPoint(t, TRUCK.head[0], TRUCK.head[1]);
      burst(s.sparks, hx, hy, '#f97316', 24, 200, random);
    }
  }
  updateSparks(s.sparks, dt, 400);
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  gradientBg(ctx, W, H, '#bae6fd', '#fef9c3');
  const t = s.truck;
  const camX = t.x - W * 0.35;
  drawGround(ctx, s.ground, camX, s.camY, W, H, '#4d7c0f', '#78716c');
  // Depot flag.
  const fx = s.routeEnd - camX;
  if (fx > -40 && fx < W + 40) {
    const fy = s.ground(s.routeEnd) - s.camY;
    ctx.fillStyle = '#334155';
    ctx.fillRect(fx, fy - 70, 4, 70);
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(fx + 4, fy - 70, 34, 22);
    text(ctx, 'DEPOT', fx + 21, fy - 59, { size: 9 });
  }
  ctx.save();
  ctx.translate(-camX, -s.camY);
  for (const [ox, oy] of TRUCK.wheels) {
    const [wx, wy] = worldPoint(t, ox, oy);
    drawWheel(ctx, wx, wy, TRUCK.wheelR, t.spin);
  }
  ctx.save();
  ctx.translate(t.x, t.y);
  ctx.rotate(t.a);
  fillRound(ctx, -54, -2, 112, 16, 3, '#334155');
  fillRound(ctx, 20, -34, 36, 34, 6, '#2563eb');
  ctx.fillStyle = '#bfdbfe';
  ctx.fillRect(36, -28, 16, 12);
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(BED_FROM - 8, -6, 4, 6);
  for (const c of s.crates) {
    if (c.lost) continue;
    fillRound(ctx, c.u - 7, -16, 14, 14, 2, c.color);
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.strokeRect(c.u - 7, -16, 14, 14);
  }
  ctx.restore();
  drawSparks(ctx, s.sparks);
  ctx.restore();
  const toGo = Math.max(0, Math.round((s.routeEnd - t.x) / 10));
  text(ctx, `Level ${s.level} · ${toGo} m to the depot`, 12, 18, { size: 14, align: 'left', color: '#1f2937' });
  text(ctx, `${Math.ceil(Math.max(0, s.timeLeft))}s`, W - 12, 18, { size: 18, align: 'right', color: s.timeLeft < 10 ? '#dc2626' : '#1f2937' });
  text(ctx, `📦 ${cratesLeft(s)} / ${s.crates.length}`, W / 2, 18, { size: 16, color: '#1f2937' });
  if (s.between > 0) text(ctx, 'Delivered!', W / 2, H / 2 - 40, { size: 30, color: '#15803d' });
}

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create,
  update,
  render,
  hud: (s) => [
    { label: 'Level', value: s.level },
    { label: 'Crates', value: `${cratesLeft(s)}/${s.crates.length}` },
    { label: 'Time', value: `${Math.ceil(Math.max(0, s.timeLeft))}s` },
    { label: 'Score', value: s.score },
  ],
  result: (s) => ({
    score: s.score,
    title: s.truck.crashed ? 'The truck rolled over' : cratesLeft(s) === 0 ? 'The whole load fell off' : 'Out of time',
    details: [
      { label: 'Deliveries', value: String(s.level - 1) },
      { label: 'Crates delivered', value: String(s.delivered) },
    ],
  }),
  onEnd: (s) => {
    void reportProgress('truck-driving.level-3', s.level - 1);
    void reportProgress('truck-driving.level-6', s.level - 1);
    void incrementProgress('truck-driving.total', s.delivered);
  },
  touch: { pad: 'horizontal' },
  startHint: '→ gas, ← brake (or hold either half of the screen). Drive smoothly — loose crates slide off!',
};
