import { roll } from '../_shared/golf/golf';
import type { P, Rollable } from '../_shared/golf/golf';

/**
 * Nine original golf holes measured in yards (x across, y down the page; the
 * tee is near the bottom), plus the shot model: carry through the air, wind
 * drift, then a roll across surfaces with different friction.
 */
export type SurfaceKind = 'green' | 'fairway' | 'rough' | 'sand' | 'water' | 'out';

export interface Circle {
  x: number;
  y: number;
  r: number;
}

export interface Ellipse {
  x: number;
  y: number;
  rx: number;
  ry: number;
}

export interface Hole {
  par: number;
  w: number;
  h: number;
  tee: P;
  pin: P;
  fairway: P[];
  fairwayW: number;
  greenR: number;
  bunkers: Circle[];
  water: Ellipse[];
  trees: Circle[];
  /** Green slope (yd/s² at full strength). */
  slope: P;
}

export const COURSE: Hole[] = [
  {
    par: 4,
    w: 160,
    h: 400,
    tee: { x: 80, y: 385 },
    pin: { x: 85, y: 30 },
    fairway: [
      { x: 80, y: 372 },
      { x: 78, y: 250 },
      { x: 90, y: 120 },
      { x: 85, y: 50 },
    ],
    fairwayW: 40,
    greenR: 16,
    bunkers: [
      { x: 110, y: 52, r: 8 },
      { x: 60, y: 44, r: 7 },
    ],
    water: [],
    trees: [
      { x: 30, y: 200, r: 10 },
      { x: 135, y: 180, r: 12 },
      { x: 25, y: 300, r: 9 },
    ],
    slope: { x: 0.3, y: -0.2 },
  },
  {
    par: 3,
    w: 120,
    h: 200,
    tee: { x: 60, y: 190 },
    pin: { x: 62, y: 28 },
    fairway: [
      { x: 60, y: 182 },
      { x: 60, y: 150 },
    ],
    fairwayW: 22,
    greenR: 14,
    bunkers: [
      { x: 82, y: 38, r: 6 },
      { x: 42, y: 22, r: 6 },
    ],
    water: [{ x: 60, y: 92, rx: 42, ry: 18 }],
    trees: [],
    slope: { x: -0.4, y: 0.1 },
  },
  {
    par: 5,
    w: 300,
    h: 420,
    tee: { x: 250, y: 405 },
    pin: { x: 60, y: 40 },
    fairway: [
      { x: 250, y: 392 },
      { x: 245, y: 250 },
      { x: 200, y: 160 },
      { x: 110, y: 100 },
      { x: 65, y: 58 },
    ],
    fairwayW: 42,
    greenR: 18,
    bunkers: [
      { x: 182, y: 192, r: 10 },
      { x: 86, y: 40, r: 7 },
    ],
    water: [{ x: 128, y: 178, rx: 22, ry: 14 }],
    trees: [
      { x: 290, y: 250, r: 14 },
      { x: 150, y: 262, r: 16 },
      { x: 172, y: 330, r: 14 },
    ],
    slope: { x: 0.2, y: 0.4 },
  },
  {
    par: 4,
    w: 170,
    h: 430,
    tee: { x: 85, y: 415 },
    pin: { x: 85, y: 25 },
    fairway: [
      { x: 85, y: 402 },
      { x: 80, y: 260 },
      { x: 90, y: 140 },
      { x: 85, y: 48 },
    ],
    fairwayW: 38,
    greenR: 16,
    bunkers: [{ x: 110, y: 40, r: 8 }],
    water: [{ x: 85, y: 172, rx: 95, ry: 7 }],
    trees: [
      { x: 25, y: 330, r: 12 },
      { x: 150, y: 90, r: 11 },
    ],
    slope: { x: -0.3, y: -0.3 },
  },
  {
    par: 4,
    w: 260,
    h: 400,
    tee: { x: 40, y: 385 },
    pin: { x: 215, y: 40 },
    fairway: [
      { x: 40, y: 372 },
      { x: 50, y: 220 },
      { x: 120, y: 130 },
      { x: 200, y: 70 },
    ],
    fairwayW: 40,
    greenR: 15,
    bunkers: [
      { x: 95, y: 140, r: 9 },
      { x: 238, y: 58, r: 6 },
    ],
    water: [],
    trees: [
      { x: 112, y: 245, r: 24 },
      { x: 150, y: 300, r: 18 },
      { x: 18, y: 150, r: 12 },
    ],
    slope: { x: 0.4, y: 0.2 },
  },
  {
    par: 3,
    w: 160,
    h: 220,
    tee: { x: 80, y: 205 },
    pin: { x: 80, y: 40 },
    fairway: [
      { x: 80, y: 196 },
      { x: 80, y: 175 },
    ],
    fairwayW: 22,
    greenR: 15,
    bunkers: [{ x: 99, y: 54, r: 5 }],
    water: [{ x: 80, y: 62, rx: 64, ry: 50 }],
    trees: [{ x: 18, y: 150, r: 10 }],
    slope: { x: 0, y: 0.3 },
  },
  {
    par: 4,
    w: 130,
    h: 370,
    tee: { x: 65, y: 355 },
    pin: { x: 65, y: 30 },
    fairway: [
      { x: 65, y: 342 },
      { x: 65, y: 44 },
    ],
    fairwayW: 28,
    greenR: 14,
    bunkers: [
      { x: 45, y: 58, r: 7 },
      { x: 86, y: 44, r: 7 },
    ],
    water: [],
    trees: [
      { x: 24, y: 250, r: 12 },
      { x: 106, y: 250, r: 12 },
      { x: 24, y: 150, r: 12 },
      { x: 106, y: 150, r: 12 },
      { x: 28, y: 90, r: 10 },
      { x: 102, y: 90, r: 10 },
    ],
    slope: { x: -0.5, y: 0 },
  },
  {
    par: 5,
    w: 200,
    h: 560,
    tee: { x: 100, y: 548 },
    pin: { x: 120, y: 26 },
    fairway: [
      { x: 100, y: 535 },
      { x: 90, y: 380 },
      { x: 120, y: 250 },
      { x: 130, y: 120 },
      { x: 120, y: 44 },
    ],
    fairwayW: 40,
    greenR: 18,
    bunkers: [
      { x: 98, y: 252, r: 10 },
      { x: 142, y: 58, r: 8 },
      { x: 100, y: 34, r: 7 },
    ],
    water: [
      { x: 48, y: 300, rx: 30, ry: 40 },
      { x: 165, y: 200, rx: 25, ry: 30 },
    ],
    trees: [
      { x: 172, y: 420, r: 16 },
      { x: 40, y: 160, r: 14 },
    ],
    slope: { x: 0.3, y: -0.4 },
  },
  {
    par: 4,
    w: 200,
    h: 450,
    tee: { x: 100, y: 435 },
    pin: { x: 100, y: 30 },
    fairway: [
      { x: 100, y: 422 },
      { x: 100, y: 250 },
      { x: 80, y: 120 },
      { x: 100, y: 48 },
    ],
    fairwayW: 40,
    greenR: 17,
    bunkers: [
      { x: 132, y: 250, r: 10 },
      { x: 68, y: 256, r: 9 },
      { x: 80, y: 40, r: 7 },
      { x: 122, y: 42, r: 7 },
    ],
    water: [{ x: 150, y: 130, rx: 25, ry: 30 }],
    trees: [{ x: 30, y: 320, r: 14 }],
    slope: { x: -0.2, y: 0.5 },
  },
];

export interface Club {
  name: string;
  carry: number;
  /** Roll after landing on fairway, as a fraction of the carry. */
  roll: number;
  /** Peak height of the flight in yards, for drawing. */
  height: number;
}

export const CLUBS: Club[] = [
  { name: 'Driver', carry: 245, roll: 0.12, height: 28 },
  { name: '3 Wood', carry: 215, roll: 0.1, height: 26 },
  { name: '5 Iron', carry: 180, roll: 0.07, height: 27 },
  { name: '7 Iron', carry: 150, roll: 0.05, height: 30 },
  { name: '9 Iron', carry: 120, roll: 0.04, height: 33 },
  { name: 'Wedge', carry: 90, roll: 0.03, height: 32 },
  { name: 'Sand Wedge', carry: 60, roll: 0.02, height: 28 },
  { name: 'Putter', carry: 0, roll: 0, height: 0 },
];
export const PUTTER = CLUBS.length - 1;
export const PUTT_MAX = 14;
export const CUP_R = 0.28;

const DECEL: Record<SurfaceKind, number> = {
  green: 3.4,
  fairway: 9,
  rough: 22,
  sand: 60,
  water: 60,
  out: 60,
};
const ROLL_FACTOR: Record<SurfaceKind, number> = {
  green: 0.6,
  fairway: 1,
  rough: 0.3,
  sand: 0,
  water: 0,
  out: 0,
};

function segDist(p: P, a: P, b: P) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t));
}

export function surfaceAt(h: Hole, x: number, y: number): SurfaceKind {
  if (x < 0 || y < 0 || x > h.w || y > h.h) return 'out';
  const p = { x, y };
  if (Math.hypot(x - h.pin.x, y - h.pin.y) <= h.greenR) return 'green';
  if (h.bunkers.some((b) => Math.hypot(x - b.x, y - b.y) <= b.r)) return 'sand';
  if (h.water.some((w) => ((x - w.x) / w.rx) ** 2 + ((y - w.y) / w.ry) ** 2 <= 1)) return 'water';
  for (let i = 0; i + 1 < h.fairway.length; i++)
    if (segDist(p, h.fairway[i], h.fairway[i + 1]) <= h.fairwayW / 2) return 'fairway';
  return 'rough';
}

/** Carry multiplier for the lie the ball sits in. */
export function lieFactor(kind: SurfaceKind, club: number): number {
  if (kind === 'rough') return 0.85;
  if (kind === 'sand') return CLUBS[club].name === 'Sand Wedge' ? 0.9 : 0.6;
  return 1;
}

export interface ShotResult {
  x: number;
  y: number;
  landX: number;
  landY: number;
  holed: boolean;
  penalty: 'water' | 'out' | null;
  /** Ball clipped a tree and dropped short. */
  tree: boolean;
  /** Points along the roll, one every 0.05 s. */
  path: P[];
}

/**
 * Plays a shot from `from`. `angle` is the direction (radians, screen
 * coordinates), `power` 0–1; `wind` is in yards of drift per 100 yards
 * carried. Putts (and putter shots from off the green) only roll.
 */
export function playShot(
  h: Hole,
  from: P,
  club: number,
  angle: number,
  power: number,
  wind: P,
  slopeScale: number,
): ShotResult {
  const lie = surfaceAt(h, from.x, from.y);
  const c = CLUBS[club];
  let lx = from.x;
  let ly = from.y;
  let speed: number;
  let tree = false;
  if (club === PUTTER) {
    speed = power * PUTT_MAX;
  } else {
    const carry = c.carry * power * lieFactor(lie, club);
    lx = from.x + Math.cos(angle) * carry + (wind.x * carry) / 100;
    ly = from.y + Math.sin(angle) * carry + (wind.y * carry) / 100;
    // Low flight near the start and end of the arc can clip a tree.
    for (let i = 1; i <= 20; i++) {
      const t = i / 20;
      const height = 4 * c.height * t * (1 - t);
      if (height > 14) continue;
      const px = from.x + (lx - from.x) * t;
      const py = from.y + (ly - from.y) * t;
      if (h.trees.some((tr) => Math.hypot(px - tr.x, py - tr.y) < tr.r)) {
        lx = px;
        ly = py;
        tree = true;
        break;
      }
    }
    const landing = surfaceAt(h, lx, ly);
    if (landing === 'water' || landing === 'out')
      return { x: lx, y: ly, landX: lx, landY: ly, holed: false, penalty: landing, tree, path: [] };
    const rollDist = tree ? 1 : carry * c.roll * ROLL_FACTOR[landing];
    speed = Math.sqrt(2 * DECEL[landing] * rollDist);
  }
  const dirX =
    club === PUTTER ? Math.cos(angle) : (lx - from.x) / (Math.hypot(lx - from.x, ly - from.y) || 1);
  const dirY =
    club === PUTTER ? Math.sin(angle) : (ly - from.y) / (Math.hypot(lx - from.x, ly - from.y) || 1);
  const ball = { x: lx, y: ly, vx: dirX * speed, vy: dirY * speed };
  const r: Rollable = {
    ball,
    radius: 0.05,
    walls: [],
    bumpers: [],
    cup: h.pin,
    cupR: CUP_R,
    cupSpeed: 1.8,
    cupPull: 1.2,
    wallE: 0,
    surface: (x, y) => {
      const k = surfaceAt(h, x, y);
      const green = k === 'green';
      return {
        decel: DECEL[k],
        ax: green ? h.slope.x * slopeScale : 0,
        ay: green ? h.slope.y * slopeScale : 0,
      };
    },
  };
  const dt = 1 / 120;
  const path: P[] = [{ x: lx, y: ly }];
  for (let i = 0; i < 120 * 15; i++) {
    if (i % 6 === 5) path.push({ x: ball.x, y: ball.y });
    if (roll(r, dt, 0) === 'holed') {
      path.push({ x: h.pin.x, y: h.pin.y });
      return {
        x: h.pin.x,
        y: h.pin.y,
        landX: lx,
        landY: ly,
        holed: true,
        penalty: null,
        tree,
        path,
      };
    }
    const k = surfaceAt(h, ball.x, ball.y);
    if (k === 'water' || k === 'out')
      return { x: ball.x, y: ball.y, landX: lx, landY: ly, holed: false, penalty: k, tree, path };
    const sp = Math.hypot(ball.vx, ball.vy);
    // Slopes keep a ball creeping; it settles once it is barely moving.
    if (sp < (k === 'green' ? 0.08 : 0.3)) break;
  }
  path.push({ x: ball.x, y: ball.y });
  return { x: ball.x, y: ball.y, landX: lx, landY: ly, holed: false, penalty: null, tree, path };
}

/** Shortest club that reaches `distance`, or the driver. */
export function suggestClub(distance: number, lie: SurfaceKind): number {
  if (lie === 'green') return PUTTER;
  for (let i = PUTTER - 1; i >= 0; i--)
    if (CLUBS[i].carry * lieFactor(lie, i) >= distance) return i;
  return 0;
}
