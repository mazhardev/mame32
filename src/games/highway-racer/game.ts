import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState, clamp } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { burst, drawSparks, fillRound, text, updateSparks } from '../_shared/arcade/draw';
import type { Spark } from '../_shared/arcade/draw';
import { DAY, NIGHT, drawRoad, drawVehicle, makeRoad, overlap, spawnVehicle, steer, updateTraffic } from '../_shared/traffic/road';
import type { Road, RoadLook } from '../_shared/traffic/road';

/**
 * Highway Racer: a checkpoint race against the clock on a four-lane
 * motorway. Each checkpoint adds time. Crashing does not end the run — it
 * costs you most of your speed, and with it precious seconds. Day turns to
 * night as the kilometres roll by.
 */
export const W = 440;
export const H = 600;
const PLAYER_Y = H - 110;
export const PLAYER_W = 44;
export const PLAYER_H = 82;
export const CHECKPOINT = 5000;

export interface State extends BaseState {
  road: Road;
  x: number;
  speed: number;
  topSpeed: number;
  distance: number;
  timeLeft: number;
  nextCheckpoint: number;
  checkpoints: number;
  bonusTime: number;
  spawnIn: number;
  crashes: number;
  stun: number;
  flash: string;
  flashT: number;
  sparks: Spark[];
}

const SETTINGS: Record<DifficultySetting, { start: number; bonus: number; top: number }> = {
  easy: { start: 45, bonus: 30, top: 560 },
  normal: { start: 40, bonus: 26, top: 600 },
  hard: { start: 35, bonus: 22, top: 640 },
};

export function create(difficulty: DifficultySetting): State {
  const c = SETTINGS[difficulty];
  return {
    ...baseState(),
    road: makeRoad(W, H, 4, 88),
    x: W / 2 + 44,
    speed: 0,
    topSpeed: c.top,
    distance: 0,
    timeLeft: c.start,
    nextCheckpoint: CHECKPOINT,
    checkpoints: 0,
    bonusTime: c.bonus,
    spawnIn: 1,
    crashes: 0,
    stun: 0,
    flash: '',
    flashT: 0,
    sparks: [],
  };
}

const playerBox = (s: State) => ({ x: s.x, y: PLAYER_Y, w: PLAYER_W, h: PLAYER_H });

/** Day for the first 15 km, then dusk, then night. */
export function lookFor(km: number): RoadLook {
  return km < 15 ? DAY : NIGHT;
}

export function update(s: State, dt: number, input: Input, random: () => number) {
  const r = s.road;
  s.stun = Math.max(0, s.stun - dt);
  const gas = (input.held.has('up') || input.pointer.down) && s.stun === 0;
  const brake = input.held.has('down');
  s.speed = clamp(s.speed + (gas ? 190 : brake ? -360 : -50) * dt, 0, s.topSpeed);
  if (s.stun === 0) s.x = steer(s.x, input, 280, dt, r.left + PLAYER_W / 2, r.left + r.lanes * r.laneW - PLAYER_W / 2);
  s.distance += s.speed * dt;
  s.timeLeft -= dt;
  if (s.distance >= s.nextCheckpoint) {
    s.checkpoints += 1;
    s.nextCheckpoint += CHECKPOINT;
    // Later checkpoints give a little less time.
    const bonus = Math.max(14, s.bonusTime - s.checkpoints);
    s.timeLeft += bonus;
    s.flash = `Checkpoint! +${bonus}s`;
    s.flashT = 1.6;
    s.events.push('levelComplete');
  }
  s.spawnIn -= dt;
  if (s.spawnIn <= 0) {
    spawnVehicle(r, s.speed, random, { minSpeed: 160, maxSpeed: 300, truckChance: 0.25 });
    s.spawnIn = (0.55 + random() * 0.6) * (400 / Math.max(200, s.speed));
  }
  updateTraffic(r, s.speed, dt, random, 0.2);
  const me = playerBox(s);
  for (const v of r.traffic) {
    if (s.stun === 0 && overlap(me, v, 6)) {
      s.crashes += 1;
      s.speed *= 0.25;
      s.stun = 0.8;
      // Shove the player out of the other car.
      s.x += s.x < v.x ? -12 : 12;
      v.y -= 30;
      s.events.push('explosion');
      burst(s.sparks, (s.x + v.x) / 2, PLAYER_Y - PLAYER_H / 2, '#f59e0b', 18, 180, random);
    }
  }
  s.score = Math.floor(s.distance / 25) + s.checkpoints * 500;
  s.flashT = Math.max(0, s.flashT - dt);
  if (s.timeLeft <= 0) {
    s.timeLeft = 0;
    s.over = true;
    s.events.push('gameOver');
  }
  updateSparks(s.sparks, dt);
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  const km = s.distance / 1000;
  const look = lookFor(km);
  drawRoad(ctx, s.road, look);
  for (const v of s.road.traffic) drawVehicle(ctx, v, false, s.time);
  if (!s.over || s.timeLeft > 0) drawVehicle(ctx, { ...playerBox(s), color: s.stun > 0 && Math.floor(s.time * 12) % 2 ? '#fca5a5' : '#dc2626', kind: 'car' });
  if (look === NIGHT) {
    // Headlight cone and darkness around it.
    const g = ctx.createRadialGradient(s.x, PLAYER_Y - 120, 30, s.x, PLAYER_Y - 120, 260);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(2,6,23,0.65)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  drawSparks(ctx, s.sparks);
  fillRound(ctx, W / 2 - 50, 8, 100, 34, 8, 'rgba(0,0,0,0.55)');
  text(ctx, `${Math.ceil(s.timeLeft)}`, W / 2, 26, { size: 24, color: s.timeLeft < 10 ? '#f87171' : '#fde047' });
  text(ctx, `${Math.round(s.speed * 0.4)} km/h`, W - 12, H - 20, { size: 16, align: 'right' });
  const toNext = (s.nextCheckpoint - s.distance) / 1000;
  text(ctx, `Next checkpoint ${toNext.toFixed(1)} km`, 12, H - 20, { size: 13, align: 'left' });
  if (s.flashT > 0) text(ctx, s.flash, W / 2, 80, { size: 22, color: '#4ade80' });
}

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create,
  update,
  render,
  hud: (s) => [
    { label: 'Time', value: `${Math.ceil(s.timeLeft)}s` },
    { label: 'Distance', value: `${(s.distance / 1000).toFixed(1)} km` },
    { label: 'Checkpoints', value: s.checkpoints },
    { label: 'Score', value: s.score },
  ],
  result: (s) => ({
    score: s.score,
    title: 'Time up!',
    details: [
      { label: 'Distance', value: `${(s.distance / 1000).toFixed(2)} km` },
      { label: 'Checkpoints', value: String(s.checkpoints) },
      { label: 'Crashes', value: String(s.crashes) },
    ],
  }),
  onEnd: (s) => {
    void reportProgress('highway-racer.cp-5', s.checkpoints);
    void reportProgress('highway-racer.night', s.distance >= 15000 ? 1 : 0);
    void reportProgress('highway-racer.clean', s.crashes === 0 && s.checkpoints >= 3 ? 1 : 0);
    void incrementProgress('highway-racer.km', Math.floor(s.distance / 1000));
  },
  touch: { pad: 'dpad' },
  startHint: 'Reach each checkpoint before the clock runs out. ↑ accelerate, ← → change lanes. Crashes cost speed.',
};
