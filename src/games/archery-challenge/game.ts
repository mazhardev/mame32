import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState, clamp } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { burst, circle, drawSparks, gradientBg, text, updateSparks } from '../_shared/arcade/draw';
import type { Spark } from '../_shared/arcade/draw';

/**
 * Archery Challenge: a timed shooting gallery. Pop rising balloons and hit
 * the moving target board before the clock runs out. Arrows fly in an arc
 * and drift with the wind; consecutive hits build a score multiplier.
 */
export const W = 640;
export const H = 400;
export const GROUND = 362;
export const BOW = { x: 78, y: 292 };
export const GRAVITY = 520;
export const MAX_SPEED = 820;
const RELOAD = 0.45;
const BALLOON_R = 16;
export const BOARD_R = 30;

export interface Arrow {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Stuck in the ground; stays visible for a moment. */
  stuck: boolean;
  /** Left the field or went into the board (drawn there instead). */
  gone: boolean;
  hit: boolean;
  popped: number;
  age: number;
  fade: number;
}

export interface Balloon {
  x: number;
  y: number;
  vy: number;
  color: string;
  gold: boolean;
  sway: number;
}

export interface Board {
  x: number;
  baseY: number;
  y: number;
  range: number;
  speed: number;
  phase: number;
  /** Arrows stuck in the board, relative to its centre. */
  stuck: { dy: number; angle: number }[];
  respawn: number;
}

export interface State extends BaseState {
  angle: number;
  power: number;
  drawing: boolean;
  drag: { x: number; y: number } | null;
  reload: number;
  arrows: Arrow[];
  balloons: Balloon[];
  board: Board;
  wind: number;
  windMax: number;
  windT: number;
  timeLeft: number;
  spawnT: number;
  streak: number;
  shots: number;
  hits: number;
  bullseyes: number;
  bestPierce: number;
  popped: number;
  sparks: Spark[];
  floaters: { x: number; y: number; text: string; life: number; color: string }[];
}

const SETTINGS: Record<DifficultySetting, { time: number; wind: number }> = {
  easy: { time: 75, wind: 20 },
  normal: { time: 60, wind: 50 },
  hard: { time: 50, wind: 90 },
};
const COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#a855f7', '#f97316', '#ec4899'];

function newBoard(random: () => number): Board {
  return {
    x: 440 + random() * 150,
    baseY: 200,
    y: 200,
    range: 60 + random() * 50,
    speed: 0.8 + random() * 0.9,
    phase: random() * Math.PI * 2,
    stuck: [],
    respawn: 0,
  };
}

export function create(difficulty: DifficultySetting, random: () => number): State {
  const c = SETTINGS[difficulty];
  return {
    ...baseState(),
    angle: -0.35,
    power: 0,
    drawing: false,
    drag: null,
    reload: 0,
    arrows: [],
    balloons: [],
    board: newBoard(random),
    wind: 0,
    windMax: c.wind,
    windT: 0,
    timeLeft: c.time,
    spawnT: 0.3,
    streak: 0,
    shots: 0,
    hits: 0,
    bullseyes: 0,
    bestPierce: 0,
    popped: 0,
    sparks: [],
    floaters: [],
  };
}

export const multiplier = (streak: number) => (streak >= 6 ? 3 : streak >= 3 ? 2 : 1);

/** Board points by how far from the centre an arrow lands. */
export function ringScore(dist: number): number {
  if (dist <= 6) return 50;
  if (dist <= 14) return 30;
  if (dist <= 22) return 20;
  if (dist <= BOARD_R) return 10;
  return 0;
}

export function shoot(s: State, angle: number, power: number) {
  if (s.reload > 0) return false;
  const p = clamp(power, 0.2, 1);
  const a = clamp(angle, -1.45, 0.5);
  s.arrows.push({
    x: BOW.x + Math.cos(a) * 20,
    y: BOW.y + Math.sin(a) * 20,
    vx: Math.cos(a) * MAX_SPEED * p,
    vy: Math.sin(a) * MAX_SPEED * p,
    stuck: false,
    gone: false,
    hit: false,
    popped: 0,
    age: 0,
    fade: 2.5,
  });
  s.reload = RELOAD;
  s.shots += 1;
  s.events.push('whoosh');
  return true;
}

function award(s: State, x: number, y: number, base: number, color: string) {
  const pts = base * multiplier(s.streak);
  s.score += pts;
  s.floaters.push({ x, y, text: `+${pts}`, life: 0.9, color });
}

/** Distance from point (px, py) to the segment (ax, ay)–(bx, by). */
function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len = dx * dx + dy * dy;
  const t = len ? clamp(((px - ax) * dx + (py - ay) * dy) / len, 0, 1) : 0;
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}

const tip = (a: Arrow): [number, number] => {
  const v = Math.hypot(a.vx, a.vy) || 1;
  return [a.x + (a.vx / v) * 14, a.y + (a.vy / v) * 14];
};

function markHit(s: State, a: Arrow) {
  if (a.hit) return;
  a.hit = true;
  s.streak += 1;
  s.hits += 1;
}

/**
 * Advances an arrow and resolves what its tip swept through this step:
 * balloons (arrows fly straight through, so one can pop several), the
 * target board and the ground.
 */
function stepArrow(s: State, a: Arrow, dt: number, random: () => number) {
  const [x0, y0] = tip(a);
  a.age += dt;
  a.vx += s.wind * dt;
  a.vy += GRAVITY * dt;
  a.x += a.vx * dt;
  a.y += a.vy * dt;
  const [x1, y1] = tip(a);

  s.balloons = s.balloons.filter((b) => {
    if (segDist(b.x, b.y, x0, y0, x1, y1) > BALLOON_R + 2) return true;
    a.popped += 1;
    markHit(s, a);
    s.popped += 1;
    award(s, b.x, b.y, b.gold ? 30 : 10, b.gold ? '#facc15' : '#fff');
    if (b.gold) {
      s.timeLeft += 3;
      s.floaters.push({ x: b.x, y: b.y + 18, text: '+3s', life: 0.9, color: '#facc15' });
    }
    s.bestPierce = Math.max(s.bestPierce, a.popped);
    burst(s.sparks, b.x, b.y, b.color, 14, 140, random);
    s.events.push(b.gold ? 'coin' : 'pop');
    return false;
  });

  // The board is a thin upright disc: hit when the tip crosses its plane.
  const bd = s.board;
  if (bd.respawn <= 0 && x0 < bd.x && x1 >= bd.x) {
    const yc = y0 + ((bd.x - x0) / (x1 - x0)) * (y1 - y0);
    const dy = yc - bd.y;
    if (Math.abs(dy) <= BOARD_R) {
      const pts = ringScore(Math.abs(dy));
      markHit(s, a);
      if (pts === 50) {
        s.bullseyes += 1;
        s.events.push('success');
      } else s.events.push('hit');
      award(s, bd.x, bd.y - BOARD_R - 10, pts, pts === 50 ? '#facc15' : '#fff');
      bd.stuck.push({ dy, angle: Math.atan2(a.vy, a.vx) });
      if (bd.stuck.length >= 3) bd.respawn = 1;
      a.gone = true;
      return;
    }
  }
  if (y1 >= GROUND) {
    a.stuck = true;
    a.y -= y1 - GROUND;
  }
  if (a.x > W + 40 || a.x < -40 || a.y > H + 40) a.gone = true;
}

function aim(s: State, input: Input, dt: number) {
  // Keyboard: ↑/↓ raise and lower the bow, hold Space to draw, release to loose.
  if (input.held.has('up')) s.angle -= 1.1 * dt;
  if (input.held.has('down')) s.angle += 1.1 * dt;
  s.angle = clamp(s.angle, -1.45, 0.5);
  const holding = input.held.has('action');
  if (holding && s.reload <= 0) {
    s.drawing = true;
    s.power = Math.min(1, s.power + dt * 1.1);
  } else if (s.drawing && !holding) {
    shoot(s, s.angle, s.power);
    s.drawing = false;
    s.power = 0;
  }

  // Pointer: press, drag back like a slingshot and let go.
  const p = input.pointer;
  if (p.pressed) s.drag = { x: p.x, y: p.y };
  if (s.drag) {
    const dx = s.drag.x - p.x;
    const dy = s.drag.y - p.y;
    const pull = Math.hypot(dx, dy);
    if (pull > 6) {
      s.angle = clamp(Math.atan2(dy, dx), -1.45, 0.5);
      s.power = clamp(pull / 160, 0.2, 1);
    }
    if (p.released || !p.down) {
      if (pull > 12) shoot(s, s.angle, s.power);
      s.drag = null;
      s.power = 0;
    }
  }
}

export function update(s: State, dt: number, input: Input, random: () => number) {
  updateSparks(s.sparks, dt, 300);
  s.floaters = s.floaters.filter((f) => (f.life -= dt) > 0);
  s.floaters.forEach((f) => (f.y -= 30 * dt));
  s.reload = Math.max(0, s.reload - dt);
  aim(s, input, dt);

  s.timeLeft -= dt;
  if (s.timeLeft <= 0) {
    s.timeLeft = 0;
    s.over = true;
    return;
  }

  s.windT -= dt;
  if (s.windT <= 0) {
    s.wind = Math.round((random() * 2 - 1) * s.windMax);
    s.windT = 12;
  }

  s.spawnT -= dt;
  if (s.spawnT <= 0 && s.balloons.length < 7) {
    s.balloons.push({
      x: 270 + random() * 340,
      y: GROUND + BALLOON_R,
      vy: 38 + random() * 40 + s.time * 0.3,
      color: COLORS[Math.floor(random() * COLORS.length)],
      gold: random() < 0.1,
      sway: random() * Math.PI * 2,
    });
    s.spawnT = 0.7 + random() * 0.6;
  }
  for (const b of s.balloons) {
    b.y -= b.vy * dt;
    b.x += Math.sin(s.time * 2 + b.sway) * 12 * dt;
  }
  s.balloons = s.balloons.filter((b) => b.y > -BALLOON_R * 3);

  const bd = s.board;
  if (bd.respawn > 0) {
    bd.respawn -= dt;
    if (bd.respawn <= 0) s.board = newBoard(random);
  } else bd.y = bd.baseY + Math.sin(s.time * bd.speed + bd.phase) * bd.range;

  for (const a of s.arrows) {
    if (a.stuck) {
      a.fade -= dt;
      continue;
    }
    stepArrow(s, a, dt, random);
    // A shot that ends without hitting anything breaks the streak.
    if ((a.stuck || a.gone) && !a.hit) s.streak = 0;
  }
  s.arrows = s.arrows.filter((a) => !a.gone && a.fade > 0);
}

/* -------------------------------------------------------------- render */

function drawArrow(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-16, 0);
  ctx.lineTo(12, 0);
  ctx.stroke();
  ctx.fillStyle = '#9ca3af';
  ctx.beginPath();
  ctx.moveTo(16, 0);
  ctx.lineTo(10, -3.5);
  ctx.lineTo(10, 3.5);
  ctx.fill();
  ctx.fillStyle = '#f43f5e';
  ctx.fillRect(-17, -3.5, 6, 2.5);
  ctx.fillRect(-17, 1, 6, 2.5);
  ctx.restore();
}

function drawBoard(ctx: CanvasRenderingContext2D, bd: Board) {
  if (bd.respawn > 0) ctx.globalAlpha = Math.min(1, bd.respawn);
  ctx.fillStyle = '#78350f';
  ctx.fillRect(bd.x + 4, bd.y - 4, 30, 8);
  // Side-on view of the board: an upright disc with coloured rings.
  const rings: [number, string][] = [
    [BOARD_R, '#f8fafc'],
    [22, '#1e293b'],
    [14, '#3b82f6'],
    [6, '#facc15'],
  ];
  for (const [r, color] of rings) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(bd.x, bd.y, 7, r, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const a of bd.stuck) drawArrow(ctx, bd.x - 12 * Math.cos(a.angle), bd.y + a.dy - 12 * Math.sin(a.angle), a.angle);
  ctx.globalAlpha = 1;
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  gradientBg(ctx, W, H, '#7dd3fc', '#e0f2fe');
  ctx.fillStyle = '#bbf7d0';
  ctx.beginPath();
  ctx.moveTo(0, GROUND);
  for (let x = 0; x <= W; x += 32) ctx.lineTo(x, GROUND - 30 - Math.sin(x / 90) * 18);
  ctx.lineTo(W, GROUND);
  ctx.fill();
  ctx.fillStyle = '#65a30d';
  ctx.fillRect(0, GROUND, W, H - GROUND);

  for (const b of s.balloons) {
    ctx.strokeStyle = 'rgba(15,23,42,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(b.x, b.y + BALLOON_R);
    ctx.quadraticCurveTo(b.x - 5, b.y + BALLOON_R + 12, b.x, b.y + BALLOON_R + 24);
    ctx.stroke();
    ctx.fillStyle = b.gold ? '#facc15' : b.color;
    ctx.beginPath();
    ctx.ellipse(b.x, b.y, BALLOON_R * 0.88, BALLOON_R, 0, 0, Math.PI * 2);
    ctx.fill();
    circle(ctx, b.x - 5, b.y - 6, 3.5, 'rgba(255,255,255,0.55)');
    if (b.gold) text(ctx, '⏱', b.x, b.y + 1, { size: 12 });
  }
  drawBoard(ctx, s.board);

  // Archer: a simple original figure holding a longbow.
  ctx.fillStyle = '#334155';
  ctx.fillRect(BOW.x - 24, BOW.y - 6, 12, 48);
  ctx.fillRect(BOW.x - 24, GROUND - 28, 5, 28);
  ctx.fillRect(BOW.x - 17, GROUND - 28, 5, 28);
  circle(ctx, BOW.x - 18, BOW.y - 16, 10, '#fcd9b6');
  ctx.fillStyle = '#16a34a';
  ctx.beginPath();
  ctx.moveTo(BOW.x - 30, BOW.y - 20);
  ctx.lineTo(BOW.x - 6, BOW.y - 22);
  ctx.lineTo(BOW.x - 20, BOW.y - 34);
  ctx.fill();
  const drawn = s.drag || s.drawing ? s.power : 0;
  ctx.save();
  ctx.translate(BOW.x, BOW.y);
  ctx.rotate(s.angle);
  ctx.strokeStyle = '#92400e';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(-6, 0, 30, -1.1, 1.1);
  ctx.stroke();
  const pullX = -6 + Math.cos(1.1) * 30 - drawn * 18;
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-6 + Math.cos(-1.1) * 30, Math.sin(-1.1) * 30);
  ctx.lineTo(pullX, 0);
  ctx.lineTo(-6 + Math.cos(1.1) * 30, Math.sin(1.1) * 30);
  ctx.stroke();
  ctx.restore();
  if (s.reload <= 0) drawArrow(ctx, BOW.x + Math.cos(s.angle) * (6 - drawn * 18), BOW.y + Math.sin(s.angle) * (6 - drawn * 18), s.angle);

  // A short preview of the arrow's path (ignoring wind) while aiming.
  if (s.drag || s.drawing) {
    const p = Math.max(0.2, s.power);
    let x = BOW.x;
    let y = BOW.y;
    const vx = Math.cos(s.angle) * MAX_SPEED * p;
    let vy = Math.sin(s.angle) * MAX_SPEED * p;
    ctx.fillStyle = 'rgba(15,23,42,0.45)';
    for (let i = 0; i < 9; i++) {
      for (let k = 0; k < 3; k++) {
        vy += GRAVITY / 60;
        x += vx / 60;
        y += vy / 60;
      }
      ctx.beginPath();
      ctx.arc(x, y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  for (const a of s.arrows) {
    ctx.globalAlpha = Math.min(1, a.fade);
    drawArrow(ctx, a.x, a.y, Math.atan2(a.vy, a.vx));
  }
  ctx.globalAlpha = 1;
  drawSparks(ctx, s.sparks);
  for (const f of s.floaters) {
    ctx.globalAlpha = Math.min(1, f.life * 2);
    text(ctx, f.text, f.x, f.y, { size: 16, color: f.color });
  }
  ctx.globalAlpha = 1;

  // Wind sock.
  const wx = W - 70;
  text(ctx, `Wind ${s.wind === 0 ? 'calm' : `${Math.abs(s.wind)} ${s.wind > 0 ? '→' : '←'}`}`, wx, 20, { size: 13, color: '#0f172a' });
  ctx.fillStyle = '#f97316';
  ctx.beginPath();
  ctx.moveTo(wx, 34);
  ctx.lineTo(wx + (s.wind / 90) * 40, 38);
  ctx.lineTo(wx, 42);
  ctx.fill();
  text(ctx, `${Math.ceil(s.timeLeft)}s`, W / 2, 22, { size: 22, color: s.timeLeft < 10 ? '#dc2626' : '#0f172a' });
  text(ctx, String(s.score), 16, 22, { size: 20, align: 'left', color: '#0f172a' });
  const m = multiplier(s.streak);
  if (m > 1) text(ctx, `×${m} streak`, 16, 44, { size: 13, align: 'left', color: '#b45309' });
}

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create,
  update,
  render,
  hud: (s) => [
    { label: 'Score', value: s.score },
    { label: 'Time', value: `${Math.ceil(s.timeLeft)}s` },
    { label: 'Streak', value: `${s.streak} (×${multiplier(s.streak)})` },
    { label: 'Accuracy', value: s.shots ? `${Math.round((s.hits / s.shots) * 100)}%` : '—' },
  ],
  result: (s) => ({
    score: s.score,
    title: 'Time’s up!',
    details: [
      { label: 'Balloons popped', value: String(s.popped) },
      { label: 'Bullseyes', value: String(s.bullseyes) },
      { label: 'Accuracy', value: s.shots ? `${Math.round((s.hits / s.shots) * 100)}%` : '—' },
    ],
  }),
  onEnd: (s) => {
    void reportProgress('archery-challenge.score-500', s.score);
    void reportProgress('archery-challenge.score-1500', s.score);
    void reportProgress('archery-challenge.bullseyes', s.bullseyes);
    void reportProgress('archery-challenge.pierce', s.bestPierce);
    void incrementProgress('archery-challenge.balloons', s.popped);
  },
  touch: { pad: 'none' },
  pointerStarts: false,
  startHint: 'Drag back from anywhere and let go to shoot — or aim with ↑/↓, hold Space to draw and release.',
};
