import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState, clamp } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { burst, drawSparks, text, updateSparks } from '../_shared/arcade/draw';
import type { Spark } from '../_shared/arcade/draw';
import { DAY, drawRoad, drawVehicle, makeRoad, overlap, spawnVehicle, steer, updateTraffic } from '../_shared/traffic/road';
import type { Road } from '../_shared/traffic/road';

/**
 * Motorcycle Racing: a narrow, nimble bike on a two-way road. The bike is
 * slim enough to split lanes between cars. Riding in the oncoming lanes
 * doubles your points (and the danger). Hold a wheelie for extra speed —
 * but you cannot steer while the front wheel is up.
 */
export const W = 440;
export const H = 600;
const PLAYER_Y = H - 110;
export const BIKE_W = 20;
export const BIKE_H = 50;

export interface State extends BaseState {
  road: Road;
  x: number;
  speed: number;
  topSpeed: number;
  wheelie: number;
  distance: number;
  oncomingTime: number;
  wheelieTime: number;
  splits: number;
  spawnIn: number;
  /** Fractional distance points. */
  points: number;
  sparks: Spark[];
}

const TOP: Record<DifficultySetting, number> = { easy: 420, normal: 480, hard: 540 };

export function create(difficulty: DifficultySetting): State {
  return { ...baseState(), road: makeRoad(W, H, 4, 88, 2), x: 264, speed: 220, topSpeed: TOP[difficulty], wheelie: 0, distance: 0, oncomingTime: 0, wheelieTime: 0, splits: 0, spawnIn: 0.4, points: 0, sparks: [] };
}

const bikeBox = (s: State) => ({ x: s.x, y: PLAYER_Y, w: BIKE_W, h: BIKE_H });
export const inOncoming = (s: State) => s.x < s.road.left + s.road.oncoming * s.road.laneW;

export function update(s: State, dt: number, input: Input, random: () => number) {
  const r = s.road;
  const wantWheelie = input.held.has('action') || input.held.has('action2');
  s.wheelie = clamp(s.wheelie + (wantWheelie && s.speed > 250 ? dt * 3 : -dt * 4), 0, 1);
  const top = s.topSpeed * (1 + s.wheelie * 0.25);
  const gas = input.held.has('up') || input.pointer.down;
  s.speed = clamp(s.speed + (gas ? 200 : input.held.has('down') ? -380 : -40) * dt, 160, top);
  if (s.wheelie < 0.5) s.x = steer(s.x, input, 300, dt, r.left + BIKE_W, r.left + r.lanes * r.laneW - BIKE_W);
  else s.wheelieTime += dt;
  s.distance += s.speed * dt;
  const oncoming = inOncoming(s);
  if (oncoming) s.oncomingTime += dt;
  s.spawnIn -= dt;
  if (s.spawnIn <= 0) {
    spawnVehicle(r, s.speed, random, { minSpeed: 140, maxSpeed: 230, truckChance: 0.15 });
    s.spawnIn = (0.45 + random() * 0.55) * (320 / s.speed);
  }
  updateTraffic(r, s.speed, dt, random, 0.1);
  const me = bikeBox(s);
  for (const v of r.traffic) {
    if (overlap(me, v, 3)) {
      s.over = true;
      s.events.push('explosion');
      burst(s.sparks, s.x, PLAYER_Y - BIKE_H / 2, '#f97316', 28, 220, random);
      return;
    }
    if (!v.passed && v.y > PLAYER_Y + BIKE_H / 2) {
      v.passed = true;
      // Lane splitting: a car close on each side as you pass.
      const sides = r.traffic.filter((o) => Math.abs(o.y - v.y) < o.h && Math.abs(o.x - s.x) < r.laneW * 0.75 && o !== v);
      if (Math.abs(v.x - s.x) < r.laneW * 0.75 && sides.some((o) => Math.sign(o.x - s.x) !== Math.sign(v.x - s.x))) {
        s.splits += 1;
        s.events.push('whoosh');
      }
    }
  }
  s.points += s.speed * dt * 0.04 * (oncoming ? 2 : 1) * (1 + s.wheelie);
  s.score = Math.floor(s.points) + s.splits * 150;
  updateSparks(s.sparks, dt);
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  drawRoad(ctx, s.road, { ...DAY, verge: '#a16207' });
  for (const v of s.road.traffic) drawVehicle(ctx, v, v.speed < 0, s.time);
  if (!s.over) {
    ctx.save();
    ctx.translate(s.x, PLAYER_Y);
    ctx.scale(1, 1 + s.wheelie * 0.12);
    drawVehicle(ctx, { x: 0, y: 0, w: BIKE_W, h: BIKE_H, color: '#0f172a', kind: 'bike' });
    ctx.restore();
  }
  drawSparks(ctx, s.sparks);
  text(ctx, `${Math.round(s.speed * 0.4)} km/h`, W - 12, 20, { size: 16, align: 'right' });
  if (inOncoming(s)) text(ctx, 'Oncoming ×2', 12, 20, { size: 15, align: 'left', color: '#fde047' });
  if (s.wheelie > 0.5) text(ctx, 'Wheelie!', W / 2, 60, { size: 20, color: '#4ade80' });
}

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create,
  update,
  render,
  hud: (s) => [
    { label: 'Score', value: s.score },
    { label: 'Distance', value: `${(s.distance / 2500).toFixed(1)} km` },
    { label: 'Splits', value: s.splits },
  ],
  result: (s) => ({
    score: s.score,
    title: 'Wiped out!',
    details: [
      { label: 'Distance', value: `${(s.distance / 2500).toFixed(2)} km` },
      { label: 'Lane splits', value: String(s.splits) },
      { label: 'Time in oncoming lanes', value: `${Math.round(s.oncomingTime)} s` },
      { label: 'Wheelie time', value: `${s.wheelieTime.toFixed(1)} s` },
    ],
  }),
  onEnd: (s) => {
    void reportProgress('motorcycle-racing.km-5', Math.floor(s.distance / 2500));
    void reportProgress('motorcycle-racing.oncoming-30', Math.floor(s.oncomingTime));
    void reportProgress('motorcycle-racing.splits-10', s.splits);
    void incrementProgress('motorcycle-racing.total', Math.floor(s.distance / 2500));
  },
  touch: { pad: 'dpad', buttons: [{ action: 'action', label: 'Wheelie' }] },
  startHint: '← → steer, ↑ throttle, hold Space to pull a wheelie. Left two lanes are oncoming traffic — double points!',
};
