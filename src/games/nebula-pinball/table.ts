/**
 * Nebula Pinball table geometry and ball physics. The table is 270 × 480
 * logical pixels with y pointing down the table. Walls are line segments
 * with a thickness, bumpers and posts are circles, and flippers are rotating
 * segments. The ball moves in small sub-steps so even fast shots cannot pass
 * through a wall, and each contact reflects the ball off the surface,
 * including the surface's own speed for a swinging flipper.
 */
export const W = 270;
export const H = 480;
export const BALL_R = 6;
export const SUBSTEPS = 10;
export const MAX_SPEED = 1300;

export type SegKind = 'wall' | 'sling' | 'gate' | 'post' | 'target' | 'rubber';

export interface Seg {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Half the wall's thickness. */
  r: number;
  e: number;
  kind: SegKind;
  /** Slingshot or drop-target index. */
  id: number;
}

export interface Circ {
  x: number;
  y: number;
  r: number;
  e: number;
  kind: 'bumper' | 'post';
  id: number;
}

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** In the plunger lane, waiting to be launched. */
  inLane: boolean;
  /** Seconds held in the saucer, or -1. */
  held: number;
  /** Seconds it has hardly moved (for the stuck-ball nudge). */
  still: number;
  /** Is out of play. */
  gone: boolean;
}

export interface Flipper {
  /** Pivot. */
  x: number;
  y: number;
  len: number;
  /** +1 points right (left flipper), -1 points left. */
  dir: 1 | -1;
  /** Angle below horizontal (radians); rest is down, up is raised. */
  a: number;
  rest: number;
  up: number;
  /** Angular speed (rad/s) of `a`. */
  w: number;
  held: boolean;
}

export const FLIP_UP_SPEED = 20;
export const FLIP_DOWN_SPEED = 13;

const seg = (x1: number, y1: number, x2: number, y2: number, kind: SegKind = 'wall', e = 0.45, r = 2, id = 0): Seg => ({ x1, y1, x2, y2, r, e, kind, id });

/** The top arch: half an ellipse from the left wall over to the plunger lane. */
export const ARCH = { cx: 134, cy: 125, rx: 124, ry: 105 };
export const archY = (x: number) => ARCH.cy - ARCH.ry * Math.sqrt(Math.max(0, 1 - ((x - ARCH.cx) / ARCH.rx) ** 2));

function arch(): Seg[] {
  const out: Seg[] = [];
  const n = 28;
  let px = ARCH.cx - ARCH.rx;
  let py = ARCH.cy;
  for (let i = 1; i <= n; i++) {
    const t = Math.PI - (Math.PI * i) / n;
    const x = ARCH.cx + Math.cos(t) * ARCH.rx;
    const y = ARCH.cy - Math.sin(t) * ARCH.ry;
    out.push(seg(px, py, x, y, 'wall', 0.4));
    px = x;
    py = y;
  }
  return out;
}

export const LANE_X = 249;
export const LANE_REST_Y = 461;
export const LANE_TOP = 112;

export const SLINGS = [
  { a: [50, 338], b: [50, 382], c: [73, 397] },
  { a: [200, 338], b: [200, 382], c: [177, 397] },
] as const;

export const DROP_X = 233;
export const DROPS = [
  { y1: 214, y2: 232 },
  { y1: 236, y2: 254 },
  { y1: 258, y2: 276 },
];

export const LANE_POSTS = [88, 118, 148, 178];
export const TOP_LANES = [103, 133, 163];
export const LANE_SENSOR_Y = 62;

export const SAUCER = { x: 58, y: 206, r: 9 };

export function buildWalls(): Seg[] {
  const walls: Seg[] = [
    ...arch(),
    // Left wall and the plunger lane.
    seg(10, ARCH.cy, 10, 490),
    seg(258, ARCH.cy, 258, 490),
    seg(240, 490, 240, LANE_TOP),
    // One-way gate at the top of the lane, sloping back into the playfield.
    seg(258, LANE_TOP - 12, 241, LANE_TOP, 'gate', 0.3),
    // Inlane guides down to the flipper pivots.
    seg(28, 350, 28, 392),
    seg(28, 392, 80, 428),
    seg(222, 350, 222, 392),
    seg(222, 392, 170, 428),
    // Plunger stop.
    seg(241, LANE_REST_Y + BALL_R + 2, 257, LANE_REST_Y + BALL_R + 2, 'wall', 0.1),
  ];
  // Slingshots: two plain sides and a kicking face toward the middle.
  SLINGS.forEach((s, i) => {
    walls.push(seg(s.a[0], s.a[1], s.b[0], s.b[1], 'wall', 0.4, 3));
    walls.push(seg(s.b[0], s.b[1], s.c[0], s.c[1], 'wall', 0.4, 3));
    walls.push(seg(s.a[0], s.a[1], s.c[0], s.c[1], 'sling', 0.6, 3, i));
  });
  // Top-lane separators.
  for (const x of LANE_POSTS) walls.push(seg(x, 46, x, 74, 'post', 0.5, 2.5));
  // The orbit deflector: turns balls coming round the arch back into play.
  walls.push(seg(10, 150, 36, 178, 'rubber', 0.75, 3));
  // Rubber posts guarding the saucer and a guide over the drop targets.
  walls.push(seg(42, 178, 52, 188, 'rubber', 0.7, 3));
  walls.push(seg(DROP_X + 3, 200, 240, 196, 'wall', 0.4));
  walls.push(seg(DROP_X + 3, 290, 240, 296, 'wall', 0.4));
  return walls;
}

export const BUMPERS: Circ[] = [
  { x: 96, y: 140, r: 14, e: 0.9, kind: 'bumper', id: 0 },
  { x: 156, y: 134, r: 14, e: 0.9, kind: 'bumper', id: 1 },
  { x: 126, y: 186, r: 14, e: 0.9, kind: 'bumper', id: 2 },
];

export function makeFlippers(): Flipper[] {
  return [
    { x: 80, y: 428, len: 40, dir: 1, a: 0.5, rest: 0.5, up: -0.42, w: 0, held: false },
    { x: 170, y: 428, len: 40, dir: -1, a: 0.5, rest: 0.5, up: -0.42, w: 0, held: false },
  ];
}

export function flipperTip(f: Flipper): [number, number] {
  return [f.x + f.dir * Math.cos(f.a) * f.len, f.y + Math.sin(f.a) * f.len];
}

/** Moves a flipper toward its target angle for one sub-step. */
export function moveFlipper(f: Flipper, dt: number) {
  const target = f.held ? f.up : f.rest;
  const speed = f.held ? FLIP_UP_SPEED : FLIP_DOWN_SPEED;
  const prev = f.a;
  if (f.a > target) f.a = Math.max(target, f.a - speed * dt);
  else if (f.a < target) f.a = Math.min(target, f.a + speed * dt);
  f.w = (f.a - prev) / dt;
}

export interface Hit {
  kind: SegKind | 'bumper' | 'flipper';
  id: number;
  /** Speed into the surface. */
  speed: number;
}

function closest(px: number, py: number, s: Seg): [number, number] {
  const dx = s.x2 - s.x1;
  const dy = s.y2 - s.y1;
  const len2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - s.x1) * dx + (py - s.y1) * dy) / len2));
  return [s.x1 + dx * t, s.y1 + dy * t];
}

/** Reflects the ball off a surface with normal (nx, ny) moving at (sx, sy). Returns the approach speed. */
function bounce(b: Ball, nx: number, ny: number, e: number, sx = 0, sy = 0): number {
  const rvx = b.vx - sx;
  const rvy = b.vy - sy;
  const vn = rvx * nx + rvy * ny;
  if (vn >= 0) return 0;
  b.vx -= (1 + e) * vn * nx;
  b.vy -= (1 + e) * vn * ny;
  // A little rolling friction along the surface.
  const tx = -ny;
  const ty = nx;
  const vt = (b.vx - sx) * tx + (b.vy - sy) * ty;
  b.vx -= vt * tx * 0.02;
  b.vy -= vt * ty * 0.02;
  return -vn;
}

export function collideSeg(b: Ball, s: Seg, hits: Hit[]) {
  const [cx, cy] = closest(b.x, b.y, s);
  let dx = b.x - cx;
  let dy = b.y - cy;
  const d = Math.hypot(dx, dy);
  const min = BALL_R + s.r;
  if (d >= min || d === 0) return;
  dx /= d;
  dy /= d;
  if (s.kind === 'gate') {
    // One way: only stops balls arriving from above the gate.
    const nx = s.y1 - s.y2;
    const ny = s.x2 - s.x1;
    const side = (b.x - s.x1) * nx + (b.y - s.y1) * ny;
    if (side <= 0 || b.vy < 0) return;
  }
  b.x = cx + dx * min;
  b.y = cy + dy * min;
  const speed = bounce(b, dx, dy, s.e);
  if (speed > 0) hits.push({ kind: s.kind, id: s.id, speed });
}

export function collideCirc(b: Ball, c: Circ, hits: Hit[]) {
  let dx = b.x - c.x;
  let dy = b.y - c.y;
  const d = Math.hypot(dx, dy);
  const min = BALL_R + c.r;
  if (d >= min || d === 0) return;
  dx /= d;
  dy /= d;
  b.x = c.x + dx * min;
  b.y = c.y + dy * min;
  const speed = bounce(b, dx, dy, c.e);
  if (speed > 0) hits.push({ kind: c.kind, id: c.id, speed });
}

export function collideFlipper(b: Ball, f: Flipper, i: number, hits: Hit[]) {
  const [tx, ty] = flipperTip(f);
  const s: Seg = { x1: f.x, y1: f.y, x2: tx, y2: ty, r: 4.5, e: 0.3, kind: 'wall', id: 0 };
  const [cx, cy] = closest(b.x, b.y, s);
  let dx = b.x - cx;
  let dy = b.y - cy;
  const d = Math.hypot(dx, dy);
  const min = BALL_R + s.r;
  if (d >= min || d === 0) return;
  dx /= d;
  dy /= d;
  b.x = cx + dx * min;
  b.y = cy + dy * min;
  // Surface speed of the flipper at the contact point.
  const wz = f.dir === 1 ? f.w : -f.w;
  const ox = cx - f.x;
  const oy = cy - f.y;
  const speed = bounce(b, dx, dy, 0.3, -wz * oy, wz * ox);
  if (speed > 0) hits.push({ kind: 'flipper', id: i, speed });
}

/** Two balls in multiball knock each other apart. */
export function collideBalls(a: Ball, b: Ball) {
  let dx = b.x - a.x;
  let dy = b.y - a.y;
  const d = Math.hypot(dx, dy);
  if (d >= BALL_R * 2 || d === 0) return;
  dx /= d;
  dy /= d;
  const push = (BALL_R * 2 - d) / 2;
  a.x -= dx * push;
  a.y -= dy * push;
  b.x += dx * push;
  b.y += dy * push;
  const vn = (b.vx - a.vx) * dx + (b.vy - a.vy) * dy;
  if (vn >= 0) return;
  a.vx += vn * dx * 0.95;
  a.vy += vn * dy * 0.95;
  b.vx -= vn * dx * 0.95;
  b.vy -= vn * dy * 0.95;
}

export function capSpeed(b: Ball) {
  const s = Math.hypot(b.vx, b.vy);
  if (s > MAX_SPEED) {
    b.vx *= MAX_SPEED / s;
    b.vy *= MAX_SPEED / s;
  }
}

export const newBall = (): Ball => ({ x: LANE_X, y: LANE_REST_Y, vx: 0, vy: 0, inLane: true, held: -1, still: 0, gone: false });
