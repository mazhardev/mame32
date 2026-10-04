/**
 * Pool table physics: equal-mass elastic ball collisions, cushions with gaps
 * at the six pockets, and rolling friction. Everything is in canvas pixels.
 */
export const W = 640;
export const H = 380;
export const LEFT = 40;
export const RIGHT = 600;
export const TOP = 40;
export const BOTTOM = 340;
export const R = 10;
export const POCKET_R = 19;
/** Half-width of the gap in the cushion at a pocket. */
const CORNER_GAP = 26;
const SIDE_GAP = 22;
const ROLL_FRICTION = 150;
const BALL_E = 0.95;
const CUSHION_E = 0.78;
export const SUBSTEPS = 8;

export interface Ball {
  n: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  potted: boolean;
}

export const POCKETS = [
  { x: LEFT - 3, y: TOP - 3 },
  { x: (LEFT + RIGHT) / 2, y: TOP - 8 },
  { x: RIGHT + 3, y: TOP - 3 },
  { x: LEFT - 3, y: BOTTOM + 3 },
  { x: (LEFT + RIGHT) / 2, y: BOTTOM + 8 },
  { x: RIGHT + 3, y: BOTTOM + 3 },
];

export const HEAD_X = LEFT + (RIGHT - LEFT) * 0.25;
export const FOOT = { x: LEFT + (RIGHT - LEFT) * 0.72, y: (TOP + BOTTOM) / 2 };

/** Standard 8-ball rack: 8 in the middle, a solid and a stripe in the back corners. */
export function rackBalls(random: () => number): Ball[] {
  const order = [1, 9, 2, 10, 8, 3, 11, 4, 12, 5, 13, 6, 14, 7, 15];
  // Shuffle the others but keep the 8 in the centre (index 4) and mixed corners.
  const rest = order.filter((n) => n !== 8 && n !== 1 && n !== 15);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  const slots: number[] = [];
  let k = 0;
  for (let i = 0; i < 15; i++) {
    if (i === 0) slots.push(1);
    else if (i === 4) slots.push(8);
    else if (i === 10) slots.push(15);
    else slots.push(rest[k++]);
  }
  const balls: Ball[] = [{ n: 0, x: HEAD_X, y: FOOT.y, vx: 0, vy: 0, potted: false }];
  let idx = 0;
  const dx = R * 2 * Math.cos(Math.PI / 6) + 0.2;
  for (let row = 0; row < 5; row++) {
    for (let i = 0; i <= row; i++) {
      balls.push({
        n: slots[idx++],
        x: FOOT.x + row * dx,
        y: FOOT.y + (i - row / 2) * (R * 2 + 0.2),
        vx: 0,
        vy: 0,
        potted: false,
      });
    }
  }
  return balls;
}

export interface ShotLog {
  firstHit: number | null;
  potted: number[];
  cushionAfterHit: boolean;
}

function nearPocketMouth(x: number, y: number): boolean {
  const midX = (LEFT + RIGHT) / 2;
  const corner =
    (x < LEFT + CORNER_GAP || x > RIGHT - CORNER_GAP) &&
    (y < TOP + CORNER_GAP || y > BOTTOM - CORNER_GAP);
  const side = Math.abs(x - midX) < SIDE_GAP && (y < TOP + R * 2 || y > BOTTOM - R * 2);
  return corner || side;
}

/** Advances all balls by dt (call with small steps). Records events in `log`. */
export function step(balls: Ball[], dt: number, log: ShotLog) {
  for (const b of balls) {
    if (b.potted) continue;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    const sp = Math.hypot(b.vx, b.vy);
    if (sp > 0) {
      const ns = Math.max(0, sp - ROLL_FRICTION * dt) * (1 - 0.15 * dt);
      b.vx *= ns / sp;
      b.vy *= ns / sp;
      if (ns < 3) b.vx = b.vy = 0;
    }
    for (const p of POCKETS) {
      if (Math.hypot(b.x - p.x, b.y - p.y) < POCKET_R) {
        b.potted = true;
        b.vx = b.vy = 0;
        log.potted.push(b.n);
        break;
      }
    }
    if (b.potted) continue;
    if (!nearPocketMouth(b.x, b.y)) {
      let bounced = false;
      if (b.x < LEFT + R) {
        b.x = LEFT + R;
        b.vx = Math.abs(b.vx) * CUSHION_E;
        bounced = true;
      } else if (b.x > RIGHT - R) {
        b.x = RIGHT - R;
        b.vx = -Math.abs(b.vx) * CUSHION_E;
        bounced = true;
      }
      if (b.y < TOP + R) {
        b.y = TOP + R;
        b.vy = Math.abs(b.vy) * CUSHION_E;
        bounced = true;
      } else if (b.y > BOTTOM - R) {
        b.y = BOTTOM - R;
        b.vy = -Math.abs(b.vy) * CUSHION_E;
        bounced = true;
      }
      if (bounced && log.firstHit !== null) log.cushionAfterHit = true;
    } else if (
      b.x < LEFT - R * 2 ||
      b.x > RIGHT + R * 2 ||
      b.y < TOP - R * 2 ||
      b.y > BOTTOM + R * 2
    ) {
      // Jaws of a pocket: anything that gets this far drops.
      b.potted = true;
      b.vx = b.vy = 0;
      log.potted.push(b.n);
    }
  }
  for (let i = 0; i < balls.length; i++) {
    const a = balls[i];
    if (a.potted) continue;
    for (let j = i + 1; j < balls.length; j++) {
      const b = balls[j];
      if (b.potted) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      if (d >= R * 2 || d === 0) continue;
      const nx = dx / d;
      const ny = dy / d;
      const overlap = (R * 2 - d) / 2;
      a.x -= nx * overlap;
      a.y -= ny * overlap;
      b.x += nx * overlap;
      b.y += ny * overlap;
      const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
      if (rel <= 0) continue;
      const j2 = ((1 + BALL_E) / 2) * rel;
      a.vx -= j2 * nx;
      a.vy -= j2 * ny;
      b.vx += j2 * nx;
      b.vy += j2 * ny;
      if (log.firstHit === null) {
        if (a.n === 0) log.firstHit = b.n;
        else if (b.n === 0) log.firstHit = a.n;
      }
    }
  }
}

export function moving(balls: Ball[]): boolean {
  return balls.some((b) => !b.potted && (b.vx !== 0 || b.vy !== 0));
}

export function newLog(): ShotLog {
  return { firstHit: null, potted: [], cushionAfterHit: false };
}

/** Runs a shot to rest. */
export function simulateShot(
  balls: Ball[],
  angle: number,
  speed: number,
  maxSeconds = 20,
): ShotLog {
  const cue = balls.find((b) => b.n === 0);
  const log = newLog();
  if (!cue) return log;
  cue.vx = Math.cos(angle) * speed;
  cue.vy = Math.sin(angle) * speed;
  const dt = 1 / 60 / SUBSTEPS;
  for (let t = 0; t < maxSeconds * 60 * SUBSTEPS && moving(balls); t++) step(balls, dt, log);
  return log;
}

/** Is (x, y) a legal, free spot for the cue ball? */
export function freeSpot(balls: Ball[], x: number, y: number): boolean {
  if (x < LEFT + R || x > RIGHT - R || y < TOP + R || y > BOTTOM - R) return false;
  return balls.every((b) => b.potted || b.n === 0 || Math.hypot(b.x - x, b.y - y) >= R * 2 + 1);
}

export function cloneBalls(balls: Ball[]): Ball[] {
  return balls.map((b) => ({ ...b }));
}

export const MAX_SPEED = 1500;
