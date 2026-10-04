import type { Input } from '../arcade/kit';
import { aheadIndex, bendAhead, headingAt, nearest, pointAt } from './track';
import type { Track } from './track';
import { bump, drawCar, drive, makeCar, speedOf } from './car';
import type { Car, CarParams, Controls } from './car';

/**
 * Lap racing shared by the circuit games: grid start with a countdown, AI
 * drivers that follow the racing line and brake for bends, lap counting
 * with a halfway check (so cutting back across the line does not count),
 * race positions, and rendering with a follow camera and a minimap.
 */
export interface Racer {
  name: string;
  car: Car;
  idx: number;
  along: number;
  laps: number;
  halfway: boolean;
  lapStart: number;
  lastLap: number | null;
  bestLap: number | null;
  finished: number | null;
  /** AI skill 0–1, or null for the player. */
  skill: number | null;
  lane: number;
  offTrack: boolean;
}

export interface RaceCore {
  track: Track;
  racers: Racer[];
  laps: number;
  clock: number;
  countdown: number;
  finishOrder: number[];
}

export interface RaceLook {
  ground: string;
  road: string;
  edge: string;
  edgeAlt?: string;
  centre?: string;
  /** Draw buoys instead of a continuous edge (water tracks). */
  buoys?: boolean;
}

export const ROAD_LOOK: RaceLook = { ground: '#4d7c0f', road: '#3f3f46', edge: '#f8fafc', edgeAlt: '#dc2626', centre: 'rgba(250,250,250,0.35)' };

export function createRace(track: Track, laps: number, names: string[], colors: string[], skills: (number | null)[]): RaceCore {
  const racers: Racer[] = names.map((name, i) => {
    const row = Math.floor(i / 2);
    const back = aheadIndex(track, 0, track.length - 40 - row * 34);
    const lane = (i % 2 === 0 ? -1 : 1) * track.width * 0.22;
    const [x, y] = pointAt(track, back, lane);
    const car = makeCar(x, y, headingAt(track, back), colors[i]);
    return { name, car, idx: back, along: track.dist[back], laps: 0, halfway: false, lapStart: 0, lastLap: null, bestLap: null, finished: null, skill: skills[i], lane: lane * 0.5, offTrack: false };
  });
  return { track, racers, laps, clock: 0, countdown: 3, finishOrder: [] };
}

/** Progress used for race positions: laps plus distance into the lap. */
export const progress = (core: RaceCore, r: Racer) => (r.finished !== null ? 1e9 - r.finished : r.laps * core.track.length + (r.halfway || r.along < core.track.length / 2 ? r.along : r.along - core.track.length));

export function standings(core: RaceCore): Racer[] {
  return [...core.racers].sort((a, b) => progress(core, b) - progress(core, a));
}

export function positionOf(core: RaceCore, r: Racer): number {
  return standings(core).indexOf(r) + 1;
}

/** Player controls from keys, touch pad, or pointer steering. */
export function playerControls(input: Input, car: Car, viewW: number, viewH: number): Controls {
  let throttle = (input.held.has('up') ? 1 : 0) - (input.held.has('down') ? 1 : 0);
  let steer = (input.held.has('right') ? 1 : 0) - (input.held.has('left') ? 1 : 0);
  const handbrake = input.held.has('action') || input.held.has('action2');
  if (input.pointer.down && !throttle && !steer) {
    // The car is drawn at the centre of the view: steer towards the finger.
    const want = Math.atan2(input.pointer.y - viewH / 2, input.pointer.x - viewW / 2);
    const d = Math.atan2(Math.sin(want - car.angle), Math.cos(want - car.angle));
    steer = Math.max(-1, Math.min(1, d * 2));
    throttle = Math.abs(d) > 2.4 ? -1 : 1;
  }
  return { throttle, steer, handbrake };
}

function aiControls(core: RaceCore, r: Racer, params: CarParams, random: () => number): Controls {
  const t = core.track;
  const skill = r.skill ?? 0.5;
  const v = speedOf(r.car);
  const look = 30 + v * 0.35;
  const target = aheadIndex(t, r.idx, look);
  const [tx, ty] = pointAt(t, target, r.lane);
  const want = Math.atan2(ty - r.car.y, tx - r.car.x);
  const d = Math.atan2(Math.sin(want - r.car.angle), Math.cos(want - r.car.angle));
  const steer = Math.max(-1, Math.min(1, d * 2.5));
  const bend = bendAhead(t, r.idx, 60 + v * 0.8);
  const corner = params.maxSpeed * (0.98 - Math.min(0.6, bend * (0.75 - skill * 0.3)));
  const throttle = v > corner ? -0.6 : 1;
  if (random() < 0.002) r.lane = (random() - 0.5) * t.width * 0.4;
  return { throttle, steer };
}

/**
 * Advances the race. `surface` lets a game slow cars on grass or shallows.
 * Returns events for sounds.
 */
export function updateRace(core: RaceCore, dt: number, player: Controls, playerParams: CarParams, aiParams: CarParams, random: () => number): string[] {
  const events: string[] = [];
  if (core.countdown > 0) {
    const before = Math.ceil(core.countdown);
    core.countdown -= dt;
    if (Math.ceil(core.countdown) !== before) events.push(core.countdown <= 0 ? 'go' : 'tick');
    return events;
  }
  core.clock += dt;
  const t = core.track;
  for (const r of core.racers) {
    const isPlayer = r.skill === null;
    const params = isPlayer ? playerParams : { ...aiParams, maxSpeed: aiParams.maxSpeed * (0.86 + (r.skill ?? 0.5) * 0.16) };
    const ctl = r.finished !== null ? { throttle: -0.3, steer: 0 } : isPlayer ? player : aiControls(core, r, params, random);
    const near = nearest(t, r.car.x, r.car.y, r.idx);
    const edge = t.width / 2;
    r.offTrack = Math.abs(near.offset) > edge;
    drive(r.car, ctl, params, dt, r.offTrack ? 0.5 : 1);
    // A wall beyond the verge pushes cars back.
    if (Math.abs(near.offset) > edge + 45) {
      const [cx, cy] = pointAt(t, near.index, Math.sign(near.offset) * (edge + 44));
      r.car.x = cx;
      r.car.y = cy;
      r.car.vx *= 0.4;
      r.car.vy *= 0.4;
      if (isPlayer) events.push('wall');
    }
    const prev = r.along;
    const now = nearest(t, r.car.x, r.car.y, near.index);
    r.idx = now.index;
    r.along = now.along;
    if (r.along > t.length * 0.4 && r.along < t.length * 0.6) r.halfway = true;
    if (prev > t.length * 0.75 && r.along < t.length * 0.25 && r.halfway) {
      r.laps += 1;
      r.halfway = false;
      const lapTime = core.clock - r.lapStart;
      r.lastLap = lapTime;
      r.bestLap = r.bestLap === null ? lapTime : Math.min(r.bestLap, lapTime);
      r.lapStart = core.clock;
      if (isPlayer) events.push('lap');
      if (r.laps >= core.laps && r.finished === null) {
        r.finished = core.clock;
        core.finishOrder.push(core.racers.indexOf(r));
        if (isPlayer) events.push('finish');
      }
    } else if (prev < t.length * 0.25 && r.along > t.length * 0.75) {
      // Reversed back over the line: undo halfway so it cannot be farmed.
      r.halfway = true;
    }
  }
  for (let i = 0; i < core.racers.length; i++) {
    for (let j = i + 1; j < core.racers.length; j++) {
      if (bump(core.racers[i].car, core.racers[j].car) && (core.racers[i].skill === null || core.racers[j].skill === null)) events.push('bump');
    }
  }
  return events;
}

export function renderTrack(ctx: CanvasRenderingContext2D, t: Track, look: RaceLook) {
  const n = t.xs.length;
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(t.xs[0], t.ys[0]);
    for (let i = 1; i < n; i++) ctx.lineTo(t.xs[i], t.ys[i]);
    ctx.closePath();
  };
  ctx.lineJoin = 'round';
  if (look.buoys) {
    path();
    ctx.strokeStyle = look.road;
    ctx.lineWidth = t.width;
    ctx.stroke();
    for (let i = 0; i < n; i += 9) {
      for (const side of [-1, 1]) {
        const [x, y] = pointAt(t, i, side * (t.width / 2 + 4));
        ctx.fillStyle = (i / 9) % 2 ? look.edge : (look.edgeAlt ?? look.edge);
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else {
    path();
    ctx.strokeStyle = look.edge;
    ctx.lineWidth = t.width + 10;
    ctx.stroke();
    if (look.edgeAlt) {
      path();
      ctx.setLineDash([14, 14]);
      ctx.strokeStyle = look.edgeAlt;
      ctx.stroke();
      ctx.setLineDash([]);
    }
    path();
    ctx.strokeStyle = look.road;
    ctx.lineWidth = t.width;
    ctx.stroke();
  }
  if (look.centre) {
    path();
    ctx.setLineDash([16, 18]);
    ctx.strokeStyle = look.centre;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // Chequered start line.
  const h = headingAt(t, 0) + Math.PI / 2;
  const cells = 8;
  for (let k = 0; k < cells; k++) {
    for (let row = 0; row < 2; row++) {
      const off = -t.width / 2 + (k + 0.5) * (t.width / cells);
      const x = t.xs[0] + Math.cos(h) * off + Math.cos(h - Math.PI / 2) * (row - 0.5) * 6;
      const y = t.ys[0] + Math.sin(h) * off + Math.sin(h - Math.PI / 2) * (row - 0.5) * 6;
      ctx.fillStyle = (k + row) % 2 ? '#111' : '#fff';
      ctx.fillRect(x - 3, y - 3, 6, 6);
    }
  }
}

/** Draws the world centred on (cx, cy), then the minimap. */
export function renderRace(ctx: CanvasRenderingContext2D, core: RaceCore, viewW: number, viewH: number, cx: number, cy: number, look: RaceLook, extra?: (ctx: CanvasRenderingContext2D) => void) {
  ctx.fillStyle = look.ground;
  ctx.fillRect(0, 0, viewW, viewH);
  ctx.save();
  ctx.translate(Math.round(viewW / 2 - cx), Math.round(viewH / 2 - cy));
  renderTrack(ctx, core.track, look);
  extra?.(ctx);
  for (const r of core.racers) drawCar(ctx, r.car, { outline: r.skill === null ? '#fde047' : undefined });
  ctx.restore();
  minimap(ctx, core, viewW - 96, 8, 88);
}

export function minimap(ctx: CanvasRenderingContext2D, core: RaceCore, x: number, y: number, size: number) {
  const t = core.track;
  const sx = size / (t.maxX - t.minX);
  const sy = size / (t.maxY - t.minY);
  const s = Math.min(sx, sy);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(x - 4, y - 4, size + 8, size + 8);
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < t.xs.length; i += 4) {
    const px = x + (t.xs[i] - t.minX) * s;
    const py = y + (t.ys[i] - t.minY) * s;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();
  for (const r of core.racers) {
    ctx.fillStyle = r.skill === null ? '#fde047' : r.car.color;
    ctx.beginPath();
    ctx.arc(x + (r.car.x - t.minX) * s, y + (r.car.y - t.minY) * s, r.skill === null ? 3.5 : 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

export const fmtTime = (t: number | null) => (t === null ? '–' : `${Math.floor(t / 60)}:${(t % 60).toFixed(2).padStart(5, '0')}`);
export const ordinal = (n: number) => `${n}${n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'}`;
