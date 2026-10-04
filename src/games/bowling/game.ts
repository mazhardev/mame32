import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState, clamp } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { circle, fillRound, text } from '../_shared/arcade/draw';
import {
  BALL_R,
  GUTTER,
  HALF,
  LANE,
  PIN_R,
  knocked,
  marks,
  pinSpots,
  position,
  rack,
  scoreFrames,
  standingNumbers,
  startRoll,
  stepRoll,
} from './engine';
import type { Roll } from './engine';

/**
 * A full ten-frame game of bowling. Set your start position and hook, then
 * stop the aim and power meters (or swipe the ball up the lane).
 */
export const W = 360;
export const H = 640;
const FOUL_SY = H - 110;
const SY = 0.7;
const MAX_ANGLE = 0.024;

type Phase = 'position' | 'aim' | 'power' | 'rolling' | 'result';

interface Tuning {
  meter: number;
  guide: number;
  oil: [number, number];
}

const TUNING: Record<DifficultySetting, Tuning> = {
  easy: { meter: 0.55, guide: 1, oil: [1, 1] },
  normal: { meter: 0.8, guide: 0.3, oil: [0.85, 1.15] },
  hard: { meter: 1.1, guide: 0, oil: [0.7, 1.3] },
};

export interface State extends BaseState {
  phase: Phase;
  rolls: number[];
  standing: number[];
  x: number;
  spin: number;
  angle: number;
  power: number;
  meterT: number;
  roll: Roll | null;
  result: string;
  resultT: number;
  strikes: number;
  spares: number;
  streak: number;
  bestStreak: number;
  oil: number;
  tuning: Tuning;
  swipe: { x: number; y: number }[] | null;
  camY: number;
  hitSound: boolean;
}

export function create(difficulty: DifficultySetting, random: () => number): State {
  const t = TUNING[difficulty];
  return {
    ...baseState(),
    phase: 'position',
    rolls: [],
    standing: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    x: 45,
    spin: -0.5,
    angle: 0,
    power: 0.7,
    meterT: 0,
    roll: null,
    result: '',
    resultT: 0,
    strikes: 0,
    spares: 0,
    streak: 0,
    bestStreak: 0,
    oil: t.oil[0] + random() * (t.oil[1] - t.oil[0]),
    tuning: t,
    swipe: null,
    camY: 0,
    hitSound: false,
  };
}

const toScreenX = (x: number) => W / 2 + x;
const toScreenY = (s: State, y: number) => FOUL_SY + (y - s.camY) * SY;

export function speedFor(power: number) {
  return 750 + power * 600;
}

export function release(s: State, angle: number, power: number, spin: number) {
  s.roll = startRoll(rack(s.standing), s.x, angle, speedFor(power), spin * s.oil);
  s.phase = 'rolling';
  s.hitSound = false;
  s.events.push('whoosh');
}

function finishRoll(s: State) {
  const roll = s.roll;
  if (!roll) return;
  const before = s.standing.length;
  const down = knocked(roll);
  s.rolls.push(down);
  const wasFull = before === 10;
  if (wasFull && down === 10) {
    s.result = 'STRIKE!';
    s.strikes += 1;
    s.streak += 1;
    s.bestStreak = Math.max(s.bestStreak, s.streak);
    s.events.push('success');
  } else if (!wasFull && down === before) {
    s.result = 'Spare!';
    s.spares += 1;
    s.streak = 0;
    s.events.push('success');
  } else {
    s.result = down === 0 ? (roll.ball.gutter ? 'Gutter ball' : 'Missed') : `${down} pin${down === 1 ? '' : 's'}`;
    s.streak = 0;
  }
  const next = position(s.rolls);
  s.standing = next.fullRack ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] : standingNumbers(roll);
  const frames = scoreFrames(s.rolls);
  const done = frames.filter((f) => f !== null) as number[];
  s.score = done.length ? done[done.length - 1] : 0;
  s.phase = 'result';
  s.resultT = 1.5;
}

/** Signed sideways bulge of a swipe relative to its chord, as a hook amount. */
export function swipeHook(path: { x: number; y: number }[]): number {
  if (path.length < 3) return 0;
  const a = path[0];
  const b = path[path.length - 1];
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  let bulge = 0;
  for (const p of path) {
    const d = ((b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x)) / len;
    if (Math.abs(d) > Math.abs(bulge)) bulge = d;
  }
  // A swipe bowed out to the right curves back left, like a real hook.
  return clamp(-bulge / 30, -1, 1);
}

function handleSwipe(s: State, input: Input) {
  const p = input.pointer;
  if (p.pressed) s.swipe = [{ x: p.x, y: p.y }];
  if (!s.swipe) return;
  if (p.down) {
    const last = s.swipe[s.swipe.length - 1];
    if (Math.hypot(p.x - last.x, p.y - last.y) > 4) s.swipe.push({ x: p.x, y: p.y });
    const first = s.swipe[0];
    // A mostly sideways drag near the start moves the ball.
    if (first.y - p.y < 30) s.x = clamp(s.x + (p.x - last.x), -HALF + BALL_R, HALF - BALL_R);
  }
  if (p.released) {
    const path = s.swipe;
    s.swipe = null;
    const a = path[0];
    const b = path[path.length - 1];
    const up = a.y - b.y;
    if (up < 60) return;
    const angle = clamp(((b.x - a.x) / up) * 0.08, -MAX_ANGLE, MAX_ANGLE);
    const power = clamp(up / 260, 0.3, 1);
    release(s, angle, power, swipeHook(path));
  }
}

export function update(s: State, dt: number, input: Input) {
  const t = s.tuning;
  if (s.phase === 'position') {
    if (input.held.has('left')) s.x -= 70 * dt;
    if (input.held.has('right')) s.x += 70 * dt;
    if (input.pressed.has('up')) s.spin = clamp(Math.round((s.spin - 0.25) * 4) / 4, -1, 1);
    if (input.pressed.has('down')) s.spin = clamp(Math.round((s.spin + 0.25) * 4) / 4, -1, 1);
    s.x = clamp(s.x, -HALF + BALL_R, HALF - BALL_R);
    handleSwipe(s, input);
    if (s.phase === 'position' && input.pressed.has('action')) {
      s.phase = 'aim';
      s.meterT = 0;
    }
  } else if (s.phase === 'aim') {
    s.meterT += dt * t.meter;
    s.angle = Math.sin(s.meterT * Math.PI) * MAX_ANGLE;
    if (input.pressed.has('action') || input.pointer.pressed) {
      s.phase = 'power';
      s.meterT = 0;
    }
  } else if (s.phase === 'power') {
    s.meterT += dt * t.meter * 1.3;
    s.power = 0.3 + 0.7 * Math.abs(Math.sin(s.meterT * Math.PI * 0.5));
    if (input.pressed.has('action') || input.pointer.pressed) release(s, s.angle, s.power, s.spin);
  } else if (s.phase === 'rolling' && s.roll) {
    const steps = Math.ceil(dt * 240);
    for (let i = 0; i < steps && !s.roll.done; i++) {
      if (stepRoll(s.roll, dt / steps) && !s.hitSound) {
        s.hitSound = true;
        s.events.push('explosion');
      }
    }
    s.camY = clamp(s.roll.ball.y + 120, -LANE + 520, 0);
    if (s.roll.done) finishRoll(s);
  } else if (s.phase === 'result') {
    s.resultT -= dt;
    if (s.resultT <= 0) {
      if (position(s.rolls).over) {
        s.over = true;
        s.events.push('levelComplete');
        return;
      }
      s.roll = null;
      s.camY = 0;
      s.phase = 'position';
    }
  }
}

/** Predicted path of the current setup, for the aim guide. */
function guidePath(s: State, angle: number) {
  const r = startRoll([], s.x, angle, speedFor(s.power), s.spin * (s.tuning.guide >= 1 ? s.oil : 1));
  const pts: { x: number; y: number }[] = [];
  const limit = -LANE * s.tuning.guide;
  for (let i = 0; i < 2000 && r.ball.y > Math.max(limit, -LANE) && !r.ball.gutter; i++) {
    stepRoll(r, 1 / 120);
    if (i % 6 === 0) pts.push({ x: r.ball.x, y: r.ball.y });
  }
  return pts;
}

function drawLane(ctx: CanvasRenderingContext2D, s: State) {
  ctx.fillStyle = '#1f2937';
  ctx.fillRect(0, 0, W, H);
  const top = toScreenY(s, -LANE - 260);
  ctx.fillStyle = '#4b5563';
  ctx.fillRect(toScreenX(-HALF - GUTTER), top, LANE_PX(), FOUL_SY + 120 - top);
  const g = ctx.createLinearGradient(toScreenX(-HALF), 0, toScreenX(HALF), 0);
  g.addColorStop(0, '#d6a46a');
  g.addColorStop(0.5, '#e8c08c');
  g.addColorStop(1, '#d6a46a');
  ctx.fillStyle = g;
  const deckTop = toScreenY(s, -LANE - 170);
  ctx.fillRect(toScreenX(-HALF), deckTop, HALF * 2, FOUL_SY - deckTop);
  ctx.strokeStyle = 'rgba(120,72,30,0.18)';
  ctx.lineWidth = 1;
  for (let b = -HALF + 4; b < HALF; b += 4) {
    ctx.beginPath();
    ctx.moveTo(toScreenX(b), deckTop);
    ctx.lineTo(toScreenX(b), FOUL_SY);
    ctx.stroke();
  }
  // Targeting arrows and dots.
  ctx.fillStyle = '#7c2d12';
  for (let i = -3; i <= 3; i++) {
    const x = toScreenX(i * 20);
    const y = toScreenY(s, -560 - Math.abs(i) * 24);
    ctx.beginPath();
    ctx.moveTo(x, y - 9);
    ctx.lineTo(x - 5, y + 5);
    ctx.lineTo(x + 5, y + 5);
    ctx.fill();
    circle(ctx, x, toScreenY(s, -320), 2.5, '#7c2d12');
  }
  ctx.fillStyle = '#b91c1c';
  ctx.fillRect(toScreenX(-HALF - GUTTER), FOUL_SY - 2, HALF * 2 + GUTTER * 2, 4);
}

const LANE_PX = () => HALF * 2 + GUTTER * 2;

function drawPin(ctx: CanvasRenderingContext2D, s: State, x: number, y: number, down: boolean, angle: number) {
  const sx = toScreenX(x);
  const sy = toScreenY(s, y);
  if (down) {
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(angle);
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.ellipse(0, 0, PIN_R * 1.8, PIN_R * 0.75, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(PIN_R * 0.6, -PIN_R * 0.5, 3, PIN_R);
    ctx.restore();
    return;
  }
  circle(ctx, sx + 1.5, sy + 2.5, PIN_R, 'rgba(0,0,0,0.25)');
  circle(ctx, sx, sy, PIN_R, '#f8fafc');
  ctx.strokeStyle = '#dc2626';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(sx, sy, PIN_R * 0.6, 0, Math.PI * 2);
  ctx.stroke();
  circle(ctx, sx, sy, PIN_R * 0.3, '#e5e7eb');
}

function drawBall(ctx: CanvasRenderingContext2D, x: number, y: number) {
  circle(ctx, x + 2, y + 3, BALL_R, 'rgba(0,0,0,0.3)');
  const g = ctx.createRadialGradient(x - 5, y - 5, 2, x, y, BALL_R);
  g.addColorStop(0, '#a78bfa');
  g.addColorStop(1, '#4c1d95');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, BALL_R, 0, Math.PI * 2);
  ctx.fill();
  for (const [dx, dy] of [
    [-4, -6],
    [3, -7],
    [0, -1],
  ]) circle(ctx, x + dx, y + dy, 2, '#1e1b4b');
}

function drawSheet(ctx: CanvasRenderingContext2D, s: State) {
  const m = marks(s.rolls);
  const f = scoreFrames(s.rolls);
  const bw = 33;
  const x0 = (W - bw * 10) / 2;
  fillRound(ctx, x0 - 4, 6, bw * 10 + 8, 46, 6, 'rgba(15,23,42,0.88)');
  const cur = position(s.rolls).frame;
  for (let i = 0; i < 10; i++) {
    const x = x0 + i * bw;
    ctx.strokeStyle = i === cur && !s.over ? '#facc15' : 'rgba(148,163,184,0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, 10.5, bw - 1, 38);
    const mk = m[i] ?? [];
    text(ctx, mk.join(' '), x + bw / 2, 20, { size: 10, color: '#fde68a', weight: 600 });
    const v = f[i];
    if (v !== undefined && v !== null) text(ctx, String(v), x + bw / 2, 38, { size: 12 });
  }
}

function drawRackMap(ctx: CanvasRenderingContext2D, s: State) {
  fillRound(ctx, W - 74, 60, 66, 60, 8, 'rgba(15,23,42,0.75)');
  for (const p of pinSpots()) {
    const x = W - 41 + p.x * 0.27;
    const y = 72 + (-LANE - p.y) * 0.32;
    circle(ctx, x, y, 4.5, s.standing.includes(p.n) ? '#f8fafc' : 'rgba(148,163,184,0.25)');
  }
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  drawLane(ctx, s);
  const pins = s.roll ? s.roll.pins : rack(s.standing);
  for (const p of pins) if (!p.gone) drawPin(ctx, s, p.x, p.y, p.down, p.angle);

  if (s.phase === 'position' || s.phase === 'aim' || s.phase === 'power') {
    if (s.tuning.guide > 0) {
      const pts = guidePath(s, s.phase === 'position' ? 0 : s.angle);
      ctx.strokeStyle = 'rgba(250,204,21,0.7)';
      ctx.setLineDash([6, 6]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(toScreenX(p.x), toScreenY(s, p.y)) : ctx.moveTo(toScreenX(p.x), toScreenY(s, p.y))));
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (s.phase !== 'position') {
      ctx.strokeStyle = 'rgba(250,204,21,0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(toScreenX(s.x), FOUL_SY - 10);
      ctx.lineTo(toScreenX(s.x + Math.tan(s.angle) * 600), toScreenY(s, -600));
      ctx.stroke();
    }
    drawBall(ctx, toScreenX(s.x), FOUL_SY - 10);
  } else if (s.roll) {
    const b = s.roll.ball;
    if (b.y > -LANE - 240) drawBall(ctx, toScreenX(b.x), toScreenY(s, b.y));
  }

  drawSheet(ctx, s);
  drawRackMap(ctx, s);

  const panelY = H - 62;
  if (s.phase === 'position') {
    fillRound(ctx, 10, panelY, W - 20, 52, 10, 'rgba(15,23,42,0.85)');
    const hook = s.spin === 0 ? 'straight' : `${Math.abs(s.spin) * 100}% hook ${s.spin < 0 ? '←' : '→'}`;
    text(ctx, `← → position   ↑ ↓ hook: ${hook}`, W / 2, panelY + 17, { size: 13 });
    text(ctx, 'Space to aim — or swipe the ball up the lane', W / 2, panelY + 37, { size: 12, color: '#cbd5e1', weight: 500 });
  } else if (s.phase === 'aim' || s.phase === 'power') {
    fillRound(ctx, 10, panelY, W - 20, 52, 10, 'rgba(15,23,42,0.85)');
    const isPower = s.phase === 'power';
    text(ctx, isPower ? 'Power — Space / tap to roll' : 'Aim — Space / tap to lock', W / 2, panelY + 15, { size: 13 });
    fillRound(ctx, 30, panelY + 28, W - 60, 14, 7, '#334155');
    if (isPower) fillRound(ctx, 30, panelY + 28, (W - 60) * s.power, 14, 7, '#f97316');
    else circle(ctx, W / 2 + (s.angle / MAX_ANGLE) * (W / 2 - 40), panelY + 35, 8, '#facc15');
  } else if (s.phase === 'result') {
    fillRound(ctx, 70, H / 2 - 30, W - 140, 60, 14, 'rgba(15,23,42,0.85)');
    text(ctx, s.result, W / 2, H / 2, { size: s.result === 'STRIKE!' ? 30 : 24, color: s.result === 'STRIKE!' ? '#facc15' : '#fff' });
  }
}

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create,
  update,
  render,
  hud: (s) => {
    const pos = position(s.rolls);
    return [
      { label: 'Frame', value: `${Math.min(10, pos.frame + 1)}/10` },
      { label: 'Score', value: s.score },
      { label: 'Strikes', value: s.strikes },
    ];
  },
  result: (s) => ({
    score: s.score,
    won: s.score >= 100,
    title: s.score === 300 ? 'A perfect game!' : `Final score ${s.score}`,
    details: [
      { label: 'Strikes', value: String(s.strikes) },
      { label: 'Spares', value: String(s.spares) },
      { label: 'Best run of strikes', value: String(s.bestStreak) },
    ],
  }),
  onEnd: (s) => {
    if (s.strikes > 0) void reportProgress('bowling.strike', 1);
    if (s.spares > 0) void reportProgress('bowling.spare', 1);
    void reportProgress('bowling.turkey', s.bestStreak);
    void reportProgress('bowling.s150', s.score);
    void incrementProgress('bowling.games', 1);
  },
  touch: { pad: 'dpad', buttons: [{ action: 'action', label: 'Aim / Roll' }] },
  pointerStarts: true,
  startHint: 'Position with ← →, set hook with ↑ ↓, then Space to stop the aim and power meters. Or swipe the ball up the lane.',
};
