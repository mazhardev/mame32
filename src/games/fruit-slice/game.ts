import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { burst, circle, drawSparks, gradientBg, text, updateSparks } from '../_shared/arcade/draw';
import type { Spark } from '../_shared/arcade/draw';

/**
 * Fruit Slice: fruit is tossed up from below. Swipe through it to slice it
 * in two before it falls back down. Several fruits in one swipe earn a
 * combo bonus. Never slice a bomb, and don't let three fruits drop.
 */
export const W = 480;
export const H = 600;
const GRAVITY = 620;

export const FRUITS = [
  { name: 'watermelon', color: '#16a34a', flesh: '#f43f5e', r: 34 },
  { name: 'orange', color: '#f97316', flesh: '#fdba74', r: 24 },
  { name: 'apple', color: '#dc2626', flesh: '#fef3c7', r: 22 },
  { name: 'kiwi', color: '#854d0e', flesh: '#84cc16', r: 20 },
  { name: 'lemon', color: '#facc15', flesh: '#fef9c3', r: 21 },
  { name: 'plum', color: '#7c3aed', flesh: '#fde68a', r: 19 },
];

export interface Fruit {
  kind: number; // index into FRUITS, or -1 for a bomb
  x: number;
  y: number;
  vx: number;
  vy: number;
  spin: number;
  angle: number;
  sliced: boolean;
}

export interface Half {
  kind: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  side: number;
}

export interface State extends BaseState {
  fruits: Fruit[];
  halves: Half[];
  lives: number;
  spawnT: number;
  spawnRate: number;
  bombChance: number;
  trail: { x: number; y: number; t: number }[];
  blade: { x: number; y: number };
  swipeCount: number;
  bestCombo: number;
  sliced: number;
  comboText: { text: string; x: number; y: number; t: number } | null;
  sparks: Spark[];
  last: { x: number; y: number } | null;
}

const SETTINGS: Record<DifficultySetting, { rate: number; bomb: number }> = {
  easy: { rate: 1.4, bomb: 0.08 },
  normal: { rate: 1.1, bomb: 0.13 },
  hard: { rate: 0.85, bomb: 0.18 },
};

export function create(difficulty: DifficultySetting): State {
  const c = SETTINGS[difficulty];
  return {
    ...baseState(),
    fruits: [],
    halves: [],
    lives: 3,
    spawnT: 0.6,
    spawnRate: c.rate,
    bombChance: c.bomb,
    trail: [],
    blade: { x: W / 2, y: H / 2 },
    swipeCount: 0,
    bestCombo: 0,
    sliced: 0,
    comboText: null,
    sparks: [],
    last: null,
  };
}

export function radius(f: Pick<Fruit, 'kind'>): number {
  return f.kind < 0 ? 22 : FRUITS[f.kind].r;
}

/** Shortest distance from point p to segment ab. */
export function segmentDistance(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len = dx * dx + dy * dy;
  const t = len ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len)) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function toss(s: State, random: () => number) {
  const n = 1 + (random() < 0.35 ? 1 : 0) + (s.time > 30 && random() < 0.3 ? 1 : 0);
  for (let i = 0; i < n; i++) {
    const x = 80 + random() * (W - 160);
    const bomb = random() < s.bombChance;
    s.fruits.push({
      kind: bomb ? -1 : Math.floor(random() * FRUITS.length),
      x,
      y: H + 30,
      vx: (W / 2 - x) * (0.3 + random() * 0.4),
      vy: -(620 + random() * 160),
      spin: (random() - 0.5) * 6,
      angle: 0,
      sliced: false,
    });
  }
  s.events.push('whoosh');
}

/** Slices everything the blade crossed between two points. */
export function slice(s: State, ax: number, ay: number, bx: number, by: number, random: () => number) {
  for (const f of s.fruits) {
    if (f.sliced || segmentDistance(f.x, f.y, ax, ay, bx, by) > radius(f)) continue;
    f.sliced = true;
    if (f.kind < 0) {
      burst(s.sparks, f.x, f.y, '#fb923c', 40, 260, random);
      s.over = true;
      s.events.push('explosion');
      return;
    }
    s.sliced += 1;
    s.swipeCount += 1;
    s.score += 1;
    const angle = Math.atan2(by - ay, bx - ax);
    for (const side of [-1, 1]) {
      s.halves.push({ kind: f.kind, x: f.x, y: f.y, vx: f.vx + Math.cos(angle + Math.PI / 2) * side * 90, vy: f.vy * 0.3, angle, side });
    }
    burst(s.sparks, f.x, f.y, FRUITS[f.kind].flesh, 10, 140, random);
    s.events.push('pop');
  }
}

function endSwipe(s: State) {
  if (s.swipeCount >= 3) {
    s.score += s.swipeCount;
    s.comboText = { text: `${s.swipeCount} fruit combo! +${s.swipeCount}`, x: s.blade.x, y: s.blade.y, t: 1 };
    s.events.push('powerup');
  }
  s.bestCombo = Math.max(s.bestCombo, s.swipeCount);
  s.swipeCount = 0;
  s.last = null;
}

export function update(s: State, dt: number, input: Input, random: () => number) {
  updateSparks(s.sparks, dt, 500);
  // The blade follows the pointer; the keyboard steers it too.
  const kx = (input.held.has('right') ? 1 : 0) - (input.held.has('left') ? 1 : 0);
  const ky = (input.held.has('down') ? 1 : 0) - (input.held.has('up') ? 1 : 0);
  if (kx || ky) {
    s.blade.x = Math.max(0, Math.min(W, s.blade.x + kx * 520 * dt));
    s.blade.y = Math.max(0, Math.min(H, s.blade.y + ky * 520 * dt));
  }
  const pointerCutting = input.pointer.down;
  if (pointerCutting) s.blade = { x: input.pointer.x, y: input.pointer.y };
  const cutting = pointerCutting || input.held.has('action');
  if (cutting) {
    if (s.last) slice(s, s.last.x, s.last.y, s.blade.x, s.blade.y, random);
    s.last = { ...s.blade };
    s.trail.push({ ...s.blade, t: 0.18 });
  } else if (s.last) endSwipe(s);
  for (const p of s.trail) p.t -= dt;
  s.trail = s.trail.filter((p) => p.t > 0);

  s.spawnT -= dt;
  if (s.spawnT <= 0) {
    toss(s, random);
    s.spawnT = s.spawnRate * (0.7 + random() * 0.6) * Math.max(0.55, 1 - s.time / 180);
  }
  for (const f of s.fruits) {
    f.vy += GRAVITY * dt;
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    f.angle += f.spin * dt;
  }
  for (const h of s.halves) {
    h.vy += GRAVITY * dt;
    h.x += h.vx * dt;
    h.y += h.vy * dt;
    h.angle += h.side * 3 * dt;
  }
  // Whole fruit that falls back out costs a life (bombs don't).
  const dropped = s.fruits.filter((f) => !f.sliced && f.vy > 0 && f.y > H + 40);
  for (const f of dropped) {
    if (f.kind >= 0) {
      s.lives -= 1;
      s.events.push('failure');
    }
  }
  if (s.lives <= 0) s.over = true;
  s.fruits = s.fruits.filter((f) => !f.sliced && !(f.vy > 0 && f.y > H + 40));
  s.halves = s.halves.filter((h) => h.y < H + 60);
  if (s.comboText) {
    s.comboText.t -= dt;
    s.comboText.y -= 30 * dt;
    if (s.comboText.t <= 0) s.comboText = null;
  }
}

function drawFruit(ctx: CanvasRenderingContext2D, kind: number, x: number, y: number, angle: number) {
  if (kind < 0) {
    circle(ctx, x, y, 22, '#111827');
    circle(ctx, x - 7, y - 7, 5, '#4b5563');
    ctx.strokeStyle = '#a16207';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + 10, y - 18);
    ctx.quadraticCurveTo(x + 20, y - 34, x + 26, y - 28);
    ctx.stroke();
    circle(ctx, x + 26, y - 28, 4 + Math.random() * 2, '#fbbf24');
    return;
  }
  const f = FRUITS[kind];
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  circle(ctx, 0, 0, f.r, f.color);
  if (f.name === 'watermelon') {
    ctx.strokeStyle = '#14532d';
    ctx.lineWidth = 3;
    for (const k of [-0.5, 0, 0.5]) {
      ctx.beginPath();
      ctx.ellipse(k * f.r, 0, 4, f.r * 0.9, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  circle(ctx, -f.r * 0.35, -f.r * 0.35, f.r * 0.22, 'rgba(255,255,255,0.35)');
  ctx.restore();
}

function drawHalf(ctx: CanvasRenderingContext2D, h: Half) {
  const f = FRUITS[h.kind];
  ctx.save();
  ctx.translate(h.x, h.y);
  ctx.rotate(h.angle);
  ctx.beginPath();
  ctx.arc(0, 0, f.r, h.side > 0 ? 0 : Math.PI, h.side > 0 ? Math.PI : Math.PI * 2);
  ctx.fillStyle = f.color;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 0, f.r * 0.82, h.side > 0 ? 0 : Math.PI, h.side > 0 ? Math.PI : Math.PI * 2);
  ctx.fillStyle = f.flesh;
  ctx.fill();
  ctx.restore();
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  gradientBg(ctx, W, H, '#78350f', '#451a03');
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.lineWidth = 2;
  for (let x = 60; x < W; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (const h of s.halves) drawHalf(ctx, h);
  for (const f of s.fruits) drawFruit(ctx, f.kind, f.x, f.y, f.angle);
  drawSparks(ctx, s.sparks);
  if (s.trail.length > 1) {
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineCap = 'round';
    for (let i = 1; i < s.trail.length; i++) {
      ctx.lineWidth = 2 + (s.trail[i].t / 0.18) * 6;
      ctx.beginPath();
      ctx.moveTo(s.trail[i - 1].x, s.trail[i - 1].y);
      ctx.lineTo(s.trail[i].x, s.trail[i].y);
      ctx.stroke();
    }
  }
  circle(ctx, s.blade.x, s.blade.y, 4, 'rgba(255,255,255,0.7)');
  if (s.comboText) text(ctx, s.comboText.text, s.comboText.x, s.comboText.y, { size: 20, color: '#fde047' });
  text(ctx, String(s.score), 20, 32, { size: 28, align: 'left', color: '#fde68a' });
  text(ctx, '✕'.repeat(3 - Math.max(0, s.lives)) + '○'.repeat(Math.max(0, s.lives)), W - 20, 32, { size: 20, align: 'right', color: '#fecaca' });
}

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create,
  update,
  render,
  hud: (s) => [
    { label: 'Score', value: s.score },
    { label: 'Lives', value: s.lives },
    { label: 'Best combo', value: s.bestCombo },
  ],
  result: (s) => ({
    score: s.score,
    title: s.lives > 0 ? 'Boom! You sliced a bomb' : 'Three fruits dropped',
    details: [
      { label: 'Fruit sliced', value: String(s.sliced) },
      { label: 'Best combo', value: String(s.bestCombo) },
    ],
  }),
  onEnd: (s) => {
    void reportProgress('fruit-slice.fifty', s.score);
    void reportProgress('fruit-slice.combo', s.bestCombo);
    void reportProgress('fruit-slice.hundred-fifty', s.score);
    void incrementProgress('fruit-slice.total', s.sliced);
  },
  touch: { pad: 'none' },
  startHint: 'Swipe across the fruit to slice it. Keyboard: steer the blade with the arrows and hold Space to cut.',
};
