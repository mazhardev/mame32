import type { DifficultySetting } from '@/types';
import { baseState, clamp } from '../_shared/arcade/kit';
import type { BaseState, Input } from '../_shared/arcade/kit';
import { BAR_LEN, LANE_W, laneX, nextPattern } from './track';
import type { Item, Lane } from './track';

/**
 * Lane Rush rules: the runner moves between three lanes, jumps hurdles,
 * slides under bars and dodges trains while the pace keeps rising. Coins
 * add to the score, and power-ups pull coins in (magnet), double the score,
 * or save the runner from one crash (shield).
 */
export const W = 270;
export const H = 480;
const FRAME = 1 / 60;
export const JUMP_V = 9.2;
export const GRAVITY = 28;
export const SLIDE_T = 0.62;
export const BODY_H = 1.7;
export const SLIDE_H = 0.85;
export const LOW_H = 0.85;
export const HIGH_BOTTOM = 1.15;
/** Seconds to move one lane over. */
const SWITCH_T = 0.16;
const MAGNET_T = 10;
const DOUBLE_T = 12;
const AHEAD = 110;

export interface Pace {
  start: number;
  max: number;
  /** Speed gained per metre run. */
  ramp: number;
}

export const PACE: Record<DifficultySetting, Pace> = {
  easy: { start: 8.5, max: 18, ramp: 0.006 },
  normal: { start: 10, max: 22, ramp: 0.008 },
  hard: { start: 12, max: 26, ramp: 0.011 },
};

export interface State extends BaseState {
  difficulty: DifficultySetting;
  pace: Pace;
  /** Distance run (the runner's z). */
  z: number;
  speed: number;
  lane: Lane;
  /** Lane the runner was in before the current move (for bouncing back off a train). */
  fromLane: Lane;
  x: number;
  y: number;
  vy: number;
  slideT: number;
  /** Seconds of stumble wobble after scraping a train. */
  stumble: number;
  items: Item[];
  nextZ: number;
  coins: number;
  magnetT: number;
  doubleT: number;
  shield: boolean;
  /** Seconds the runner flickers after a shield is used. */
  safeT: number;
  crashed: boolean;
  crashT: number;
  crashWhat: string;
  pops: { x: number; y: number; z: number; t: number; text: string }[];
  /** Swipe tracking. */
  swipe: { on: boolean; x: number; y: number; used: boolean };
  rand: () => number;
  acc: number;
  stats: { shieldSaves: number; powerups: number; jumps: number; slides: number };
}

function seeded(seed: number) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export function create(difficulty: DifficultySetting, seed = Math.floor(Math.random() * 2 ** 31)): State {
  const pace = PACE[difficulty];
  const s: State = {
    ...baseState(),
    difficulty,
    pace,
    z: 0,
    speed: pace.start,
    lane: 0,
    fromLane: 0,
    x: 0,
    y: 0,
    vy: 0,
    slideT: 0,
    stumble: 0,
    items: [],
    nextZ: 40,
    coins: 0,
    magnetT: 0,
    doubleT: 0,
    shield: false,
    safeT: 0,
    crashed: false,
    crashT: 0,
    crashWhat: '',
    pops: [],
    swipe: { on: false, x: 0, y: 0, used: false },
    rand: seeded(seed),
    acc: 0,
    stats: { shieldSaves: 0, powerups: 0, jumps: 0, slides: 0 },
  };
  fill(s);
  return s;
}

function fill(s: State) {
  while (s.nextZ < s.z + AHEAD) {
    const p = nextPattern(s.rand, s.nextZ, s.speed, s.z);
    s.items.push(...p.items);
    s.nextZ = p.end;
  }
  s.items = s.items.filter((it) => it.z + it.len > s.z - 8);
}

/* ---------------------------------------------------------------- actions */
export const onGround = (s: State) => s.y <= 0 && s.vy <= 0;

export function moveLane(s: State, dir: -1 | 1) {
  if (s.crashed) return;
  const to = clamp(s.lane + dir, -1, 1) as Lane;
  if (to === s.lane) return;
  s.fromLane = s.lane;
  s.lane = to;
  s.events.push('whoosh');
}

export function jump(s: State) {
  if (s.crashed || !onGround(s)) return;
  s.vy = JUMP_V;
  s.slideT = 0;
  s.stats.jumps++;
  s.events.push('jump');
}

export function slide(s: State) {
  if (s.crashed) return;
  if (!onGround(s)) {
    // Drop fast out of a jump, and slide on landing.
    s.vy = Math.min(s.vy, -16);
    s.slideT = SLIDE_T + 0.15;
    return;
  }
  s.slideT = SLIDE_T;
  s.stats.slides++;
  s.events.push('blip');
}

/* ------------------------------------------------------------- collisions */
const bodyTop = (s: State) => s.y + (s.slideT > 0 && onGround(s) ? SLIDE_H : s.slideT > 0 ? SLIDE_H : BODY_H);

function crash(s: State, what: string, it: Item) {
  if (s.shield) {
    s.shield = false;
    s.safeT = 1.2;
    s.stats.shieldSaves++;
    it.taken = true;
    s.pops.push({ x: laneX(it.lane), y: 1.2, z: s.z + 1, t: 0, text: 'SHIELD!' });
    s.events.push('explosion');
    return;
  }
  s.crashed = true;
  s.crashT = 0;
  s.crashWhat = what;
  s.events.push('gameOver');
}

function collide(s: State, prevZ: number) {
  const half = 0.3;
  for (const it of s.items) {
    if (it.taken) continue;
    const near = Math.abs(s.x - laneX(it.lane)) < (it.kind === 'block' ? 0.95 : 0.7);
    if (!near) continue;
    if (it.kind === 'coin' || it.kind === 'magnet' || it.kind === 'shield' || it.kind === 'double') {
      if (Math.abs(it.z - s.z) < 0.7 && it.y > s.y - 0.3 && it.y < bodyTop(s) + 0.4) collect(s, it);
      continue;
    }
    if (s.safeT > 0) continue;
    // Did the runner's body pass into the obstacle's span this frame?
    const front = s.z + half;
    const entered = front >= it.z && prevZ + half < it.z;
    const inside = s.z - half < it.z + it.len && front > it.z;
    if (it.kind === 'low' && inside && s.y < LOW_H) crash(s, 'hurdle', it);
    else if (it.kind === 'high' && inside && bodyTop(s) > HIGH_BOTTOM) crash(s, 'bar', it);
    else if (it.kind === 'block' && inside) {
      if (entered || Math.abs(s.x - laneX(it.lane)) < 0.35) crash(s, 'train', it);
      else {
        // Scraped the side of a train while changing lanes: bounce back.
        s.lane = s.fromLane;
        s.stumble = 0.5;
        s.events.push('hit');
      }
    }
    if (s.crashed) return;
  }
}

function collect(s: State, it: Item) {
  it.taken = true;
  const x2 = s.doubleT > 0 ? 2 : 1;
  switch (it.kind) {
    case 'coin':
      s.coins++;
      s.score += 10 * x2;
      s.events.push('coin');
      break;
    case 'magnet':
      s.magnetT = MAGNET_T;
      break;
    case 'double':
      s.doubleT = DOUBLE_T;
      break;
    case 'shield':
      s.shield = true;
      break;
  }
  if (it.kind !== 'coin') {
    s.stats.powerups++;
    s.pops.push({ x: laneX(it.lane), y: 1.6, z: it.z, t: 0, text: it.kind === 'magnet' ? 'MAGNET' : it.kind === 'double' ? '2× SCORE' : 'SHIELD' });
    s.events.push('powerup');
  }
}

/* ------------------------------------------------------------------ frame */
export function frame(s: State) {
  for (const p of s.pops) p.t += FRAME;
  s.pops = s.pops.filter((p) => p.t < 0.9);
  if (s.crashed) {
    s.crashT += FRAME;
    if (s.crashT > 1.1) s.over = true;
    return;
  }
  const prevZ = s.z;
  s.speed = Math.min(s.pace.max, s.pace.start + s.z * s.pace.ramp);
  const step = s.speed * FRAME * (s.stumble > 0 ? 0.8 : 1);
  s.z += step;
  s.score += step * (s.doubleT > 0 ? 2 : 1);
  // Glide toward the lane.
  const target = laneX(s.lane);
  const v = (LANE_W / SWITCH_T) * FRAME;
  s.x = Math.abs(target - s.x) <= v ? target : s.x + Math.sign(target - s.x) * v;
  // Jump arc.
  if (s.y > 0 || s.vy > 0) {
    s.vy -= GRAVITY * FRAME;
    s.y += s.vy * FRAME;
    if (s.y <= 0) {
      s.y = 0;
      s.vy = 0;
    }
  }
  if (s.slideT > 0 && onGround(s)) s.slideT -= FRAME;
  s.stumble = Math.max(0, s.stumble - FRAME);
  s.safeT = Math.max(0, s.safeT - FRAME);
  s.magnetT = Math.max(0, s.magnetT - FRAME);
  s.doubleT = Math.max(0, s.doubleT - FRAME);
  // The magnet pulls nearby coins from every lane.
  if (s.magnetT > 0) {
    for (const it of s.items) {
      if (it.kind !== 'coin' || it.taken) continue;
      const dz = it.z - s.z;
      if (dz < 9 && dz > -1) collect(s, it);
    }
  }
  collide(s, prevZ);
  fill(s);
}

/* ------------------------------------------------------------------ input */
const SWIPE = 22;

export function update(s: State, dt: number, input: Input) {
  const p = input.pressed;
  if (p.has('left')) moveLane(s, -1);
  if (p.has('right')) moveLane(s, 1);
  if (p.has('up') || p.has('action')) jump(s);
  if (p.has('down') || p.has('action2')) slide(s);
  // Swipes: act as soon as the finger has moved far enough, once per touch.
  const ptr = input.pointer;
  if (ptr.pressed) s.swipe = { on: true, x: ptr.x, y: ptr.y, used: false };
  if (s.swipe.on && !s.swipe.used) {
    const dx = ptr.x - s.swipe.x;
    const dy = ptr.y - s.swipe.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) >= SWIPE) {
      s.swipe.used = true;
      if (Math.abs(dx) > Math.abs(dy)) moveLane(s, dx < 0 ? -1 : 1);
      else if (dy < 0) jump(s);
      else slide(s);
    } else if (ptr.released) jump(s); // A plain tap jumps.
  }
  if (ptr.released || !ptr.down) s.swipe.on = false;
  s.acc = Math.min(s.acc + dt, FRAME * 5);
  while (s.acc >= FRAME - 1e-9 && !s.over) {
    s.acc -= FRAME;
    frame(s);
  }
}

export const BAR = BAR_LEN;
