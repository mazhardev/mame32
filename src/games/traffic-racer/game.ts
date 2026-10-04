import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState, clamp } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { burst, drawSparks, text, updateSparks } from '../_shared/arcade/draw';
import type { Spark } from '../_shared/arcade/draw';
import { DAY, drawRoad, drawVehicle, makeRoad, overlap, spawnVehicle, steer, updateTraffic } from '../_shared/traffic/road';
import type { Road } from '../_shared/traffic/road';

/**
 * Traffic Racer: weave through a busy three-lane road. You control the
 * speed; going faster scores faster. Passing a car very closely is a near
 * miss and builds a combo. One crash ends the run.
 */
export const W = 400;
export const H = 600;
const PLAYER_Y = H - 110;
const MIN_SPEED = 180;

export interface State extends BaseState {
  road: Road;
  x: number;
  speed: number;
  maxSpeed: number;
  distance: number;
  spawnIn: number;
  density: number;
  combo: number;
  comboT: number;
  nearMisses: number;
  bestCombo: number;
  flash: string;
  flashT: number;
  /** Fractional distance points and near-miss bonus. */
  points: number;
  bonus: number;
  sparks: Spark[];
}

const SETTINGS: Record<DifficultySetting, { max: number; density: number }> = {
  easy: { max: 460, density: 0.75 },
  normal: { max: 520, density: 1 },
  hard: { max: 580, density: 1.3 },
};

export const PLAYER_W = 50;
export const PLAYER_H = 92;

export function create(difficulty: DifficultySetting): State {
  const c = SETTINGS[difficulty];
  return { ...baseState(), road: makeRoad(W, H, 3, 100), x: W / 2, speed: 260, maxSpeed: c.max, distance: 0, spawnIn: 0.5, density: c.density, combo: 0, comboT: 0, nearMisses: 0, bestCombo: 0, flash: '', flashT: 0, points: 0, bonus: 0, sparks: [] };
}

export const playerBox = (s: State) => ({ x: s.x, y: PLAYER_Y, w: PLAYER_W, h: PLAYER_H });

export function update(s: State, dt: number, input: Input, random: () => number) {
  const r = s.road;
  const accel = input.held.has('up') || input.pointer.down ? 160 : input.held.has('down') ? -320 : -40;
  s.speed = clamp(s.speed + accel * dt, MIN_SPEED, s.maxSpeed);
  s.x = steer(s.x, input, 260, dt, r.left + PLAYER_W / 2, r.left + r.lanes * r.laneW - PLAYER_W / 2);
  s.distance += s.speed * dt;
  s.spawnIn -= dt;
  if (s.spawnIn <= 0) {
    spawnVehicle(r, s.speed, random, { minSpeed: 140, maxSpeed: 260 });
    s.spawnIn = (0.9 / s.density) * (0.6 + random() * 0.8) * (300 / s.speed);
  }
  updateTraffic(r, s.speed, dt, random);
  const me = playerBox(s);
  for (const v of r.traffic) {
    if (overlap(me, v, 6)) {
      s.over = true;
      s.events.push('explosion');
      burst(s.sparks, s.x, PLAYER_Y - PLAYER_H / 2, '#f97316', 30, 220, random);
      return;
    }
    // Near miss: a car slips past beside you with very little room.
    if (!v.passed && v.y > PLAYER_Y + PLAYER_H / 2) {
      v.passed = true;
      const gap = Math.abs(v.x - s.x) - (v.w + PLAYER_W) / 2;
      if (gap < 18 && s.speed > 300) {
        s.combo += 1;
        s.comboT = 3;
        s.nearMisses += 1;
        s.bestCombo = Math.max(s.bestCombo, s.combo);
        const pts = 50 * s.combo;
        s.bonus += pts;
        s.score += pts;
        s.flash = `Near miss ×${s.combo}  +${pts}`;
        s.flashT = 1;
        s.events.push('whoosh');
      }
    }
  }
  s.comboT = Math.max(0, s.comboT - dt);
  if (s.comboT === 0) s.combo = 0;
  s.flashT = Math.max(0, s.flashT - dt);
  // Distance scores faster at high speed.
  s.points += s.speed * dt * (s.speed / 300) * 0.05;
  s.score = Math.floor(s.points) + s.bonus;
  updateSparks(s.sparks, dt);
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  drawRoad(ctx, s.road, DAY);
  for (const v of s.road.traffic) drawVehicle(ctx, v, v.speed < 0, s.time);
  if (!s.over) drawVehicle(ctx, { ...playerBox(s), color: '#2563eb', kind: 'car' });
  drawSparks(ctx, s.sparks);
  text(ctx, `${Math.round(s.speed * 0.4)} km/h`, W - 12, 20, { size: 16, align: 'right', color: '#fff' });
  text(ctx, `${(s.distance / 2500).toFixed(1)} km`, 12, 20, { size: 16, align: 'left', color: '#fff' });
  if (s.flashT > 0) text(ctx, s.flash, W / 2, 70, { size: 20, color: '#fde047' });
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
    { label: 'Combo', value: s.combo },
  ],
  result: (s) => ({
    score: s.score,
    title: 'Crashed!',
    details: [
      { label: 'Distance', value: `${(s.distance / 2500).toFixed(2)} km` },
      { label: 'Near misses', value: String(s.nearMisses) },
      { label: 'Best combo', value: String(s.bestCombo) },
    ],
  }),
  onEnd: (s) => {
    void reportProgress('traffic-racer.km-5', Math.floor(s.distance / 2500));
    void reportProgress('traffic-racer.combo-5', s.bestCombo);
    void reportProgress('traffic-racer.score-5000', s.score);
    void incrementProgress('traffic-racer.misses', s.nearMisses);
  },
  touch: { pad: 'dpad' },
  startHint: '← → change lanes, ↑ speed up, ↓ brake. Pass cars closely at speed for near-miss combos.',
};
