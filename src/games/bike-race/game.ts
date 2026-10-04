import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState, clamp } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { circle, fillRound, gradientBg, text } from '../_shared/arcade/draw';
import { drawGround, drawWheel, makeBody, step, worldPoint } from '../_shared/hill/vehicle';
import type { Body, VehicleSpec } from '../_shared/hill/vehicle';
import { STAGES, buildTrack } from './track';
import type { Track } from './track';

/**
 * Bike Race: three motocross stages against two ghost riders. Throttle and
 * brake drive the bike; lean shifts your weight to land jumps level. Crash
 * and you restart from the last checkpoint — the clock keeps running.
 */
export const W = 560;
export const H = 380;
const START_X = 80;

export const BIKE: VehicleSpec = {
  mass: 1,
  inertia: 480,
  wheels: [
    [-24, 14],
    [24, 14],
  ],
  wheelR: 13,
  spring: 900,
  damping: 40,
  engine: 760,
  brake: 900,
  airTorque: 0,
  head: [2, -34],
  maxSpeed: 520,
};

const LEAN_AIR = 6.5;
const LEAN_GROUND = 2.2;

interface Tuning {
  ghosts: [number, number];
  scale: number;
}

const TUNING: Record<DifficultySetting, Tuning> = {
  easy: { ghosts: [200, 230], scale: 0.85 },
  normal: { ghosts: [255, 295], scale: 1 },
  hard: { ghosts: [305, 345], scale: 1.12 },
};

export interface State extends BaseState {
  stage: number;
  track: Track;
  bike: Body;
  stageTime: number;
  times: number[];
  ghostTimes: number[][];
  checkpoint: number;
  crashT: number;
  crashes: number;
  airRot: number;
  flips: number;
  phase: 'ride' | 'finish';
  phaseT: number;
  camY: number;
  tuning: Tuning;
  stageWins: number;
  message: string;
  messageT: number;
}

function startStage(s: State, n: number) {
  s.stage = n;
  s.track = buildTrack(n, s.tuning.scale);
  s.bike = makeBody(START_X, s.track.ground, BIKE);
  s.stageTime = 0;
  s.checkpoint = START_X;
  s.crashT = 0;
  s.airRot = 0;
  s.phase = 'ride';
  s.phaseT = 0;
  s.camY = s.bike.y - H * 0.6;
  s.message = `Stage ${n + 1}`;
  s.messageT = 1.5;
}

export function create(difficulty: DifficultySetting): State {
  const tuning = TUNING[difficulty];
  const s = {
    ...baseState(),
    stage: 0,
    track: buildTrack(0, tuning.scale),
    bike: makeBody(START_X, buildTrack(0, tuning.scale).ground, BIKE),
    stageTime: 0,
    times: [],
    ghostTimes: [],
    checkpoint: START_X,
    crashT: 0,
    crashes: 0,
    airRot: 0,
    flips: 0,
    phase: 'ride',
    phaseT: 0,
    camY: 0,
    tuning,
    stageWins: 0,
    message: '',
    messageT: 0,
  } as State;
  startStage(s, 0);
  return s;
}

/** A ghost's finishing time for this stage at its pace (px/s). */
export const ghostTime = (s: State, pace: number) => s.track.length / pace;

/** Ghost position after t seconds: a little slower on the climbs. */
export function ghostX(s: State, pace: number, t: number) {
  return START_X + Math.min(s.track.length, pace * t);
}

export function ride(s: State, dt: number, throttle: number, lean: number) {
  const b = s.bike;
  step(b, BIKE, s.track.ground, throttle, dt);
  b.w += lean * (b.grounded ? LEAN_GROUND : LEAN_AIR) * dt;
  if (!b.grounded) s.airRot += b.w * dt;
  else {
    if (Math.abs(s.airRot) >= Math.PI * 2 * 0.9 && !b.crashed) {
      s.flips += Math.floor(Math.abs(s.airRot) / (Math.PI * 2 * 0.9));
      s.message = 'FLIP!';
      s.messageT = 1.2;
      s.events.push('success');
    }
    s.airRot = 0;
  }
  // Keep the angle in range so flips do not wind it up forever.
  if (b.a > Math.PI) b.a -= Math.PI * 2;
  if (b.a < -Math.PI) b.a += Math.PI * 2;
}

function respawn(s: State) {
  s.bike = makeBody(s.checkpoint, s.track.ground, BIKE);
  s.crashT = 0;
  s.airRot = 0;
}

export function update(s: State, dt: number, input: Input) {
  s.messageT = Math.max(0, s.messageT - dt);
  s.phaseT += dt;
  if (s.phase === 'finish') {
    if (s.phaseT > 2.6) {
      if (s.stage + 1 >= STAGES) {
        s.over = true;
        s.events.push('levelComplete');
        return;
      }
      startStage(s, s.stage + 1);
    }
    return;
  }
  s.stageTime += dt;
  const b = s.bike;
  if (b.crashed) {
    s.crashT += dt;
    if (s.crashT > 1) respawn(s);
    return;
  }
  const p = input.pointer;
  const h = input.held;
  const gas = h.has('up') || h.has('action') || (p.down && p.y > H * 0.5 && p.x > W / 2);
  const brake = h.has('down') || (p.down && p.y > H * 0.5 && p.x <= W / 2);
  const lean =
    (h.has('right') || (p.down && p.y <= H * 0.5 && p.x > W / 2) ? 1 : 0) -
    (h.has('left') || (p.down && p.y <= H * 0.5 && p.x <= W / 2) ? 1 : 0);
  ride(s, dt, gas ? 1 : brake ? -1 : 0, lean);
  for (const c of s.track.checkpoints) {
    if (b.x >= c && s.checkpoint < c && b.grounded) {
      s.checkpoint = c;
      s.message = 'Checkpoint';
      s.messageT = 0.8;
      s.events.push('coin');
    }
  }
  if (b.crashed) {
    s.crashes += 1;
    s.events.push('explosion');
    return;
  }
  s.camY += (b.y - H * 0.6 - s.camY) * Math.min(1, dt * 3);
  if (b.x - START_X >= s.track.length) {
    const ghosts = s.tuning.ghosts.map((g) => ghostTime(s, g + s.stage * 6));
    s.times.push(s.stageTime);
    s.ghostTimes.push(ghosts);
    const place = 1 + ghosts.filter((g) => g < s.stageTime).length;
    if (place === 1) s.stageWins += 1;
    s.message = place === 1 ? 'Stage win!' : `${place === 2 ? '2nd' : '3rd'} place`;
    s.messageT = 2.6;
    s.phase = 'finish';
    s.phaseT = 0;
    s.events.push(place === 1 ? 'success' : 'coin');
    const total = s.times.reduce((a, t) => a + t, 0);
    s.score =
      Math.max(0, Math.round(s.times.length * 1000 - total * 12)) +
      s.stageWins * 200 +
      s.flips * 50;
  }
}

function drawBike(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  a: number,
  spin: number,
  alpha: number,
  color: string,
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const b = { x, y, a } as Body;
  for (const [ox, oy] of BIKE.wheels) {
    const [wx, wy] = worldPoint(b, ox, oy);
    drawWheel(ctx, wx, wy, BIKE.wheelR, spin);
  }
  ctx.translate(x, y);
  ctx.rotate(a);
  ctx.strokeStyle = color;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-24, 14);
  ctx.lineTo(-6, -4);
  ctx.lineTo(16, -6);
  ctx.lineTo(24, 14);
  ctx.stroke();
  fillRound(ctx, -14, -10, 26, 10, 4, color);
  // Rider.
  ctx.strokeStyle = '#1f2937';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-4, -8);
  ctx.lineTo(0, -26);
  ctx.lineTo(14, -14);
  ctx.stroke();
  circle(ctx, 2, -32, 7, color);
  ctx.restore();
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  gradientBg(ctx, W, H, '#fde68a', '#fef3c7');
  const b = s.bike;
  const camX = b.x - W * 0.33;
  ctx.fillStyle = 'rgba(180,83,9,0.25)';
  for (let i = 0; i < 6; i++) {
    const mx = ((((i * 240 - camX * 0.3) % (W + 240)) + W + 240) % (W + 240)) - 120;
    ctx.beginPath();
    ctx.moveTo(mx - 150, H);
    ctx.lineTo(mx, H - 140 - (i % 3) * 30);
    ctx.lineTo(mx + 150, H);
    ctx.fill();
  }
  drawGround(ctx, s.track.ground, camX, s.camY, W, H, '#a16207', '#78350f');
  ctx.save();
  ctx.translate(-camX, -s.camY);
  // Checkpoint flags and the finish line.
  for (const c of s.track.checkpoints) {
    const gx = START_X + c - START_X;
    const gy = s.track.ground(gx);
    ctx.fillStyle = c <= s.checkpoint ? '#22c55e' : '#94a3b8';
    ctx.fillRect(gx, gy - 50, 3, 50);
    ctx.fillRect(gx + 3, gy - 50, 18, 12);
  }
  const fx = START_X + s.track.length;
  const fy = s.track.ground(fx);
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 ? '#111827' : '#f8fafc';
    ctx.fillRect(fx, fy - 80 + i * 10, 10, 10);
  }
  // Ghosts.
  const colors = ['#a855f7', '#0ea5e9'];
  s.tuning.ghosts.forEach((g, i) => {
    const gx = ghostX(s, g + s.stage * 6, s.stageTime);
    const slope = (s.track.ground(gx + 10) - s.track.ground(gx - 10)) / 20;
    drawBike(ctx, gx, s.track.ground(gx) - 27, Math.atan(slope), gx / 13, 0.4, colors[i]);
  });
  if (!b.crashed || s.crashT < 0.5) drawBike(ctx, b.x, b.y, b.a, b.spin, 1, '#ef4444');
  ctx.restore();

  const progress = clamp((b.x - START_X) / s.track.length, 0, 1);
  fillRound(ctx, 12, 12, W - 24, 10, 5, 'rgba(0,0,0,0.2)');
  fillRound(ctx, 12, 12, (W - 24) * progress, 10, 5, '#ef4444');
  s.tuning.ghosts.forEach((g, i) => {
    const gp = clamp((ghostX(s, g + s.stage * 6, s.stageTime) - START_X) / s.track.length, 0, 1);
    circle(ctx, 12 + (W - 24) * gp, 17, 5, colors[i]);
  });
  text(ctx, `Stage ${s.stage + 1}/${STAGES}`, 14, 38, {
    size: 14,
    align: 'left',
    color: '#78350f',
  });
  text(ctx, `${s.stageTime.toFixed(1)} s`, W - 14, 38, {
    size: 16,
    align: 'right',
    color: '#78350f',
  });
  if (b.crashed)
    text(ctx, 'Crash! Back to the checkpoint…', W / 2, 70, { size: 18, color: '#b91c1c' });
  if (s.messageT > 0) text(ctx, s.message, W / 2, 96, { size: 22, color: '#7c2d12' });
  if (s.phase === 'finish') {
    const i = s.times.length - 1;
    fillRound(ctx, W / 2 - 150, H / 2 - 40, 300, 92, 14, 'rgba(15,23,42,0.85)');
    text(ctx, `Your time ${s.times[i].toFixed(1)} s`, W / 2, H / 2 - 16, { size: 18 });
    text(
      ctx,
      `Ghosts: ${s.ghostTimes[i].map((t) => t.toFixed(1)).join(' s · ')} s`,
      W / 2,
      H / 2 + 14,
      { size: 14, color: '#cbd5e1' },
    );
  }
}

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create,
  update,
  render,
  hud: (s) => [
    { label: 'Stage', value: `${s.stage + 1}/${STAGES}` },
    { label: 'Time', value: `${s.stageTime.toFixed(1)} s` },
    { label: 'Crashes', value: s.crashes },
  ],
  result: (s) => {
    const total = s.times.reduce((a, t) => a + t, 0);
    return {
      score: s.score,
      won: s.stageWins >= 2,
      title:
        s.stageWins === STAGES
          ? 'Clean sweep — every stage won!'
          : `${s.stageWins} of ${STAGES} stages won`,
      details: [
        { label: 'Total time', value: `${total.toFixed(1)} s` },
        ...s.times.map((t, i) => ({
          label: `Stage ${i + 1}`,
          value: `${t.toFixed(1)} s (ghosts ${s.ghostTimes[i].map((g) => g.toFixed(1)).join(' / ')})`,
        })),
        { label: 'Crashes', value: String(s.crashes) },
        { label: 'Flips', value: String(s.flips) },
      ],
    };
  },
  onEnd: (s, difficulty) => {
    void reportProgress('bike-race.finish', 1);
    if (s.stageWins > 0) void reportProgress('bike-race.win', 1);
    if (s.crashes === 0) void reportProgress('bike-race.clean', 1);
    void incrementProgress('bike-race.flips', s.flips);
    if (difficulty === 'hard' && s.stageWins === STAGES) void reportProgress('bike-race.hard', 1);
  },
  touch: { pad: 'dpad' },
  startHint:
    '↑ throttle, ↓ brake, ← → lean (or touch: bottom half gas/brake, top half lean). Beat the ghosts over three stages!',
};
