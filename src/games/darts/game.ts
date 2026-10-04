import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState, clamp } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { circle, fillRound, text } from '../_shared/arcade/draw';
import { ORDER, R, aiTarget, applyDart, scoreAt, targetPoint } from './engine';
import type { Hit } from './engine';

/**
 * Darts: 301 with a double finish against the computer. Your aim drifts in a
 * slow circle, so release when it passes over your target. Three darts per
 * turn; a bust (going below zero, to one, or to zero without a double)
 * cancels the whole turn.
 */
export const W = 460;
export const H = 500;
const CX = W / 2;
const CY = 240;
const K = 1.12;
export const START = 301;

export interface Dart {
  x: number;
  y: number;
  hit: Hit;
  mine: boolean;
}

export interface State extends BaseState {
  scores: [number, number];
  turn: 0 | 1;
  turnStart: number;
  dartsThrown: number;
  darts: Dart[];
  aimX: number;
  aimY: number;
  aiTimer: number;
  aiSpread: number;
  message: string;
  messageT: number;
  legs: [number, number];
  doubles: number;
  bestTurn: number;
  turnTotal: number;
  sway: number;
}

const SPREAD: Record<DifficultySetting, number> = { easy: 34, normal: 22, hard: 13 };

export function create(difficulty: DifficultySetting): State {
  return {
    ...baseState(),
    scores: [START, START],
    turn: 0,
    turnStart: START,
    dartsThrown: 0,
    darts: [],
    aimX: 0,
    aimY: -103,
    aiTimer: 0,
    aiSpread: SPREAD[difficulty],
    message: 'Your throw',
    messageT: 1.5,
    legs: [0, 0],
    doubles: 0,
    bestTurn: 0,
    turnTotal: 0,
    sway: difficulty === 'hard' ? 9 : difficulty === 'easy' ? 6 : 7.5,
  };
}

function gaussian(random: () => number): number {
  return Math.sqrt(-2 * Math.log(Math.max(1e-9, random()))) * Math.cos(2 * Math.PI * random());
}

function endTurn(s: State, bust: boolean) {
  if (bust) s.scores[s.turn] = s.turnStart;
  else if (s.turn === 0) s.bestTurn = Math.max(s.bestTurn, s.turnTotal);
  s.turn = s.turn === 0 ? 1 : 0;
  s.turnStart = s.scores[s.turn];
  s.dartsThrown = 0;
  s.turnTotal = 0;
  s.aiTimer = 1.1;
  s.darts = s.darts.slice(-3);
}

/** Throws one dart landing at (x, y) in board units. */
export function throwDart(s: State, x: number, y: number) {
  const hit = scoreAt(x, y);
  s.darts.push({ x, y, hit, mine: s.turn === 0 });
  s.dartsThrown += 1;
  s.events.push(hit.value ? 'hit' : 'failure');
  const next = applyDart(s.scores[s.turn], hit);
  if (next === null) {
    s.message = 'Bust!';
    s.messageT = 1.4;
    s.events.push('failure');
    endTurn(s, true);
    return;
  }
  s.scores[s.turn] = next;
  s.turnTotal += hit.value;
  s.message = hit.label;
  s.messageT = 0.8;
  if (next === 0) {
    s.legs[s.turn] += 1;
    if (s.turn === 0) s.doubles += 1;
    s.over = true;
    s.score = s.turn === 0 ? 500 + Math.max(0, 30 - s.darts.filter((d) => d.mine).length) * 20 : 0;
    s.events.push(s.turn === 0 ? 'levelComplete' : 'gameOver');
    return;
  }
  if (s.dartsThrown >= 3) {
    if (s.turn === 0 && s.turnTotal === 180) void reportProgress('darts.max', 1);
    endTurn(s, false);
  }
}

export function update(s: State, dt: number, input: Input, random: () => number) {
  s.messageT = Math.max(0, s.messageT - dt);
  if (s.turn === 1) {
    s.aiTimer -= dt;
    if (s.aiTimer <= 0) {
      const [tx, ty] = targetPoint(aiTarget(s.scores[1]));
      throwDart(s, tx + gaussian(random) * s.aiSpread * 0.6, ty + gaussian(random) * s.aiSpread * 0.6);
      s.aiTimer = 0.9;
      if ((s.turn as number) === 0) {
        s.message = 'Your throw';
        s.messageT = 1.2;
      }
    }
    return;
  }
  // Aim: the pointer (in board units) or the arrow keys.
  if (input.pointer.active) {
    s.aimX = (input.pointer.x - CX) / K;
    s.aimY = (input.pointer.y - CY) / K;
  }
  const move = 120 * dt;
  if (input.held.has('left')) s.aimX -= move;
  if (input.held.has('right')) s.aimX += move;
  if (input.held.has('up')) s.aimY -= move;
  if (input.held.has('down')) s.aimY += move;
  s.aimX = clamp(s.aimX, -200, 200);
  s.aimY = clamp(s.aimY, -200, 200);
  if (input.pressed.has('action') || input.pointer.released) {
    const [sx, sy] = swayAt(s);
    throwDart(s, s.aimX + sx + gaussian(random) * 2, s.aimY + sy + gaussian(random) * 2);
  }
}

/** The hand's drift: a slow loop that never quite stops. */
export function swayAt(s: State): [number, number] {
  return [Math.cos(s.time * 1.7) * s.sway, Math.sin(s.time * 2.3) * s.sway * 0.8];
}

function drawBoard(ctx: CanvasRenderingContext2D) {
  circle(ctx, CX, CY, (R.doubleOut + 28) * K, '#111827');
  for (let i = 0; i < 20; i++) {
    const a0 = ((i * 18 - 9 - 90) * Math.PI) / 180;
    const a1 = ((i * 18 + 9 - 90) * Math.PI) / 180;
    const ring = (r0: number, r1: number, color: string) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(CX, CY, r1 * K, a0, a1);
      ctx.arc(CX, CY, r0 * K, a1, a0, true);
      ctx.closePath();
      ctx.fill();
    };
    const dark = i % 2 === 0;
    ring(R.outerBull, R.tripleIn, dark ? '#1f2937' : '#f5f0e1');
    ring(R.tripleIn, R.tripleOut, dark ? '#dc2626' : '#16a34a');
    ring(R.tripleOut, R.doubleIn, dark ? '#1f2937' : '#f5f0e1');
    ring(R.doubleIn, R.doubleOut, dark ? '#dc2626' : '#16a34a');
    const mid = ((i * 18 - 90) * Math.PI) / 180;
    text(ctx, String(ORDER[i]), CX + Math.cos(mid) * (R.doubleOut + 15) * K, CY + Math.sin(mid) * (R.doubleOut + 15) * K, { size: 14, color: '#f8fafc' });
  }
  circle(ctx, CX, CY, R.outerBull * K, '#16a34a');
  circle(ctx, CX, CY, R.bull * K, '#dc2626');
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  ctx.fillStyle = '#334155';
  ctx.fillRect(0, 0, W, H);
  drawBoard(ctx);
  for (const d of s.darts) {
    const x = CX + d.x * K;
    const y = CY + d.y * K;
    ctx.strokeStyle = d.mine ? '#38bdf8' : '#f59e0b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 10, y + 16);
    ctx.stroke();
    circle(ctx, x, y, 3, '#f8fafc');
  }
  if (s.turn === 0 && !s.over) {
    const [sx, sy] = swayAt(s);
    const x = CX + (s.aimX + sx) * K;
    const y = CY + (s.aimY + sy) * K;
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.moveTo(x - 14, y);
    ctx.lineTo(x + 14, y);
    ctx.moveTo(x, y - 14);
    ctx.lineTo(x, y + 14);
    ctx.stroke();
  }
  fillRound(ctx, 10, H - 46, W - 20, 38, 10, 'rgba(15,23,42,0.85)');
  text(ctx, `You ${s.scores[0]}`, 24, H - 27, { size: 18, align: 'left', color: s.turn === 0 ? '#38bdf8' : '#94a3b8' });
  text(ctx, `Computer ${s.scores[1]}`, W - 24, H - 27, { size: 18, align: 'right', color: s.turn === 1 ? '#f59e0b' : '#94a3b8' });
  text(ctx, `${'●'.repeat(3 - s.dartsThrown)}${'○'.repeat(s.dartsThrown)}`, W / 2, H - 27, { size: 14, color: '#e2e8f0' });
  if (s.messageT > 0) text(ctx, s.message, W / 2, 22, { size: 22, color: s.message === 'Bust!' ? '#f87171' : '#f8fafc' });
}

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create,
  update,
  render,
  hud: (s) => [
    { label: 'You', value: s.scores[0] },
    { label: 'Computer', value: s.scores[1] },
    { label: 'Darts', value: `${3 - s.dartsThrown} left` },
  ],
  result: (s) => ({
    score: s.score,
    won: s.scores[0] === 0,
    lost: s.scores[1] === 0,
    title: s.scores[0] === 0 ? 'Game shot! You win' : 'The computer checked out',
    details: [
      { label: 'Your score left', value: String(s.scores[0]) },
      { label: 'Darts thrown', value: String(s.darts.filter((d) => d.mine).length) },
      { label: 'Best turn', value: String(s.bestTurn) },
    ],
  }),
  onEnd: (s, difficulty) => {
    if (s.scores[0] !== 0) return;
    void reportProgress('darts.win', 1);
    if (difficulty === 'hard') void reportProgress('darts.hard', 1);
    void incrementProgress('darts.wins', 1);
  },
  touch: { pad: 'none' },
  pointerStarts: true,
  startHint: 'Point at the board and release to throw (or arrows + Space). 301 down, finish on a double.',
};
