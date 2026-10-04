import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState, clamp } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { circle, fillRound, text } from '../_shared/arcade/draw';
import { gaussian, placeCueBall, planShot } from './ai';
import type { ShotPlan, Skill } from './ai';
import {
  BOTTOM,
  FOOT,
  H,
  HEAD_X,
  LEFT,
  MAX_SPEED,
  POCKETS,
  POCKET_R,
  R,
  RIGHT,
  SUBSTEPS,
  TOP,
  W,
  freeSpot,
  moving,
  newLog,
  rackBalls,
  step,
} from './physics';
import type { Ball, ShotLog } from './physics';
import { groupOf, judge } from './rules';
import type { Player, Table } from './rules';

/** 8-ball pool against the computer. */
type Phase = 'place' | 'aim' | 'moving' | 'ai';

const SKILLS: Record<DifficultySetting, Skill & { guide: number }> = {
  easy: { aimError: 0.03, lookahead: 2, guide: 2 },
  normal: { aimError: 0.012, lookahead: 5, guide: 1 },
  hard: { aimError: 0.004, lookahead: 10, guide: 0 },
};

const COLORS: Record<number, string> = {
  0: '#f8fafc',
  1: '#facc15',
  2: '#2563eb',
  3: '#dc2626',
  4: '#7c3aed',
  5: '#ea580c',
  6: '#16a34a',
  7: '#7f1d1d',
  8: '#111827',
};
const colorOf = (n: number) => COLORS[n > 8 ? n - 8 : n];

export interface State extends BaseState {
  balls: Ball[];
  table: Table;
  phase: Phase;
  kitchen: boolean;
  aim: number;
  power: number;
  charging: number;
  log: ShotLog;
  message: string;
  messageT: number;
  aiTimer: number;
  aiPlan: ShotPlan | null;
  skill: Skill & { guide: number };
  winner: Player | null;
  myPots: number;
  visitPots: number;
  bestVisit: number;
  follow: boolean;
  lastPointer: { x: number; y: number };
}

export function create(difficulty: DifficultySetting, random: () => number): State {
  return {
    ...baseState(),
    balls: rackBalls(random),
    table: { groups: [null, null], turn: 0, remaining: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], isBreak: true },
    phase: 'place',
    kitchen: true,
    aim: 0,
    power: 0.8,
    charging: -1,
    log: newLog(),
    message: 'Your break — place the cue ball behind the line',
    messageT: 4,
    aiTimer: 0,
    aiPlan: null,
    skill: SKILLS[difficulty],
    winner: null,
    myPots: 0,
    visitPots: 0,
    bestVisit: 0,
    follow: false,
    lastPointer: { x: -1, y: -1 },
  };
}

const cueBall = (s: State) => s.balls[0];

function say(s: State, msg: string, t = 2.2) {
  s.message = msg;
  s.messageT = t;
}

export function shoot(s: State, angle: number, speed: number) {
  const c = cueBall(s);
  c.vx = Math.cos(angle) * speed;
  c.vy = Math.sin(angle) * speed;
  s.log = newLog();
  s.phase = 'moving';
  s.events.push('hit');
}

function startTurn(s: State, who: Player, ballInHand: boolean) {
  s.table.turn = who;
  s.visitPots = 0;
  s.kitchen = false;
  if (who === 0) {
    s.phase = ballInHand ? 'place' : 'aim';
  } else {
    s.phase = 'ai';
    s.aiTimer = 1;
    s.aiPlan = null;
    if (ballInHand) {
      const spot = placeCueBall(s.balls, s.table, Math.random, false);
      cueBall(s).x = spot.x;
      cueBall(s).y = spot.y;
    }
  }
}

function respot(s: State, n: number) {
  const b = s.balls.find((x) => x.n === n);
  if (!b) return;
  b.potted = false;
  b.vx = b.vy = 0;
  for (let dx = 0; dx < 200; dx += 2) {
    if (freeSpot(s.balls.filter((x) => x !== b), FOOT.x + dx, FOOT.y)) {
      b.x = FOOT.x + dx;
      b.y = FOOT.y;
      return;
    }
  }
}

function resolveShot(s: State) {
  const t = s.table;
  const v = judge(t, s.log);
  const assigned = t.groups[0] === null && v.groups[0] !== null;
  const shooter = t.turn;
  const potted = s.log.potted.filter((n) => n !== 0);
  t.remaining = t.remaining.filter((n) => !potted.includes(n));
  t.groups = v.groups;
  t.isBreak = false;
  if (shooter === 0) {
    s.myPots += potted.filter((n) => n !== 8).length;
    s.visitPots += potted.length;
    s.bestVisit = Math.max(s.bestVisit, s.visitPots);
  }
  s.score = s.myPots * 50;
  if (v.respot8) {
    respot(s, 8);
    t.remaining.push(8);
  }
  if (s.log.potted.includes(0)) {
    const c = cueBall(s);
    c.potted = false;
    c.x = HEAD_X;
    c.y = (TOP + BOTTOM) / 2;
  }
  if (v.winner !== null) {
    s.winner = v.winner;
    s.over = true;
    if (v.winner === 0) s.score += 500;
    s.events.push(v.winner === 0 ? 'levelComplete' : 'gameOver');
    say(s, v.winner === 0 ? 'You sank the 8 — you win!' : v.foul ? `${v.foul} — computer wins` : 'Computer sinks the 8', 5);
    return;
  }
  const next: Player = shooter === 0 ? 1 : 0;
  if (v.foul) {
    say(s, `Foul: ${v.foul}. ${next === 0 ? 'Ball in hand for you' : 'Ball in hand for the computer'}`);
    s.events.push('failure');
    startTurn(s, next, true);
    return;
  }
  if (v.again) {
    const g = t.groups[shooter];
    say(s, assigned && g ? `${shooter === 0 ? 'You are' : 'Computer is'} ${g} — shoot again` : 'Shoot again', 1.8);
    s.events.push('success');
    if (shooter === 0) s.phase = 'aim';
    else {
      s.phase = 'ai';
      s.aiTimer = 1;
      s.aiPlan = null;
    }
    return;
  }
  say(s, next === 0 ? 'Your shot' : 'Computer’s shot', 1.4);
  startTurn(s, next, false);
}

function readPointer(s: State, input: Input) {
  const p = input.pointer;
  if (p.active && (p.x !== s.lastPointer.x || p.y !== s.lastPointer.y || p.down)) {
    s.follow = true;
    s.lastPointer = { x: p.x, y: p.y };
  }
}

export function update(s: State, dt: number, input: Input, random: () => number) {
  s.messageT = Math.max(0, s.messageT - dt);
  readPointer(s, input);
  const c = cueBall(s);
  const p = input.pointer;
  const h = input.held;

  if (s.phase === 'place') {
    const maxX = s.kitchen ? HEAD_X : RIGHT - R;
    let nx = c.x + ((h.has('right') ? 1 : 0) - (h.has('left') ? 1 : 0)) * 160 * dt;
    let ny = c.y + ((h.has('down') ? 1 : 0) - (h.has('up') ? 1 : 0)) * 160 * dt;
    if (h.size) s.follow = false;
    if (s.follow && p.active) {
      nx = p.x;
      ny = p.y;
    }
    nx = clamp(nx, LEFT + R, maxX);
    ny = clamp(ny, TOP + R, BOTTOM - R);
    if (freeSpot(s.balls, nx, ny)) {
      c.x = nx;
      c.y = ny;
    }
    if (input.pressed.has('action') || p.released) {
      s.phase = 'aim';
      s.charging = -1;
      s.aim = Math.atan2(FOOT.y - c.y, FOOT.x - c.x);
    }
    return;
  }

  if (s.phase === 'aim') {
    const fine = h.has('action2') ? 0.15 : 1;
    if (h.has('left')) s.aim -= 1.3 * fine * dt;
    if (h.has('right')) s.aim += 1.3 * fine * dt;
    if (h.has('up')) s.power = clamp(s.power + 0.7 * dt, 0.05, 1);
    if (h.has('down')) s.power = clamp(s.power - 0.7 * dt, 0.05, 1);
    if (h.has('left') || h.has('right')) s.follow = false;
    if (s.follow && p.active && Math.hypot(p.x - c.x, p.y - c.y) > R) s.aim = Math.atan2(p.y - c.y, p.x - c.x);
    if (p.pressed) s.charging = 0;
    if (s.charging >= 0 && p.down) {
      s.charging += dt;
      // Power rises for 1.2 s, then falls again, so a long hold is not always a smash.
      const phase = (s.charging / 1.2) % 2;
      s.power = clamp(phase < 1 ? phase : 2 - phase, 0.05, 1);
    }
    if (p.released && s.charging > 0.1) {
      s.charging = -1;
      shoot(s, s.aim, s.power * MAX_SPEED);
      return;
    }
    if (input.pressed.has('action')) shoot(s, s.aim, s.power * MAX_SPEED);
    return;
  }

  if (s.phase === 'ai') {
    s.aiTimer -= dt;
    if (!s.aiPlan) {
      s.aiPlan = planShot(s.balls, s.table, s.skill);
      s.aim = s.aiPlan.angle;
    }
    if (s.aiTimer <= 0 && s.aiPlan) {
      const angle = s.aiPlan.angle + gaussian(random) * s.skill.aimError;
      const speed = s.aiPlan.speed * (1 + (random() - 0.5) * s.skill.aimError * 4);
      shoot(s, angle, speed);
    }
    return;
  }

  if (s.phase === 'moving') {
    const before = s.log.potted.length;
    const hadHit = s.log.firstHit !== null;
    for (let i = 0; i < SUBSTEPS; i++) step(s.balls, dt / SUBSTEPS, s.log);
    if (!hadHit && s.log.firstHit !== null) s.events.push('click');
    if (s.log.potted.length > before) s.events.push('pop');
    if (!moving(s.balls)) resolveShot(s);
  }
}

/** Where the aim line first meets a ball, for the guide. */
function firstContact(s: State) {
  const c = cueBall(s);
  const dx = Math.cos(s.aim);
  const dy = Math.sin(s.aim);
  let best: { t: number; ball: Ball } | null = null;
  for (const b of s.balls) {
    if (b.potted || b.n === 0) continue;
    const ox = b.x - c.x;
    const oy = b.y - c.y;
    const along = ox * dx + oy * dy;
    if (along <= 0) continue;
    const perp2 = ox * ox + oy * oy - along * along;
    if (perp2 > 4 * R * R) continue;
    const t = along - Math.sqrt(4 * R * R - perp2);
    if (!best || t < best.t) best = { t, ball: b };
  }
  // Otherwise the line runs to the cushion.
  let tw = Infinity;
  if (dx > 0) tw = Math.min(tw, (RIGHT - R - c.x) / dx);
  if (dx < 0) tw = Math.min(tw, (LEFT + R - c.x) / dx);
  if (dy > 0) tw = Math.min(tw, (BOTTOM - R - c.y) / dy);
  if (dy < 0) tw = Math.min(tw, (TOP + R - c.y) / dy);
  return best && best.t < tw ? best : { t: tw, ball: null };
}

function drawBall(ctx: CanvasRenderingContext2D, b: Ball) {
  circle(ctx, b.x + 1.5, b.y + 2, R, 'rgba(0,0,0,0.3)');
  if (b.n > 8) {
    circle(ctx, b.x, b.y, R, '#f8fafc');
    ctx.save();
    ctx.beginPath();
    ctx.arc(b.x, b.y, R, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = colorOf(b.n);
    ctx.fillRect(b.x - R, b.y - R * 0.55, R * 2, R * 1.1);
    ctx.restore();
  } else circle(ctx, b.x, b.y, R, colorOf(b.n));
  if (b.n > 0) {
    circle(ctx, b.x, b.y, R * 0.48, '#f8fafc');
    text(ctx, String(b.n), b.x, b.y + 0.5, { size: 7.5, color: '#111827', weight: 800 });
  }
  circle(ctx, b.x - R * 0.35, b.y - R * 0.4, R * 0.22, 'rgba(255,255,255,0.55)');
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  ctx.fillStyle = '#0b1220';
  ctx.fillRect(0, 0, W, H);
  fillRound(ctx, LEFT - 30, TOP - 30, RIGHT - LEFT + 60, BOTTOM - TOP + 60, 18, '#5b3417');
  ctx.fillStyle = '#15803d';
  ctx.fillRect(LEFT - 6, TOP - 6, RIGHT - LEFT + 12, BOTTOM - TOP + 12);
  ctx.fillStyle = '#16a34a';
  ctx.fillRect(LEFT, TOP, RIGHT - LEFT, BOTTOM - TOP);
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath();
  ctx.moveTo(HEAD_X, TOP);
  ctx.lineTo(HEAD_X, BOTTOM);
  ctx.stroke();
  circle(ctx, FOOT.x, FOOT.y, 2, 'rgba(255,255,255,0.4)');
  for (const p of POCKETS) circle(ctx, p.x, p.y, POCKET_R, '#020617');
  for (let i = 0; i < 6; i++) {
    const x = LEFT + ((RIGHT - LEFT) * (i + 1)) / 7;
    if (i !== 2 && i !== 3) {
      circle(ctx, x, TOP - 18, 2.5, '#f5deb3');
      circle(ctx, x, BOTTOM + 18, 2.5, '#f5deb3');
    }
  }

  const c = cueBall(s);
  const aiming = s.phase === 'aim' || (s.phase === 'ai' && s.aiPlan);
  if (aiming) {
    const fc = firstContact(s);
    const ex = c.x + Math.cos(s.aim) * fc.t;
    const ey = c.y + Math.sin(s.aim) * fc.t;
    ctx.strokeStyle = s.phase === 'ai' ? 'rgba(253,186,116,0.6)' : 'rgba(255,255,255,0.7)';
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(c.x, c.y);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.setLineDash([]);
    if (fc.ball && s.phase === 'aim') {
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath();
      ctx.arc(ex, ey, R, 0, Math.PI * 2);
      ctx.stroke();
      if (s.skill.guide > 0) {
        const nx = fc.ball.x - ex;
        const ny = fc.ball.y - ey;
        const len = Math.hypot(nx, ny) || 1;
        const reach = s.skill.guide > 1 ? 160 : 60;
        ctx.strokeStyle = 'rgba(250,204,21,0.8)';
        ctx.beginPath();
        ctx.moveTo(fc.ball.x, fc.ball.y);
        ctx.lineTo(fc.ball.x + (nx / len) * reach, fc.ball.y + (ny / len) * reach);
        ctx.stroke();
      }
    }
  }
  for (const b of s.balls) if (!b.potted) drawBall(ctx, b);
  if (aiming) {
    const pull = 14 + (s.phase === 'aim' ? s.power * 40 : 20);
    const bx = c.x - Math.cos(s.aim) * pull;
    const by = c.y - Math.sin(s.aim) * pull;
    ctx.strokeStyle = '#d4a373';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx - Math.cos(s.aim) * 230, by - Math.sin(s.aim) * 230);
    ctx.stroke();
    ctx.strokeStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(bx - Math.cos(s.aim) * 150, by - Math.sin(s.aim) * 150);
    ctx.lineTo(bx - Math.cos(s.aim) * 230, by - Math.sin(s.aim) * 230);
    ctx.stroke();
    ctx.lineCap = 'butt';
  }
  if (s.phase === 'place') {
    ctx.strokeStyle = 'rgba(250,204,21,0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(c.x, c.y, R + 4, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Power bar.
  if (s.phase === 'aim') {
    fillRound(ctx, W - 22, TOP, 12, BOTTOM - TOP, 6, 'rgba(15,23,42,0.6)');
    const ph = (BOTTOM - TOP - 4) * s.power;
    fillRound(ctx, W - 20, BOTTOM - 2 - ph, 8, ph, 4, s.power > 0.8 ? '#ef4444' : '#f59e0b');
  }
  // Group rack display.
  const groupLabel = (p: Player) => s.table.groups[p] ?? 'open';
  text(ctx, `You: ${groupLabel(0)}`, LEFT, 13, { size: 12, align: 'left', color: s.table.turn === 0 ? '#7dd3fc' : '#94a3b8' });
  text(ctx, `Computer: ${groupLabel(1)}`, RIGHT, 13, { size: 12, align: 'right', color: s.table.turn === 1 ? '#fdba74' : '#94a3b8' });
  const mine = s.table.groups[0];
  if (mine) {
    const left = s.table.remaining.filter((n) => groupOf(n) === mine);
    left.forEach((n, i) => {
      const b = { n, x: LEFT + 110 + i * 15, y: 13, vx: 0, vy: 0, potted: false };
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.scale(0.6, 0.6);
      ctx.translate(-b.x, -b.y);
      drawBall(ctx, b);
      ctx.restore();
    });
  }
  if (s.messageT > 0) {
    ctx.font = '700 14px Inter, system-ui, sans-serif';
    const w = Math.min(W - 40, ctx.measureText(s.message).width + 30);
    fillRound(ctx, (W - w) / 2, H - 30, w, 24, 8, 'rgba(15,23,42,0.85)');
    text(ctx, s.message, W / 2, H - 18, { size: 13 });
  }
}

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create,
  update,
  render,
  hud: (s) => {
    const left = (p: Player) => {
      const g = s.table.groups[p];
      return g ? s.table.remaining.filter((n) => groupOf(n) === g).length : 7;
    };
    return [
      { label: 'Turn', value: s.table.turn === 0 ? 'You' : 'Computer' },
      { label: 'Your balls left', value: left(0) },
      { label: 'Computer’s left', value: left(1) },
    ];
  },
  result: (s) => ({
    score: s.score,
    won: s.winner === 0,
    lost: s.winner === 1,
    title: s.winner === 0 ? 'You win the frame!' : 'The computer wins the frame',
    details: [
      { label: 'Balls you potted', value: String(s.myPots) },
      { label: 'Best visit', value: `${s.bestVisit} ball${s.bestVisit === 1 ? '' : 's'}` },
    ],
  }),
  onEnd: (s, difficulty) => {
    void reportProgress('pool.run', s.bestVisit);
    if (s.winner !== 0) return;
    void reportProgress('pool.win', 1);
    if (difficulty === 'hard') void reportProgress('pool.hard', 1);
    void incrementProgress('pool.wins', 1);
  },
  touch: { pad: 'dpad', buttons: [{ action: 'action', label: 'Shoot' }, { action: 'action2', label: 'Fine' }] },
  startHint: 'Point the cue with the mouse or finger, hold to build power and release to shoot. Keys: ← → aim, ↑ ↓ power, Space shoots.',
};
