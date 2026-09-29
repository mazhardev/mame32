import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { gradientBg, text } from '../_shared/arcade/draw';

/**
 * Stack Tower: a block slides back and forth above the tower. Tap to drop
 * it; whatever overhangs the block below is sliced off, so the tower gets
 * narrower with every imperfect drop. Perfect drops keep the full width,
 * and a streak of them makes the block grow back a little.
 */
export const W = 360;
export const H = 640;
export const BLOCK_H = 26;
const START_W = 180;
const PERFECT = 5;

export interface Block {
  x: number;
  w: number;
  hue: number;
}

export interface Falling {
  x: number;
  y: number;
  w: number;
  vy: number;
  hue: number;
}

export interface State extends BaseState {
  tower: Block[];
  moving: Block;
  dir: number;
  speed: number;
  speedUp: number;
  falling: Falling[];
  perfectStreak: number;
  bestStreak: number;
  camera: number;
  flash: number;
}

const SETTINGS: Record<DifficultySetting, { speed: number; up: number }> = {
  easy: { speed: 150, up: 3 },
  normal: { speed: 190, up: 4.5 },
  hard: { speed: 240, up: 6 },
};

export function create(difficulty: DifficultySetting): State {
  const c = SETTINGS[difficulty];
  const base = { x: (W - START_W) / 2, w: START_W, hue: 200 };
  return {
    ...baseState(),
    tower: [base],
    moving: { x: -START_W, w: START_W, hue: 212 },
    dir: 1,
    speed: c.speed,
    speedUp: c.up,
    falling: [],
    perfectStreak: 0,
    bestStreak: 0,
    camera: 0,
    flash: 0,
  };
}

/** Screen y of the top edge of tower level `i`. */
export function levelY(i: number, camera: number): number {
  return H - 120 - (i + 1) * BLOCK_H + camera;
}

/**
 * Drops the moving block on the tower. Returns 'perfect', 'cut' or 'miss'.
 */
export function drop(s: State): 'perfect' | 'cut' | 'miss' {
  const top = s.tower[s.tower.length - 1];
  const m = s.moving;
  const level = s.tower.length;
  const y = levelY(level, s.camera);
  const left = Math.max(m.x, top.x);
  const right = Math.min(m.x + m.w, top.x + top.w);
  const overlap = right - left;
  if (overlap <= 0) {
    s.falling.push({ x: m.x, y, w: m.w, vy: 0, hue: m.hue });
    s.over = true;
    s.events.push('gameOver');
    return 'miss';
  }
  let placed: Block;
  let result: 'perfect' | 'cut';
  if (Math.abs(m.x - top.x) <= PERFECT) {
    s.perfectStreak += 1;
    s.bestStreak = Math.max(s.bestStreak, s.perfectStreak);
    // Every third perfect in a row widens the block again.
    const grow = s.perfectStreak >= 3 ? Math.min(12, START_W - top.w) : 0;
    placed = { x: top.x - grow / 2, w: top.w + grow, hue: m.hue };
    s.flash = 0.35;
    s.events.push('success');
    result = 'perfect';
  } else {
    s.perfectStreak = 0;
    placed = { x: left, w: overlap, hue: m.hue };
    // The sliced-off piece tumbles away.
    if (m.x < top.x) s.falling.push({ x: m.x, y, w: top.x - m.x, vy: 0, hue: m.hue });
    else s.falling.push({ x: right, y, w: m.x + m.w - right, vy: 0, hue: m.hue });
    s.events.push('click');
    result = 'cut';
  }
  s.tower.push(placed);
  s.score = s.tower.length - 1;
  s.speed += s.speedUp;
  s.dir = s.tower.length % 2 ? 1 : -1;
  s.moving = { x: s.dir > 0 ? -placed.w : W, w: placed.w, hue: (m.hue + 9) % 360 };
  return result;
}

export function update(s: State, dt: number, input: Input) {
  if (input.pressed.has('action') || input.pointer.pressed) drop(s);
  if (s.over) return;
  const m = s.moving;
  m.x += s.dir * s.speed * dt;
  // Bounce between the edges, travelling a little past them.
  if (m.x > W - m.w + 40) s.dir = -1;
  if (m.x < -40) s.dir = 1;
  // Keep the top of the tower in the upper third of the view.
  const target = Math.max(0, (s.tower.length - 12) * BLOCK_H);
  s.camera += (target - s.camera) * Math.min(1, dt * 4);
  for (const f of s.falling) {
    f.vy += 900 * dt;
    f.y += f.vy * dt;
  }
  s.falling = s.falling.filter((f) => f.y < H + 400);
  s.flash = Math.max(0, s.flash - dt);
}

function block(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, hue: number) {
  ctx.fillStyle = `hsl(${hue} 70% 58%)`;
  ctx.fillRect(x, y, w, BLOCK_H);
  ctx.fillStyle = `hsl(${hue} 70% 70%)`;
  ctx.fillRect(x, y, w, 5);
  ctx.fillStyle = `hsl(${hue} 60% 42%)`;
  ctx.fillRect(x, y + BLOCK_H - 4, w, 4);
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  const topHue = s.tower[s.tower.length - 1].hue;
  gradientBg(ctx, W, H, `hsl(${topHue} 45% 22%)`, `hsl(${(topHue + 40) % 360} 50% 12%)`);
  s.tower.forEach((b, i) => {
    const y = levelY(i, s.camera);
    if (y < H + BLOCK_H) block(ctx, b.x, y, b.w, b.hue);
  });
  if (!s.over) block(ctx, s.moving.x, levelY(s.tower.length, s.camera), s.moving.w, s.moving.hue);
  for (const f of s.falling) block(ctx, f.x, f.y, f.w, f.hue);
  if (s.flash > 0) {
    const top = s.tower[s.tower.length - 1];
    ctx.strokeStyle = `rgba(255,255,255,${s.flash * 2.5})`;
    ctx.lineWidth = 3;
    ctx.strokeRect(top.x - 4, levelY(s.tower.length - 1, s.camera) - 4, top.w + 8, BLOCK_H + 8);
  }
  text(ctx, String(s.score), W / 2, 80, { size: 52, color: 'rgba(255,255,255,0.9)' });
  if (s.perfectStreak >= 2) text(ctx, `Perfect ×${s.perfectStreak}`, W / 2, 124, { size: 18, color: '#fde68a' });
}

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create,
  update,
  render,
  hud: (s) => [
    { label: 'Height', value: s.score },
    { label: 'Perfect streak', value: s.perfectStreak },
  ],
  result: (s) => ({
    score: s.score,
    title: s.score >= 30 ? 'Sky-high!' : 'The tower toppled!',
    details: [
      { label: 'Blocks stacked', value: String(s.score) },
      { label: 'Best perfect streak', value: String(s.bestStreak) },
    ],
  }),
  onEnd: (s) => {
    void reportProgress('stack-tower.twenty', s.score);
    void reportProgress('stack-tower.fifty', s.score);
    void reportProgress('stack-tower.perfect', s.bestStreak);
    void incrementProgress('stack-tower.blocks', s.score);
  },
  touch: { pad: 'none' },
  startHint: 'Tap, click or press Space to drop the sliding block. Line it up exactly for a perfect drop.',
};
