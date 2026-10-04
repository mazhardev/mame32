import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState, clamp } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { burst, drawSparks, fillRound, text, updateSparks } from '../_shared/arcade/draw';
import type { Spark } from '../_shared/arcade/draw';
import { DAY, drawRoad, drawVehicle, laneCentre, laneOf, makeRoad, overlap, spawnVehicle, steer, updateTraffic } from '../_shared/traffic/road';
import type { Road, Vehicle } from '../_shared/traffic/road';

/**
 * Police Chase: you are the patrol car. A suspect is fleeing through the
 * traffic ahead, swerving between lanes. Catch up and ram them four times to
 * make the arrest before the timer runs out. Each new suspect drives faster.
 * Hitting civilians damages your car; three knocks and you are off the case.
 */
export const W = 440;
export const H = 620;
const PLAYER_Y = H - 110;
export const CAR_W = 46;
export const CAR_H = 86;
export const RAMS = 4;

export interface Suspect {
  x: number;
  /** Distance ahead of the player along the road (px). */
  gap: number;
  speed: number;
  health: number;
  targetX: number;
  think: number;
  hitCd: number;
}

export interface State extends BaseState {
  road: Road;
  x: number;
  speed: number;
  topSpeed: number;
  suspect: Suspect;
  arrests: number;
  timeLeft: number;
  damage: number;
  stun: number;
  spawnIn: number;
  flash: string;
  flashT: number;
  suspectBase: number;
  sparks: Spark[];
}

const SETTINGS: Record<DifficultySetting, { top: number; time: number; suspect: number }> = {
  easy: { top: 500, time: 55, suspect: 330 },
  normal: { top: 520, time: 45, suspect: 360 },
  hard: { top: 540, time: 40, suspect: 395 },
};

function newSuspect(base: number, arrests: number, x: number): Suspect {
  return { x, gap: 380, speed: base + arrests * 18, health: RAMS, targetX: x, think: 1, hitCd: 0 };
}

export function create(difficulty: DifficultySetting): State {
  const c = SETTINGS[difficulty];
  const road = makeRoad(W, H, 4, 92);
  return {
    ...baseState(),
    road,
    x: laneCentre(road, 2),
    speed: 300,
    topSpeed: c.top,
    suspect: newSuspect(c.suspect, 0, laneCentre(road, 1)),
    suspectBase: c.suspect,
    arrests: 0,
    timeLeft: c.time,
    damage: 0,
    stun: 0,
    spawnIn: 0.5,
    flash: '',
    flashT: 0,
    sparks: [],
  };
}

const suspectY = (s: State) => PLAYER_Y - s.suspect.gap;

/** The suspect weaves towards the clearest lane ahead. */
function steerSuspect(s: State, dt: number, random: () => number) {
  const r = s.road;
  const sus = s.suspect;
  sus.think -= dt;
  const y = suspectY(s);
  const blocked = (lane: number) => r.traffic.some((v) => laneOf(r, v.x) === lane && v.y < y && y - v.y < 220);
  if (sus.think <= 0 || blocked(laneOf(r, sus.targetX))) {
    const options = [0, 1, 2, 3].filter((l) => !blocked(l));
    const pick = options.length ? options[Math.floor(random() * options.length)] : Math.floor(random() * r.lanes);
    sus.targetX = laneCentre(r, pick);
    sus.think = 0.8 + random() * 1.4;
  }
  sus.x += clamp(sus.targetX - sus.x, -170 * dt, 170 * dt);
}

export function ram(s: State, random: () => number = Math.random) {
  const sus = s.suspect;
  sus.health -= 1;
  sus.hitCd = 0.8;
  sus.gap += 60;
  s.events.push('hit');
  burst(s.sparks, s.x, suspectY(s) + CAR_H / 2, '#fde047', 14, 160, random);
  if (sus.health <= 0) {
    s.arrests += 1;
    s.score += 1000 + Math.round(s.timeLeft) * 20;
    s.flash = 'Suspect arrested!';
    s.flashT = 2;
    s.events.push('levelComplete');
    s.timeLeft = Math.max(s.timeLeft, 0) + 30;
    s.suspect = newSuspect(s.suspectBase, s.arrests, laneCentre(s.road, Math.floor(random() * 4)));
  } else {
    s.flash = `Hit! ${sus.health} to go`;
    s.flashT = 1;
  }
}

export function update(s: State, dt: number, input: Input, random: () => number) {
  const r = s.road;
  s.stun = Math.max(0, s.stun - dt);
  const gas = (input.held.has('up') || input.pointer.down) && s.stun === 0;
  s.speed = clamp(s.speed + (gas ? 220 : input.held.has('down') ? -380 : -40) * dt, 150, s.topSpeed);
  if (s.stun === 0) s.x = steer(s.x, input, 300, dt, r.left + CAR_W / 2, r.left + r.lanes * r.laneW - CAR_W / 2);
  s.timeLeft -= dt;

  const sus = s.suspect;
  sus.hitCd = Math.max(0, sus.hitCd - dt);
  sus.gap += (sus.speed - s.speed) * dt;
  sus.gap = Math.max(CAR_H, sus.gap);
  steerSuspect(s, dt, random);

  s.spawnIn -= dt;
  if (s.spawnIn <= 0) {
    spawnVehicle(r, s.speed, random, { minSpeed: 120, maxSpeed: 220, truckChance: 0.2 });
    s.spawnIn = (0.55 + random() * 0.6) * (360 / s.speed);
  }
  updateTraffic(r, s.speed, dt, random, 0.15);

  const me = { x: s.x, y: PLAYER_Y, w: CAR_W, h: CAR_H };
  const susBox = { x: sus.x, y: suspectY(s), w: CAR_W, h: CAR_H };
  if (sus.hitCd === 0 && overlap(me, susBox, 2)) ram(s, random);
  // The suspect shoves civilians out of its way rather than crashing.
  for (const v of r.traffic) if (overlap(susBox, v, 0)) v.x += v.x < sus.x ? -60 * dt : 60 * dt;
  if (s.stun === 0) {
    const hit = r.traffic.find((v) => overlap(me, v, 6));
    if (hit) {
      s.damage += 1;
      s.stun = 1;
      s.speed *= 0.3;
      hit.y -= 40;
      s.flash = 'Civilian hit!';
      s.flashT = 1;
      s.events.push('explosion');
      burst(s.sparks, s.x, PLAYER_Y - CAR_H / 2, '#f97316', 18, 160, random);
    }
  }
  s.flashT = Math.max(0, s.flashT - dt);
  if (s.damage >= 3 || s.timeLeft <= 0) {
    s.over = true;
    s.events.push('gameOver');
  }
  updateSparks(s.sparks, dt);
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  drawRoad(ctx, s.road, { ...DAY, verge: '#3f6212' });
  for (const v of s.road.traffic) drawVehicle(ctx, v as Vehicle, false, s.time);
  const sy = suspectY(s);
  if (sy > -CAR_H) drawVehicle(ctx, { x: s.suspect.x, y: sy, w: CAR_W, h: CAR_H, color: '#111827', kind: 'suspect' });
  else text(ctx, '▲ suspect ahead', s.suspect.x, 46, { size: 13, color: '#fde047' });
  drawVehicle(ctx, { x: s.x, y: PLAYER_Y, w: CAR_W, h: CAR_H, color: s.stun > 0 && Math.floor(s.time * 12) % 2 ? '#94a3b8' : '#f8fafc', kind: 'police' }, false, s.time);
  drawSparks(ctx, s.sparks);
  fillRound(ctx, 10, H - 40, 140, 30, 8, 'rgba(0,0,0,0.5)');
  for (let i = 0; i < RAMS; i++) fillRound(ctx, 18 + i * 32, H - 32, 26, 14, 4, i < s.suspect.health ? '#ef4444' : '#334155');
  text(ctx, `${Math.ceil(Math.max(0, s.timeLeft))}s`, W - 14, 22, { size: 20, align: 'right', color: s.timeLeft < 10 ? '#f87171' : '#fff' });
  text(ctx, `Damage ${'✖'.repeat(s.damage)}${'·'.repeat(3 - s.damage)}`, 14, 22, { size: 14, align: 'left', color: '#fecaca' });
  if (s.flashT > 0) text(ctx, s.flash, W / 2, 70, { size: 22, color: '#fde047' });
}

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create,
  update,
  render,
  hud: (s) => [
    { label: 'Arrests', value: s.arrests },
    { label: 'Time', value: `${Math.ceil(Math.max(0, s.timeLeft))}s` },
    { label: 'Damage', value: `${s.damage}/3` },
    { label: 'Score', value: s.score },
  ],
  result: (s) => ({
    score: s.score,
    title: s.damage >= 3 ? 'Your car is wrecked' : 'The suspect got away',
    details: [{ label: 'Arrests', value: String(s.arrests) }],
  }),
  onEnd: (s) => {
    void reportProgress('police-chase.first', s.arrests);
    void reportProgress('police-chase.five', s.arrests);
    void incrementProgress('police-chase.total', s.arrests);
  },
  touch: { pad: 'dpad' },
  startHint: '↑ accelerate, ← → steer. Ram the black suspect car four times to arrest them. Avoid civilians!',
};
