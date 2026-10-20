/**
 * Carrom disc physics. Discs slide on the board with friction, collide
 * elastically with each other and bounce off the cushions; a disc whose
 * centre passes over a pocket falls in. Everything runs in small fixed
 * sub-steps so fast strikes never tunnel through a coin.
 *
 * Board coordinates: the playing surface is L × L with (0, 0) at the
 * top-left corner. Proportions follow a standard 74 cm board.
 */
export const L = 340;
export const R_COIN = 7.2;
export const R_STRIKER = 9.6;
export const R_POCKET = 11;
/** Distance from an edge to the centre line of that player's baseline. */
export const BASE = 54;
/** Half the length of the strip the striker may be placed on. */
export const BASE_HALF = 106;

export const POCKETS: readonly [number, number][] = [
  [R_POCKET, R_POCKET],
  [L - R_POCKET, R_POCKET],
  [R_POCKET, L - R_POCKET],
  [L - R_POCKET, L - R_POCKET],
];

export type Kind = 'white' | 'black' | 'queen' | 'striker';

export interface Disc {
  id: number;
  kind: Kind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  m: number;
  /** Still on the board (false once pocketed). */
  on: boolean;
}

export const PHYS = {
  /** Sliding friction, as a deceleration in units/s². */
  friction: 300,
  /** Extra speed-proportional drag, per second. */
  damping: 0.4,
  eDisc: 0.9,
  eWall: 0.68,
  /** Below this speed a disc is considered stopped. */
  stop: 2.5,
  maxSpeed: 1150,
  sub: 1 / 480,
};

export interface PhysEvent {
  type: 'pocket' | 'hit' | 'wall';
  a: Disc;
  b?: Disc;
  pocket?: number;
  speed: number;
}

export function disc(id: number, kind: Kind, x: number, y: number): Disc {
  const striker = kind === 'striker';
  return { id, kind, x, y, vx: 0, vy: 0, r: striker ? R_STRIKER : R_COIN, m: striker ? 2.6 : 1, on: true };
}

/** One fixed sub-step: move, slow down, bounce, collide, drop into pockets. */
export function stepOnce(discs: Disc[], dt: number, events: PhysEvent[]) {
  for (const d of discs) {
    if (!d.on) continue;
    const sp = Math.hypot(d.vx, d.vy);
    if (sp > 0) {
      const ns = Math.max(0, sp - (PHYS.friction + PHYS.damping * sp) * dt);
      const k = ns / sp;
      d.vx *= k;
      d.vy *= k;
    }
    d.x += d.vx * dt;
    d.y += d.vy * dt;
    // Cushions.
    let hit = 0;
    if (d.x < d.r) {
      d.x = d.r;
      hit = Math.abs(d.vx);
      d.vx = Math.abs(d.vx) * PHYS.eWall;
    } else if (d.x > L - d.r) {
      d.x = L - d.r;
      hit = Math.abs(d.vx);
      d.vx = -Math.abs(d.vx) * PHYS.eWall;
    }
    if (d.y < d.r) {
      d.y = d.r;
      hit = Math.max(hit, Math.abs(d.vy));
      d.vy = Math.abs(d.vy) * PHYS.eWall;
    } else if (d.y > L - d.r) {
      d.y = L - d.r;
      hit = Math.max(hit, Math.abs(d.vy));
      d.vy = -Math.abs(d.vy) * PHYS.eWall;
    }
    if (hit > 60) events.push({ type: 'wall', a: d, speed: hit });
  }

  for (let i = 0; i < discs.length; i++) {
    const a = discs[i];
    if (!a.on) continue;
    for (let j = i + 1; j < discs.length; j++) {
      const b = discs[j];
      if (!b.on) continue;
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      const min = a.r + b.r;
      let d2 = dx * dx + dy * dy;
      if (d2 >= min * min) continue;
      if (d2 < 1e-9) {
        dx = 0.01;
        dy = 0;
        d2 = 1e-4;
      }
      const d = Math.sqrt(d2);
      const nx = dx / d;
      const ny = dy / d;
      const ia = 1 / a.m;
      const ib = 1 / b.m;
      // Push apart in proportion to the inverse masses.
      const push = (min - d) / (ia + ib);
      a.x -= nx * push * ia;
      a.y -= ny * push * ia;
      b.x += nx * push * ib;
      b.y += ny * push * ib;
      const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if (vn < 0) {
        const imp = (-(1 + PHYS.eDisc) * vn) / (ia + ib);
        a.vx -= imp * nx * ia;
        a.vy -= imp * ny * ia;
        b.vx += imp * nx * ib;
        b.vy += imp * ny * ib;
        if (-vn > 40) events.push({ type: 'hit', a, b, speed: -vn });
      }
    }
  }

  for (const d of discs) {
    if (!d.on) continue;
    for (let p = 0; p < POCKETS.length; p++) {
      const [px, py] = POCKETS[p];
      if ((d.x - px) ** 2 + (d.y - py) ** 2 < R_POCKET * R_POCKET) {
        d.on = false;
        d.vx = 0;
        d.vy = 0;
        d.x = px;
        d.y = py;
        events.push({ type: 'pocket', a: d, pocket: p, speed: 0 });
        break;
      }
    }
  }
}

/** Whether any disc on the board is still moving. */
export function moving(discs: Disc[]): boolean {
  return discs.some((d) => d.on && (Math.abs(d.vx) > PHYS.stop || Math.abs(d.vy) > PHYS.stop));
}

function stopSlow(discs: Disc[]) {
  for (const d of discs) {
    if (Math.hypot(d.vx, d.vy) < PHYS.stop) {
      d.vx = 0;
      d.vy = 0;
    }
  }
}

/**
 * Advances the simulation by `dt` seconds in fixed sub-steps.
 * Returns true while something is still moving.
 */
export function advance(discs: Disc[], dt: number, events: PhysEvent[]): boolean {
  const n = Math.max(1, Math.ceil(dt / PHYS.sub - 1e-9));
  const h = dt / n;
  for (let i = 0; i < n; i++) stepOnce(discs, h, events);
  stopSlow(discs);
  return moving(discs);
}

/** Runs until everything is at rest (or `maxTime` seconds pass). */
export function settle(discs: Disc[], events: PhysEvent[], maxTime = 14): number {
  let t = 0;
  while (t < maxTime) {
    for (let i = 0; i < 16; i++) stepOnce(discs, PHYS.sub, events);
    t += 16 * PHYS.sub;
    stopSlow(discs);
    if (!moving(discs)) break;
  }
  for (const d of discs) {
    d.vx = 0;
    d.vy = 0;
  }
  return t;
}

/** Launch speed for a power between 0 and 1. */
export function speedFor(power: number): number {
  const p = Math.max(0, Math.min(1, power));
  return PHYS.maxSpeed * (0.06 + 0.94 * p ** 1.2);
}

/** The power that gives a launch speed (inverse of speedFor). */
export function powerFor(speed: number): number {
  const s = Math.max(0, Math.min(1, speed / PHYS.maxSpeed));
  return Math.min(1, Math.max(0, (s - 0.06) / 0.94) ** (1 / 1.2));
}

export function cloneDiscs(discs: Disc[]): Disc[] {
  return discs.map((d) => ({ ...d }));
}
