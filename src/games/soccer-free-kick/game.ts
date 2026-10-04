import type { DifficultySetting } from '@/types';
import { reportProgress } from '@/achievements/AchievementService';
import { baseState, clamp } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { circle, fillRound, text } from '../_shared/arcade/draw';
import { GOAL_H, GOAL_W, WALL_D, goalPoints, launch, makeKick, simulate, step } from './engine';
import type { Kick, KeeperCfg, Result, Shot, Simulation } from './engine';

/** Ten free kicks: bend it round the wall and past the keeper. */
export const W = 420;
export const H = 600;
export const KICKS = 10;
const F = 760;
const CAM_BACK = 3.2;
const CAM_H = 1.3;
const HORIZON = 210;

interface Tuning {
  keeper: KeeperCfg;
  wall: number;
  wind: number;
  /** 2 = full path, 1 = first part of the path, 0 = aim reticle only. */
  guide: number;
}

const TUNING: Record<DifficultySetting, Tuning> = {
  easy: { keeper: { reaction: 0.34, speed: 3.6, reach: 0.7 }, wall: 1.85, wind: 0, guide: 2 },
  normal: { keeper: { reaction: 0.22, speed: 4.8, reach: 0.85 }, wall: 2.0, wind: 0.8, guide: 1 },
  hard: { keeper: { reaction: 0.13, speed: 5.8, reach: 0.98 }, wall: 2.15, wind: 1.6, guide: 0 },
};

const SPINS = [0, 0.5, 1, -1, -0.5];

export interface State extends BaseState {
  n: number;
  kick: Kick;
  shot: Shot;
  spinIdx: number;
  charging: number;
  phase: 'aim' | 'flight' | 'result';
  phaseT: number;
  sim: Simulation | null;
  wind: number;
  tuning: Tuning;
  goals: number;
  corners: number;
  curlers: number;
  message: string;
  swipe: { x: number; y: number; t: number }[] | null;
}

/** The camera stands behind the ball and turns part of the way towards the goal. */
function cameraYaw(k: Kick) {
  return Math.atan2(k.goalX, k.dist) * 0.7;
}

export function project(k: Kick, d: number, x: number, z: number) {
  const a = cameraYaw(k);
  const rd = d + CAM_BACK;
  const depth = Math.max(0.5, x * Math.sin(a) + rd * Math.cos(a));
  const lateral = x * Math.cos(a) - rd * Math.sin(a);
  return { x: W / 2 + (lateral * F) / depth, y: HORIZON + ((CAM_H - z) * F) / depth, s: F / depth };
}

/** Inverse of `project` on a plane at depth d: screen point to (x, z). */
export function unprojectAt(k: Kick, d: number, sx: number, sy: number) {
  // Solve lateral/depth for the plane numerically: a few Newton-style passes are plenty.
  let x = 0;
  for (let i = 0; i < 8; i++) {
    const p = project(k, d, x, 0);
    x += (sx - p.x) / p.s;
  }
  const p = project(k, d, x, 0);
  return { x, z: CAM_H - (sy - HORIZON) * (p.s ? 1 / p.s : 0) };
}

function newKick(s: State, random: () => number) {
  s.kick = makeKick(s.n, random);
  const yaw = Math.atan2(s.kick.goalX, s.kick.dist);
  s.shot = { speed: 26, yaw, pitch: pitchFor(s.kick.dist, 1.4, 26), spin: 0 };
  s.spinIdx = 0;
  s.wind = s.tuning.wind ? (random() - 0.5) * 2 * s.tuning.wind : 0;
  s.phase = 'aim';
  s.phaseT = 0;
  s.sim = null;
  s.charging = -1;
}

export function create(difficulty: DifficultySetting, random: () => number): State {
  const s = {
    ...baseState(),
    n: 0,
    kick: { dist: 20, goalX: 0, wall: [] },
    shot: { speed: 26, yaw: 0, pitch: 0.2, spin: 0 },
    spinIdx: 0,
    charging: -1,
    phase: 'aim',
    phaseT: 0,
    sim: null,
    wind: 0,
    tuning: TUNING[difficulty],
    goals: 0,
    corners: 0,
    curlers: 0,
    message: '',
    swipe: null,
  } as State;
  newKick(s, random);
  return s;
}

/** Elevation that brings a ball at `speed` to height z after `dist` metres (drag ignored). */
export function pitchFor(dist: number, z: number, speed: number): number {
  let lo = -0.1;
  let hi = 0.8;
  for (let i = 0; i < 30; i++) {
    const p = (lo + hi) / 2;
    const t = dist / (speed * Math.cos(p));
    const h = speed * Math.sin(p) * t - 4.9 * t * t;
    if (h < z) lo = p;
    else hi = p;
  }
  return (lo + hi) / 2;
}

function shoot(s: State) {
  s.sim = simulate(s.kick, s.shot, s.tuning.keeper, s.tuning.wall, s.wind);
  s.phase = 'flight';
  s.phaseT = 0;
  s.events.push('hit');
}

const MESSAGES: Record<Result, string> = {
  goal: 'GOAL!',
  saved: 'Saved by the keeper',
  wall: 'Blocked by the wall',
  post: 'Off the woodwork!',
  wide: 'Wide of the post',
  over: 'Over the bar',
  short: 'Not enough on it',
};

function settle(s: State) {
  const sim = s.sim;
  if (!sim) return;
  s.message = MESSAGES[sim.result];
  if (sim.result === 'goal') {
    const pts = goalPoints(s.kick, sim.at);
    s.score += pts;
    s.goals += 1;
    if (pts >= 200) {
      s.corners += 1;
      s.message = 'TOP CORNER!';
    }
    if (Math.abs(s.shot.spin) >= 0.5) s.curlers += 1;
    s.events.push('success');
  } else s.events.push(sim.result === 'post' ? 'hit' : 'failure');
  s.phase = 'result';
  s.phaseT = 0;
}

function handleSwipe(s: State, input: Input) {
  const p = input.pointer;
  if (p.pressed) s.swipe = [{ x: p.x, y: p.y, t: s.time }];
  if (!s.swipe) return;
  if (p.down) {
    const last = s.swipe[s.swipe.length - 1];
    if (Math.hypot(p.x - last.x, p.y - last.y) > 3) s.swipe.push({ x: p.x, y: p.y, t: s.time });
  }
  if (!p.released) return;
  const path = s.swipe;
  s.swipe = null;
  const a = path[0];
  const b = path[path.length - 1];
  if (a.y - b.y < 40) return;
  const k = s.kick;
  // The swipe's end point, read on the goal plane, is the target.
  const target = unprojectAt(k, k.dist, b.x, b.y);
  const tx = target.x;
  const tz = target.z;
  const secs = Math.max(0.05, b.t - a.t);
  const speed = clamp(15 + Math.hypot(b.x - a.x, b.y - a.y) / secs / 55, 16, 32);
  let bulge = 0;
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  for (const q of path) {
    const d = ((b.x - a.x) * (q.y - a.y) - (b.y - a.y) * (q.x - a.x)) / len;
    if (Math.abs(d) > Math.abs(bulge)) bulge = d;
  }
  // A swipe bowed out to the left curls the ball back to the right.
  const spin = clamp(bulge / 40, -1, 1);
  s.shot = {
    speed,
    yaw: Math.atan2(tx - spin * 1.2, k.dist),
    pitch: pitchFor(k.dist, clamp(tz, 0.2, 3), speed),
    spin,
  };
  shoot(s);
}

export function update(s: State, dt: number, input: Input, random: () => number) {
  s.phaseT += dt;
  if (s.phase === 'aim') {
    const h = input.held;
    if (h.has('left')) s.shot.yaw -= 0.35 * dt;
    if (h.has('right')) s.shot.yaw += 0.35 * dt;
    if (h.has('up')) s.shot.pitch = clamp(s.shot.pitch + 0.25 * dt, 0, 0.55);
    if (h.has('down')) s.shot.pitch = clamp(s.shot.pitch - 0.25 * dt, 0, 0.55);
    if (input.pressed.has('action2')) {
      s.spinIdx = (s.spinIdx + 1) % SPINS.length;
      s.shot.spin = SPINS[s.spinIdx];
    }
    if (input.pressed.has('action')) s.charging = 0;
    if (s.charging >= 0) {
      s.charging += dt;
      const ph = (s.charging / 1.1) % 2;
      s.shot.speed = 16 + 16 * (ph < 1 ? ph : 2 - ph);
      if (!h.has('action')) {
        s.charging = -1;
        shoot(s);
      }
      return;
    }
    handleSwipe(s, input);
    return;
  }
  if (s.phase === 'flight' && s.sim) {
    const last = s.sim.path[s.sim.path.length - 1];
    if (s.phaseT >= last.t + 0.15) settle(s);
    return;
  }
  if (s.phase === 'result' && s.phaseT > 1.7) {
    s.n += 1;
    if (s.n >= KICKS) {
      s.over = true;
      s.events.push('levelComplete');
      return;
    }
    newKick(s, random);
  }
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  k: Kick,
  d: number,
  x: number,
  height: number,
  shirt: string,
) {
  const foot = project(k, d, x, 0);
  const head = project(k, d, x, height);
  const w = 0.5 * foot.s;
  fillRound(ctx, foot.x - w / 2, head.y + w * 0.5, w, foot.y - head.y - w * 0.5, w * 0.3, shirt);
  ctx.fillStyle = '#111827';
  ctx.fillRect(foot.x - w / 2, foot.y - (foot.y - head.y) * 0.45, w, (foot.y - head.y) * 0.12);
  circle(ctx, foot.x, head.y + w * 0.3, w * 0.38, '#c68642');
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  const k = s.kick;
  const sky = ctx.createLinearGradient(0, 0, 0, HORIZON);
  sky.addColorStop(0, '#1e3a8a');
  sky.addColorStop(1, '#475569');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, HORIZON);
  ctx.fillStyle = '#334155';
  ctx.fillRect(0, HORIZON - 60, W, 60);
  for (let i = 0; i < 60; i++)
    circle(
      ctx,
      (i * 29) % W,
      HORIZON - 50 + ((i * 7) % 40),
      3,
      ['#ef4444', '#f8fafc', '#3b82f6', '#facc15'][i % 4],
    );
  const grass = ctx.createLinearGradient(0, HORIZON, 0, H);
  grass.addColorStop(0, '#166534');
  grass.addColorStop(1, '#22c55e');
  ctx.fillStyle = grass;
  ctx.fillRect(0, HORIZON, W, H - HORIZON);
  for (let d = 0; d < 40; d += 4) {
    const a = project(k, d, 0, 0);
    const b = project(k, d + 2, 0, 0);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(0, b.y, W, a.y - b.y);
  }
  // Goal line, box and frame.
  const gl = project(k, k.dist, k.goalX - 20, 0);
  const gr = project(k, k.dist, k.goalX + 20, 0);
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(gl.x, gl.y);
  ctx.lineTo(gr.x, gr.y);
  ctx.stroke();
  const bl = project(k, k.dist - 16.5, k.goalX - 20, 0);
  const br = project(k, k.dist - 16.5, k.goalX + 20, 0);
  ctx.beginPath();
  ctx.moveTo(bl.x, bl.y);
  ctx.lineTo(br.x, br.y);
  ctx.stroke();
  const p0 = project(k, k.dist, k.goalX - GOAL_W / 2, 0);
  const p1 = project(k, k.dist, k.goalX + GOAL_W / 2, GOAL_H);
  ctx.fillStyle = 'rgba(241,245,249,0.25)';
  ctx.fillRect(p0.x, p1.y, p1.x - p0.x, p0.y - p1.y);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 14; i++) {
    const x = p0.x + ((p1.x - p0.x) * i) / 14;
    ctx.beginPath();
    ctx.moveTo(x, p1.y);
    ctx.lineTo(x, p0.y);
    ctx.stroke();
  }
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y);
  ctx.lineTo(p0.x, p1.y);
  ctx.lineTo(p1.x, p1.y);
  ctx.lineTo(p1.x, p0.y);
  ctx.stroke();

  // Keeper and ball position for this moment of the flight.
  const sim = s.sim;
  let ball = { d: 0, x: 0, z: 0.11 };
  let keeper = { x: k.goalX + Math.sign(k.goalX) * Math.min(1, Math.abs(k.goalX) / 4) * 0.8, z: 1 };
  if (sim && s.phase !== 'aim') {
    const i = Math.min(
      sim.path.length - 1,
      sim.path.findIndex((f) => f.t >= s.phaseT) === -1
        ? sim.path.length - 1
        : sim.path.findIndex((f) => f.t >= s.phaseT),
    );
    const f = sim.path[i];
    ball = { d: f.d, x: f.x, z: f.z };
    keeper = sim.keeper[Math.min(sim.keeper.length - 1, i)];
  }
  const kf = project(k, k.dist - 0.3, keeper.x, Math.max(0, keeper.z - 1));
  const kh = project(k, k.dist - 0.3, keeper.x, Math.max(0, keeper.z - 1) + 1.85);
  const dive = clamp((keeper.z - 1) * 0.6 + (keeper.x - k.goalX) * 0.15, -1.2, 1.2);
  ctx.save();
  ctx.translate(kf.x, kf.y);
  ctx.rotate(dive);
  const kw = 0.55 * kf.s;
  fillRound(ctx, -kw / 2, -(kf.y - kh.y), kw, kf.y - kh.y, kw * 0.3, '#facc15');
  circle(ctx, 0, -(kf.y - kh.y), kw * 0.4, '#c68642');
  ctx.restore();
  // Wall.
  const ballBehindWall = ball.d > WALL_D;
  if (ballBehindWall) drawBall(ctx, k, ball);
  for (const wx of k.wall)
    drawPlayer(
      ctx,
      k,
      WALL_D,
      wx,
      s.phase === 'flight' && s.phaseT > 0.15 ? s.tuning.wall : 1.8,
      '#dc2626',
    );

  // Aim guides.
  if (s.phase === 'aim') {
    const g = s.tuning.guide;
    if (g > 0) {
      const f = launch(s.shot);
      ctx.strokeStyle = 'rgba(255,255,255,0.65)';
      ctx.setLineDash([4, 6]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      const limit = g >= 2 ? k.dist : k.dist * 0.45;
      let first = true;
      for (let i = 0; i < 600 && f.d < limit; i++) {
        step(f, s.shot.spin, 1 / 120, g >= 2 ? s.wind : 0);
        if (i % 3) continue;
        const q = project(k, f.d, f.x, f.z);
        if (first) ctx.moveTo(q.x, q.y);
        else ctx.lineTo(q.x, q.y);
        first = false;
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // The reticle shows where the ball would cross the goal line without curl or wind.
    const plain = launch({ ...s.shot, spin: 0 });
    for (let i = 0; i < 600 && plain.d < k.dist && plain.vd > 0.5; i++) step(plain, 0, 1 / 120);
    const r = project(k, k.dist, plain.x, clamp(plain.z, 0, 6));
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(r.x, r.y, 7, 0, Math.PI * 2);
    ctx.moveTo(r.x - 11, r.y);
    ctx.lineTo(r.x + 11, r.y);
    ctx.moveTo(r.x, r.y - 11);
    ctx.lineTo(r.x, r.y + 11);
    ctx.stroke();
  }
  if (!ballBehindWall) drawBall(ctx, k, ball);

  // Panels.
  fillRound(ctx, 8, 8, W - 16, 40, 10, 'rgba(15,23,42,0.85)');
  text(ctx, `Kick ${Math.min(KICKS, s.n + 1)}/${KICKS} · ${Math.round(k.dist)} m`, 20, 28, {
    size: 14,
    align: 'left',
  });
  text(ctx, `Goals ${s.goals}`, W - 20, 28, { size: 14, align: 'right', color: '#86efac' });
  if (s.wind)
    text(ctx, `Wind ${s.wind > 0 ? '→' : '←'} ${Math.abs(s.wind).toFixed(1)}`, W / 2 + 40, 28, {
      size: 12,
      color: '#7dd3fc',
    });
  if (s.phase === 'aim') {
    fillRound(ctx, 8, H - 58, W - 16, 50, 10, 'rgba(15,23,42,0.82)');
    const curl =
      s.shot.spin === 0
        ? 'no curl'
        : `curl ${s.shot.spin < 0 ? '←' : '→'}${Math.abs(s.shot.spin) === 1 ? '↻' : ''}`;
    text(ctx, `Power ${Math.round(((s.shot.speed - 16) / 16) * 100)}% · ${curl}`, W / 2, H - 42, {
      size: 13,
    });
    text(
      ctx,
      'Swipe to shoot (bow the swipe to curl) · or arrows aim, X curl, hold Space',
      W / 2,
      H - 22,
      { size: 10.5, color: '#cbd5e1', weight: 500 },
    );
  }
  if (s.phase === 'result') {
    fillRound(
      ctx,
      50,
      H / 2 - 30,
      W - 100,
      60,
      14,
      s.sim?.result === 'goal' ? 'rgba(22,101,52,0.92)' : 'rgba(15,23,42,0.88)',
    );
    text(ctx, s.message, W / 2, H / 2, {
      size: 26,
      color: s.sim?.result === 'goal' ? '#fde047' : '#fff',
    });
  }
}

function drawBall(ctx: CanvasRenderingContext2D, k: Kick, b: { d: number; x: number; z: number }) {
  const g = project(k, b.d, b.x, 0);
  const p = project(k, b.d, b.x, b.z);
  const r = Math.max(2.5, 0.11 * p.s);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(g.x, g.y, r, r * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  circle(ctx, p.x, p.y, r, '#f8fafc');
  circle(ctx, p.x, p.y, r * 0.35, '#111827');
}

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create,
  update,
  render,
  hud: (s) => [
    { label: 'Kick', value: `${Math.min(KICKS, s.n + 1)}/${KICKS}` },
    { label: 'Goals', value: s.goals },
    { label: 'Score', value: s.score },
  ],
  result: (s) => ({
    score: s.score,
    won: s.goals >= 5,
    title:
      s.goals >= 8
        ? `Dead-ball specialist: ${s.goals}/${KICKS}!`
        : `${s.goals} of ${KICKS} free kicks scored`,
    details: [
      { label: 'Goals', value: `${s.goals}/${KICKS}` },
      { label: 'Top corners', value: String(s.corners) },
      { label: 'Curled in', value: String(s.curlers) },
    ],
  }),
  onEnd: (s, difficulty) => {
    if (s.goals > 0) void reportProgress('soccer-free-kick.goal', 1);
    if (s.corners > 0) void reportProgress('soccer-free-kick.corner', 1);
    if (s.curlers > 0) void reportProgress('soccer-free-kick.curler', 1);
    void reportProgress('soccer-free-kick.five', s.goals);
    if (difficulty === 'hard' && s.goals >= 6) void reportProgress('soccer-free-kick.hard', 1);
  },
  touch: {
    pad: 'dpad',
    buttons: [
      { action: 'action', label: 'Hold to kick' },
      { action: 'action2', label: 'Curl' },
    ],
  },
  pointerStarts: false,
  startHint:
    'Swipe from the ball towards the goal — bow your swipe to curl it round the wall. Or aim with the arrows, X for curl and hold Space.',
};
