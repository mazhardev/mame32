import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { fillRound, gradientBg, text } from '../_shared/arcade/draw';

/**
 * Stack Blocks: a crane swings a block back and forth on a rope. Release it
 * to drop it onto the tower. A block that misses the tower top falls and
 * costs a life. A block landing off-centre makes the tower lean; once the
 * stack's overhang builds past half a block width, the top section topples.
 */
export const W = 380;
export const H = 600;
export const BLOCK_W = 70;
export const BLOCK_H = 34;
const BASE_Y = H - 40;
const ROPE = 150;
const DROP_G = 1800;

export interface Placed {
  /** Horizontal offset from the tower base centre. */
  x: number;
  color: string;
}

export interface Falling {
  x: number;
  y: number;
  vy: number;
  vx: number;
  color: string;
}

export interface State extends BaseState {
  tower: Placed[];
  swing: number;
  swingSpeed: number;
  amplitude: number;
  falling: Falling | null;
  /** Blocks tumbling off the screen (missed or toppled), for display only. */
  debris: (Falling & { rot: number })[];
  lives: number;
  perfects: number;
  combo: number;
  nextColor: number;
}

const COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#06b6d4', '#6366f1', '#ec4899'];
const SETTINGS: Record<DifficultySetting, { speed: number; amp: number }> = {
  easy: { speed: 1.6, amp: 0.55 },
  normal: { speed: 2.0, amp: 0.7 },
  hard: { speed: 2.5, amp: 0.85 },
};

export function create(difficulty: DifficultySetting): State {
  const c = SETTINGS[difficulty];
  return {
    ...baseState(),
    tower: [],
    swing: 0,
    swingSpeed: c.speed,
    amplitude: c.amp,
    falling: null,
    debris: [],
    lives: 3,
    perfects: 0,
    combo: 0,
    nextColor: 0,
  };
}

/** Where the camera puts the top of the tower so it stays on screen. */
function cameraShift(s: State): number {
  return Math.max(0, s.tower.length - 8) * BLOCK_H;
}

export const towerTopY = (s: State) => BASE_Y - s.tower.length * BLOCK_H + cameraShift(s);
const pivotY = (s: State) => towerTopY(s) - 260;

export function hookPos(s: State): [number, number] {
  const a = Math.sin(s.swing) * s.amplitude;
  return [W / 2 + Math.sin(a) * ROPE, pivotY(s) + Math.cos(a) * ROPE];
}

/** Offset of the tower top block, i.e. where the next block must land. */
const topX = (s: State) => (s.tower.length ? s.tower[s.tower.length - 1].x : 0);

/**
 * Lands a block at horizontal offset x (relative to the base centre).
 * Returns 'miss' if it misses the top block entirely.
 */
export function land(s: State, x: number, color: string): 'miss' | 'perfect' | 'ok' | 'topple' {
  const support = topX(s);
  const off = x - support;
  if (s.tower.length && Math.abs(off) >= BLOCK_W * 0.85) return 'miss';
  if (!s.tower.length && Math.abs(x) > BLOCK_W) return 'miss';
  const perfect = Math.abs(off) < 5;
  s.tower.push({ x: perfect ? support : x, color });
  // Check stability from the top down: the centre of mass of every section
  // above a block must sit over that block.
  for (let i = s.tower.length - 2; i >= 0; i--) {
    const above = s.tower.slice(i + 1);
    const com = above.reduce((sum, b) => sum + b.x, 0) / above.length;
    if (Math.abs(com - s.tower[i].x) > BLOCK_W / 2) {
      const fallen = s.tower.splice(i + 1);
      for (const b of fallen) s.debris.push({ x: W / 2 + b.x, y: towerTopY(s), vy: -100, vx: com > s.tower[i].x ? 120 : -120, color: b.color, rot: 0 });
      return 'topple';
    }
  }
  return perfect ? 'perfect' : 'ok';
}

export function update(s: State, dt: number, input: Input) {
  s.swing += s.swingSpeed * dt;
  if (!s.falling && (input.pressed.has('action') || input.pointer.pressed)) {
    const [hx, hy] = hookPos(s);
    s.falling = { x: hx, y: hy, vy: 0, vx: Math.cos(s.swing) * s.amplitude * s.swingSpeed * ROPE * 0.25, color: COLORS[s.nextColor % COLORS.length] };
    s.nextColor += 1;
    s.events.push('whoosh');
  }
  const f = s.falling;
  if (f) {
    f.vy += DROP_G * dt;
    f.y += f.vy * dt;
    f.x += f.vx * dt;
    const top = towerTopY(s);
    if (f.y + BLOCK_H / 2 >= top) {
      const result = land(s, f.x - W / 2, f.color);
      s.falling = null;
      if (result === 'miss' || result === 'topple') {
        if (result === 'miss') s.debris.push({ ...f, vy: 0, rot: 0 });
        s.lives -= 1;
        s.combo = 0;
        s.events.push(result === 'topple' ? 'explosion' : 'failure');
        if (s.lives <= 0) {
          s.over = true;
          s.events.push('gameOver');
        }
      } else {
        s.combo = result === 'perfect' ? s.combo + 1 : 0;
        if (result === 'perfect') s.perfects += 1;
        s.score += result === 'perfect' ? 2 + Math.min(3, s.combo - 1) : 1;
        s.events.push(result === 'perfect' ? 'coin' : 'hit');
        s.swingSpeed = Math.min(4, s.swingSpeed + 0.04);
      }
    }
  }
  for (const d of s.debris) {
    d.vy += DROP_G * dt;
    d.y += d.vy * dt;
    d.x += d.vx * dt;
    d.rot += dt * 4;
  }
  s.debris = s.debris.filter((d) => d.y < H + 80);
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  gradientBg(ctx, W, H, '#bfdbfe', '#eff6ff');
  const shift = cameraShift(s);
  ctx.fillStyle = '#64748b';
  ctx.fillRect(W / 2 - 60, BASE_Y + shift, 120, 40);
  s.tower.forEach((b, i) => {
    const y = BASE_Y - (i + 1) * BLOCK_H + shift;
    if (y > H + 40) return;
    fillRound(ctx, W / 2 + b.x - BLOCK_W / 2, y, BLOCK_W, BLOCK_H - 2, 4, b.color);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(W / 2 + b.x - BLOCK_W / 2 + 6, y + 6, BLOCK_W - 12, 5);
  });
  const [hx, hy] = hookPos(s);
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W / 2, pivotY(s));
  ctx.lineTo(hx, hy);
  ctx.stroke();
  if (!s.falling) fillRound(ctx, hx - BLOCK_W / 2, hy, BLOCK_W, BLOCK_H - 2, 4, COLORS[s.nextColor % COLORS.length]);
  if (s.falling) fillRound(ctx, s.falling.x - BLOCK_W / 2, s.falling.y - BLOCK_H / 2, BLOCK_W, BLOCK_H - 2, 4, s.falling.color);
  for (const d of s.debris) {
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.rotate(d.rot);
    fillRound(ctx, -BLOCK_W / 2, -BLOCK_H / 2, BLOCK_W, BLOCK_H - 2, 4, d.color);
    ctx.restore();
  }
  text(ctx, String(s.score), W / 2, 40, { size: 32, color: '#1e3a8a' });
  text(ctx, '❤'.repeat(Math.max(0, s.lives)), 50, 40, { size: 20, color: '#dc2626' });
}

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create,
  update,
  render,
  hud: (s) => [
    { label: 'Score', value: s.score },
    { label: 'Height', value: s.tower.length },
    { label: 'Lives', value: s.lives },
  ],
  result: (s) => ({
    score: s.score,
    title: 'Crane closed!',
    details: [
      { label: 'Tower height', value: String(s.tower.length) },
      { label: 'Perfect drops', value: String(s.perfects) },
    ],
  }),
  onEnd: (s) => {
    void reportProgress('stack-blocks.height-15', s.tower.length);
    void reportProgress('stack-blocks.height-40', s.tower.length);
    void reportProgress('stack-blocks.perfect-5', s.perfects);
    void incrementProgress('stack-blocks.total', s.tower.length);
  },
  touch: { pad: 'none' },
  startHint: 'Tap (or Space) to release the swinging block. Land it squarely so the tower does not topple.',
};
