import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { fillRound, text } from '../_shared/arcade/draw';
import { createRally, resetForServe, updateRally } from '../_shared/rally/rally';
import type { AiSkill, Court, Rally } from '../_shared/rally/rally';
import { drawBall, drawPlayer, pointerMemory, readControl, toScreen } from '../_shared/rally/view';
import type { PointerMemory, View } from '../_shared/rally/view';
import { callScore, newMatch, pointTo, server } from './scoring';
import type { Match } from './scoring';

/**
 * Tennis from above on a singles court, short format (first to 4 games). You
 * run in two dimensions; volleys are allowed, so rushing the net is a real
 * tactic against a computer that loves the baseline.
 */
export const W = 420;
export const H = 660;

export const COURT: Court = {
  width: 8.23,
  length: 23.77,
  netHeight: 0.914,
  gravity: 9.8,
  bounce: 0.7,
  grip: 0.82,
  volleys: true,
  reach: 1.45,
  hitHeight: 2.5,
  playerSpeed: 6.8,
  depthMove: true,
  home: 1.2,
  roam: 4,
  flight: 1.25,
  serveZ: 2.6,
};

export const SKILL: Record<DifficultySetting, AiSkill> = {
  easy: { speed: 0.5, error: 0.2, reaction: 0.3, pace: 1.15, placement: 0.15 },
  normal: { speed: 0.55, error: 0.12, reaction: 0.2, pace: 1, placement: 0.5 },
  hard: { speed: 0.62, error: 0.06, reaction: 0.1, pace: 0.88, placement: 0.8 },
};

const VIEW: View = { cx: W / 2, cy: H / 2 + 8, scale: 20.5 };
const ALLEY = 1.37;

export interface State extends BaseState {
  rally: Rally;
  match: Match;
  mem: PointerMemory;
  message: string;
  aces: number;
  pointsWon: number;
  guide: boolean;
}

export function create(difficulty: DifficultySetting): State {
  return {
    ...baseState(),
    rally: createRally(COURT, SKILL[difficulty], 0),
    match: newMatch(0),
    mem: pointerMemory(),
    message: 'Your serve',
    aces: 0,
    pointsWon: 0,
    guide: difficulty === 'easy',
  };
}

export function update(s: State, dt: number, input: Input, random: () => number) {
  const r = s.rally;
  const res = updateRally(r, dt, readControl(input, VIEW, s.mem), random);
  s.events.push(...r.events);
  r.events.length = 0;
  if (res) {
    const ace = res.winner === 0 && r.server === 0 && r.shots === 0 && r.ball.lastHitter === 0;
    if (ace) s.aces += 1;
    if (res.winner === 0) s.pointsWon += 1;
    const outcome = pointTo(s.match, res.winner);
    const who = res.winner === 0 ? 'you' : 'the computer';
    s.message =
      outcome === 'match'
        ? res.winner === 0
          ? 'Game, set and match — you!'
          : 'Game, set and match — computer'
        : outcome === 'game'
          ? `Game to ${who}  (${s.match.games[0]}–${s.match.games[1]})`
          : `${ace ? 'Ace!' : res.reason} — ${callScore(s.match)}`;
    s.score = s.pointsWon * 10 + s.match.games[0] * 50;
  }
  if (r.phase === 'point' && r.phaseT > 1.4) {
    if (s.match.winner !== null) {
      if (s.match.winner === 0) s.score += 300;
      s.over = true;
      s.events.push(s.match.winner === 0 ? 'levelComplete' : 'gameOver');
      return;
    }
    resetForServe(r, server(s.match));
  }
}

function line(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number) {
  const [a, b] = toScreen(VIEW, x0, y0);
  const [c, d] = toScreen(VIEW, x1, y1);
  ctx.beginPath();
  ctx.moveTo(a, b);
  ctx.lineTo(c, d);
  ctx.stroke();
}

function drawCourt(ctx: CanvasRenderingContext2D) {
  const hw = COURT.width / 2;
  const hl = COURT.length / 2;
  ctx.fillStyle = '#2f7a4a';
  ctx.fillRect(0, 0, W, H);
  const [x0, y0] = toScreen(VIEW, -hw - ALLEY, -hl);
  const [x1, y1] = toScreen(VIEW, hw + ALLEY, hl);
  ctx.fillStyle = '#3b82c4';
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  const [s0] = toScreen(VIEW, -hw, 0);
  const [s1] = toScreen(VIEW, hw, 0);
  ctx.fillStyle = '#2563eb';
  ctx.fillRect(s0, y0, s1 - s0, y1 - y0);
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 2;
  ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
  line(ctx, -hw, -hl, -hw, hl);
  line(ctx, hw, -hl, hw, hl);
  line(ctx, -hw, -6.4, hw, -6.4);
  line(ctx, -hw, 6.4, hw, 6.4);
  line(ctx, 0, -6.4, 0, 6.4);
  line(ctx, 0, -hl, 0, -hl + 0.4);
  line(ctx, 0, hl, 0, hl - 0.4);
}

function drawNet(ctx: CanvasRenderingContext2D) {
  const [x0, y] = toScreen(VIEW, -COURT.width / 2 - ALLEY - 0.6, 0);
  const [x1] = toScreen(VIEW, COURT.width / 2 + ALLEY + 0.6, 0);
  const top = y - COURT.netHeight * VIEW.scale * 0.8;
  ctx.fillStyle = 'rgba(15,23,42,0.45)';
  ctx.fillRect(x0, top, x1 - x0, y - top);
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(x0, top - 1, x1 - x0, 3);
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  const r = s.rally;
  drawCourt(ctx);
  if (s.guide && r.ball.lastHitter === 1 && r.ball.bounces === 0) {
    const [lx, ly] = toScreen(VIEW, r.ball.landX, r.ball.landY);
    ctx.strokeStyle = 'rgba(250,204,21,0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(lx, ly, 8, 5, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  const racket = { length: 11, head: 7, color: '#e5e7eb' };
  drawPlayer(ctx, VIEW, r.players[1], '#f97316', -1, racket, r.ball.x);
  const far = r.ball.y < 0;
  if (far) drawBall(ctx, VIEW, r.ball, 4.5, '#d9f99d');
  drawNet(ctx);
  if (!far) drawBall(ctx, VIEW, r.ball, 4.5, '#d9f99d');
  drawPlayer(ctx, VIEW, r.players[0], '#0ea5e9', 1, racket, r.ball.x);

  const m = s.match;
  fillRound(ctx, 8, 8, 150, 50, 8, 'rgba(15,23,42,0.8)');
  text(ctx, 'You', 18, 22, { size: 13, align: 'left', color: '#7dd3fc' });
  text(ctx, 'CPU', 18, 43, { size: 13, align: 'left', color: '#fdba74' });
  text(ctx, String(m.games[0]), 78, 22, { size: 15 });
  text(ctx, String(m.games[1]), 78, 43, { size: 15 });
  const pts = (p: number, o: number) => (m.tiebreak ? String(p) : p === 3 && o === 3 ? '40' : ['0', '15', '30', '40'][p]);
  text(ctx, pts(m.points[0], m.points[1]), 124, 22, { size: 15, color: '#fde68a' });
  text(ctx, pts(m.points[1], m.points[0]), 124, 43, { size: 15, color: '#fde68a' });
  const srv = server(m);
  text(ctx, '●', 100, srv === 0 ? 22 : 43, { size: 9, color: '#d9f99d' });
  if (r.phase !== 'play') {
    fillRound(ctx, 30, H / 2 - 24, W - 60, 46, 12, 'rgba(15,23,42,0.82)');
    const hint = r.phase === 'serve' && r.server === 0 ? 'Your serve — Space or tap' : r.phase === 'serve' ? 'Computer to serve' : s.message;
    text(ctx, hint, W / 2, H / 2, { size: 16 });
  }
}

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create,
  update,
  render,
  hud: (s) => [
    { label: 'Games', value: `${s.match.games[0]}–${s.match.games[1]}` },
    { label: 'Points', value: callScore(s.match) },
    { label: 'Aces', value: s.aces },
  ],
  result: (s) => {
    const won = s.match.winner === 0;
    return {
      score: s.score,
      won,
      lost: !won,
      title: won ? 'Game, set and match!' : 'The computer takes the set',
      details: [
        { label: 'Games', value: `${s.match.games[0]}–${s.match.games[1]}` },
        { label: 'Points won', value: String(s.pointsWon) },
        { label: 'Aces', value: String(s.aces) },
        { label: 'Longest rally', value: `${s.rally.longest} shots` },
      ],
    };
  },
  onEnd: (s, difficulty) => {
    if (s.aces > 0) void reportProgress('tennis.ace', 1);
    if (s.match.loveGames > 0) void reportProgress('tennis.love', 1);
    if (s.match.winner !== 0) return;
    void reportProgress('tennis.win', 1);
    if (difficulty === 'hard') void reportProgress('tennis.hard', 1);
    void incrementProgress('tennis.wins', 1);
  },
  touch: { pad: 'dpad', buttons: [{ action: 'action', label: 'Serve' }] },
  startHint: 'Run with the arrows or follow the mouse/finger; your racket plays the ball. Hold an arrow at contact to aim. First to 4 games.',
};
