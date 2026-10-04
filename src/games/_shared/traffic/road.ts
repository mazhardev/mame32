import { clamp } from '../arcade/kit';
import type { Input } from '../arcade/kit';

/**
 * Shared engine for the endless traffic games. The view scrolls up a
 * multi-lane road. Everything is in screen pixels; vehicles store their own
 * road speed, and are moved by the difference between it and the player's
 * speed, so faster traffic overtakes you and slower traffic falls behind.
 */
export interface Vehicle {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Road speed in px/s; negative for oncoming traffic. */
  speed: number;
  color: string;
  kind: 'car' | 'truck' | 'bike' | 'police' | 'suspect';
  /** Already counted for a near miss / overtake. */
  passed: boolean;
  /** Seconds left of a lane change, and the target x. */
  changing: number;
  targetX: number;
}

export interface Road {
  width: number;
  height: number;
  lanes: number;
  laneW: number;
  left: number;
  /** Lanes (from the left) that carry oncoming traffic. */
  oncoming: number;
  scroll: number;
  traffic: Vehicle[];
}

export function makeRoad(width: number, height: number, lanes: number, laneW: number, oncoming = 0): Road {
  return { width, height, lanes, laneW, left: (width - lanes * laneW) / 2, oncoming, scroll: 0, traffic: [] };
}

export const laneCentre = (r: Road, lane: number) => r.left + (lane + 0.5) * r.laneW;
export const laneOf = (r: Road, x: number) => clamp(Math.floor((x - r.left) / r.laneW), 0, r.lanes - 1);

const COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#06b6d4', '#a855f7', '#e2e8f0', '#64748b', '#ec4899'];

/** Adds a vehicle in a random lane, just off the top (or bottom for faster cars). */
export function spawnVehicle(r: Road, playerSpeed: number, random: () => number, opts: { truckChance?: number; minSpeed?: number; maxSpeed?: number } = {}): Vehicle | null {
  const lane = Math.floor(random() * r.lanes);
  const oncoming = lane < r.oncoming;
  const truck = random() < (opts.truckChance ?? 0.15);
  const w = truck ? r.laneW * 0.62 : r.laneW * 0.5;
  const h = truck ? w * 2.6 : w * 1.85;
  const base = (opts.minSpeed ?? 140) + random() * ((opts.maxSpeed ?? 260) - (opts.minSpeed ?? 140));
  const speed = oncoming ? -base : base * (truck ? 0.75 : 1);
  // Cars slower than the player appear at the top; faster ones come from behind.
  const fromBelow = !oncoming && speed > playerSpeed;
  const y = fromBelow ? r.height + h : -h;
  const x = laneCentre(r, lane);
  if (r.traffic.some((v) => Math.abs(v.x - x) < r.laneW * 0.6 && Math.abs(v.y - y) < h + 60)) return null;
  const v: Vehicle = { x, y, w, h, speed, color: COLORS[Math.floor(random() * COLORS.length)], kind: truck ? 'truck' : 'car', passed: false, changing: 0, targetX: x };
  r.traffic.push(v);
  return v;
}

/** Moves the road and traffic. Occasionally a car changes lane if it is clear. */
export function updateTraffic(r: Road, playerSpeed: number, dt: number, random: () => number, laneChanges = 0.15) {
  r.scroll = (r.scroll + playerSpeed * dt) % 80;
  for (const v of r.traffic) {
    v.y += (playerSpeed - v.speed) * dt;
    if (v.changing > 0) {
      v.changing -= dt;
      v.x += (v.targetX - v.x) * Math.min(1, dt * 3);
    } else if (v.speed > 0 && random() < laneChanges * dt) {
      const lane = laneOf(r, v.x) + (random() < 0.5 ? -1 : 1);
      if (lane >= r.oncoming && lane < r.lanes) {
        const tx = laneCentre(r, lane);
        const clear = !r.traffic.some((o) => o !== v && Math.abs(o.x - tx) < r.laneW * 0.6 && Math.abs(o.y - v.y) < o.h + v.h);
        if (clear) {
          v.targetX = tx;
          v.changing = 1;
        }
      }
    }
    // Keep a gap behind slower traffic in the same lane.
    for (const o of r.traffic) {
      if (o !== v && Math.abs(o.x - v.x) < r.laneW * 0.5 && o.y < v.y && v.y - o.y < v.h + 30 && v.speed > o.speed && v.speed > 0 && o.speed > 0) v.speed = o.speed;
    }
  }
  r.traffic = r.traffic.filter((v) => v.y > -200 && v.y < r.height + 200);
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Vehicles are positioned by their centre. */
export const overlap = (a: Box, b: Box, shrink = 4) =>
  Math.abs(a.x - b.x) < (a.w + b.w) / 2 - shrink && Math.abs(a.y - b.y) < (a.h + b.h) / 2 - shrink;

/** Horizontal steering for the player: hold left / right, or follow the pointer. */
export function steer(x: number, input: Input, speed: number, dt: number, min: number, max: number): number {
  const dir = (input.held.has('right') ? 1 : 0) - (input.held.has('left') ? 1 : 0);
  if (dir) x += dir * speed * dt;
  else if (input.pointer.down) x += clamp(input.pointer.x - x, -speed * dt, speed * dt);
  return clamp(x, min, max);
}

export interface RoadLook {
  verge: string;
  road: string;
  line: string;
  edge: string;
}

export const DAY: RoadLook = { verge: '#4d7c0f', road: '#374151', line: '#f8fafc', edge: '#e5e7eb' };
export const NIGHT: RoadLook = { verge: '#14532d', road: '#1f2937', line: '#fde68a', edge: '#9ca3af' };

export function drawRoad(ctx: CanvasRenderingContext2D, r: Road, look: RoadLook) {
  ctx.fillStyle = look.verge;
  ctx.fillRect(0, 0, r.width, r.height);
  ctx.fillStyle = look.road;
  ctx.fillRect(r.left, 0, r.lanes * r.laneW, r.height);
  ctx.fillStyle = look.edge;
  ctx.fillRect(r.left - 4, 0, 4, r.height);
  ctx.fillRect(r.left + r.lanes * r.laneW, 0, 4, r.height);
  for (let l = 1; l < r.lanes; l++) {
    const x = r.left + l * r.laneW - 1.5;
    if (l === r.oncoming && r.oncoming > 0) {
      ctx.fillStyle = '#facc15';
      ctx.fillRect(x - 2, 0, 3, r.height);
      ctx.fillRect(x + 3, 0, 3, r.height);
      continue;
    }
    ctx.fillStyle = look.line;
    for (let y = -80 + r.scroll; y < r.height; y += 80) ctx.fillRect(x, y, 3, 40);
  }
  // Roadside posts for a sense of speed.
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  for (let y = -80 + r.scroll; y < r.height; y += 80) {
    ctx.fillRect(r.left - 18, y, 6, 6);
    ctx.fillRect(r.left + r.lanes * r.laneW + 12, y, 6, 6);
  }
}

export function drawVehicle(ctx: CanvasRenderingContext2D, v: Box & { color: string; kind?: string }, facingDown = false, time = 0) {
  const { x, y, w, h } = v;
  ctx.save();
  ctx.translate(x, y);
  if (facingDown) ctx.rotate(Math.PI);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(-w / 2 + 3, -h / 2 + 3, w, h);
  ctx.fillStyle = v.color;
  ctx.beginPath();
  ctx.roundRect?.(-w / 2, -h / 2, w, h, 6);
  if (!ctx.roundRect) ctx.rect(-w / 2, -h / 2, w, h);
  ctx.fill();
  if (v.kind === 'bike') {
    ctx.fillStyle = '#111827';
    ctx.fillRect(-w / 2 + 1, -h / 2 + 4, w - 2, 6);
    ctx.fillRect(-w / 2 + 1, h / 2 - 10, w - 2, 6);
    ctx.fillStyle = '#fde68a';
    ctx.beginPath();
    ctx.arc(0, -2, w / 2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = 'rgba(15,23,42,0.75)';
    ctx.fillRect(-w / 2 + 4, -h / 2 + (v.kind === 'truck' ? 6 : 10), w - 8, v.kind === 'truck' ? 14 : 10);
    if (v.kind !== 'truck') ctx.fillRect(-w / 2 + 4, h / 2 - 14, w - 8, 7);
    ctx.fillStyle = '#fef9c3';
    ctx.fillRect(-w / 2 + 2, -h / 2, 5, 3);
    ctx.fillRect(w / 2 - 7, -h / 2, 5, 3);
  }
  if (v.kind === 'police') {
    ctx.fillStyle = Math.floor(time * 6) % 2 ? '#ef4444' : '#3b82f6';
    ctx.fillRect(-w / 2 + 3, -4, w - 6, 6);
  }
  ctx.restore();
}
