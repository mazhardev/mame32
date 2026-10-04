import type { DifficultySetting } from '@/types';
import { reportProgress } from '@/achievements/AchievementService';
import { baseState, clamp } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { circle, fillRound, text } from '../_shared/arcade/draw';
import {
  PITCHER,
  SWING,
  ZONE,
  contact,
  fenceAt,
  flightTime,
  inZone,
  makePitch,
  pitchAt,
} from './engine';
import type { Contact, Pitch } from './engine';

/** Home run derby: ten outs, hit as many home runs as you can. */
export const W = 420;
export const H = 600;
export const OUTS = 10;
const CAM_BACK = 2.4;
const CAM_H = 1.5;
const F = 520;
const HZ = 170;

export interface State extends BaseState {
  difficulty: DifficultySetting;
  phase: 'windup' | 'pitch' | 'result';
  t: number;
  pitch: Pitch;
  swingAt: number | null;
  swingAim: { x: number; z: number } | null;
  aimX: number;
  aimZ: number;
  result: Contact | null;
  message: string;
  outs: number;
  homers: number[];
  streak: number;
  bestStreak: number;
  lastPointer: { x: number; y: number };
  aid: boolean;
}

export function project(d: number, x: number, z: number) {
  const depth = Math.max(0.3, d + CAM_BACK);
  return { x: W / 2 + (x * F) / depth, y: HZ + ((CAM_H - z) * F) / depth, s: F / depth };
}

export function create(difficulty: DifficultySetting, random: () => number): State {
  return {
    ...baseState(),
    difficulty,
    phase: 'windup',
    t: 0,
    pitch: makePitch(difficulty, random),
    swingAt: null,
    swingAim: null,
    aimX: 0,
    aimZ: (ZONE.z0 + ZONE.z1) / 2,
    result: null,
    message: '',
    outs: 0,
    homers: [],
    streak: 0,
    bestStreak: 0,
    lastPointer: { x: -1, y: -1 },
    aid: difficulty === 'easy',
  };
}

function resolve(s: State) {
  const p = s.pitch;
  let out = true;
  if (s.swingAt === null || !s.swingAim) {
    s.result = null;
    if (inZone(p)) s.message = 'Called strike — out';
    else {
      s.message = 'Ball — good eye';
      out = false;
    }
  } else {
    const c = contact(p, { at: s.swingAt, ...s.swingAim }, PITCHER[s.difficulty].window);
    s.result = c;
    if (c.kind === 'miss') s.message = 'Swing and a miss';
    else if (c.kind === 'foul') s.message = 'Foul ball';
    else if (c.homer) {
      out = false;
      s.homers.push(Math.round(c.distance));
      s.streak += 1;
      s.bestStreak = Math.max(s.bestStreak, s.streak);
      s.message = `HOME RUN! ${Math.round(c.distance)} m`;
      s.events.push('success');
    } else
      s.message =
        c.angle <= 0.12
          ? 'Grounder — out'
          : c.distance > 70
            ? `Caught at the wall (${Math.round(c.distance)} m)`
            : 'Fly ball — out';
    if (c.kind !== 'miss') s.events.push('hit');
  }
  if (out) {
    s.outs += 1;
    s.streak = 0;
    s.events.push('failure');
  }
  s.score = s.homers.length * 100 + s.homers.reduce((a, b) => a + b, 0);
  s.phase = 'result';
  s.t = 0;
}

export function update(s: State, dt: number, input: Input, random: () => number) {
  s.t += dt;
  // Bat aim: pointer when it moves, otherwise the arrow keys.
  const p = input.pointer;
  const moved = p.x !== s.lastPointer.x || p.y !== s.lastPointer.y;
  s.lastPointer = { x: p.x, y: p.y };
  if (p.active && (moved || p.pressed)) {
    const sc = F / CAM_BACK;
    s.aimX = (p.x - W / 2) / sc;
    s.aimZ = CAM_H - (p.y - HZ) / sc;
  }
  const h = input.held;
  s.aimX += ((h.has('right') ? 1 : 0) - (h.has('left') ? 1 : 0)) * 0.9 * dt;
  s.aimZ += ((h.has('up') ? 1 : 0) - (h.has('down') ? 1 : 0)) * 0.9 * dt;
  s.aimX = clamp(s.aimX, -0.6, 0.6);
  s.aimZ = clamp(s.aimZ, 0.2, 1.4);

  if (s.phase === 'windup') {
    if (s.t > 1.3) {
      s.phase = 'pitch';
      s.t = 0;
      s.swingAt = null;
      s.swingAim = null;
      s.events.push('whoosh');
    }
    return;
  }
  if (s.phase === 'pitch') {
    if (s.swingAt === null && (input.pressed.has('action') || p.pressed)) {
      s.swingAt = s.t;
      s.swingAim = { x: s.aimX, z: s.aimZ };
    }
    const T = flightTime(s.pitch);
    const decided = s.swingAt !== null ? s.t >= Math.max(T, s.swingAt + SWING) : s.t > T + 0.15;
    if (decided) resolve(s);
    return;
  }
  if (s.phase === 'result' && s.t > 2.3) {
    if (s.outs >= OUTS) {
      s.over = true;
      s.events.push('levelComplete');
      return;
    }
    s.pitch = makePitch(s.difficulty, random);
    s.phase = 'windup';
    s.t = 0;
    s.result = null;
  }
}

function drawField(ctx: CanvasRenderingContext2D, c: Contact, progress: number) {
  const cx = W / 2;
  const cy = 470;
  const k = 1.55;
  ctx.fillStyle = 'rgba(15,23,42,0.85)';
  ctx.fillRect(0, 230, W, 260);
  ctx.fillStyle = '#15803d';
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  for (let a = -Math.PI / 4; a <= Math.PI / 4 + 0.001; a += 0.05)
    ctx.lineTo(cx + Math.sin(a) * fenceAt(a) * k, cy - Math.cos(a) * fenceAt(a) * k);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#c2a36b';
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + 27 * k * 0.71, cy - 27 * k * 0.71);
  ctx.lineTo(cx, cy - 38 * k);
  ctx.lineTo(cx - 27 * k * 0.71, cy - 27 * k * 0.71);
  ctx.closePath();
  ctx.fill();
  if (c.kind === 'fair' || c.kind === 'foul') {
    const dist = c.kind === 'fair' ? c.distance : 40;
    const t = Math.min(1, progress);
    const ex = cx + Math.sin(c.spray) * dist * k * t;
    const ey = cy - Math.cos(c.spray) * dist * k * t;
    ctx.strokeStyle = '#fde047';
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.setLineDash([]);
    circle(ctx, ex, ey, 4, '#f8fafc');
  }
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  const sky = ctx.createLinearGradient(0, 0, 0, HZ);
  sky.addColorStop(0, '#1e3a8a');
  sky.addColorStop(1, '#60a5fa');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, HZ);
  ctx.fillStyle = '#166534';
  ctx.fillRect(0, HZ - 30, W, 30);
  ctx.fillStyle = '#22c55e';
  ctx.fillRect(0, HZ, W, H - HZ);
  // Infield dirt, mound and plate.
  const mound = project(18.4, 0, 0);
  ctx.fillStyle = '#c2a36b';
  ctx.beginPath();
  ctx.ellipse(mound.x, mound.y, 2.7 * mound.s, 0.6 * mound.s, 0, 0, Math.PI * 2);
  ctx.fill();
  const near = project(0.2, 0, 0);
  ctx.beginPath();
  ctx.ellipse(near.x, near.y + 30, 260, 70, 0, 0, Math.PI * 2);
  ctx.fill();
  const pl = project(0, -0.22, 0);
  const pr = project(0, 0.22, 0);
  const pb = project(-0.3, 0, 0);
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.moveTo(pl.x, pl.y);
  ctx.lineTo(pr.x, pr.y);
  ctx.lineTo(pr.x, pb.y - 6);
  ctx.lineTo(pb.x, pb.y);
  ctx.lineTo(pl.x, pb.y - 6);
  ctx.fill();
  // Pitcher.
  const wind = s.phase === 'windup' ? s.t / 1.3 : 1;
  const feet = project(18.4, 0.1, 0);
  const sc = feet.s;
  fillRound(ctx, feet.x - 0.25 * sc, feet.y - 1.75 * sc, 0.5 * sc, 1.0 * sc, 4, '#f8fafc');
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(feet.x - 0.2 * sc, feet.y - 0.8 * sc, 0.15 * sc, 0.8 * sc);
  ctx.fillRect(feet.x + 0.05 * sc, feet.y - 0.8 * sc, 0.15 * sc, 0.8 * sc);
  circle(ctx, feet.x, feet.y - 1.9 * sc, 0.17 * sc, '#c68642');
  const armA = -1 + wind * 4;
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 0.12 * sc;
  ctx.beginPath();
  ctx.moveTo(feet.x + 0.2 * sc, feet.y - 1.6 * sc);
  ctx.lineTo(
    feet.x + 0.2 * sc + Math.sin(armA) * 0.6 * sc,
    feet.y - 1.6 * sc - Math.cos(armA) * 0.6 * sc,
  );
  ctx.stroke();

  // Strike zone.
  const z0 = project(0, ZONE.x0, ZONE.z1);
  const z1 = project(0, ZONE.x1, ZONE.z0);
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 2;
  ctx.strokeRect(z0.x, z0.y, z1.x - z0.x, z1.y - z0.y);

  // Batter (a right-hander, on the left of the plate from the catcher's view).
  const bf = project(1.0, -0.95, 0);
  const bs = bf.s;
  ctx.globalAlpha = 0.9;
  fillRound(ctx, bf.x - 0.25 * bs, bf.y - 1.5 * bs, 0.5 * bs, 0.75 * bs, 10, '#1e40af');
  fillRound(ctx, bf.x - 0.22 * bs, bf.y - 0.8 * bs, 0.18 * bs, 0.8 * bs, 6, '#e5e7eb');
  fillRound(ctx, bf.x + 0.04 * bs, bf.y - 0.8 * bs, 0.18 * bs, 0.8 * bs, 6, '#e5e7eb');
  circle(ctx, bf.x, bf.y - 1.68 * bs, 0.14 * bs, '#1e3a8a');
  ctx.globalAlpha = 1;
  // Bat: cocked, or swinging through the zone.
  const swingT =
    s.swingAt !== null && s.phase !== 'windup' ? clamp((s.t - s.swingAt) / (SWING * 2), 0, 1) : 0;
  const hands = { x: bf.x + 0.2 * bs, y: bf.y - 1.25 * bs };
  const batAngle = -2.3 + swingT * 3.6;
  ctx.strokeStyle = '#d4a373';
  ctx.lineWidth = 12;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(hands.x, hands.y);
  ctx.lineTo(hands.x + Math.cos(batAngle) * 0.85 * bs, hands.y + Math.sin(batAngle) * 0.85 * bs);
  ctx.stroke();
  ctx.lineCap = 'butt';

  // Aim marker (where the bat's sweet spot will be).
  const aim = project(0, s.aimX, s.aimZ);
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(aim.x, aim.y, 0.12 * aim.s, 0.08 * aim.s, 0, 0, Math.PI * 2);
  ctx.stroke();
  circle(ctx, aim.x, aim.y, 3, '#facc15');

  // Ball.
  if (s.phase === 'pitch') {
    const b = pitchAt(s.pitch, s.t);
    if (b.d > -0.5) {
      const g = project(b.d, b.x, 0);
      const q = project(b.d, b.x, b.z);
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.ellipse(g.x, g.y, 0.05 * g.s, 0.02 * g.s, 0, 0, Math.PI * 2);
      ctx.fill();
      circle(ctx, q.x, q.y, Math.max(2, 0.04 * q.s), '#f8fafc');
    }
    if (s.aid && s.t > flightTime(s.pitch) * 0.45) {
      const end = project(0, s.pitch.x, s.pitch.z);
      ctx.strokeStyle = 'rgba(248,113,113,0.8)';
      ctx.beginPath();
      ctx.arc(end.x, end.y, 6, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // Scoreboard.
  fillRound(ctx, 8, 8, W - 16, 44, 10, 'rgba(15,23,42,0.85)');
  text(ctx, `Home runs ${s.homers.length}`, 20, 30, { size: 16, align: 'left', color: '#fde047' });
  text(ctx, `Outs ${s.outs}/${OUTS}`, W - 20, 30, { size: 16, align: 'right' });
  if (s.phase === 'pitch' && s.t < 0.6)
    text(ctx, `${s.pitch.kind} · ${Math.round(s.pitch.speed * 3.6)} km/h`, W / 2, 64, {
      size: 12,
      color: '#e2e8f0',
    });
  if (s.phase === 'result') {
    if (s.result && s.result.kind !== 'miss') drawField(ctx, s.result, s.t / 0.9);
    const hr = s.message.startsWith('HOME');
    fillRound(ctx, 30, H - 96, W - 60, 50, 14, hr ? 'rgba(22,101,52,0.92)' : 'rgba(15,23,42,0.88)');
    text(ctx, s.message, W / 2, H - 71, { size: hr ? 24 : 18, color: hr ? '#fde047' : '#fff' });
  }
}

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create,
  update,
  render,
  hud: (s) => [
    { label: 'Home runs', value: s.homers.length },
    { label: 'Outs', value: `${s.outs}/${OUTS}` },
    { label: 'Longest', value: s.homers.length ? `${Math.max(...s.homers)} m` : '–' },
  ],
  result: (s) => ({
    score: s.score,
    won: s.homers.length >= 5,
    title: `${s.homers.length} home run${s.homers.length === 1 ? '' : 's'}!`,
    details: [
      { label: 'Home runs', value: String(s.homers.length) },
      { label: 'Longest', value: s.homers.length ? `${Math.max(...s.homers)} m` : '–' },
      { label: 'Total distance', value: `${s.homers.reduce((a, b) => a + b, 0)} m` },
      { label: 'Best streak', value: String(s.bestStreak) },
    ],
  }),
  onEnd: (s, difficulty) => {
    if (s.homers.length) void reportProgress('baseball-batting.homer', 1);
    void reportProgress('baseball-batting.long', s.homers.length ? Math.max(...s.homers) : 0);
    void reportProgress('baseball-batting.five', s.homers.length);
    void reportProgress('baseball-batting.streak', s.bestStreak);
    if (difficulty === 'hard' && s.homers.length >= 5)
      void reportProgress('baseball-batting.hard', 1);
  },
  touch: { pad: 'dpad', buttons: [{ action: 'action', label: 'Swing' }] },
  pointerStarts: false,
  startHint:
    'Move the yellow bat marker to where the pitch will cross, then swing as it arrives. Ten outs — how many homers?',
};
