import type { Input } from '../arcade/kit';
import { circle } from '../arcade/draw';
import type { Control, Player, RallyBall } from './rally';
import { emptyControl } from './rally';

/** Maps court metres to canvas pixels; z lifts the ball up the screen. */
export interface View {
  cx: number;
  cy: number;
  scale: number;
}

export function toScreen(v: View, x: number, y: number, z = 0): [number, number] {
  return [v.cx + x * v.scale, v.cy + y * v.scale - z * v.scale * 0.8];
}

export function toWorld(v: View, sx: number, sy: number) {
  return { x: (sx - v.cx) / v.scale, y: (sy - v.cy) / v.scale };
}

/** Remembers whether the pointer or the keys moved last. */
export interface PointerMemory {
  x: number;
  y: number;
  following: boolean;
}

export function pointerMemory(): PointerMemory {
  return { x: -1, y: -1, following: false };
}

/** Turns keys, mouse or touch into a rally Control for the human player. */
export function readControl(input: Input, v: View, mem: PointerMemory): Control {
  const c = emptyControl();
  const h = input.held;
  c.mx = (h.has('right') ? 1 : 0) - (h.has('left') ? 1 : 0);
  c.my = (h.has('down') ? 1 : 0) - (h.has('up') ? 1 : 0);
  c.steer = c.mx;
  c.depth = h.has('up') ? 1 : h.has('down') ? -1 : 0;
  c.serve = input.pressed.has('action') || input.pointer.pressed;
  const p = input.pointer;
  if (c.mx !== 0 || c.my !== 0) mem.following = false;
  if (p.active && (p.x !== mem.x || p.y !== mem.y || p.down)) {
    mem.following = true;
    mem.x = p.x;
    mem.y = p.y;
  }
  if (mem.following && p.active) c.target = toWorld(v, p.x, p.y);
  return c;
}

export function drawBall(ctx: CanvasRenderingContext2D, v: View, b: RallyBall, radius: number, color: string) {
  const [sx, sy] = toScreen(v, b.x, b.y);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(sx, sy, radius, radius * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  const [bx, by] = toScreen(v, b.x, b.y, b.z);
  const r = radius * (1 + Math.min(0.5, b.z * 0.08));
  circle(ctx, bx, by, r, color);
  circle(ctx, bx - r * 0.3, by - r * 0.3, r * 0.35, 'rgba(255,255,255,0.6)');
}

/** A player seen from above, with a paddle or racket on the hitting side. */
export function drawPlayer(
  ctx: CanvasRenderingContext2D,
  v: View,
  p: Player,
  body: string,
  facing: 1 | -1,
  bat: { length: number; head: number; color: string },
  ballX: number,
) {
  const [sx, sy] = toScreen(v, p.x, p.y);
  const side = ballX >= p.x ? 1 : -1;
  const swing = p.swing > 0 ? Math.sin((p.swing / 0.25) * Math.PI) : 0;
  const angle = side * (0.5 - swing * 0.9) * facing;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(0, 6, 16, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  circle(ctx, 0, 0, 13, body);
  circle(ctx, 0, -2 * facing, 7, '#f1c27d');
  ctx.rotate(angle);
  ctx.strokeStyle = '#3f2a14';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(side * 10, 0);
  ctx.lineTo(side * (10 + bat.length), -facing * 4);
  ctx.stroke();
  ctx.fillStyle = bat.color;
  ctx.beginPath();
  ctx.ellipse(side * (12 + bat.length), -facing * 5, bat.head, bat.head * 0.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
