import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { circle, text } from '../_shared/arcade/draw';

/**
 * Color Switch: tap to hop the ball upwards through rotating obstacles.
 * The ball may only pass through the part of an obstacle that matches its
 * own colour. Switcher orbs change the ball's colour; stars score points.
 */
export const W = 360;
export const H = 640;
export const COLORS = ['#f43f5e', '#facc15', '#a855f7', '#22d3ee'];
export const NAMES = ['pink', 'yellow', 'purple', 'cyan'];
const R = 11;

export type ObType = 'ring' | 'double' | 'bars';

export interface Obstacle {
  type: ObType;
  /** World y of the obstacle's centre (grows upwards as negative numbers). */
  y: number;
  angle: number;
  spin: number;
  radius: number;
  starTaken: boolean;
  switcherTaken: boolean;
}

export interface State extends BaseState {
  y: number;
  vy: number;
  color: number;
  camera: number;
  obstacles: Obstacle[];
  spinBase: number;
  gap: number;
  stars: number;
  /** The ball waits on the start line until the first hop. */
  hopped: boolean;
}

const SETTINGS: Record<DifficultySetting, { spin: number; gap: number }> = {
  easy: { spin: 1.3, gap: 360 },
  normal: { spin: 1.8, gap: 330 },
  hard: { spin: 2.4, gap: 300 },
};

export const GRAVITY = 1250;
export const HOP = -410;
const THICK = 16;

export function create(difficulty: DifficultySetting): State {
  const c = SETTINGS[difficulty];
  const s: State = { ...baseState(), y: 0, vy: 0, color: 0, camera: -H * 0.1, obstacles: [], spinBase: c.spin, gap: c.gap, stars: 0, hopped: false };
  return s;
}

/** Colour of a ring at a world angle, given the ring's rotation. */
export function ringColor(angle: number, rotation: number): number {
  const a = (((angle - rotation) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  return Math.floor(a / (Math.PI / 2)) % 4;
}

const SEG = W / 2;

/** Colour of a sliding bar row at screen x, for a row slid by `offset`. */
export function barColor(x: number, offset: number): number {
  return ((Math.floor((x + offset) / SEG) % 4) + 4) % 4;
}

function addObstacle(s: State, random: () => number) {
  const last = s.obstacles[s.obstacles.length - 1];
  const y = last ? last.y - s.gap : -260;
  const n = s.obstacles.length;
  const type: ObType = n < 2 ? 'ring' : (['ring', 'double', 'bars'] as ObType[])[Math.floor(random() * 3)];
  const dir = random() < 0.5 ? 1 : -1;
  s.obstacles.push({ type, y, angle: random() * Math.PI * 2, spin: dir * s.spinBase * (1 + Math.min(0.6, n * 0.03)), radius: type === 'double' ? 70 : 88, starTaken: false, switcherTaken: false });
}

/** The colour the ball would need to be to pass the obstacle at its position, or -1 if clear. */
export function colourAt(ob: Obstacle, ballY: number): number {
  const dy = ballY - ob.y;
  if (ob.type === 'bars') {
    if (Math.abs(dy) > THICK / 2 + R) return -1;
    return barColor(W / 2, ob.angle * 60);
  }
  const rings = ob.type === 'double' ? [ob.radius, ob.radius + 26] : [ob.radius];
  for (let k = 0; k < rings.length; k++) {
    const r = rings[k];
    // The ball travels straight up the centre line, so it meets the ring at the top and bottom.
    if (Math.abs(Math.abs(dy) - r) < THICK / 2 + R) {
      const angle = dy < 0 ? -Math.PI / 2 : Math.PI / 2;
      const rot = k === 0 ? ob.angle : -ob.angle;
      return ringColor(angle, rot);
    }
  }
  return -1;
}

export function update(s: State, dt: number, input: Input, random: () => number) {
  while (s.obstacles.length < 4 || s.obstacles[s.obstacles.length - 1].y > s.y - 900) addObstacle(s, random);
  if (input.pressed.has('action') || input.pressed.has('up') || input.pointer.pressed) {
    s.vy = HOP;
    s.hopped = true;
    s.events.push('jump');
  }
  // Before the first hop the ball rests on the start line.
  if (!s.hopped) return;
  s.vy += GRAVITY * dt;
  s.y += s.vy * dt;
  for (const ob of s.obstacles) ob.angle += ob.spin * dt;
  // The camera follows upwards only.
  s.camera = Math.min(s.camera, s.y - H * 0.1);
  // Screen y is y − camera + 0.6·H, so the ball has dropped off the bottom here.
  if (s.y - s.camera > H * 0.4 + R) {
    s.over = true;
    s.events.push('gameOver');
    return;
  }
  for (const ob of s.obstacles) {
    const need = colourAt(ob, s.y);
    if (need >= 0 && need !== s.color) {
      s.over = true;
      s.events.push('hit');
      return;
    }
    // Star in the middle of the obstacle.
    if (!ob.starTaken && Math.abs(s.y - ob.y) < R + 12) {
      ob.starTaken = true;
      s.stars += 1;
      s.score += 1;
      s.events.push('coin');
    }
    // Colour switcher halfway to the next obstacle.
    const switchY = ob.y - s.gap / 2;
    if (!ob.switcherTaken && Math.abs(s.y - switchY) < R + 12) {
      ob.switcherTaken = true;
      const choices = [0, 1, 2, 3].filter((c) => c !== s.color);
      s.color = choices[Math.floor(random() * choices.length)];
      s.events.push('powerup');
    }
  }
  s.obstacles = s.obstacles.filter((ob) => ob.y - s.camera < H + 300);
}

function drawRing(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, rot: number) {
  ctx.lineWidth = THICK;
  for (let k = 0; k < 4; k++) {
    ctx.strokeStyle = COLORS[k];
    ctx.beginPath();
    ctx.arc(cx, cy, r, rot + (k * Math.PI) / 2 + 0.02, rot + ((k + 1) * Math.PI) / 2 - 0.02);
    ctx.stroke();
  }
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  ctx.fillStyle = '#16161d';
  ctx.fillRect(0, 0, W, H);
  const toScreen = (y: number) => y - s.camera + H * 0.1 + H * 0.5;
  for (const ob of s.obstacles) {
    const cy = toScreen(ob.y);
    if (cy < -200 || cy > H + 200) continue;
    if (ob.type === 'bars') {
      const off = ob.angle * 60;
      const first = Math.floor(off / SEG) - 1;
      for (let k = first; k < first + 5; k++) {
        ctx.fillStyle = COLORS[((k % 4) + 4) % 4];
        ctx.fillRect(k * SEG - off + 2, cy - THICK / 2, SEG - 4, THICK);
      }
    } else {
      drawRing(ctx, W / 2, cy, ob.radius, ob.angle);
      if (ob.type === 'double') drawRing(ctx, W / 2, cy, ob.radius + 26, -ob.angle);
    }
    if (!ob.starTaken) {
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const rr = i % 2 ? 5 : 12;
        ctx.lineTo(W / 2 + Math.cos(a) * rr, cy + Math.sin(a) * rr);
      }
      ctx.fill();
    }
    if (!ob.switcherTaken) {
      const sy = toScreen(ob.y - s.gap / 2);
      for (let k = 0; k < 4; k++) {
        ctx.fillStyle = COLORS[k];
        ctx.beginPath();
        ctx.moveTo(W / 2, sy);
        ctx.arc(W / 2, sy, 11, (k * Math.PI) / 2, ((k + 1) * Math.PI) / 2);
        ctx.fill();
      }
    }
  }
  if (!s.hopped) {
    ctx.fillStyle = '#374151';
    ctx.fillRect(W / 2 - 40, toScreen(0) + R + 2, 80, 4);
  }
  circle(ctx, W / 2, toScreen(s.y), R, COLORS[s.color]);
  text(ctx, String(s.score), 24, 34, { size: 30, align: 'left' });
}

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create,
  update,
  render,
  hud: (s) => [
    { label: 'Stars', value: s.score },
    { label: 'Ball colour', value: NAMES[s.color] },
  ],
  result: (s) => ({
    score: s.score,
    title: 'Wrong colour!',
    details: [{ label: 'Stars collected', value: String(s.stars) }],
  }),
  onEnd: (s) => {
    void reportProgress('color-switch.ten', s.score);
    void reportProgress('color-switch.thirty', s.score);
    void incrementProgress('color-switch.stars', s.score);
  },
  touch: { pad: 'none' },
  startHint: 'Tap or press Space to hop. Only pass through your own colour!',
};
