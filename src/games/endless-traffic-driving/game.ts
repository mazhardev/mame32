import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState, clamp } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { burst, circle, drawSparks, text, updateSparks } from '../_shared/arcade/draw';
import type { Spark } from '../_shared/arcade/draw';
import { DAY, drawRoad, drawVehicle, laneCentre, makeRoad, overlap, spawnVehicle, updateTraffic } from '../_shared/traffic/road';
import type { Road } from '../_shared/traffic/road';

/**
 * Endless Traffic Driving: a relaxed lane-hopping drive. The car drives
 * itself; tap left or right to hop one lane. Collect coins, avoid the
 * traffic, and the speed creeps up the longer you go. Three lives, with a
 * moment of safety after each knock.
 */
export const W = 400;
export const H = 600;
const PLAYER_Y = H - 110;
export const CAR_W = 50;
export const CAR_H = 92;

export interface Coin {
  x: number;
  y: number;
  taken: boolean;
}

export interface State extends BaseState {
  road: Road;
  lane: number;
  x: number;
  speed: number;
  baseSpeed: number;
  distance: number;
  lives: number;
  safe: number;
  coins: Coin[];
  coinCount: number;
  spawnIn: number;
  coinIn: number;
  sparks: Spark[];
}

const SPEED: Record<DifficultySetting, number> = { easy: 220, normal: 270, hard: 320 };

export function create(difficulty: DifficultySetting): State {
  const road = makeRoad(W, H, 3, 100);
  return { ...baseState(), road, lane: 1, x: laneCentre(road, 1), speed: SPEED[difficulty], baseSpeed: SPEED[difficulty], distance: 0, lives: 3, safe: 1, coins: [], coinCount: 0, spawnIn: 0.8, coinIn: 0.5, sparks: [] };
}

export function hop(s: State, dir: -1 | 1) {
  const lane = clamp(s.lane + dir, 0, s.road.lanes - 1);
  if (lane !== s.lane) {
    s.lane = lane;
    s.events.push('click');
  }
}

export function update(s: State, dt: number, input: Input, random: () => number) {
  const r = s.road;
  if (input.pressed.has('left')) hop(s, -1);
  if (input.pressed.has('right')) hop(s, 1);
  if (input.pointer.pressed) hop(s, input.pointer.x < s.x ? -1 : 1);
  s.x += (laneCentre(r, s.lane) - s.x) * Math.min(1, dt * 12);
  s.speed = s.baseSpeed + Math.min(220, s.time * 2);
  s.distance += s.speed * dt;
  s.safe = Math.max(0, s.safe - dt);
  s.spawnIn -= dt;
  if (s.spawnIn <= 0) {
    // All traffic is slower than you, so it always comes from ahead.
    spawnVehicle(r, s.speed, random, { minSpeed: 60, maxSpeed: Math.max(80, s.speed * 0.55), truckChance: 0.2 });
    s.spawnIn = (0.75 + random() * 0.7) * (300 / s.speed);
  }
  s.coinIn -= dt;
  if (s.coinIn <= 0) {
    const lane = Math.floor(random() * r.lanes);
    for (let k = 0; k < 4; k++) s.coins.push({ x: laneCentre(r, lane), y: -30 - k * 45, taken: false });
    s.coinIn = 2 + random() * 2;
  }
  updateTraffic(r, s.speed, dt, random, 0);
  for (const c of s.coins) {
    c.y += s.speed * dt;
    if (!c.taken && Math.abs(c.x - s.x) < CAR_W / 2 + 6 && Math.abs(c.y - PLAYER_Y) < CAR_H / 2 + 6) {
      c.taken = true;
      s.coinCount += 1;
      s.events.push('coin');
    }
  }
  s.coins = s.coins.filter((c) => !c.taken && c.y < H + 30);
  const me = { x: s.x, y: PLAYER_Y, w: CAR_W, h: CAR_H };
  if (s.safe === 0) {
    const hit = r.traffic.find((v) => overlap(me, v, 8));
    if (hit) {
      s.lives -= 1;
      s.safe = 2;
      r.traffic.splice(r.traffic.indexOf(hit), 1);
      s.events.push('explosion');
      burst(s.sparks, s.x, PLAYER_Y - CAR_H / 2, '#f59e0b', 20, 180, random);
      if (s.lives <= 0) {
        s.over = true;
        s.events.push('gameOver');
      }
    }
  }
  s.score = Math.floor(s.distance / 50) + s.coinCount * 10;
  updateSparks(s.sparks, dt);
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  drawRoad(ctx, s.road, { ...DAY, verge: '#65a30d' });
  for (const c of s.coins) {
    circle(ctx, c.x, c.y, 10, '#facc15');
    circle(ctx, c.x, c.y, 6, '#fde047');
  }
  for (const v of s.road.traffic) drawVehicle(ctx, v, false, s.time);
  if (!s.over && !(s.safe > 0 && Math.floor(s.time * 10) % 2)) drawVehicle(ctx, { x: s.x, y: PLAYER_Y, w: CAR_W, h: CAR_H, color: '#0ea5e9', kind: 'car' });
  drawSparks(ctx, s.sparks);
  text(ctx, '❤'.repeat(Math.max(0, s.lives)), 12, 20, { size: 18, align: 'left', color: '#ef4444' });
  text(ctx, `🪙 ${s.coinCount}`, W - 12, 20, { size: 16, align: 'right' });
}

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create,
  update,
  render,
  hud: (s) => [
    { label: 'Score', value: s.score },
    { label: 'Coins', value: s.coinCount },
    { label: 'Lives', value: s.lives },
    { label: 'Distance', value: `${(s.distance / 2500).toFixed(1)} km` },
  ],
  result: (s) => ({
    score: s.score,
    title: 'Out of lives',
    details: [
      { label: 'Distance', value: `${(s.distance / 2500).toFixed(2)} km` },
      { label: 'Coins collected', value: String(s.coinCount) },
    ],
  }),
  onEnd: (s) => {
    void reportProgress('endless-traffic-driving.km-3', Math.floor(s.distance / 2500));
    void reportProgress('endless-traffic-driving.coins-50', s.coinCount);
    void incrementProgress('endless-traffic-driving.total', s.coinCount);
  },
  touch: { pad: 'horizontal' },
  startHint: 'Tap ← or → (or tap either side of the car) to hop lanes. Grab coins, dodge cars. Three lives.',
};
