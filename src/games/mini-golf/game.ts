import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { circle, fillRound, text } from '../_shared/arcade/draw';
import {
  atRest,
  newAim,
  rectContains,
  roll,
  scoreName,
  segmentsOf,
  updateAim,
} from '../_shared/golf/golf';
import type { Aim, GolfBall, Rollable, Seg } from '../_shared/golf/golf';
import { HOLES } from './holes';
import type { MiniHole } from './holes';

/** Nine holes of mini golf with walls, bumpers, sand, water and a windmill. */
export const W = 400;
export const H = 600;
export const BALL_R = 7;
export const CUP_R = 11;
export const MAX_SPEED = 760;
const DECEL = 220;
const SAND_DECEL = 900;

interface Tuning {
  /** 2 = full predicted path, 1 = aim arrow, 0 = short arrow only. */
  guide: number;
  spinner: number;
  maxStrokes: number;
}

const TUNING: Record<DifficultySetting, Tuning> = {
  easy: { guide: 2, spinner: 0.8, maxStrokes: 10 },
  normal: { guide: 1, spinner: 1, maxStrokes: 8 },
  hard: { guide: 0, spinner: 1.6, maxStrokes: 6 },
};

export interface State extends BaseState {
  hole: number;
  ball: GolfBall;
  lastRest: { x: number; y: number };
  strokes: number;
  card: number[];
  aim: Aim;
  phase: 'aim' | 'rolling' | 'holed';
  phaseT: number;
  message: string;
  tuning: Tuning;
  rollT: number;
  holesInOne: number;
}

export function makeRollable(hole: MiniHole, ball: GolfBall, spinnerSpeed = 1): Rollable {
  const walls: Seg[] = [...segmentsOf(hole.outline), ...(hole.blocks ?? []).flatMap(segmentsOf)];
  const sp = hole.spinner;
  return {
    ball,
    radius: BALL_R,
    walls,
    bumpers: hole.bumpers ?? [],
    movers: sp
      ? (t) => {
          const omega = sp.speed * spinnerSpeed;
          const a = t * omega;
          const dx = Math.cos(a) * sp.len;
          const dy = Math.sin(a) * sp.len;
          return [
            {
              seg: { a: { x: sp.x - dx, y: sp.y - dy }, b: { x: sp.x + dx, y: sp.y + dy } },
              pivot: sp,
              omega,
            },
          ];
        }
      : undefined,
    cup: hole.cup,
    cupR: CUP_R,
    cupSpeed: 330,
    wallE: 0.78,
    surface: (x, y) => {
      let decel = DECEL;
      let ax = 0;
      let ay = 0;
      if (hole.sand?.some((r) => rectContains(r, x, y))) decel = SAND_DECEL;
      for (const s of hole.slopes ?? []) {
        if (rectContains(s, x, y)) {
          ax += s.ax;
          ay += s.ay;
        }
      }
      return { decel, ax, ay };
    },
  };
}

export function inWater(hole: MiniHole, x: number, y: number) {
  return !!hole.water?.some((r) => rectContains(r, x, y));
}

/** Runs a shot from the ball's position to rest; used by tests and the guide. */
export function simulatePutt(
  hole: MiniHole,
  from: { x: number; y: number },
  angle: number,
  power: number,
  time = 0,
  spinner = 1,
  maxSeconds = 12,
): { x: number; y: number; holed: boolean; water: boolean; path: { x: number; y: number }[] } {
  const ball = {
    x: from.x,
    y: from.y,
    vx: Math.cos(angle) * power * MAX_SPEED,
    vy: Math.sin(angle) * power * MAX_SPEED,
  };
  const r = makeRollable(hole, ball, spinner);
  const path = [{ x: ball.x, y: ball.y }];
  const dt = 1 / 240;
  for (let i = 0; i < maxSeconds * 240; i++) {
    const res = roll(r, dt, time + i * dt);
    if (i % 8 === 0) path.push({ x: ball.x, y: ball.y });
    if (res === 'holed') return { x: ball.x, y: ball.y, holed: true, water: false, path };
    if (inWater(hole, ball.x, ball.y))
      return { x: ball.x, y: ball.y, holed: false, water: true, path };
    if (atRest(ball) && !hole.slopes?.some((s) => rectContains(s, ball.x, ball.y))) break;
    if (atRest(ball, 1) && i > 240) break;
  }
  return { x: ball.x, y: ball.y, holed: false, water: false, path };
}

function startHole(s: State, n: number) {
  const h = HOLES[n];
  s.hole = n;
  s.ball = { x: h.tee.x, y: h.tee.y, vx: 0, vy: 0 };
  s.lastRest = { ...h.tee };
  s.strokes = 0;
  s.phase = 'aim';
  s.aim = newAim(Math.atan2(h.cup.y - h.tee.y, h.cup.x - h.tee.x));
  s.message = `Hole ${n + 1}: ${h.name} — par ${h.par}`;
  s.phaseT = 0;
}

export function create(difficulty: DifficultySetting): State {
  const s: State = {
    ...baseState(),
    hole: 0,
    ball: { x: 0, y: 0, vx: 0, vy: 0 },
    lastRest: { x: 0, y: 0 },
    strokes: 0,
    card: [],
    aim: newAim(),
    phase: 'aim',
    phaseT: 0,
    message: '',
    tuning: TUNING[difficulty],
    rollT: 0,
    holesInOne: 0,
  };
  startHole(s, 0);
  return s;
}

export function totalPar(n = HOLES.length) {
  return HOLES.slice(0, n).reduce((a, h) => a + h.par, 0);
}

function finishHole(s: State, strokes: number, msg: string) {
  s.card.push(strokes);
  s.phase = 'holed';
  s.phaseT = 0;
  s.message = msg;
  const par = HOLES[s.hole].par;
  if (strokes === 1) s.holesInOne += 1;
  s.score = s.card.reduce((a, st, i) => a + Math.max(0, HOLES[i].par + 3 - st) * 100, 0);
  s.events.push(strokes <= par ? 'success' : 'coin');
}

export function update(s: State, dt: number, input: Input) {
  const hole = HOLES[s.hole];
  s.phaseT += dt;
  if (s.phase === 'aim') {
    if (updateAim(s.aim, input, dt, s.ball)) {
      s.strokes += 1;
      s.lastRest = { x: s.ball.x, y: s.ball.y };
      s.ball.vx = Math.cos(s.aim.angle) * s.aim.power * MAX_SPEED;
      s.ball.vy = Math.sin(s.aim.angle) * s.aim.power * MAX_SPEED;
      s.phase = 'rolling';
      s.rollT = 0;
      s.events.push('hit');
    }
    return;
  }
  if (s.phase === 'rolling') {
    const r = makeRollable(hole, s.ball, s.tuning.spinner);
    const steps = Math.max(1, Math.ceil(dt * 240));
    s.rollT += dt;
    for (let i = 0; i < steps; i++) {
      const res = roll(r, dt / steps, s.time + (i * dt) / steps);
      if (res === 'holed') {
        finishHole(s, s.strokes, scoreName(s.strokes, hole.par));
        return;
      }
      if (res === 'hit' && i === 0) s.events.push('blip');
    }
    if (inWater(hole, s.ball.x, s.ball.y)) {
      s.events.push('failure');
      s.strokes += 1;
      s.ball = { ...s.lastRest, vx: 0, vy: 0 };
      s.message = 'Splash! +1 stroke';
      s.phaseT = 0;
      s.phase = 'aim';
      return;
    }
    const onSlope = hole.slopes?.some((sl) => rectContains(sl, s.ball.x, s.ball.y));
    if ((atRest(s.ball) && !onSlope) || s.rollT > 12) {
      s.ball.vx = s.ball.vy = 0;
      if (s.strokes >= s.tuning.maxStrokes) {
        finishHole(
          s,
          s.tuning.maxStrokes + 1,
          `Stroke limit — ${s.tuning.maxStrokes + 1} on the card`,
        );
        return;
      }
      s.phase = 'aim';
      s.message = '';
    }
    return;
  }
  if (s.phase === 'holed' && s.phaseT > 1.8) {
    if (s.hole + 1 >= HOLES.length) {
      s.over = true;
      s.events.push('levelComplete');
      return;
    }
    startHole(s, s.hole + 1);
  }
}

function drawHole(ctx: CanvasRenderingContext2D, s: State, hole: MiniHole) {
  ctx.fillStyle = '#14532d';
  ctx.fillRect(0, 0, W, H);
  // Decorative hedge pattern.
  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  for (let y = 0; y < H; y += 24)
    for (let x = (y / 24) % 2 ? 12 : 0; x < W; x += 24) ctx.fillRect(x, y, 12, 12);
  const path = (poly: { x: number; y: number }[]) => {
    ctx.beginPath();
    poly.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
  };
  path(hole.outline);
  ctx.fillStyle = '#22c55e';
  ctx.fill();
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 8;
  ctx.stroke();
  for (const sl of hole.slopes ?? []) {
    const g = ctx.createLinearGradient(0, sl.y, 0, sl.y + sl.h);
    g.addColorStop(0, 'rgba(21,128,61,0.9)');
    g.addColorStop(1, 'rgba(74,222,128,0.6)');
    ctx.fillStyle = g;
    ctx.fillRect(sl.x, sl.y, sl.w, sl.h);
    for (let y = sl.y + 20; y < sl.y + sl.h; y += 40) {
      text(ctx, sl.ay > 0 ? '▼' : '▲', sl.x + sl.w / 2, y, {
        size: 16,
        color: 'rgba(255,255,255,0.35)',
      });
    }
  }
  for (const r of hole.sand ?? [])
    fillRound(ctx, r.x + 2, r.y + 2, r.w - 4, r.h - 4, 14, '#fcd34d');
  for (const r of hole.water ?? []) {
    fillRound(ctx, r.x + 2, r.y + 2, r.w - 4, r.h - 4, 10, '#0ea5e9');
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1.5;
    for (let x = r.x + 12; x < r.x + r.w - 12; x += 22) {
      const y = r.y + r.h / 2 + Math.sin(s.time * 2 + x * 0.1) * 4;
      ctx.beginPath();
      ctx.arc(x, y, 5, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    }
  }
  for (const b of hole.blocks ?? []) {
    path(b);
    ctx.fillStyle = '#92400e';
    ctx.fill();
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 4;
    ctx.stroke();
  }
  for (const k of hole.bumpers ?? []) {
    circle(ctx, k.x, k.y, k.r, '#dc2626');
    circle(ctx, k.x, k.y, k.r * 0.55, '#fca5a5');
  }
  if (hole.spinner) {
    const sp = hole.spinner;
    const a = s.time * sp.speed * s.tuning.spinner;
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(sp.x - Math.cos(a) * sp.len, sp.y - Math.sin(a) * sp.len);
    ctx.lineTo(sp.x + Math.cos(a) * sp.len, sp.y + Math.sin(a) * sp.len);
    ctx.stroke();
    ctx.lineCap = 'butt';
    circle(ctx, sp.x, sp.y, 7, '#dc2626');
  }
  circle(ctx, hole.cup.x, hole.cup.y, CUP_R, '#052e16');
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(hole.cup.x, hole.cup.y);
  ctx.lineTo(hole.cup.x, hole.cup.y - 34);
  ctx.stroke();
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.moveTo(hole.cup.x, hole.cup.y - 34);
  ctx.lineTo(hole.cup.x + 18, hole.cup.y - 28);
  ctx.lineTo(hole.cup.x, hole.cup.y - 22);
  ctx.fill();
  fillRound(ctx, hole.tee.x - 14, hole.tee.y - 6, 28, 12, 4, 'rgba(255,255,255,0.25)');
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  const hole = HOLES[s.hole];
  drawHole(ctx, s, hole);
  const b = s.ball;
  if (s.phase === 'aim') {
    const g = s.tuning.guide;
    if (g >= 2) {
      const sim = simulatePutt(hole, b, s.aim.angle, s.aim.power, s.time, s.tuning.spinner, 3);
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.setLineDash([4, 6]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      sim.path.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.stroke();
      ctx.setLineDash([]);
    }
    const len = 18 + s.aim.power * (g >= 1 ? 110 : 45);
    const ex = b.x + Math.cos(s.aim.angle) * len;
    const ey = b.y + Math.sin(s.aim.angle) * len;
    ctx.strokeStyle = s.aim.power > 0.8 ? '#f97316' : '#facc15';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    circle(ctx, ex, ey, 4, ctx.strokeStyle as string);
  }
  if (s.phase !== 'holed') {
    circle(ctx, b.x + 1.5, b.y + 2, BALL_R, 'rgba(0,0,0,0.3)');
    circle(ctx, b.x, b.y, BALL_R, '#f8fafc');
  }
  fillRound(ctx, 8, 8, W - 16, 30, 8, 'rgba(15,23,42,0.8)');
  text(
    ctx,
    `Hole ${s.hole + 1}/${HOLES.length}  ·  Par ${hole.par}  ·  Strokes ${s.strokes}`,
    W / 2,
    23,
    { size: 14 },
  );
  if (s.message && (s.phase === 'holed' || s.phaseT < 2.2)) {
    fillRound(ctx, 40, H - 52, W - 80, 36, 10, 'rgba(15,23,42,0.85)');
    text(ctx, s.message, W / 2, H - 34, {
      size: s.phase === 'holed' ? 18 : 14,
      color: s.phase === 'holed' ? '#fde68a' : '#fff',
    });
  }
}

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create,
  update,
  render,
  hud: (s) => {
    const played = s.card.length;
    const diff = s.card.reduce((a, st) => a + st, 0) - totalPar(played);
    return [
      { label: 'Hole', value: `${s.hole + 1}/${HOLES.length}` },
      {
        label: 'Total',
        value: played ? (diff === 0 ? 'E' : diff > 0 ? `+${diff}` : String(diff)) : 'E',
      },
      { label: 'Strokes', value: s.strokes },
    ];
  },
  result: (s) => {
    const total = s.card.reduce((a, b) => a + b, 0);
    const diff = total - totalPar();
    return {
      score: s.score,
      won: diff <= 0,
      title: `Round complete: ${total} strokes (${diff === 0 ? 'even par' : diff > 0 ? `+${diff}` : diff})`,
      details: HOLES.map((h, i) => ({
        label: `${i + 1}. ${h.name} (par ${h.par})`,
        value: String(s.card[i] ?? '–'),
      })),
    };
  },
  onEnd: (s, difficulty) => {
    const total = s.card.reduce((a, b) => a + b, 0);
    void incrementProgress('mini-golf.rounds', 1);
    if (s.holesInOne > 0) void reportProgress('mini-golf.ace', 1);
    if (total <= totalPar()) void reportProgress('mini-golf.par', 1);
    if (total < totalPar() && difficulty === 'hard') void reportProgress('mini-golf.hard', 1);
  },
  touch: {
    pad: 'dpad',
    buttons: [
      { action: 'action', label: 'Putt' },
      { action: 'action2', label: 'Fine' },
    ],
  },
  pointerStarts: false,
  startHint:
    'Drag back from the ball and release to putt (or ← → aim, ↑ ↓ power, Space). Nine holes — beat par!',
};
