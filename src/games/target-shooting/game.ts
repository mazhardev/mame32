import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState, clamp } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { circle, fillRound, gradientBg, text } from '../_shared/arcade/draw';

/**
 * Target Shooting: a ten-shot rifle range. The sight drifts with your
 * breathing, so the crosshair never sits perfectly still. Hold your breath
 * (Shift / X or the Steady button) to calm it for a few seconds — hold too
 * long and it shakes worse than before. On Hard, wind nudges each shot.
 * Scoring uses the ten rings of a real target, with an inner X ring.
 */
export const W = 440;
export const H = 440;
export const TX = W / 2;
export const TY = H / 2 - 10;
export const RING = 17;
export const SHOTS = 10;

export interface Hole {
  x: number;
  y: number;
  points: number;
  x10: boolean;
}

export interface State extends BaseState {
  aimX: number;
  aimY: number;
  swayX: number;
  swayY: number;
  sway: number;
  breath: number;
  holding: boolean;
  shaky: number;
  wind: number;
  holes: Hole[];
  cd: number;
  difficulty: DifficultySetting;
}

const SWAY: Record<DifficultySetting, number> = { easy: 10, normal: 16, hard: 22 };

export function create(difficulty: DifficultySetting, random: () => number = Math.random): State {
  return {
    ...baseState(),
    aimX: TX,
    aimY: TY,
    swayX: 0,
    swayY: 0,
    sway: SWAY[difficulty],
    breath: 1,
    holding: false,
    shaky: 0,
    wind: difficulty === 'hard' ? (random() - 0.5) * 2 : 0,
    holes: [],
    cd: 0.3,
    difficulty,
  };
}

/** Points for a hit at distance d from the centre: 10 in the middle ring down to 1, 0 outside. */
export function ringScore(d: number): { points: number; x10: boolean } {
  const ring = Math.floor(d / RING);
  return { points: Math.max(0, 10 - ring), x10: d < RING * 0.5 };
}

export function update(s: State, dt: number, input: Input, random: () => number) {
  const move = 160 * dt;
  if (input.held.has('left')) s.aimX -= move;
  if (input.held.has('right')) s.aimX += move;
  if (input.held.has('up')) s.aimY -= move;
  if (input.held.has('down')) s.aimY += move;
  if (input.pointer.active && !input.held.size) {
    s.aimX = input.pointer.x;
    s.aimY = input.pointer.y;
  }
  s.aimX = clamp(s.aimX, 0, W);
  s.aimY = clamp(s.aimY, 0, H);

  // Breath: holding steadies the sight until the breath runs out.
  s.holding = input.held.has('action2') && s.breath > 0;
  if (s.holding) s.breath = Math.max(0, s.breath - dt / 4);
  else s.breath = Math.min(1, s.breath + dt / 5);
  if (s.breath === 0) s.shaky = 1.5;
  s.shaky = Math.max(0, s.shaky - dt);
  const amp = s.sway * (s.holding ? 0.15 : 1) * (s.shaky > 0 ? 2 : 1);
  // A slow figure-of-eight drift plus a little tremor.
  s.swayX = Math.sin(s.time * 0.9) * amp + (random() - 0.5) * amp * 0.15;
  s.swayY = Math.sin(s.time * 1.7) * amp * 0.6 + (random() - 0.5) * amp * 0.15;

  s.cd = Math.max(0, s.cd - dt);
  const fire = input.pressed.has('action') || input.pointer.released;
  if (fire && s.cd === 0 && s.holes.length < SHOTS) {
    const x = s.aimX + s.swayX + s.wind * 18;
    const y = s.aimY + s.swayY;
    const { points, x10 } = ringScore(Math.hypot(x - TX, y - TY));
    s.holes.push({ x, y, points, x10 });
    s.score += points;
    s.cd = 0.8;
    s.events.push(points >= 9 ? 'coin' : points > 0 ? 'hit' : 'failure');
    if (s.difficulty === 'hard') s.wind = clamp(s.wind + (random() - 0.5), -1.2, 1.2);
    if (s.holes.length >= SHOTS) {
      s.over = true;
      s.events.push('levelComplete');
    }
  }
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  gradientBg(ctx, W, H, '#d6d3d1', '#a8a29e');
  fillRound(ctx, TX - 190, TY - 190, 380, 380, 12, '#f5f5f4');
  for (let ring = 10; ring >= 1; ring--) {
    const r = (11 - ring) * RING;
    circle(ctx, TX, TY, r, ring >= 7 ? (ring % 2 ? '#111827' : '#1f2937') : ring % 2 ? '#f5f5f4' : '#e7e5e4');
    ctx.strokeStyle = ring >= 7 ? '#e5e7eb' : '#57534e';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(TX, TY, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.strokeStyle = '#e5e7eb';
  ctx.beginPath();
  ctx.arc(TX, TY, RING * 0.5, 0, Math.PI * 2);
  ctx.stroke();
  for (const h of s.holes) {
    circle(ctx, h.x, h.y, 4, '#fbbf24');
    circle(ctx, h.x, h.y, 2, '#000');
  }
  // Sight.
  const x = s.aimX + s.swayX;
  const y = s.aimY + s.swayY;
  ctx.strokeStyle = s.shaky > 0 ? '#ef4444' : s.holding ? '#22c55e' : '#2563eb';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, 14, 0, Math.PI * 2);
  ctx.moveTo(x - 24, y);
  ctx.lineTo(x - 6, y);
  ctx.moveTo(x + 6, y);
  ctx.lineTo(x + 24, y);
  ctx.moveTo(x, y - 24);
  ctx.lineTo(x, y - 6);
  ctx.moveTo(x, y + 6);
  ctx.lineTo(x, y + 24);
  ctx.stroke();
  // Breath meter.
  fillRound(ctx, 12, H - 22, 120, 10, 5, 'rgba(0,0,0,0.2)');
  fillRound(ctx, 12, H - 22, 120 * s.breath, 10, 5, s.breath < 0.25 ? '#ef4444' : '#22c55e');
  text(ctx, 'Breath', 140, H - 17, { size: 11, align: 'left', color: '#292524' });
  if (s.wind) text(ctx, `Wind ${s.wind > 0 ? '→' : '←'} ${Math.abs(s.wind * 10).toFixed(0)}`, W - 12, H - 17, { size: 12, align: 'right', color: '#292524' });
  text(ctx, `Shot ${Math.min(SHOTS, s.holes.length + 1)} / ${SHOTS}`, W - 12, 16, { size: 13, align: 'right', color: '#292524' });
  const last = s.holes[s.holes.length - 1];
  if (last) text(ctx, last.x10 ? 'X!' : String(last.points), 18, 18, { size: 18, align: 'left', color: '#292524' });
}

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create,
  update,
  render,
  pointerStarts: true,
  hud: (s) => [
    { label: 'Score', value: s.score },
    { label: 'Shots', value: `${s.holes.length}/${SHOTS}` },
    { label: 'X', value: s.holes.filter((h) => h.x10).length },
  ],
  result: (s) => ({
    score: s.score,
    title: `${s.score} / 100`,
    details: [
      { label: 'Inner X hits', value: String(s.holes.filter((h) => h.x10).length) },
      { label: 'Best shot', value: String(Math.max(0, ...s.holes.map((h) => h.points))) },
    ],
  }),
  onEnd: (s) => {
    void reportProgress('target-shooting.score-80', s.score);
    void reportProgress('target-shooting.score-95', s.score);
    void reportProgress('target-shooting.x-3', s.holes.filter((h) => h.x10).length);
    void incrementProgress('target-shooting.rounds', 1);
  },
  touch: { pad: 'none', buttons: [{ action: 'action2', label: 'Steady' }] },
  startHint: 'Aim with the mouse (fire on release) or arrows + Space. Hold Shift/X to hold your breath.',
};
