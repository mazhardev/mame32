import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState, clamp } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { circle, fillRound, gradientBg, text } from '../_shared/arcade/draw';

/**
 * Sprint Race: 100 m against three rivals. Alternate the left and right keys
 * (or the two buttons) to run — rhythm matters, pressing the same key twice
 * in a row does nothing. "Set…" then a random pause before the gun; going
 * early is a false start and costs you a second.
 */
export const W = 560;
export const H = 340;
export const DISTANCE = 100;
const LANE_H = 52;
const TRACK_TOP = 90;
const PX_PER_M = 4.4;

export interface Runner {
  name: string;
  color: string;
  pos: number;
  speed: number;
  /** AI cadence: strides per second, and a top speed. */
  cadence: number;
  top: number;
  finish: number | null;
  phase: number;
}

export interface State extends BaseState {
  phase: 'set' | 'running' | 'done';
  gunAt: number;
  me: Runner;
  rivals: Runner[];
  lastFoot: 'left' | 'right' | null;
  falseStart: boolean;
  penalty: number;
  taps: number;
  difficulty: DifficultySetting;
}

const AI: Record<DifficultySetting, [number, number]> = { easy: [8.6, 8.2], normal: [9.4, 9.1], hard: [10.2, 10] };

function runner(name: string, color: string, top: number): Runner {
  return { name, color, pos: 0, speed: 0, cadence: 0, top, finish: null, phase: 0 };
}

export function create(difficulty: DifficultySetting, random: () => number = Math.random): State {
  const [lo, hi] = AI[difficulty];
  const rivals = ['Ade', 'Bea', 'Cal'].map((n, i) => runner(n, ['#ef4444', '#22c55e', '#a855f7'][i], lo + (hi - lo) * random() + i * 0.1));
  return { ...baseState(), phase: 'set', gunAt: 1.5 + random() * 2, me: runner('You', '#2563eb', 11), rivals, lastFoot: null, falseStart: false, penalty: 0, taps: 0, difficulty };
}

/** A stride: alternating feet add speed; repeating a foot does not. */
export function stride(s: State, foot: 'left' | 'right') {
  if (s.phase === 'set') {
    if (!s.falseStart) {
      s.falseStart = true;
      s.penalty = 1;
      s.events.push('failure');
    }
    return;
  }
  if (s.phase !== 'running' || s.me.finish !== null) return;
  if (foot === s.lastFoot) return;
  s.lastFoot = foot;
  s.taps += 1;
  s.me.speed = Math.min(s.me.top, s.me.speed + 0.75);
}

export const elapsed = (s: State) => Math.max(0, s.time - s.gunAt);

export function update(s: State, dt: number, input: Input) {
  if (input.pressed.has('left') || input.keys.has('z') || input.keys.has('a')) stride(s, 'left');
  if (input.pressed.has('right') || input.keys.has('m') || input.keys.has('l')) stride(s, 'right');
  if (input.pointer.pressed) stride(s, input.pointer.x < W / 2 ? 'left' : 'right');
  if (s.phase === 'set') {
    if (s.time >= s.gunAt) {
      s.phase = 'running';
      s.events.push('powerup');
    }
    return;
  }
  const t = elapsed(s);
  const me = s.me;
  if (me.finish === null) {
    // The penalty holds a false starter in the blocks for a moment.
    if (t > s.penalty) {
      me.speed = Math.max(0, me.speed - 2.6 * dt);
      me.pos += me.speed * dt;
      me.phase += me.speed * dt * 0.9;
    } else me.speed = 0;
    if (me.pos >= DISTANCE) {
      me.finish = t;
      s.events.push('levelComplete');
    }
  }
  for (const r of s.rivals) {
    if (r.finish !== null) continue;
    // Rivals accelerate smoothly to their top speed, fading slightly late on.
    const target = r.top * (r.pos > 70 ? 0.97 : 1);
    r.speed += (target - r.speed) * Math.min(1, dt * 1.1);
    r.pos += r.speed * dt;
    r.phase += r.speed * dt * 0.9;
    if (r.pos >= DISTANCE) r.finish = t;
  }
  if (me.finish !== null && (s.rivals.every((r) => r.finish !== null) || t > me.finish + 3)) {
    s.phase = 'done';
    s.over = true;
    const place = placeOf(s);
    s.score = Math.max(0, Math.round((20 - me.finish) * 100)) + (place === 1 ? 500 : place === 2 ? 250 : place === 3 ? 100 : 0);
  }
  if (t > 40 && me.finish === null) {
    me.finish = t;
  }
}

export function placeOf(s: State): number {
  const mine = s.me.finish ?? Infinity;
  return 1 + s.rivals.filter((r) => (r.finish ?? Infinity) < mine).length;
}

function drawRunner(ctx: CanvasRenderingContext2D, r: Runner, lane: number) {
  const x = 40 + Math.min(DISTANCE + 6, r.pos) * PX_PER_M;
  const y = TRACK_TOP + lane * LANE_H + LANE_H / 2;
  const swing = Math.sin(r.phase * 3);
  ctx.strokeStyle = r.color;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y - 6);
  ctx.lineTo(x + swing * 9, y + 14);
  ctx.moveTo(x, y - 6);
  ctx.lineTo(x - swing * 9, y + 14);
  ctx.moveTo(x, y - 18);
  ctx.lineTo(x, y - 6);
  ctx.moveTo(x, y - 16);
  ctx.lineTo(x - swing * 8, y - 6);
  ctx.moveTo(x, y - 16);
  ctx.lineTo(x + swing * 8, y - 6);
  ctx.stroke();
  circle(ctx, x, y - 23, 6, r.color);
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  gradientBg(ctx, W, H, '#bae6fd', '#e0f2fe');
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(0, 40, W, 40);
  for (let i = 0; i < 40; i++) circle(ctx, 10 + i * 14, 52 + (i % 3) * 8, 4, ['#f87171', '#60a5fa', '#fbbf24', '#34d399'][i % 4]);
  fillRound(ctx, 0, TRACK_TOP, W, LANE_H * 4, 0, '#c2410c');
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 2;
  for (let l = 0; l <= 4; l++) {
    ctx.beginPath();
    ctx.moveTo(0, TRACK_TOP + l * LANE_H);
    ctx.lineTo(W, TRACK_TOP + l * LANE_H);
    ctx.stroke();
  }
  ctx.fillStyle = '#fff';
  ctx.fillRect(38, TRACK_TOP, 3, LANE_H * 4);
  for (let k = 0; k < 8; k++) {
    ctx.fillStyle = k % 2 ? '#111' : '#fff';
    ctx.fillRect(40 + DISTANCE * PX_PER_M, TRACK_TOP + k * (LANE_H / 2), 6, LANE_H / 2);
  }
  s.rivals.forEach((r, i) => drawRunner(ctx, r, i < 1 ? i : i + 1));
  drawRunner(ctx, s.me, 1);
  const t = elapsed(s);
  if (s.phase === 'set') text(ctx, s.falseStart ? 'False start! +1 s' : 'Set…', W / 2, 24, { size: 22, color: s.falseStart ? '#dc2626' : '#0f172a' });
  else text(ctx, `${t.toFixed(2)} s`, W / 2, 24, { size: 22, color: '#0f172a' });
  const speedBar = clamp(s.me.speed / s.me.top, 0, 1);
  fillRound(ctx, 20, H - 26, 160, 12, 6, 'rgba(0,0,0,0.15)');
  fillRound(ctx, 20, H - 26, 160 * speedBar, 12, 6, '#2563eb');
  text(ctx, 'Speed', 200, H - 20, { size: 12, align: 'left', color: '#0f172a' });
  text(ctx, `${Math.max(0, DISTANCE - s.me.pos).toFixed(0)} m to go`, W - 20, H - 20, { size: 13, align: 'right', color: '#0f172a' });
}

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create,
  update,
  render,
  customKeys: ['z', 'm', 'a', 'l'],
  hud: (s) => [
    { label: 'Time', value: `${elapsed(s).toFixed(2)}s` },
    { label: 'Distance', value: `${Math.min(DISTANCE, s.me.pos).toFixed(0)} m` },
    { label: 'Speed', value: `${(s.me.speed * 3.6).toFixed(0)} km/h` },
  ],
  result: (s) => {
    const place = placeOf(s);
    return {
      score: s.score,
      won: place === 1,
      timeMs: Math.round((s.me.finish ?? 0) * 1000),
      title: place === 1 ? 'Gold!' : place === 2 ? 'Silver!' : place === 3 ? 'Bronze!' : 'Fourth place',
      details: [
        { label: 'Your time', value: `${(s.me.finish ?? 0).toFixed(2)} s` },
        { label: 'Winner', value: place === 1 ? 'You' : [...s.rivals].sort((a, b) => (a.finish ?? 99) - (b.finish ?? 99))[0].name },
        { label: 'Strides', value: String(s.taps) },
      ],
    };
  },
  onEnd: (s) => {
    const place = placeOf(s);
    if (place === 1) void reportProgress('sprint-race.gold', 1);
    if (place === 1 && s.difficulty === 'hard') void reportProgress('sprint-race.hard', 1);
    if ((s.me.finish ?? 99) < 11) void reportProgress('sprint-race.fast', 1);
    void incrementProgress('sprint-race.races', 1);
  },
  touch: { pad: 'horizontal' },
  pointerStarts: true,
  startHint: 'Alternate ← and → (or Z and M, or tap the two halves) as fast as you can after the gun. Don’t go early!',
};
