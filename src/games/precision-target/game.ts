import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { burst, circle, drawSparks, gradientBg, text, updateSparks } from '../_shared/arcade/draw';
import type { Spark } from '../_shared/arcade/draw';

/**
 * Precision Target: accuracy over speed. Twenty targets appear one at a
 * time, drifting along smooth paths and shrinking as they go. Each click is
 * scored by how close it is to the bullseye, from 100 for dead centre down
 * to 1 at the rim. Let a target vanish, or miss it entirely, and it scores 0.
 */
export const W = 480;
export const H = 400;
export const TARGETS = 20;

export interface Target {
  cx: number;
  cy: number;
  ax: number;
  ay: number;
  fx: number;
  fy: number;
  r0: number;
  life: number;
  age: number;
}

export interface Shot {
  precision: number;
  x: number;
  y: number;
}

export interface State extends BaseState {
  target: Target | null;
  index: number;
  shots: Shot[];
  gap: number;
  move: number;
  life: number;
  sparks: Spark[];
}

const SETTINGS: Record<DifficultySetting, { move: number; life: number }> = {
  easy: { move: 0.4, life: 3.2 },
  normal: { move: 0.8, life: 2.6 },
  hard: { move: 1.2, life: 2.1 },
};

export function create(difficulty: DifficultySetting): State {
  const c = SETTINGS[difficulty];
  return { ...baseState(), target: null, index: 0, shots: [], gap: 0.6, move: c.move, life: c.life, sparks: [] };
}

export function position(t: Target): { x: number; y: number; r: number } {
  const k = t.age / t.life;
  return {
    x: t.cx + Math.sin(t.age * t.fx) * t.ax,
    y: t.cy + Math.sin(t.age * t.fy + 1) * t.ay,
    r: t.r0 * (1 - k * 0.6),
  };
}

/** 100 at the centre, falling linearly to 1 at the rim; 0 outside. */
export function precisionAt(dist: number, r: number): number {
  if (dist > r) return 0;
  return Math.max(1, Math.round(100 * (1 - dist / r)));
}

function spawn(s: State, random: () => number) {
  const ax = (30 + random() * 70) * s.move;
  const ay = (20 + random() * 50) * s.move;
  s.target = {
    cx: 60 + ax + random() * (W - 120 - 2 * ax),
    cy: 60 + ay + random() * (H - 120 - 2 * ay),
    ax,
    ay,
    fx: 1 + random() * 2,
    fy: 1 + random() * 2,
    r0: 34 - Math.min(12, s.index * 0.5),
    life: s.life,
    age: 0,
  };
}

function record(s: State, shot: Shot) {
  s.shots.push(shot);
  s.score += shot.precision;
  s.target = null;
  s.index += 1;
  s.gap = 0.45;
  if (s.index >= TARGETS) {
    s.over = true;
    s.events.push('levelComplete');
  }
}

export function update(s: State, dt: number, input: Input, random: () => number) {
  if (!s.target) {
    s.gap -= dt;
    if (s.gap <= 0 && s.index < TARGETS) spawn(s, random);
    updateSparks(s.sparks, dt);
    return;
  }
  const t = s.target;
  t.age += dt;
  if (t.age >= t.life) {
    s.events.push('failure');
    record(s, { precision: 0, x: -1, y: -1 });
    return;
  }
  if (input.pointer.pressed) {
    const p = position(t);
    const precision = precisionAt(Math.hypot(input.pointer.x - p.x, input.pointer.y - p.y), p.r);
    s.events.push(precision >= 90 ? 'coin' : precision > 0 ? 'hit' : 'failure');
    if (precision > 0) burst(s.sparks, p.x, p.y, precision >= 90 ? '#fde047' : '#f8fafc', 10, 120, random);
    record(s, { precision, x: input.pointer.x, y: input.pointer.y });
  }
  updateSparks(s.sparks, dt);
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  gradientBg(ctx, W, H, '#1e293b', '#0f172a');
  if (s.target) {
    const p = position(s.target);
    const fade = 1 - s.target.age / s.target.life;
    circle(ctx, p.x, p.y, p.r, '#f8fafc');
    circle(ctx, p.x, p.y, p.r * 0.75, '#ef4444');
    circle(ctx, p.x, p.y, p.r * 0.5, '#f8fafc');
    circle(ctx, p.x, p.y, p.r * 0.25, '#ef4444');
    circle(ctx, p.x, p.y, 1.5, '#0f172a');
    ctx.strokeStyle = `rgba(253,224,71,${fade})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r + 6, -Math.PI / 2, -Math.PI / 2 + fade * Math.PI * 2);
    ctx.stroke();
  }
  drawSparks(ctx, s.sparks);
  const last = s.shots[s.shots.length - 1];
  if (last && !s.target) text(ctx, last.precision ? `${last.precision}%` : 'Miss', W / 2, H / 2, { size: 30, color: last.precision >= 90 ? '#fde047' : '#e2e8f0' });
  text(ctx, `${Math.min(TARGETS, s.index + 1)} / ${TARGETS}`, W - 12, 18, { size: 14, align: 'right', color: '#cbd5e1' });
}

export const average = (s: State) => (s.shots.length ? Math.round(s.shots.reduce((a, b) => a + b.precision, 0) / s.shots.length) : 0);

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create,
  update,
  render,
  hud: (s) => [
    { label: 'Score', value: s.score },
    { label: 'Average', value: `${average(s)}%` },
    { label: 'Target', value: `${Math.min(TARGETS, s.index + 1)}/${TARGETS}` },
  ],
  result: (s) => ({
    score: s.score,
    title: `Average precision ${average(s)}%`,
    details: [
      { label: 'Bullseyes (90%+)', value: String(s.shots.filter((x) => x.precision >= 90).length) },
      { label: 'Missed targets', value: String(s.shots.filter((x) => x.precision === 0).length) },
    ],
  }),
  onEnd: (s) => {
    void reportProgress('precision-target.avg-70', average(s));
    void reportProgress('precision-target.avg-85', average(s));
    void reportProgress('precision-target.bulls-10', s.shots.filter((x) => x.precision >= 90).length);
    void incrementProgress('precision-target.rounds', 1);
  },
  touch: { pad: 'none' },
  startHint: 'Click (or tap) each target as close to the centre as you can before it fades.',
};
