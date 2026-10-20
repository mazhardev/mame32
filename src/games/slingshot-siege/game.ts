import type { DifficultySetting } from '@/types';
import { baseState, clamp } from '../_shared/arcade/kit';
import type { BaseState, Input } from '../_shared/arcade/kit';
import { LEVEL_COUNT, SLING_X, SLING_Y, level as buildLevel, levelRight } from './levels';
import type { Ammo, Level, Mat } from './levels';
import {
  AMMO,
  ENEMY_POINTS,
  MATS,
  STEP,
  addShot,
  buildWorld,
  enemiesLeft,
  explode,
  removeThing,
  restless,
  stepWorld,
} from './physics';
import type { Phys, Thing } from './physics';
import { SOLUTIONS } from './solutions';

/** Slingshot Siege rules: aiming, the flight of each shot, turns, scoring and stars. */
export const W = 480;
export const H = 270;
/** Screen height of the strip below ground level (logical px). */
export const GROUND_PX = 26;
export const MIN_SPEED = 5;
export const MAX_SPEED = 23;
/** Drag distance (logical px) for a full-power shot. */
export const PULL_PX = 72;
export const MIN_ANGLE = (-15 * Math.PI) / 180;
export const MAX_ANGLE = (80 * Math.PI) / 180;
export const AMMO_BONUS = 10000;
/** World x at the left edge of the view (the sling stands at x = 4). */
export const VIEW_X0 = 1.2;
const SETTLE_STEPS = 45;
const KABOOM_FUSE = 1.2;
export const KABOOM_BLAST = { r: 4.2, power: 11, damage: 260 };
export const TNT_BLAST = { r: 3.4, power: 9, damage: 170 };

export type Phase = 'aim' | 'fly' | 'clear' | 'bonus' | 'lost';

export interface Debris {
  x: number;
  y: number;
  vx: number;
  vy: number;
  a: number;
  va: number;
  life: number;
  size: number;
  color: string;
}

export interface State extends BaseState {
  difficulty: DifficultySetting;
  level: number;
  def: Level;
  /** Shots the solver needed: three stars for matching it. */
  par: number;
  phys: Phys;
  /** Ammo still to fire; queue[0] sits in the sling. */
  queue: Ammo[];
  shotsUsed: number;
  phase: Phase;
  phaseT: number;
  /** Shots of the current turn (the triplets make three). */
  shots: Thing[];
  ability: 'ready' | 'used' | 'none';
  /** Seconds the zoomer's dash trail still shows. */
  dashT: number;
  flightT: number;
  quietT: number;
  /** Kaboom fuse after landing, or -1. */
  fuse: number;
  aim: { angle: number; power: number };
  /** The aim was last set with the keyboard (so the guide shows without a drag). */
  keyAim: boolean;
  drag: { on: boolean; x0: number; y0: number; x: number; y: number };
  /** Flight path of this shot and of the previous one, as x,y pairs. */
  trail: number[];
  lastTrail: number[];
  zoom: number;
  right: number;
  acc: number;
  steps: number;
  killsThisShot: number;
  debris: Debris[];
  pops: { x: number; y: number; t: number; text: string; big: boolean }[];
  booms: { x: number; y: number; r: number; t: number }[];
  shake: number;
  bonusT: number;
  won: boolean;
  stars: number;
  /** Seconds since the last impact sound (keeps the clatter down). */
  hitCool: number;
  stats: { tnt: number; bestKills: number; broken: number };
}

export const isSpecial = (a: Ammo) => a === 'triple' || a === 'zoomer' || a === 'kaboom';

export function parFor(index: number, ammo: number): number {
  const sol = SOLUTIONS[index];
  return Math.min(ammo, sol && sol.length ? sol.length : ammo);
}

export function starsFor(shotsUsed: number, par: number): number {
  if (shotsUsed <= par) return 3;
  if (shotsUsed <= par + 1) return 2;
  return 1;
}

/** Seconds of trajectory the aiming guide shows. */
export const GUIDE_T: Record<DifficultySetting, number> = { easy: 1.6, normal: 0.8, hard: 0.4 };

export function create(difficulty: DifficultySetting, index: number): State {
  const i = clamp(Math.floor(index), 0, LEVEL_COUNT - 1);
  const def = buildLevel(i);
  const phys = buildWorld(def);
  // Let the fresh fort settle onto its supports before damage counts.
  for (let k = 0; k < SETTLE_STEPS; k++) stepWorld(phys);
  phys.broken.length = 0;
  phys.live = true;
  const queue = def.ammo.slice();
  if (difficulty === 'easy') queue.push('pebble');
  const right = levelRight(def);
  return {
    ...baseState(),
    difficulty,
    level: i,
    def,
    par: parFor(i, def.ammo.length),
    phys,
    queue,
    shotsUsed: 0,
    phase: 'aim',
    phaseT: 0,
    shots: [],
    ability: 'none',
    dashT: 0,
    flightT: 0,
    quietT: 0,
    fuse: -1,
    aim: { angle: (32 * Math.PI) / 180, power: 0.75 },
    keyAim: false,
    drag: { on: false, x0: 0, y0: 0, x: 0, y: 0 },
    trail: [],
    lastTrail: [],
    zoom: clamp((W - 16) / (right - VIEW_X0), 11, 21),
    right,
    acc: 0,
    steps: 0,
    killsThisShot: 0,
    debris: [],
    pops: [],
    booms: [],
    shake: 0,
    bonusT: 0,
    won: false,
    stars: 0,
    hitCool: 0,
    stats: { tnt: 0, bestKills: 0, broken: 0 },
  };
}

/* ------------------------------------------------------------- the camera */
export const toScreenX = (s: State, x: number) => 8 + (x - VIEW_X0) * s.zoom;
export const toScreenY = (s: State, y: number) => H - GROUND_PX - y * s.zoom;

export const speedFor = (power: number) => MIN_SPEED + (MAX_SPEED - MIN_SPEED) * clamp(power, 0, 1);

/** Where a shot launched now would be after `n` physics steps (semi-implicit Euler, as Box2D integrates). */
export function predict(angle: number, speed: number, n: number): [number, number] {
  const vx = Math.cos(angle) * speed;
  const vy = Math.sin(angle) * speed;
  const g = -10 * STEP * STEP;
  return [SLING_X + vx * STEP * n, SLING_Y + vy * STEP * n + (g * n * (n + 1)) / 2];
}

/* --------------------------------------------------------------- shooting */
export function launch(s: State, angle: number, speed: number) {
  if (s.phase !== 'aim' || !s.queue.length) return;
  const ammo = s.queue.shift() as Ammo;
  const t = addShot(s.phys, ammo, SLING_X, SLING_Y, Math.cos(angle) * speed, Math.sin(angle) * speed);
  s.shots = [t];
  s.shotsUsed++;
  s.phase = 'fly';
  s.phaseT = 0;
  s.flightT = 0;
  s.quietT = 0;
  s.fuse = -1;
  s.dashT = 0;
  s.ability = isSpecial(ammo) ? 'ready' : 'none';
  s.lastTrail = s.trail;
  s.trail = [];
  s.killsThisShot = 0;
  s.events.push('shoot');
}

function blast(s: State, x: number, y: number, b: { r: number; power: number; damage: number }) {
  explode(s.phys, { x, y, ...b });
  s.booms.push({ x, y, r: b.r, t: 0 });
  s.shake = Math.max(s.shake, 7);
  s.events.push('explosion');
}

/** The special move of the shot in flight: split, dash or explode. */
export function useAbility(s: State) {
  if (s.phase !== 'fly' || s.ability !== 'ready') return;
  const t = s.shots[0];
  if (!t || t.dead) return;
  s.ability = 'used';
  const p = s.phys;
  const c = t.body.getPosition();
  const v = t.body.getLinearVelocity();
  const sp = Math.hypot(v.x, v.y);
  const dir = Math.atan2(v.y, v.x);
  if (t.ammo === 'triple') {
    for (const k of [-1, 1]) {
      const a = dir + k * 0.17;
      const ox = -Math.sin(dir) * 0.75 * k;
      const oy = Math.cos(dir) * 0.75 * k;
      s.shots.push(addShot(p, 'triple', c.x + ox, c.y + oy, Math.cos(a) * sp, Math.sin(a) * sp));
    }
    s.events.push('whoosh');
  } else if (t.ammo === 'zoomer') {
    const ns = Math.min(32, Math.max(24, sp * 2));
    t.body.setLinearVelocity({ x: Math.cos(dir) * ns, y: Math.sin(dir) * ns });
    s.dashT = 0.6;
    s.events.push('whoosh');
  } else if (t.ammo === 'kaboom') {
    const x = c.x;
    const y = c.y;
    removeThing(p, t);
    blast(s, x, y, KABOOM_BLAST);
    s.fuse = -1;
  }
}

/* ------------------------------------------------------- breaks and turns */
const MAT_COLORS: Record<Mat, string[]> = {
  wood: ['#b7793f', '#8c5a2b', '#d79a5a'],
  stone: ['#8d939c', '#6c727b', '#b4b9c0'],
  ice: ['#bfe9ff', '#8fd3f5', '#ffffff'],
  tnt: ['#d64032', '#f2b233', '#5b2a1e'],
};

function scatter(s: State, x: number, y: number, colors: string[], n: number, speed: number, random: () => number) {
  for (let i = 0; i < n; i++) {
    const a = random() * Math.PI * 2;
    const v = speed * (0.3 + random() * 0.9);
    s.debris.push({
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v + speed * 0.3,
      a: random() * 6,
      va: (random() - 0.5) * 14,
      life: 0.6 + random() * 0.6,
      size: 0.12 + random() * 0.2,
      color: colors[i % colors.length],
    });
  }
}

/** Deterministic little random for effects, so replays never depend on Math.random. */
function fx(s: State): () => number {
  let seed = (s.steps * 2654435761 + s.phys.nextId * 40503) >>> 0;
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function processBreaks(s: State) {
  const p = s.phys;
  const rand = fx(s);
  while (p.broken.length) {
    for (const t of p.broken.splice(0)) {
      const c = t.body.getPosition();
      const x = c.x;
      const y = c.y;
      if (t.kind === 'enemy') {
        s.score += ENEMY_POINTS;
        s.killsThisShot++;
        s.stats.bestKills = Math.max(s.stats.bestKills, s.killsThisShot);
        s.pops.push({ x, y: y + 0.6, t: 0, text: `${ENEMY_POINTS}`, big: true });
        scatter(s, x, y, ['#8e5fd1', '#b78ef0', '#ffffff'], 14, 6, rand);
        s.events.push('pop');
      } else if (t.kind === 'block') {
        const pts = MATS[t.mat].points;
        s.score += pts;
        s.stats.broken++;
        s.pops.push({ x, y: y + 0.3, t: 0, text: `${pts}`, big: false });
        const n = Math.round(clamp(t.w * t.h * 8, 5, 14));
        scatter(s, x, y, MAT_COLORS[t.mat], n, 4, rand);
      }
      removeThing(p, t);
      if (t.kind === 'block' && t.mat === 'tnt') {
        s.stats.tnt++;
        blast(s, x, y, TNT_BLAST);
      }
    }
  }
}

function endTurn(s: State) {
  const p = s.phys;
  const rand = fx(s);
  for (const t of s.shots) {
    if (t.dead) continue;
    const c = t.body.getPosition();
    scatter(s, c.x, c.y, ['#d9d4c7', '#ffffff'], 8, 2.5, rand);
    removeThing(p, t);
  }
  s.shots = [];
  s.ability = 'none';
  s.phaseT = 0;
  if (enemiesLeft(p) === 0) s.phase = 'clear';
  else if (s.queue.length) s.phase = 'aim';
  else s.phase = 'lost';
}

function finish(s: State, won: boolean) {
  s.won = won;
  s.stars = won ? starsFor(s.shotsUsed, s.par) : 0;
  s.over = true;
  s.events.push(won ? 'levelComplete' : 'failure');
}

/** One fixed physics step plus everything that follows from it. */
export function fixedStep(s: State) {
  const p = s.phys;
  s.steps++;
  stepWorld(p);
  s.hitCool -= STEP;
  let big = 0;
  for (const im of p.impacts) big = Math.max(big, im.e);
  if (big > 20 && s.hitCool <= 0) {
    s.events.push('hit');
    s.hitCool = 0.12;
  }
  if (big > 120) s.shake = Math.max(s.shake, Math.min(6, big / 60));
  const lost: Thing[] = [];
  for (const t of p.things) {
    if (t.hurt > 0) t.hurt -= STEP;
    if (t.dead || t.kind === 'rock') continue;
    const c = t.body.getPosition();
    if (c.y < -4 || c.x < -30 || c.x > s.right + 40) lost.push(t);
  }
  for (const t of lost) {
    // Shots that fly off just vanish; anything else counts as broken.
    if (t.kind === 'shot') removeThing(p, t);
    else {
      t.dead = true;
      p.broken.push(t);
    }
  }
  processBreaks(s);

  s.phaseT += STEP;
  const quiet = restless(p) < 0.25;
  switch (s.phase) {
    case 'aim':
      if (enemiesLeft(p) === 0) {
        s.phase = 'clear';
        s.phaseT = 0;
      }
      break;
    case 'fly': {
      s.flightT += STEP;
      s.dashT = Math.max(0, s.dashT - STEP);
      s.quietT = quiet ? s.quietT + STEP : 0;
      const lead = s.shots[0];
      if (lead && !lead.dead && s.steps % 3 === 0 && s.trail.length < 400) {
        const c = lead.body.getPosition();
        s.trail.push(c.x, c.y);
      }
      if (lead && !lead.dead && lead.hit) {
        if (lead.ammo === 'kaboom' && s.ability === 'ready' && s.fuse < 0) s.fuse = KABOOM_FUSE;
        else if (lead.ammo !== 'kaboom' && s.ability === 'ready') s.ability = 'none';
      }
      if (s.fuse >= 0) {
        s.fuse -= STEP;
        if (s.fuse < 0 && lead && !lead.dead && s.ability === 'ready') {
          s.ability = 'used';
          const c = lead.body.getPosition();
          const x = c.x;
          const y = c.y;
          removeThing(p, lead);
          blast(s, x, y, KABOOM_BLAST);
        }
      }
      if ((s.flightT > 1 && s.quietT > 0.5 && s.fuse < 0) || s.flightT > 14) endTurn(s);
      break;
    }
    case 'clear':
      if (s.phaseT > 1 && (quiet || s.phaseT > 3)) {
        s.phase = 'bonus';
        s.phaseT = 0;
        s.bonusT = 0.3;
      }
      break;
    case 'bonus':
      s.bonusT -= STEP;
      if (s.bonusT <= 0) {
        if (s.queue.length) {
          s.queue.shift();
          s.score += AMMO_BONUS;
          s.pops.push({ x: SLING_X - 1.4, y: 1.6, t: 0, text: `${AMMO_BONUS}`, big: true });
          s.events.push('coin');
          s.bonusT = 0.45;
        } else finish(s, true);
      }
      break;
    case 'lost':
      if (enemiesLeft(p) === 0) {
        s.phase = 'clear';
        s.phaseT = 0;
      } else if (s.phaseT > 1.5 && (quiet || s.phaseT > 4)) finish(s, false);
      break;
  }
}

/** Advances effects by a frame and the physics by whole fixed steps. */
export function tick(s: State, dt: number) {
  s.acc = Math.min(s.acc + dt, STEP * 6);
  while (s.acc >= STEP - 1e-9 && !s.over) {
    s.acc -= STEP;
    fixedStep(s);
  }
  for (let i = s.debris.length - 1; i >= 0; i--) {
    const d = s.debris[i];
    d.life -= dt;
    if (d.life <= 0) {
      s.debris.splice(i, 1);
      continue;
    }
    d.vy -= 10 * dt;
    d.x += d.vx * dt;
    d.y += d.vy * dt;
    d.a += d.va * dt;
    if (d.y < 0.05) {
      d.y = 0.05;
      d.vy = Math.abs(d.vy) * 0.3;
      d.vx *= 0.6;
    }
  }
  for (let i = s.pops.length - 1; i >= 0; i--) {
    s.pops[i].t += dt;
    if (s.pops[i].t > 1.1) s.pops.splice(i, 1);
  }
  for (let i = s.booms.length - 1; i >= 0; i--) {
    s.booms[i].t += dt;
    if (s.booms[i].t > 0.6) s.booms.splice(i, 1);
  }
  s.shake = Math.max(0, s.shake - dt * 18);
}

/* ------------------------------------------------------------------ input */
function fire(s: State) {
  if (s.phase !== 'aim' || !s.queue.length) return;
  launch(s, s.aim.angle, speedFor(s.aim.power));
}

export function update(s: State, dt: number, input: Input) {
  const ptr = input.pointer;
  if (s.phase === 'aim') {
    if (ptr.pressed) {
      s.drag = { on: true, x0: ptr.x, y0: ptr.y, x: ptr.x, y: ptr.y };
      s.keyAim = false;
    }
    if (s.drag.on) {
      s.drag.x = ptr.x;
      s.drag.y = ptr.y;
      const dx = s.drag.x0 - ptr.x;
      const dy = s.drag.y0 - ptr.y;
      const len = Math.hypot(dx, dy);
      if (len > 4) {
        s.aim.angle = clamp(Math.atan2(-dy, dx), MIN_ANGLE, MAX_ANGLE);
        s.aim.power = clamp(len / PULL_PX, 0, 1);
      }
      if (!ptr.down || ptr.released) {
        s.drag.on = false;
        if (len >= 10) fire(s);
      }
    } else {
      const h = input.held;
      if (h.has('up') || h.has('down') || h.has('left') || h.has('right')) s.keyAim = true;
      if (h.has('up')) s.aim.angle = clamp(s.aim.angle + 0.8 * dt, MIN_ANGLE, MAX_ANGLE);
      if (h.has('down')) s.aim.angle = clamp(s.aim.angle - 0.8 * dt, MIN_ANGLE, MAX_ANGLE);
      if (h.has('right')) s.aim.power = clamp(s.aim.power + 0.5 * dt, 0, 1);
      if (h.has('left')) s.aim.power = clamp(s.aim.power - 0.5 * dt, 0, 1);
      if (input.pressed.has('action')) fire(s);
    }
  } else if (s.phase === 'fly') {
    s.drag.on = false;
    if (ptr.pressed || input.pressed.has('action')) useAbility(s);
  } else s.drag.on = false;
  tick(s, dt);
}

/* ------------------------------------------------------- solver interface */
export interface Shot {
  /** Launch angle in degrees. */
  a: number;
  /** Launch speed in m/s. */
  v: number;
  /** Physics step after launch at which to use the special move, if any. */
  tap?: number;
}

/**
 * Fires one shot and runs the physics until the turn is over (the next shot
 * is ready, or the level is won or lost). Used by the solver and the tests.
 */
export function playShot(s: State, shot: Shot) {
  launch(s, (shot.a * Math.PI) / 180, shot.v);
  let n = 0;
  while (s.phase === 'fly' && !s.over && n < 60 * 20) {
    if (shot.tap !== undefined && n === shot.tap) useAbility(s);
    fixedStep(s);
    n++;
  }
}

/** Runs a won level's victory lap (bonus count) to the end. */
export function playOut(s: State) {
  let n = 0;
  while (!s.over && s.phase !== 'aim' && n < 60 * 30) {
    fixedStep(s);
    n++;
  }
}

export const describeAmmo = (a: Ammo) => AMMO[a];
