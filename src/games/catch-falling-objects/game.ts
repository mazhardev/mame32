import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState, clamp } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { burst, drawSparks, fillRound, gradientBg, text, updateSparks } from '../_shared/arcade/draw';
import type { Spark } from '../_shared/arcade/draw';

/**
 * Catch Falling Objects: move the basket to catch fruit. Golden stars are
 * worth more, bombs cost a life, and every fruit that hits the ground costs a
 * life too. Things fall faster as the score climbs.
 */
export const W = 400;
export const H = 560;
export const BASKET_Y = H - 70;
const BASKET_W = 84;
const MOVE = 380;

type Kind = 'fruit' | 'star' | 'bomb';
export interface Item {
  kind: Kind;
  icon: string;
  x: number;
  y: number;
  vy: number;
}

export interface State extends BaseState {
  x: number;
  items: Item[];
  spawnIn: number;
  interval: number;
  fall: number;
  lives: number;
  caught: number;
  streak: number;
  bestStreak: number;
  sparks: Spark[];
  bombRate: number;
}

const FRUIT = ['🍎', '🍊', '🍋', '🍇', '🍓', '🍐', '🍑'];
const SETTINGS: Record<DifficultySetting, { fall: number; interval: number; bombs: number }> = {
  easy: { fall: 150, interval: 1.0, bombs: 0.1 },
  normal: { fall: 190, interval: 0.85, bombs: 0.16 },
  hard: { fall: 230, interval: 0.7, bombs: 0.22 },
};
export function create(difficulty: DifficultySetting): State {
  const c = SETTINGS[difficulty];
  return { ...baseState(), bombRate: c.bombs, x: W / 2, items: [], spawnIn: 0.5, interval: c.interval, fall: c.fall, lives: 3, caught: 0, streak: 0, bestStreak: 0, sparks: [] };
}

export function spawnItem(s: State, random: () => number): Item {
  const r = random();
  const kind: Kind = r < s.bombRate ? 'bomb' : r < s.bombRate + 0.08 ? 'star' : 'fruit';
  const icon = kind === 'bomb' ? '💣' : kind === 'star' ? '⭐' : FRUIT[Math.floor(random() * FRUIT.length)];
  const item = { kind, icon, x: 24 + random() * (W - 48), y: -20, vy: s.fall * (0.85 + random() * 0.3) + s.caught * 1.5 };
  s.items.push(item);
  return item;
}

export function inBasket(s: State, item: Item): boolean {
  return item.y >= BASKET_Y - 10 && item.y <= BASKET_Y + 14 && Math.abs(item.x - s.x) <= BASKET_W / 2;
}

export function update(s: State, dt: number, input: Input, random: () => number) {
  let dir = 0;
  if (input.held.has('left')) dir -= 1;
  if (input.held.has('right')) dir += 1;
  if (dir) s.x += dir * MOVE * dt;
  else if (input.pointer.active && (input.pointer.down || input.pointer.pressed)) s.x += clamp(input.pointer.x - s.x, -MOVE * dt * 1.6, MOVE * dt * 1.6);
  s.x = clamp(s.x, BASKET_W / 2, W - BASKET_W / 2);

  s.spawnIn -= dt;
  if (s.spawnIn <= 0) {
    spawnItem(s, random);
    s.spawnIn = Math.max(0.35, s.interval - s.caught * 0.006) * (0.7 + random() * 0.6);
  }
  for (const it of s.items) it.y += it.vy * dt;
  const keep: Item[] = [];
  for (const it of s.items) {
    if (inBasket(s, it)) {
      if (it.kind === 'bomb') {
        s.lives -= 1;
        s.streak = 0;
        s.events.push('explosion');
        burst(s.sparks, it.x, it.y, '#f97316', 18, 220, random);
      } else {
        s.caught += 1;
        s.streak += 1;
        s.bestStreak = Math.max(s.bestStreak, s.streak);
        s.score += it.kind === 'star' ? 50 : 10;
        s.events.push(it.kind === 'star' ? 'coin' : 'pop');
        burst(s.sparks, it.x, it.y, it.kind === 'star' ? '#facc15' : '#86efac', 8, 120, random);
      }
      continue;
    }
    if (it.y > H + 20) {
      if (it.kind !== 'bomb') {
        s.lives -= 1;
        s.streak = 0;
        s.events.push('failure');
      }
      continue;
    }
    keep.push(it);
  }
  s.items = keep;
  updateSparks(s.sparks, dt, 300);
  if (s.lives <= 0) {
    s.over = true;
    s.events.push('gameOver');
  }
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  gradientBg(ctx, W, H, '#fef3c7', '#fde68a');
  ctx.fillStyle = '#65a30d';
  ctx.fillRect(0, H - 30, W, 30);
  for (const it of s.items) text(ctx, it.icon, it.x, it.y, { size: 30 });
  fillRound(ctx, s.x - BASKET_W / 2, BASKET_Y, BASKET_W, 30, 8, '#92400e');
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 2;
  for (let i = 1; i < 6; i++) {
    const x = s.x - BASKET_W / 2 + (i * BASKET_W) / 6;
    ctx.beginPath();
    ctx.moveTo(x, BASKET_Y + 3);
    ctx.lineTo(x, BASKET_Y + 27);
    ctx.stroke();
  }
  drawSparks(ctx, s.sparks);
  text(ctx, '❤'.repeat(Math.max(0, s.lives)), 50, 28, { size: 20, color: '#dc2626' });
  text(ctx, String(s.score), W - 50, 28, { size: 22, color: '#78350f' });
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
    { label: 'Caught', value: s.caught },
  ],
  result: (s) => ({
    score: s.score,
    title: 'Basket down!',
    details: [
      { label: 'Caught', value: String(s.caught) },
      { label: 'Best streak', value: String(s.bestStreak) },
    ],
  }),
  onEnd: (s) => {
    void reportProgress('catch-falling-objects.caught-30', s.caught);
    void reportProgress('catch-falling-objects.score-1000', s.score);
    void reportProgress('catch-falling-objects.streak-25', s.bestStreak);
    void incrementProgress('catch-falling-objects.total', s.caught);
  },
  touch: { pad: 'horizontal' },
  startHint: 'Move the basket with ← → or by dragging. Catch fruit and stars, dodge bombs!',
};
