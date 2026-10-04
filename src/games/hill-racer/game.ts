import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { burst, circle, drawSparks, fillRound, gradientBg, text, updateSparks } from '../_shared/arcade/draw';
import type { Spark } from '../_shared/arcade/draw';
import { drawGround, drawWheel, hills, makeBody, step, worldPoint } from '../_shared/hill/vehicle';
import type { Body, Ground, VehicleSpec } from '../_shared/hill/vehicle';

/**
 * Hill Racer: drive a little jeep as far as you can over ever-steeper hills.
 * Fuel drains as you go; drive over fuel cans to top up. In the air, the gas
 * pedal tips the nose up and the brake tips it down, so you can line up the
 * landing. Land on your roof and the run is over.
 */
export const W = 560;
export const H = 380;

export const JEEP: VehicleSpec = {
  mass: 1,
  inertia: 650,
  wheels: [
    [-26, 15],
    [26, 15],
  ],
  wheelR: 12,
  spring: 950,
  damping: 42,
  engine: 720,
  brake: 900,
  airTorque: 2600,
  head: [-4, -26],
  maxSpeed: 460,
};

export interface Pickup {
  x: number;
  kind: 'fuel' | 'coin';
  taken: boolean;
  /** Height above the ground for coins. */
  lift: number;
}

export interface State extends BaseState {
  ground: Ground;
  car: Body;
  fuel: number;
  burn: number;
  pickups: Pickup[];
  nextPickup: number;
  /** World x of the next fuel can; the gaps widen as you go. */
  nextFuel: number;
  coins: number;
  airTime: number;
  bestAir: number;
  camY: number;
  outOfFuel: number;
  sparks: Spark[];
}

const BURN: Record<DifficultySetting, number> = { easy: 3.2, normal: 4.2, hard: 5.4 };

export function create(difficulty: DifficultySetting, random: () => number = Math.random): State {
  const ground = hills(Math.floor(random() * 1000), difficulty === 'hard' ? 1.15 : difficulty === 'easy' ? 0.85 : 1);
  const car = makeBody(80, ground, JEEP);
  return { ...baseState(), ground, car, fuel: 100, burn: BURN[difficulty], pickups: [], nextPickup: 400, nextFuel: 3000, coins: 0, airTime: 0, bestAir: 0, camY: car.y - H / 2, outOfFuel: 0, sparks: [] };
}

export const distance = (s: State) => Math.max(0, Math.floor((s.car.x - 80) / 10));

function placePickups(s: State) {
  while (s.nextPickup < s.car.x + W * 1.5) {
    const x = s.nextPickup;
    if (x >= s.nextFuel) {
      s.pickups.push({ x, kind: 'fuel', taken: false, lift: 18 });
      s.nextFuel += 4200 + s.nextFuel * 0.12;
    } else for (let k = 0; k < 5; k++) s.pickups.push({ x: x + k * 26, kind: 'coin', taken: false, lift: 34 + Math.sin(k / 1.3) * 16 });
    s.nextPickup += 260;
  }
}

export function update(s: State, dt: number, input: Input, random: () => number) {
  const gas = input.held.has('right') || input.held.has('up') || (input.pointer.down && input.pointer.x > W / 2);
  const brake = input.held.has('left') || input.held.has('down') || (input.pointer.down && input.pointer.x <= W / 2);
  const throttle = s.fuel > 0 ? (gas ? 1 : brake ? -1 : 0) : brake ? -1 : 0;
  step(s.car, JEEP, s.ground, throttle, dt);
  if (throttle > 0) s.fuel = Math.max(0, s.fuel - s.burn * dt * 1.3);
  else s.fuel = Math.max(0, s.fuel - s.burn * dt * 0.3);
  if (!s.car.grounded) {
    s.airTime += dt;
  } else if (s.airTime > 0) {
    if (s.airTime > 1) {
      s.score += Math.round(s.airTime * 20);
      s.events.push('success');
    }
    s.bestAir = Math.max(s.bestAir, s.airTime);
    s.airTime = 0;
  }
  placePickups(s);
  for (const p of s.pickups) {
    if (p.taken) continue;
    const py = s.ground(p.x) - p.lift;
    if (Math.abs(p.x - s.car.x) < 30 && Math.abs(py - s.car.y) < 40) {
      p.taken = true;
      if (p.kind === 'fuel') {
        s.fuel = 100;
        s.events.push('powerup');
      } else {
        s.coins += 1;
        s.events.push('coin');
      }
    }
  }
  s.pickups = s.pickups.filter((p) => p.x > s.car.x - W);
  s.camY += (s.car.y - H * 0.55 - s.camY) * Math.min(1, dt * 3);
  s.score = distance(s) + s.coins * 10;
  if (s.car.crashed) {
    s.over = true;
    s.events.push('explosion');
    const [hx, hy] = worldPoint(s.car, JEEP.head[0], JEEP.head[1]);
    burst(s.sparks, hx, hy, '#f97316', 24, 200, random);
    return;
  }
  // Out of fuel and stopped for a moment: the run is over.
  if (s.fuel === 0 && Math.abs(s.car.vx) < 8) {
    s.outOfFuel += dt;
    if (s.outOfFuel > 1.2) {
      s.over = true;
      s.events.push('gameOver');
    }
  } else s.outOfFuel = 0;
  updateSparks(s.sparks, dt, 400);
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  gradientBg(ctx, W, H, '#7dd3fc', '#fef3c7');
  const camX = s.car.x - W * 0.35;
  ctx.fillStyle = 'rgba(148,163,184,0.5)';
  for (let i = 0; i < 6; i++) {
    const mx = ((i * 260 - camX * 0.3) % (W + 260) + W + 260) % (W + 260) - 130;
    ctx.beginPath();
    ctx.moveTo(mx - 140, H);
    ctx.lineTo(mx, H - 170 - (i % 3) * 30);
    ctx.lineTo(mx + 140, H);
    ctx.fill();
  }
  drawGround(ctx, s.ground, camX, s.camY, W, H, '#65a30d', '#92400e');
  for (const p of s.pickups) {
    if (p.taken) continue;
    const x = p.x - camX;
    const y = s.ground(p.x) - p.lift - s.camY;
    if (p.kind === 'coin') {
      circle(ctx, x, y, 8, '#f59e0b');
      circle(ctx, x, y, 5, '#fde047');
    } else {
      fillRound(ctx, x - 9, y - 12, 18, 24, 3, '#dc2626');
      text(ctx, '⛽', x, y, { size: 12 });
    }
  }
  // Vehicle.
  ctx.save();
  ctx.translate(-camX, -s.camY);
  const c = s.car;
  for (const [ox, oy] of JEEP.wheels) {
    const [wx, wy] = worldPoint(c, ox, oy);
    drawWheel(ctx, wx, wy, JEEP.wheelR, c.spin);
  }
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(c.a);
  fillRound(ctx, -34, -6, 68, 18, 5, '#dc2626');
  fillRound(ctx, -14, -24, 24, 20, 4, '#fca5a5');
  ctx.fillStyle = '#1e3a8a';
  ctx.beginPath();
  ctx.arc(-3, -28, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  drawSparks(ctx, s.sparks);
  ctx.restore();
  // Fuel gauge.
  fillRound(ctx, 12, 12, 130, 16, 8, 'rgba(0,0,0,0.25)');
  fillRound(ctx, 12, 12, 1.3 * s.fuel, 16, 8, s.fuel < 25 ? '#ef4444' : '#22c55e');
  text(ctx, `⛽ ${Math.ceil(s.fuel)}%`, 77, 20, { size: 11, color: '#fff' });
  text(ctx, `${distance(s)} m`, W / 2, 22, { size: 20, color: '#1f2937' });
  text(ctx, `🪙 ${s.coins}`, W - 12, 22, { size: 16, align: 'right', color: '#1f2937' });
  if (s.airTime > 1) text(ctx, `Air ${s.airTime.toFixed(1)}s`, W / 2, 50, { size: 18, color: '#7c3aed' });
}

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create,
  update,
  render,
  hud: (s) => [
    { label: 'Distance', value: `${distance(s)} m` },
    { label: 'Fuel', value: `${Math.ceil(s.fuel)}%` },
    { label: 'Coins', value: s.coins },
    { label: 'Score', value: s.score },
  ],
  result: (s) => ({
    score: s.score,
    title: s.car.crashed ? 'Flipped over!' : 'Out of fuel',
    details: [
      { label: 'Distance', value: `${distance(s)} m` },
      { label: 'Coins', value: String(s.coins) },
      { label: 'Longest jump', value: `${s.bestAir.toFixed(1)} s` },
    ],
  }),
  onEnd: (s) => {
    void reportProgress('hill-racer.m-500', distance(s));
    void reportProgress('hill-racer.m-1500', distance(s));
    void reportProgress('hill-racer.air', s.bestAir >= 2 ? 1 : 0);
    void incrementProgress('hill-racer.total', distance(s));
  },
  touch: { pad: 'horizontal' },
  startHint: '→ gas, ← brake (tap either half of the screen). In the air, gas tips the nose up, brake tips it down.',
};
