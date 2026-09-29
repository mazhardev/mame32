import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { burst, circle, drawSparks, gradientBg, text, updateSparks } from '../_shared/arcade/draw';
import type { Spark } from '../_shared/arcade/draw';

/**
 * Spiral Drop: a ball bounces on the rings of a tall tower. Turn the tower
 * so the ball falls through the gaps. Red sections are deadly — unless the
 * ball has fallen through three or more rings in a row, in which case it
 * smashes straight through. Reach the bottom to clear the level.
 */
export const W = 360;
export const H = 640;
export const SLOTS = 12;
export const SPACING = 110;
const CX = W / 2;
const RX = 120;
const RY = 34;
const BALL_R = 11;
export const BOUNCE = -430;
export const GRAVITY = 1300;
/** The ball sits at the front of the tower (straight towards the viewer). */
const FRONT = Math.PI / 2;

export type Slot = 'solid' | 'gap' | 'danger';

export interface State extends BaseState {
  rings: Slot[][];
  rotation: number;
  y: number;
  vy: number;
  level: number;
  passed: number;
  streak: number;
  smashed: number;
  sparks: Spark[];
  dragX: number | null;
  clearedT: number;
  danger: number;
}

const SETTINGS: Record<DifficultySetting, { danger: number }> = {
  easy: { danger: 0.6 },
  normal: { danger: 1 },
  hard: { danger: 1.4 },
};

export function makeRings(level: number, danger: number, random: () => number): Slot[][] {
  const count = 12 + level * 3;
  const rings: Slot[][] = [];
  for (let i = 0; i < count; i++) {
    const ring: Slot[] = Array<Slot>(SLOTS).fill('solid');
    // A contiguous gap of 2–3 slots somewhere.
    const gapStart = Math.floor(random() * SLOTS);
    const gapLen = 2 + (random() < 0.5 ? 1 : 0);
    for (let k = 0; k < gapLen; k++) ring[(gapStart + k) % SLOTS] = 'gap';
    // Danger slots grow with level (none on the first ring).
    const dangers = i === 0 ? 0 : Math.min(5, Math.floor((1 + level * 0.6 + random() * 2) * danger));
    for (let d = 0; d < dangers; d++) {
      const k = Math.floor(random() * SLOTS);
      if (ring[k] === 'solid') ring[k] = 'danger';
    }
    rings.push(ring);
  }
  return rings;
}

export function create(difficulty: DifficultySetting, random: () => number = Math.random): State {
  const danger = SETTINGS[difficulty].danger;
  return {
    ...baseState(),
    rings: makeRings(1, danger, random),
    rotation: 0,
    y: -60,
    vy: 0,
    level: 1,
    passed: 0,
    streak: 0,
    smashed: 0,
    sparks: [],
    dragX: null,
    clearedT: 0,
    danger,
  };
}

/** Which slot of a ring is under the ball for a tower rotation. */
export function slotUnderBall(rotation: number): number {
  const a = (((FRONT - rotation) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  return Math.floor(a / ((Math.PI * 2) / SLOTS)) % SLOTS;
}

export function update(s: State, dt: number, input: Input, random: () => number) {
  updateSparks(s.sparks, dt, 400);
  if (s.clearedT > 0) {
    s.clearedT -= dt;
    if (s.clearedT <= 0) {
      s.level += 1;
      s.rings = makeRings(s.level, s.danger, random);
      s.y = -60;
      s.vy = 0;
      s.streak = 0;
    }
    return;
  }
  // Turn with the keys, or drag sideways.
  const turn = (input.held.has('right') ? 1 : 0) - (input.held.has('left') ? 1 : 0);
  s.rotation += turn * 3.6 * dt;
  if (input.pointer.down) {
    if (s.dragX !== null) s.rotation += (input.pointer.x - s.dragX) * 0.018;
    s.dragX = input.pointer.x;
  } else s.dragX = null;

  const prev = s.y;
  s.vy += GRAVITY * dt;
  s.y += s.vy * dt;
  // Check each ring the ball crossed on the way down.
  if (s.vy > 0) {
    for (let i = 0; i < s.rings.length; i++) {
      const ry = i * SPACING;
      if (!(prev + BALL_R <= ry && s.y + BALL_R >= ry)) continue;
      const slot = s.rings[i][slotUnderBall(s.rotation)];
      if (slot === 'gap' || s.streak >= 3) {
        if (slot !== 'gap') {
          s.smashed += 1;
          burst(s.sparks, CX, H * 0.4, '#f472b6', 16, 200, random);
          s.events.push('explosion');
          s.streak = 0;
          s.y = ry - BALL_R;
          s.vy = BOUNCE;
          s.rings[i] = s.rings[i].map(() => 'gap');
        } else {
          s.streak += 1;
          s.passed += 1;
          s.score += s.level * s.streak;
          s.events.push('pop');
        }
        continue;
      }
      if (slot === 'danger') {
        s.over = true;
        s.events.push('gameOver');
        return;
      }
      s.y = ry - BALL_R;
      s.vy = BOUNCE;
      s.streak = 0;
      s.events.push('tick');
      break;
    }
  }
  if (s.y > (s.rings.length - 1) * SPACING + 60) {
    s.score += 10 * s.level;
    s.clearedT = 1.2;
    s.events.push('levelComplete');
  }
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  gradientBg(ctx, W, H, `hsl(${(s.level * 47) % 360} 55% 30%)`, `hsl(${(s.level * 47 + 40) % 360} 60% 14%)`);
  const camera = s.y - H * 0.4;
  // The pole.
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(CX - 18, 0, 36, H);
  const slotAngle = (Math.PI * 2) / SLOTS;
  // Draw rings from the bottom of the view upwards so nearer ones overlap.
  for (let i = s.rings.length - 1; i >= 0; i--) {
    const y = i * SPACING - camera;
    if (y < -60 || y > H + 60) continue;
    const ring = s.rings[i];
    for (let k = 0; k < SLOTS; k++) {
      if (ring[k] === 'gap') continue;
      const a0 = k * slotAngle + s.rotation;
      const a1 = a0 + slotAngle;
      ctx.fillStyle = ring[k] === 'danger' ? '#ef4444' : `hsl(${(s.level * 47 + 180) % 360} 70% 62%)`;
      ctx.beginPath();
      ctx.ellipse(CX, y, RX, RY, 0, a0, a1);
      ctx.ellipse(CX, y, 22, 7, 0, a1, a0, true);
      ctx.closePath();
      ctx.fill();
      // Front faces get a darker edge for depth.
      if (Math.sin((a0 + a1) / 2) > 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath();
        ctx.ellipse(CX, y, RX, RY, 0, a0, a1);
        ctx.ellipse(CX, y + 10, RX, RY, 0, a1, a0, true);
        ctx.closePath();
        ctx.fill();
      }
    }
    if (i === s.rings.length - 1) {
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.ellipse(CX, y + 60, RX, RY, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const by = s.y - camera;
  const bx = CX;
  const ballY = by + RY * Math.sin(FRONT) - BALL_R;
  circle(ctx, bx, ballY, BALL_R, s.streak >= 3 ? '#f472b6' : '#f8fafc');
  circle(ctx, bx - 3, ballY - 3, 3, 'rgba(255,255,255,0.8)');
  drawSparks(ctx, s.sparks);
  // Level progress bar.
  const progress = Math.min(1, Math.max(0, s.y / ((s.rings.length - 1) * SPACING)));
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(60, 20, W - 120, 8);
  ctx.fillStyle = '#facc15';
  ctx.fillRect(60, 20, (W - 120) * progress, 8);
  text(ctx, String(s.level), 44, 24, { size: 14 });
  text(ctx, String(s.level + 1), W - 44, 24, { size: 14 });
  text(ctx, String(s.score), W / 2, 60, { size: 30 });
  if (s.clearedT > 0) text(ctx, 'Level clear!', W / 2, H / 2, { size: 30, color: '#fde047' });
}

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create,
  update,
  render,
  hud: (s) => [
    { label: 'Score', value: s.score },
    { label: 'Level', value: s.level },
    { label: 'Streak', value: s.streak },
  ],
  result: (s) => ({
    score: s.score,
    title: 'Landed on red!',
    details: [
      { label: 'Level', value: String(s.level) },
      { label: 'Rings passed', value: String(s.passed) },
      { label: 'Rings smashed', value: String(s.smashed) },
    ],
  }),
  onEnd: (s) => {
    void reportProgress('spiral-drop.level-3', s.level);
    void reportProgress('spiral-drop.level-8', s.level);
    void reportProgress('spiral-drop.smash', s.smashed);
    void incrementProgress('spiral-drop.rings', s.passed);
  },
  touch: { pad: 'horizontal' },
  startHint: 'Drag sideways or press ← → to turn the tower. Drop through the gaps, avoid red!',
};
