import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { fillRound, text } from '../_shared/arcade/draw';
import { createRally, resetForServe, updateRally } from '../_shared/rally/rally';
import type { AiSkill, Court, Rally, Side } from '../_shared/rally/rally';
import { drawBall, drawPlayer, pointerMemory, readControl, toScreen } from '../_shared/rally/view';
import type { PointerMemory, View } from '../_shared/rally/view';

/**
 * Table tennis seen from above: one game to 11 points (win by two) against the
 * computer. Movement is automatic contact: get in line with the ball and the
 * paddle plays it; where it meets the paddle and the arrow you hold decide
 * where it goes.
 */
export const W = 400;
export const H = 620;
export const TARGET = 11;

export const COURT: Court = {
  width: 1.525,
  length: 2.74,
  netHeight: 0.1525,
  gravity: 9.8,
  bounce: 0.82,
  grip: 0.92,
  volleys: false,
  reach: 0.42,
  hitHeight: 0.95,
  playerSpeed: 2.6,
  depthMove: false,
  home: 0.35,
  roam: 0.55,
  flight: 0.72,
  serveZ: 0.3,
};

export const SKILL: Record<DifficultySetting, AiSkill> = {
  easy: { speed: 0.46, error: 0.2, reaction: 0.25, pace: 1.15, placement: 0.15 },
  normal: { speed: 0.51, error: 0.11, reaction: 0.15, pace: 1, placement: 0.5 },
  hard: { speed: 0.58, error: 0.05, reaction: 0.08, pace: 0.86, placement: 0.85 },
};

const VIEW: View = { cx: W / 2, cy: H / 2 + 6, scale: 128 };

export interface State extends BaseState {
  rally: Rally;
  points: [number, number];
  firstServer: Side;
  mem: PointerMemory;
  message: string;
  maxDeficit: number;
  guide: boolean;
  decided: boolean;
}

/** Service changes every two points, and every point from 10–10. */
export function serverFor(points: [number, number], first: Side): Side {
  const total = points[0] + points[1];
  const deuce = points[0] >= TARGET - 1 && points[1] >= TARGET - 1;
  const swaps = deuce ? total : Math.floor(total / 2);
  return ((first + swaps) % 2) as Side;
}

export function winnerOf(points: [number, number]): Side | null {
  const [a, b] = points;
  if (a >= TARGET && a - b >= 2) return 0;
  if (b >= TARGET && b - a >= 2) return 1;
  return null;
}

export function create(difficulty: DifficultySetting): State {
  return {
    ...baseState(),
    rally: createRally(COURT, SKILL[difficulty], 0),
    points: [0, 0],
    firstServer: 0,
    mem: pointerMemory(),
    message: 'Your serve',
    maxDeficit: 0,
    guide: difficulty === 'easy',
    decided: false,
  };
}

export function update(s: State, dt: number, input: Input, random: () => number) {
  const r = s.rally;
  const res = updateRally(r, dt, readControl(input, VIEW, s.mem), random);
  s.events.push(...r.events);
  r.events.length = 0;
  if (res) {
    s.points[res.winner] += 1;
    s.maxDeficit = Math.max(s.maxDeficit, s.points[1] - s.points[0]);
    s.score = s.points[0] * 10 + r.longest * 2;
    s.message = res.winner === 0 ? `${res.reason} — your point` : `${res.reason} — computer’s point`;
    s.decided = winnerOf(s.points) !== null;
  }
  if (r.phase === 'point' && r.phaseT > 1.1) {
    if (s.decided) {
      if (winnerOf(s.points) === 0) s.score += 100;
      s.over = true;
      s.events.push(winnerOf(s.points) === 0 ? 'levelComplete' : 'gameOver');
      return;
    }
    const server = serverFor(s.points, s.firstServer);
    resetForServe(r, server);
    s.message = server === 0 ? 'Your serve' : 'Computer serves';
  }
}

function drawTable(ctx: CanvasRenderingContext2D) {
  const [x0, y0] = toScreen(VIEW, -COURT.width / 2, -COURT.length / 2);
  const [x1, y1] = toScreen(VIEW, COURT.width / 2, COURT.length / 2);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(x0 + 6, y0 + 10, x1 - x0, y1 - y0);
  ctx.fillStyle = '#1e40af';
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 3;
  ctx.strokeRect(x0 + 1.5, y0 + 1.5, x1 - x0 - 3, y1 - y0 - 3);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(VIEW.cx, y0);
  ctx.lineTo(VIEW.cx, y1);
  ctx.stroke();
}

function drawNet(ctx: CanvasRenderingContext2D) {
  const [x0, y] = toScreen(VIEW, -COURT.width / 2 - 0.1, 0);
  const [x1] = toScreen(VIEW, COURT.width / 2 + 0.1, 0);
  const top = y - COURT.netHeight * VIEW.scale * 0.8;
  ctx.fillStyle = 'rgba(226,232,240,0.55)';
  ctx.fillRect(x0, top, x1 - x0, y - top);
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(x0, top - 1, x1 - x0, 3);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(x0 - 3, top - 2, 4, y - top + 2);
  ctx.fillRect(x1 - 1, top - 2, 4, y - top + 2);
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  const r = s.rally;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#3b2f4a');
  g.addColorStop(1, '#5b4636');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  drawTable(ctx);
  if (s.guide && r.ball.lastHitter === 1 && r.ball.bounces === 0) {
    const [lx, ly] = toScreen(VIEW, r.ball.landX, r.ball.landY);
    ctx.strokeStyle = 'rgba(250,204,21,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(lx, ly, 9, 6, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  const paddle = { length: 12, head: 9, color: '#dc2626' };
  const cpuPaddle = { length: 12, head: 9, color: '#111827' };
  drawPlayer(ctx, VIEW, r.players[1], '#f59e0b', -1, cpuPaddle, r.ball.x);
  const far = r.ball.y < 0;
  if (far) drawBall(ctx, VIEW, r.ball, 5, '#fff7ed');
  drawNet(ctx);
  if (!far) drawBall(ctx, VIEW, r.ball, 5, '#fff7ed');
  drawPlayer(ctx, VIEW, r.players[0], '#0ea5e9', 1, paddle, r.ball.x);

  fillRound(ctx, 10, 10, 120, 34, 8, 'rgba(15,23,42,0.75)');
  text(ctx, `${s.points[0]} – ${s.points[1]}`, 70, 27, { size: 20 });
  const server = r.phase === 'serve' ? r.server : null;
  if (server !== null) text(ctx, server === 0 ? '● you serve' : '● CPU serves', W - 12, 27, { size: 13, align: 'right', color: '#fde68a' });
  if (r.phase !== 'play') {
    fillRound(ctx, 40, H / 2 - 22, W - 80, 44, 12, 'rgba(15,23,42,0.8)');
    const hint = r.phase === 'serve' && r.server === 0 ? 'Your serve — Space or tap' : s.message;
    text(ctx, hint, W / 2, H / 2, { size: 17 });
  }
}

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create,
  update,
  render,
  hud: (s) => [
    { label: 'You', value: s.points[0] },
    { label: 'Computer', value: s.points[1] },
    { label: 'Longest rally', value: s.rally.longest },
  ],
  result: (s) => {
    const won = winnerOf(s.points) === 0;
    return {
      score: s.score,
      won,
      lost: !won,
      title: won ? `You win ${s.points[0]}–${s.points[1]}` : `Computer wins ${s.points[1]}–${s.points[0]}`,
      details: [
        { label: 'Final score', value: `${s.points[0]}–${s.points[1]}` },
        { label: 'Longest rally', value: `${s.rally.longest} shots` },
      ],
    };
  },
  onEnd: (s, difficulty) => {
    void reportProgress('table-tennis.rally', s.rally.longest);
    if (winnerOf(s.points) !== 0) return;
    void reportProgress('table-tennis.win', 1);
    if (difficulty === 'hard') void reportProgress('table-tennis.hard', 1);
    if (s.maxDeficit >= 5) void reportProgress('table-tennis.comeback', 1);
    void incrementProgress('table-tennis.wins', 1);
  },
  touch: { pad: 'horizontal', buttons: [{ action: 'action', label: 'Serve' }] },
  startHint: 'Move with ←/→ or the mouse/finger; the paddle plays the ball. Hold an arrow at contact to aim. First to 11.',
};
