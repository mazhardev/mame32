import { clamp } from '../arcade/kit';
import type { Input } from '../arcade/kit';

/**
 * Shared rolling-ball physics for golf games: friction that depends on the
 * surface, walls as line segments, round bumpers, a cup that only captures a
 * ball rolling slowly enough, and a drag-back-to-shoot control.
 */
export interface P {
  x: number;
  y: number;
}

export interface Seg {
  a: P;
  b: P;
}

export interface GolfBall {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface Surface {
  /** Constant deceleration (units/s²). */
  decel: number;
  /** Extra acceleration (slopes). */
  ax: number;
  ay: number;
}

export interface Rollable {
  ball: GolfBall;
  radius: number;
  walls: Seg[];
  bumpers: { x: number; y: number; r: number }[];
  /** Moving walls: called each step with the time, returns segments and their angular speed about a pivot. */
  movers?: (t: number) => { seg: Seg; pivot: P; omega: number }[];
  cup: P;
  cupR: number;
  /** Fastest speed at which the cup still catches the ball. */
  cupSpeed: number;
  surface: (x: number, y: number) => Surface;
  wallE: number;
  /** Pull towards the cup when the ball rolls over its edge (units/s²). */
  cupPull?: number;
}

export function segmentsOf(poly: P[]): Seg[] {
  return poly.map((a, i) => ({ a, b: poly[(i + 1) % poly.length] }));
}

function closest(p: P, s: Seg): P {
  const dx = s.b.x - s.a.x;
  const dy = s.b.y - s.a.y;
  const len2 = dx * dx + dy * dy || 1;
  const t = clamp(((p.x - s.a.x) * dx + (p.y - s.a.y) * dy) / len2, 0, 1);
  return { x: s.a.x + dx * t, y: s.a.y + dy * t };
}

/** Pushes the ball out of a contact point and reflects it; (svx, svy) is the surface velocity. */
function contact(ball: GolfBall, c: P, r: number, e: number, svx = 0, svy = 0): boolean {
  const dx = ball.x - c.x;
  const dy = ball.y - c.y;
  const d = Math.hypot(dx, dy);
  if (d >= r || d === 0) return false;
  const nx = dx / d;
  const ny = dy / d;
  ball.x = c.x + nx * r;
  ball.y = c.y + ny * r;
  const rel = (ball.vx - svx) * nx + (ball.vy - svy) * ny;
  if (rel < 0) {
    ball.vx -= (1 + e) * rel * nx;
    ball.vy -= (1 + e) * rel * ny;
  }
  return true;
}

/**
 * One physics step. Returns 'holed' when the ball drops, 'hit' on a wall
 * contact, otherwise null.
 */
export function roll(g: Rollable, dt: number, time: number): 'holed' | 'hit' | null {
  const b = g.ball;
  const surf = g.surface(b.x, b.y);
  b.vx += surf.ax * dt;
  b.vy += surf.ay * dt;
  const sp = Math.hypot(b.vx, b.vy);
  if (sp > 0) {
    const ns = Math.max(0, sp - surf.decel * dt);
    b.vx *= ns / sp;
    b.vy *= ns / sp;
  }
  b.x += b.vx * dt;
  b.y += b.vy * dt;

  let hit = false;
  for (const w of g.walls) if (contact(b, closest(b, w), g.radius, g.wallE)) hit = true;
  for (const k of g.bumpers) {
    const dx = b.x - k.x;
    const dy = b.y - k.y;
    const d = Math.hypot(dx, dy) || 1;
    if (contact(b, { x: k.x + (dx / d) * k.r, y: k.y + (dy / d) * k.r }, g.radius, 1.05))
      hit = true;
  }
  if (g.movers) {
    for (const m of g.movers(time)) {
      const c = closest(b, m.seg);
      // Velocity of the bar at the contact point: ω × r.
      const svx = -m.omega * (c.y - m.pivot.y);
      const svy = m.omega * (c.x - m.pivot.x);
      if (contact(b, c, g.radius, 0.7, svx, svy)) hit = true;
    }
  }

  const dc = Math.hypot(b.x - g.cup.x, b.y - g.cup.y);
  if (dc < g.cupR && Math.hypot(b.vx, b.vy) < g.cupSpeed) {
    b.vx = b.vy = 0;
    b.x = g.cup.x;
    b.y = g.cup.y;
    return 'holed';
  }
  // A ball rolling over the edge of the cup is pulled gently towards it.
  if (dc < g.cupR * 1.6 && dc > 0.01) {
    const pull = (g.cupPull ?? 60) * dt;
    b.vx += ((g.cup.x - b.x) / dc) * pull;
    b.vy += ((g.cup.y - b.y) / dc) * pull;
  }
  return hit ? 'hit' : null;
}

export function atRest(b: GolfBall, threshold = 3): boolean {
  return Math.hypot(b.vx, b.vy) < threshold;
}

/** Drag-back aiming shared by golf games. */
export interface Aim {
  angle: number;
  power: number;
  dragging: boolean;
  /** Keyboard / pointer last used. */
  pointer: boolean;
}

export function newAim(angle = -Math.PI / 2): Aim {
  return { angle, power: 0.5, dragging: false, pointer: false };
}

/**
 * Updates the aim from keys or a drag. Returns true when a shot should be
 * taken. `toScreen` maps the ball into canvas pixels; `maxDrag` is the drag
 * length for full power.
 */
export function updateAim(
  aim: Aim,
  input: Input,
  dt: number,
  ballScreen: P,
  maxDrag = 140,
  fineKey = true,
): boolean {
  const h = input.held;
  const fine = fineKey && h.has('action2') ? 0.2 : 1;
  if (h.has('left')) aim.angle -= 1.6 * fine * dt;
  if (h.has('right')) aim.angle += 1.6 * fine * dt;
  if (h.has('up')) aim.power = clamp(aim.power + 0.6 * fine * dt, 0.03, 1);
  if (h.has('down')) aim.power = clamp(aim.power - 0.6 * fine * dt, 0.03, 1);
  if (h.size) aim.pointer = false;
  const p = input.pointer;
  if (p.pressed) {
    aim.dragging = true;
    aim.pointer = true;
  }
  if (aim.dragging && p.down) {
    const dx = ballScreen.x - p.x;
    const dy = ballScreen.y - p.y;
    const len = Math.hypot(dx, dy);
    if (len > 6) {
      aim.angle = Math.atan2(dy, dx);
      aim.power = clamp(len / maxDrag, 0.03, 1);
    }
  }
  if (aim.dragging && p.released) {
    aim.dragging = false;
    const dx = ballScreen.x - p.x;
    const dy = ballScreen.y - p.y;
    return Math.hypot(dx, dy) > 10;
  }
  return input.pressed.has('action');
}

/** Card wording for a hole score relative to par. */
export function scoreName(strokes: number, par: number): string {
  if (strokes === 1) return 'Hole in one!';
  const d = strokes - par;
  return d <= -3
    ? 'Albatross!'
    : d === -2
      ? 'Eagle!'
      : d === -1
        ? 'Birdie!'
        : d === 0
          ? 'Par'
          : d === 1
            ? 'Bogey'
            : d === 2
              ? 'Double bogey'
              : `+${d}`;
}

export function rectContains(
  r: { x: number; y: number; w: number; h: number },
  x: number,
  y: number,
): boolean {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

export function polyContains(poly: P[], x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
