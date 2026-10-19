import type { DifficultySetting } from '@/types';
import type { SoundName } from '@/services/audio';
import { baseState } from '../_shared/arcade/kit';
import type { BaseState, Input } from '../_shared/arcade/kit';
import type { Spark } from '../_shared/arcade/draw';
import { burst, updateSparks } from '../_shared/arcade/draw';
import { EMPTY, ONEWAY, SOLID, edgeAhead, makeGrid, moveBody, overlaps, setCell } from '../_shared/platform/tiles';
import type { Body, Grid } from '../_shared/platform/tiles';
import { LEVEL_COUNT, PER_WORLD, ROWS, T, TILE, VIEW_W, buildLevel, isQuestion } from './levels';
import type { Level } from './levels';

/**
 * Pip Quest rules. A plain state object advanced by `update` — no React, no
 * canvas — so the physics and rules are unit-testable.
 */

/* ------------------------------------------------------------------ tuning */

export const PHYS = {
  walk: 92,
  run: 165,
  jump: 360,
  gravityHold: 900,
  gravity: 1900,
  maxFall: 440,
  coyote: 0.09,
  buffer: 0.13,
};

const SMALL_H = 14;
const BIG_H = 26;
const PW = 12;

export const DIFFICULTY: Record<DifficultySetting, { lives: number; time: number; speed: number; bossHp: number }> = {
  easy: { lives: 5, time: 400, speed: 0.85, bossHp: 0.8 },
  normal: { lives: 3, time: 300, speed: 1, bossHp: 1 },
  hard: { lives: 3, time: 240, speed: 1.2, bossHp: 1.3 },
};

const CHAIN = [100, 200, 400, 800, 1000, 2000, 4000, 8000];
const FLAG_POINTS = [100, 400, 800, 2000, 5000];
export const BOSS_NAMES = ['Thornback', 'Rockjaw', 'Galeclaw', 'Frostmaw', 'King Emberhorn'];

/* ------------------------------------------------------------------- types */

export type Form = 0 | 1 | 2;

export interface Player extends Body {
  form: Form;
  facing: 1 | -1;
  invuln: number;
  star: number;
  coyote: number;
  buffer: number;
  shootCd: number;
  anim: number;
  chain: number;
  plat: Plat | null;
  dead: boolean;
}

export type EnemyKind = 'g' | 'k' | 'h' | 'b' | 'c';

export interface Enemy {
  kind: EnemyKind;
  b: Body;
  dir: number;
  alive: boolean;
  active: boolean;
  /** Seconds left of the squash or knock-out animation. */
  fade: number;
  flipped: boolean;
  /** Snail state: 0 walking, 1 shell resting, 2 shell spinning. */
  shell: 0 | 1 | 2;
  timer: number;
  grace: number;
  homeX: number;
  homeY: number;
  /** Plants: 0 hidden … 1 fully out. */
  out: number;
  chain: number;
}

export interface Item {
  kind: 'acorn' | 'berry' | 'star' | 'life';
  b: Body;
  dir: number;
  rise: number;
}

export interface Plat {
  kind: 'm' | 'v' | 'f';
  x: number;
  y: number;
  w: number;
  ox: number;
  oy: number;
  phase: number;
  dx: number;
  dy: number;
  /** Crumbling clouds: 0 solid, 1 shaking, 2 falling, 3 gone. */
  state: number;
  timer: number;
  vy: number;
}

export interface Bar {
  cx: number;
  cy: number;
  a: number;
  speed: number;
  n: number;
}

export interface Shot {
  b: Body;
  life: number;
}

export interface Bolt {
  x: number;
  y: number;
  vx: number;
  vy: number;
  bounced: boolean;
  life: number;
}

export interface Boss {
  world: number;
  b: Body;
  hp: number;
  maxHp: number;
  dir: number;
  state: 'wait' | 'walk' | 'jump' | 'throw' | 'hurt' | 'down';
  timer: number;
  invuln: number;
  throws: number;
}

export interface Pop {
  x: number;
  y: number;
  t: number;
  text: string;
}

export type Phase = 'intro' | 'play' | 'dying' | 'flag' | 'tally' | 'boss-down' | 'done';

export interface State extends BaseState {
  difficulty: DifficultySetting;
  levelIndex: number;
  lv: Level;
  grid: Grid;
  tiles: Uint8Array;
  p: Player;
  enemies: Enemy[];
  items: Item[];
  coins: { x: number; y: number; taken: boolean }[];
  plats: Plat[];
  bars: Bar[];
  shots: Shot[];
  bolts: Bolt[];
  boss: Boss | null;
  pops: Pop[];
  bumps: { c: number; r: number; t: number }[];
  sparks: Spark[];
  debris: { x: number; y: number; vx: number; vy: number; life: number }[];
  cam: number;
  camMin: number;
  arena: number | null;
  arenaLocked: boolean;
  clock: number;
  lives: number;
  coinCount: number;
  phase: Phase;
  phaseT: number;
  checkpoint: { c: number; r: number } | null;
  checks: { c: number; r: number; reached: boolean }[];
  goal: { c: number; top: number; bottom: number } | null;
  flagY: number;
  hurried: boolean;
  won: boolean;
  /** Statistics for achievements. */
  stats: { bestChain: number; fireKills: number; bosses: number; coins: number; flagTop: boolean; cleared: number; deaths: number };
  /** Highest level index reached this run, reported for "continue". */
  reached: number;
}

/* ----------------------------------------------------------------- building */

function body(x: number, y: number, w: number, h: number): Body {
  return { x, y, w, h, vx: 0, vy: 0, ground: false };
}

function collisionOf(v: number): number {
  if (v >= TILE.ground && v <= TILE.stump) return SOLID;
  if (v === TILE.ledge) return ONEWAY;
  return EMPTY;
}

/** Sets up a level, keeping the player's form, lives, score and coins. */
export function loadLevel(s: State, index: number, fromCheckpoint = false) {
  const lv = buildLevel(index);
  const tiles = lv.tiles.slice();
  const grid = makeGrid(lv.cols, ROWS, T, { sideWalls: true });
  for (let i = 0; i < tiles.length; i++) grid.cells[i] = collisionOf(tiles[i]);
  const keepCheckpoint = fromCheckpoint && s.levelIndex === index ? s.checkpoint : null;

  s.levelIndex = index;
  s.reached = Math.max(s.reached, index);
  s.lv = lv;
  s.tiles = tiles;
  s.grid = grid;
  s.enemies = [];
  s.items = [];
  s.coins = [];
  s.plats = [];
  s.bars = [];
  s.shots = [];
  s.bolts = [];
  s.boss = null;
  s.pops = [];
  s.bumps = [];
  s.sparks = [];
  s.debris = [];
  s.checks = [];
  s.goal = null;
  s.arena = null;
  s.arenaLocked = false;
  s.camMin = 0;
  s.checkpoint = keepCheckpoint;
  s.clock = DIFFICULTY[s.difficulty].time;
  s.hurried = false;
  s.flagY = 0;

  let barN = 0;
  for (const m of lv.marks) {
    const x = m.c * T;
    const y = m.r * T;
    switch (m.ch) {
      case 'o':
        s.coins.push({ x: x + T / 2, y: y + T / 2, taken: false });
        break;
      case 'g':
      case 'k':
      case 'h':
      case 'b': {
        const e = enemy(m.ch, x + 1, y + T - 14);
        s.enemies.push(e);
        break;
      }
      case 'c': {
        const e = enemy('c', x + 2, y + T - 20);
        e.b.w = 12;
        e.b.h = 20;
        s.enemies.push(e);
        break;
      }
      case 'm':
      case 'v':
        s.plats.push(plat(m.ch, x - T, y, 3 * T, m.c));
        break;
      case 'f':
        s.plats.push(plat('f', x, y, 2 * T, m.c));
        break;
      case 'R':
        s.bars.push({ cx: x + T / 2, cy: y + T / 2, a: barN * 1.3, speed: (barN % 2 ? -1 : 1) * (1.5 + 0.1 * Math.floor(index / PER_WORLD)), n: index >= 12 ? 6 : 5 });
        barN++;
        break;
      case 'C':
        s.checks.push({ c: m.c, r: m.r, reached: !!keepCheckpoint && keepCheckpoint.c === m.c });
        break;
      case '%':
        s.goal = { c: m.c, top: 4 * T, bottom: (m.r + 1) * T };
        break;
      case 'A':
        s.arena = m.c;
        break;
      case 'K': {
        const world = Math.floor(index / PER_WORLD);
        const hp = Math.round((3 + Math.floor(world / 2)) * 4 * DIFFICULTY[s.difficulty].bossHp);
        s.boss = { world, b: body(x - 10, y + T - 36, 36, 36), hp, maxHp: hp, dir: -1, state: 'wait', timer: 1, invuln: 0, throws: 0 };
        break;
      }
    }
  }

  const start = keepCheckpoint ?? lv.start;
  const form = s.p?.form ?? 0;
  const h = form ? BIG_H : SMALL_H;
  s.p = {
    ...body(start.c * T + 2, (start.r + 1) * T - h, PW, h),
    form,
    facing: 1,
    invuln: 0,
    star: 0,
    coyote: 0,
    buffer: 0,
    shootCd: 0,
    anim: 0,
    chain: 0,
    plat: null,
    dead: false,
  };
  s.cam = clampCam(s, s.p.x - VIEW_W * 0.4);
  s.phase = 'intro';
  s.phaseT = 1.6;
}

function enemy(kind: EnemyKind, x: number, y: number): Enemy {
  return {
    kind,
    b: body(x, y, 14, 14),
    dir: -1,
    alive: true,
    active: false,
    fade: 0,
    flipped: false,
    shell: 0,
    timer: 0,
    grace: 0,
    homeX: x,
    homeY: y,
    out: 0,
    chain: 0,
  };
}

function plat(kind: Plat['kind'], x: number, y: number, w: number, seed: number): Plat {
  return { kind, x, y, w, ox: x, oy: y, phase: (seed * 0.7) % (Math.PI * 2), dx: 0, dy: 0, state: 0, timer: 0, vy: 0 };
}

export function create(difficulty: DifficultySetting, _random: () => number, startLevel = 0): State {
  const s = {
    ...baseState(),
    difficulty,
    levelIndex: -1,
    lives: DIFFICULTY[difficulty].lives,
    coinCount: 0,
    won: false,
    reached: startLevel,
    stats: { bestChain: 0, fireKills: 0, bosses: 0, coins: 0, flagTop: false, cleared: 0, deaths: 0 },
  } as State;
  loadLevel(s, startLevel);
  return s;
}

/* ---------------------------------------------------------------- helpers */

const levelW = (s: State) => s.lv.cols * T;

function clampCam(s: State, x: number) {
  return Math.max(s.camMin, Math.min(levelW(s) - VIEW_W, x));
}

function sound(s: State, name: SoundName) {
  if (!s.events.includes(name)) s.events.push(name);
}

function pop(s: State, x: number, y: number, text: string) {
  s.pops.push({ x, y, t: 0.9, text });
}

function addScore(s: State, n: number, x?: number, y?: number) {
  s.score += n;
  if (x !== undefined && y !== undefined) pop(s, x, y, String(n));
}

function addCoin(s: State, x: number, y: number) {
  s.coinCount++;
  s.stats.coins++;
  s.score += 200;
  sound(s, 'coin');
  if (s.coinCount >= 100) {
    s.coinCount -= 100;
    s.lives++;
    pop(s, x, y - 10, '1UP');
    sound(s, 'powerup');
  }
}

function chainPoints(s: State, x: number, y: number, step: number) {
  if (step >= CHAIN.length) {
    s.lives++;
    pop(s, x, y, '1UP');
    sound(s, 'powerup');
  } else addScore(s, CHAIN[step], x, y);
}

function setForm(p: Player, form: Form) {
  const h = form ? BIG_H : SMALL_H;
  p.y += p.h - h;
  p.h = h;
  p.form = form;
}

/* ------------------------------------------------------------------ update */

export function update(s: State, dt: number, input: Input, random: () => number) {
  s.pops = s.pops.filter((q) => (q.t -= dt) > 0);
  s.bumps = s.bumps.filter((q) => (q.t -= dt) > 0);
  updateSparks(s.sparks, dt, 500);
  for (let i = s.debris.length - 1; i >= 0; i--) {
    const d = s.debris[i];
    d.vy += 1200 * dt;
    d.x += d.vx * dt;
    d.y += d.vy * dt;
    if ((d.life -= dt) <= 0) s.debris.splice(i, 1);
  }

  switch (s.phase) {
    case 'intro':
      if ((s.phaseT -= dt) <= 0) s.phase = 'play';
      return;
    case 'dying':
      updateDying(s, dt);
      return;
    case 'flag':
      updateFlag(s, dt);
      return;
    case 'tally':
      updateTally(s, dt);
      return;
    case 'boss-down':
      updateWorld(s, dt, random);
      if (s.boss) updateBoss(s, dt, random);
      s.p.vx *= 0.9;
      s.p.vy = Math.min(PHYS.maxFall, s.p.vy + PHYS.gravity * dt);
      moveBody(s.grid, s.p, dt);
      if ((s.phaseT -= dt) <= 0) {
        s.phase = 'tally';
        s.phaseT = 0;
      }
      return;
    case 'done':
      return;
  }

  // Playing.
  s.clock -= dt;
  if (s.clock <= 60 && !s.hurried) {
    s.hurried = true;
    sound(s, 'tick');
  }
  if (s.clock <= 0) {
    s.clock = 0;
    die(s);
    return;
  }
  updateWorld(s, dt, random);
  updatePlayer(s, dt, input);
  if (s.phase !== 'play') return;
  updateEnemies(s, dt);
  updateItems(s, dt);
  updateShots(s, dt);
  if (s.boss) updateBoss(s, dt, random);
  updateBolts(s, dt);
  touchEnemies(s);
  touchHazards(s);
  updateCamera(s, dt);
}

function updateWorld(s: State, dt: number, _random: () => number) {
  for (const pl of s.plats) {
    const px = pl.x;
    const py = pl.y;
    if (pl.kind === 'm') {
      pl.phase += dt * 0.9;
      pl.x = pl.ox + Math.sin(pl.phase) * 3 * T;
    } else if (pl.kind === 'v') {
      pl.phase += dt * 0.8;
      pl.y = pl.oy + Math.sin(pl.phase) * 3 * T;
    } else if (pl.state === 1) {
      if ((pl.timer -= dt) <= 0) pl.state = 2;
    } else if (pl.state === 2) {
      pl.vy = Math.min(400, pl.vy + 900 * dt);
      pl.y += pl.vy * dt;
      if (pl.y > ROWS * T + 20) {
        pl.state = 3;
        pl.timer = 3;
      }
    } else if (pl.state === 3 && (pl.timer -= dt) <= 0) {
      pl.state = 0;
      pl.y = pl.oy;
      pl.vy = 0;
    }
    pl.dx = pl.x - px;
    pl.dy = pl.y - py;
  }
  for (const bar of s.bars) bar.a += bar.speed * dt;
}

/* ------------------------------------------------------------------ player */

function updatePlayer(s: State, dt: number, input: Input) {
  const p = s.p;
  const ice = s.lv.plan.theme === 'snow';
  const dir = (input.held.has('right') ? 1 : 0) - (input.held.has('left') ? 1 : 0);
  const run = input.held.has('action2');
  const jumpHeld = input.held.has('action') || input.held.has('up');
  const jumpPressed = input.pressed.has('action') || input.pressed.has('up');
  const onGround = p.ground || !!p.plat;

  p.invuln = Math.max(0, p.invuln - dt);
  if (p.star > 0) p.star = Math.max(0, p.star - dt);
  p.shootCd = Math.max(0, p.shootCd - dt);

  // Horizontal movement with acceleration, skidding and slippery ice.
  const target = dir * (run ? PHYS.run : PHYS.walk);
  let accel = onGround ? (ice ? 260 : 720) : 460;
  if (dir !== 0 && Math.sign(p.vx) === -dir && onGround && Math.abs(p.vx) > 40) accel = ice ? 420 : 1500;
  if (dir === 0) accel = onGround ? (ice ? 120 : 900) : 160;
  if (p.vx < target) p.vx = Math.min(target, p.vx + accel * dt);
  else if (p.vx > target) p.vx = Math.max(target, p.vx - accel * dt);
  if (dir) p.facing = dir as 1 | -1;
  p.anim += Math.abs(p.vx) * dt * 0.08;

  // Jumping: coyote time and a jump buffer make it forgiving.
  p.coyote = onGround ? PHYS.coyote : p.coyote - dt;
  p.buffer = jumpPressed ? PHYS.buffer : p.buffer - dt;
  if (p.buffer > 0 && p.coyote > 0) {
    p.vy = -(PHYS.jump + 30 * Math.min(1, Math.abs(p.vx) / PHYS.run));
    p.buffer = 0;
    p.coyote = 0;
    p.plat = null;
    p.ground = false;
    sound(s, 'jump');
  }
  const gravity = p.vy < 0 && jumpHeld ? PHYS.gravityHold : PHYS.gravity;
  p.vy = Math.min(PHYS.maxFall, p.vy + gravity * dt);

  // Fire berries.
  if (p.form === 2 && input.pressed.has('action2') && p.shootCd <= 0 && s.shots.length < 2) {
    const b = body(p.facing > 0 ? p.x + p.w : p.x - 8, p.y + 6, 8, 8);
    b.vx = p.facing * 230;
    b.vy = 80;
    s.shots.push({ b, life: 3 });
    p.shootCd = 0.25;
    sound(s, 'shoot');
  }

  // Ride a moving ledge.
  if (p.plat) {
    p.x += p.plat.dx;
    p.y = p.plat.y - p.h;
  }
  const prevBottom = p.y + p.h;
  const res = moveBody(s.grid, p, dt);
  if (res.head) bumpTile(s, res.head[0], res.head[1]);

  // Land on moving and crumbling ledges.
  let onPlat: Plat | null = null;
  for (const pl of s.plats) {
    if (pl.state >= 2) continue;
    if (p.x + p.w <= pl.x || p.x >= pl.x + pl.w) continue;
    const bottom = p.y + p.h;
    if (p.vy >= 0 && prevBottom <= pl.y + 3 + Math.max(0, pl.dy) && bottom >= pl.y - 0.5) {
      p.y = pl.y - p.h;
      p.vy = 0;
      onPlat = pl;
      if (pl.kind === 'f' && pl.state === 0) {
        pl.state = 1;
        pl.timer = 0.45;
      }
    }
  }
  p.plat = onPlat;
  if (p.ground || p.plat) p.chain = 0;

  // Boss arena: the door shuts behind you.
  if (s.arena !== null && !s.arenaLocked && p.x > (s.arena + 3) * T) {
    s.arenaLocked = true;
    s.camMin = Math.min(levelW(s) - VIEW_W, s.arena * T);
    if (s.boss) s.boss.state = 'walk';
    sound(s, 'whoosh');
  }
  if (s.arenaLocked && p.x < s.camMin) {
    p.x = s.camMin;
    p.vx = Math.max(0, p.vx);
  }

  // Coins.
  for (const c of s.coins) {
    if (!c.taken && Math.abs(c.x - (p.x + p.w / 2)) < 10 && c.y > p.y - 6 && c.y < p.y + p.h + 6) {
      c.taken = true;
      addCoin(s, c.x, c.y);
    }
  }

  // Checkpoints.
  for (const ck of s.checks) {
    if (!ck.reached && p.x >= ck.c * T) {
      ck.reached = true;
      s.checkpoint = { c: ck.c, r: ck.r };
      pop(s, ck.c * T + 8, ck.r * T - 8, 'Checkpoint!');
      sound(s, 'success');
    }
  }

  // The goal pole.
  if (s.goal && p.x + p.w >= s.goal.c * T + 6) {
    const g = s.goal;
    const frac = Math.max(0, Math.min(1, (g.bottom - (p.y + p.h)) / (g.bottom - g.top)));
    const k = Math.min(FLAG_POINTS.length - 1, Math.floor(frac * FLAG_POINTS.length));
    if (k === FLAG_POINTS.length - 1) s.stats.flagTop = true;
    addScore(s, FLAG_POINTS[k], g.c * T, p.y);
    p.x = g.c * T + 6 - p.w;
    p.vx = 0;
    p.vy = 0;
    s.flagY = g.top;
    s.phase = 'flag';
    s.phaseT = 0;
    sound(s, 'levelComplete');
    return;
  }

  if (p.y > ROWS * T + 24) die(s);
}

function updateCamera(s: State, dt: number) {
  const target = clampCam(s, s.p.x + s.p.w / 2 - VIEW_W * 0.42);
  s.cam += (target - s.cam) * Math.min(1, dt * 9);
  s.cam = clampCam(s, s.cam);
}

/** Hitting a tile from below: open lucky blocks, break bricks, knock enemies off. */
function bumpTile(s: State, c: number, r: number) {
  const i = r * s.lv.cols + c;
  const v = s.tiles[i];
  const p = s.p;
  const x = c * T;
  const y = r * T;
  if (isQuestion(v)) {
    s.tiles[i] = TILE.used;
    s.bumps.push({ c, r, t: 0.15 });
    if (v === TILE.qcoin) {
      addCoin(s, x + 8, y);
      burst(s.sparks, x + 8, y - 8, '#fde047', 8, 90);
      pop(s, x + 8, y - 10, '200');
    } else {
      const kind: Item['kind'] = v === TILE.qstar ? 'star' : v === TILE.q1up ? 'life' : p.form === 0 ? 'acorn' : 'berry';
      const b = body(x + 2, y, 12, 14);
      s.items.push({ kind, b, dir: 1, rise: 0 });
      sound(s, 'powerup');
    }
  } else if (v === TILE.brick) {
    if (p.form > 0) {
      s.tiles[i] = TILE.empty;
      setCell(s.grid, c, r, EMPTY);
      for (const [vx, vy] of [[-60, -320], [60, -320], [-50, -220], [50, -220]]) s.debris.push({ x: x + 8, y: y + 8, vx, vy, life: 1 });
      addScore(s, 50);
      sound(s, 'hit');
    } else {
      s.bumps.push({ c, r, t: 0.15 });
      sound(s, 'blip');
    }
  } else {
    sound(s, 'blip');
    return;
  }
  // Anything standing on the bumped tile gets knocked over.
  const above = { x, y: y - T, w: T, h: T };
  for (const e of s.enemies) if (e.alive && e.kind !== 'c' && overlaps(above, e.b)) knockOut(s, e, 1);
  for (const c2 of s.coins) {
    if (!c2.taken && c2.x > x && c2.x < x + T && c2.y > y - T && c2.y < y) {
      c2.taken = true;
      addCoin(s, c2.x, c2.y);
    }
  }
  for (const it of s.items) if (it.rise >= 1 && overlaps(above, it.b)) it.b.vy = -260;
}

/* ----------------------------------------------------------------- enemies */

function knockOut(s: State, e: Enemy, dir: number) {
  e.alive = false;
  e.flipped = true;
  e.fade = 1.5;
  e.b.vy = -260;
  e.b.vx = dir * 40;
  addScore(s, 200, e.b.x + 7, e.b.y);
  sound(s, 'hit');
}

function updateEnemies(s: State, dt: number) {
  const speed = DIFFICULTY[s.difficulty].speed;
  const p = s.p;
  for (const e of s.enemies) {
    if (!e.alive) {
      if (e.fade > 0) {
        e.fade -= dt;
        if (e.flipped) {
          e.b.vy += 1200 * dt;
          e.b.x += e.b.vx * dt;
          e.b.y += e.b.vy * dt;
        }
      }
      continue;
    }
    if (!e.active) {
      if (e.b.x < s.cam + VIEW_W + 24) e.active = true;
      else continue;
    }
    const b = e.b;
    switch (e.kind) {
      case 'c': {
        // Snapweed: pops out of its stump, but not while Pip is right beside it.
        e.timer -= dt;
        const near = Math.abs(p.x + p.w / 2 - (b.x + b.w / 2)) < 26;
        if (e.timer <= 0) {
          if (e.out <= 0 && near) e.timer = 0.3;
          else {
            e.shell = e.out > 0.5 ? 0 : 1; // reuse: 1 = rising, 0 = sinking
            e.timer = e.out > 0.5 ? 2 : 1.6;
          }
        }
        const target = e.shell === 1 ? 1 : 0;
        e.out += Math.sign(target - e.out) * dt * 2;
        e.out = Math.max(0, Math.min(1, e.out));
        b.y = e.homeY + (1 - e.out) * 20;
        break;
      }
      case 'b': {
        // Flitter: hangs about, then swoops after Pip.
        e.timer += dt;
        if (!e.shell && Math.abs(p.x - b.x) < 150) e.shell = 1;
        if (e.shell) {
          b.vx += (Math.sign(p.x - b.x) * 62 * speed - b.vx) * dt * 2;
          const ty = p.y - 6 + Math.sin(e.timer * 3) * 24;
          b.vy = Math.max(-70, Math.min(70, (ty - b.y) * 1.4));
        } else {
          b.vx = 0;
          b.vy = Math.cos(e.timer * 2.5) * 20;
        }
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        e.dir = b.vx < 0 ? -1 : 1;
        break;
      }
      default: {
        let vx = 0;
        if (e.kind === 'k' && e.shell === 1) {
          e.timer -= dt;
          if (e.timer <= 0) e.shell = 0;
        } else if (e.kind === 'k' && e.shell === 2) {
          vx = e.dir * 210;
          e.grace = Math.max(0, e.grace - dt);
        } else {
          vx = e.dir * (e.kind === 'g' ? 32 : e.kind === 'k' ? 26 : 28) * speed;
          // Snails and hedgehogs turn round at ledges; bugs walk off them.
          if (e.kind !== 'g' && b.ground && edgeAhead(s.grid, b, e.dir)) {
            e.dir = -e.dir;
            vx = -vx;
          }
        }
        b.vx = vx;
        b.vy = Math.min(PHYS.maxFall, b.vy + PHYS.gravity * dt);
        const res = moveBody(s.grid, b, dt);
        if (res.wall) {
          e.dir = -res.wall;
          if (e.shell === 2 && b.x > s.cam - 16 && b.x < s.cam + VIEW_W + 16) sound(s, 'blip');
        }
        if (b.y > ROWS * T + 20) {
          e.alive = false;
          e.fade = 0;
        }
        break;
      }
    }
  }

  // Walkers turn round when they meet; a spinning shell knocks others over.
  const list = s.enemies.filter((e) => e.alive && e.active && e.kind !== 'b' && e.kind !== 'c');
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i];
      const c = list[j];
      if (!a.alive || !c.alive || !overlaps(a.b, c.b)) continue;
      if (a.shell === 2 || c.shell === 2) {
        const [shell, other] = a.shell === 2 ? [a, c] : [c, a];
        if (other.shell === 2) {
          knockOut(s, a, -1);
          knockOut(s, c, 1);
          continue;
        }
        other.alive = false;
        other.flipped = true;
        other.fade = 1.5;
        other.b.vy = -260;
        chainPoints(s, other.b.x, other.b.y, shell.chain++);
        sound(s, 'hit');
      } else if (a.shell === 0 && c.shell === 0) {
        const left = a.b.x < c.b.x ? a : c;
        const right = left === a ? c : a;
        left.dir = -1;
        right.dir = 1;
      }
    }
  }
  // Flying enemies are also hit by shells.
  for (const sh of list) {
    if (sh.shell !== 2) continue;
    for (const e of s.enemies) {
      if (e !== sh && e.alive && (e.kind === 'b' || (e.kind === 'c' && e.out > 0.3)) && overlaps(sh.b, e.b)) {
        e.alive = false;
        e.flipped = true;
        e.fade = 1.5;
        chainPoints(s, e.b.x, e.b.y, sh.chain++);
      }
    }
  }
}

function touchEnemies(s: State) {
  const p = s.p;
  const prevBottom = p.y + p.h - p.vy / 60;
  for (const e of s.enemies) {
    if (!e.alive || !e.active || !overlaps(p, e.b)) continue;
    if (e.kind === 'c' && e.out < 0.35) continue;
    if (p.star > 0) {
      knockOut(s, e, p.facing);
      continue;
    }
    const fromAbove = p.vy > 0 && prevBottom <= e.b.y + 7;
    if (e.kind === 'k' && e.shell === 1) {
      // Kick a resting shell.
      e.shell = 2;
      e.dir = p.x + p.w / 2 < e.b.x + e.b.w / 2 ? 1 : -1;
      e.grace = 0.25;
      e.chain = 0;
      addScore(s, 400, e.b.x, e.b.y);
      sound(s, 'hit');
      if (fromAbove) p.vy = -240;
      else e.b.x = e.dir > 0 ? p.x + p.w + 1 : p.x - e.b.w - 1;
      continue;
    }
    if (e.kind === 'k' && e.shell === 2 && e.grace > 0) continue;
    if (fromAbove && e.kind !== 'h' && e.kind !== 'c') {
      stomp(s, e);
      continue;
    }
    hurt(s);
    if (s.phase !== 'play') return;
  }
}

function stomp(s: State, e: Enemy) {
  const p = s.p;
  p.vy = -300;
  p.y = e.b.y - p.h;
  chainPoints(s, e.b.x + 7, e.b.y, p.chain);
  p.chain++;
  s.stats.bestChain = Math.max(s.stats.bestChain, p.chain);
  sound(s, 'pop');
  if (e.kind === 'k') {
    e.shell = 1;
    e.timer = 7;
    e.b.vx = 0;
  } else if (e.kind === 'b') {
    e.alive = false;
    e.flipped = true;
    e.fade = 1.5;
    e.b.vy = 0;
  } else {
    e.alive = false;
    e.flipped = false;
    e.fade = 0.45;
  }
}

function hurt(s: State) {
  const p = s.p;
  if (p.invuln > 0 || p.star > 0) return;
  if (p.form > 0) {
    setForm(p, (p.form - 1) as Form);
    p.invuln = 2;
    sound(s, 'hit');
  } else die(s);
}

function die(s: State) {
  if (s.phase !== 'play') return;
  const p = s.p;
  p.dead = true;
  p.vy = -330;
  p.vx = 0;
  s.phase = 'dying';
  s.phaseT = 2.2;
  s.stats.deaths++;
  sound(s, 'failure');
}

function updateDying(s: State, dt: number) {
  const p = s.p;
  if (s.phaseT < 1.9) {
    p.vy += 1100 * dt;
    p.y += p.vy * dt;
  }
  if ((s.phaseT -= dt) > 0) return;
  s.lives--;
  if (s.lives < 0) {
    s.lives = 0;
    s.over = true;
    s.phase = 'done';
    return;
  }
  // Back to the last checkpoint, small again.
  s.p.form = 0;
  loadLevel(s, s.levelIndex, true);
}

function touchHazards(s: State) {
  const p = s.p;
  const c0 = Math.floor(p.x / T);
  const c1 = Math.floor((p.x + p.w - 0.01) / T);
  const r0 = Math.floor(p.y / T);
  const r1 = Math.floor((p.y + p.h - 0.01) / T);
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      if (c < 0 || c >= s.lv.cols || r < 0 || r >= ROWS) continue;
      const v = s.tiles[r * s.lv.cols + c];
      if (v === TILE.lava && p.y + p.h > r * T + 6) {
        die(s);
        return;
      }
      if (v === TILE.spikes && p.y + p.h > r * T + 8) {
        hurt(s);
        if (s.phase === 'play') p.vy = -260;
        return;
      }
    }
  }
  // Fire bars.
  for (const bar of s.bars) {
    for (let k = 1; k <= bar.n; k++) {
      const x = bar.cx + Math.cos(bar.a) * k * 8;
      const y = bar.cy + Math.sin(bar.a) * k * 8;
      const nx = Math.max(p.x, Math.min(x, p.x + p.w));
      const ny = Math.max(p.y, Math.min(y, p.y + p.h));
      if ((x - nx) ** 2 + (y - ny) ** 2 < 16) {
        hurt(s);
        return;
      }
    }
  }
}

/* ------------------------------------------------------------------- items */

function updateItems(s: State, dt: number) {
  const p = s.p;
  for (let i = s.items.length - 1; i >= 0; i--) {
    const it = s.items[i];
    const b = it.b;
    if (it.rise < 1) {
      it.rise = Math.min(1, it.rise + dt * 2);
      b.y -= dt * 2 * T;
      continue;
    }
    if (it.kind !== 'berry') {
      b.vx = it.dir * (it.kind === 'star' ? 75 : it.kind === 'life' ? 65 : 55);
      b.vy = Math.min(PHYS.maxFall, b.vy + (it.kind === 'star' ? 900 : PHYS.gravity) * dt);
      const res = moveBody(s.grid, b, dt);
      if (res.wall) it.dir = -res.wall;
      if (it.kind === 'star' && res.landed) b.vy = -300;
    }
    if (b.y > ROWS * T + 20) {
      s.items.splice(i, 1);
      continue;
    }
    if (overlaps(p, b)) {
      s.items.splice(i, 1);
      collect(s, it);
    }
  }
}

function collect(s: State, it: Item) {
  const p = s.p;
  const x = it.b.x;
  const y = it.b.y;
  if (it.kind === 'acorn') {
    if (p.form === 0) setForm(p, 1);
    addScore(s, 1000, x, y);
    sound(s, 'powerup');
  } else if (it.kind === 'berry') {
    if (p.form === 0) setForm(p, 1);
    p.form = 2;
    addScore(s, 1000, x, y);
    sound(s, 'powerup');
  } else if (it.kind === 'star') {
    p.star = 9;
    addScore(s, 1000, x, y);
    sound(s, 'achievement');
  } else {
    s.lives++;
    pop(s, x, y, '1UP');
    sound(s, 'powerup');
  }
}

function updateShots(s: State, dt: number) {
  for (let i = s.shots.length - 1; i >= 0; i--) {
    const sh = s.shots[i];
    const b = sh.b;
    const dir = Math.sign(b.vx) || 1;
    b.vy = Math.min(320, b.vy + 1200 * dt);
    const res = moveBody(s.grid, b, dt);
    if (res.landed) b.vy = -200;
    let gone = res.wall !== 0 || (sh.life -= dt) <= 0 || b.y > ROWS * T || b.x < s.cam - 20 || b.x > s.cam + VIEW_W + 20;
    if (!gone) b.vx = dir * 230;
    if (!gone) {
      for (const e of s.enemies) {
        if (e.alive && e.active && overlaps(b, e.b) && !(e.kind === 'c' && e.out < 0.35)) {
          knockOut(s, e, dir);
          s.stats.fireKills++;
          gone = true;
          break;
        }
      }
    }
    const boss = s.boss;
    if (!gone && boss && boss.state !== 'down' && boss.state !== 'wait' && overlaps(b, boss.b)) {
      damageBoss(s, 1);
      gone = true;
    }
    if (gone) {
      burst(s.sparks, b.x + 4, b.y + 4, '#fb923c', 5, 60);
      s.shots.splice(i, 1);
    }
  }
}

/* -------------------------------------------------------------------- boss */

function damageBoss(s: State, n: number) {
  const boss = s.boss!;
  if (boss.invuln > 0) return;
  boss.hp -= n;
  boss.invuln = n >= 4 ? 1.2 : 0.15;
  sound(s, 'hit');
  burst(s.sparks, boss.b.x + 18, boss.b.y + 10, '#fde047', 10, 120);
  if (boss.hp <= 0) {
    boss.state = 'down';
    boss.b.vy = -300;
    s.bolts = [];
    s.stats.bosses++;
    addScore(s, 5000, boss.b.x + 18, boss.b.y);
    sound(s, 'explosion');
    s.phase = 'boss-down';
    s.phaseT = 2.6;
  } else if (n >= 4) {
    boss.state = 'hurt';
    boss.timer = 1.1;
    boss.dir = s.p.x < boss.b.x ? 1 : -1;
  }
}

function updateBoss(s: State, dt: number, random: () => number) {
  const boss = s.boss!;
  const b = boss.b;
  const p = s.p;
  boss.invuln = Math.max(0, boss.invuln - dt);
  if (boss.state === 'down') {
    b.vy += 900 * dt;
    b.y += b.vy * dt;
    return;
  }
  if (boss.state === 'wait') return;
  const fast = 1 + boss.world * 0.12;
  const speed = DIFFICULTY[s.difficulty].speed;
  boss.timer -= dt;
  switch (boss.state) {
    case 'walk':
      boss.dir = p.x + p.w / 2 < b.x + b.w / 2 ? -1 : 1;
      b.vx = boss.dir * 45 * fast * speed;
      if (boss.timer <= 0) {
        if (random() < 0.45) {
          boss.state = 'jump';
          b.vy = -430;
          b.vx = boss.dir * 90 * fast;
          sound(s, 'whoosh');
        } else {
          boss.state = 'throw';
          boss.throws = 1 + Math.min(2, Math.floor(boss.world / 2)) + (boss.world === 4 ? 1 : 0);
          boss.timer = 0.3;
          b.vx = 0;
        }
      }
      break;
    case 'jump':
      if (b.ground && b.vy >= 0) {
        boss.state = 'walk';
        boss.timer = 1.2 + random();
        b.vx = 0;
        sound(s, 'explosion');
      }
      break;
    case 'throw':
      b.vx = 0;
      if (boss.timer <= 0) {
        if (boss.throws > 0) {
          boss.throws--;
          boss.timer = 0.45;
          const dx = p.x - b.x;
          s.bolts.push({
            x: b.x + b.w / 2 + boss.dir * 14,
            y: b.y + 10,
            vx: Math.max(-170, Math.min(170, dx * 0.9)) * (0.85 + random() * 0.3),
            vy: -260 - random() * 80,
            bounced: false,
            life: 4,
          });
          sound(s, 'shoot');
        } else {
          boss.state = 'walk';
          boss.timer = 1.4 + random();
        }
      }
      break;
    case 'hurt':
      b.vx = boss.dir * 120 * fast;
      if (boss.timer <= 0) {
        boss.state = 'walk';
        boss.timer = 0.8;
      }
      break;
  }
  b.vy = Math.min(PHYS.maxFall, b.vy + 1300 * dt);
  const res = moveBody(s.grid, b, dt);
  if (res.wall && boss.state === 'hurt') boss.dir = -res.wall;
  if (b.x < s.camMin) b.x = s.camMin;

  if (s.phase !== 'play' || (boss.state as Boss['state']) === 'down') return;
  if (overlaps(p, b)) {
    const prevBottom = p.y + p.h - p.vy / 60;
    if (p.vy > 0 && prevBottom <= b.y + 12) {
      p.vy = -420;
      p.y = b.y - p.h;
      if (boss.invuln <= 0) damageBoss(s, 4);
    } else if (p.star > 0) damageBoss(s, 4);
    else if (boss.invuln < 0.2 || boss.state !== 'hurt') hurt(s);
  }
}

function updateBolts(s: State, dt: number) {
  const p = s.p;
  for (let i = s.bolts.length - 1; i >= 0; i--) {
    const f = s.bolts[i];
    f.vy += 620 * dt;
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    const floor = 14 * T - 5;
    if (f.y > floor && !f.bounced) {
      f.y = floor;
      f.vy = -220;
      f.bounced = true;
    }
    if ((f.life -= dt) <= 0 || f.y > ROWS * T) {
      s.bolts.splice(i, 1);
      continue;
    }
    const nx = Math.max(p.x, Math.min(f.x, p.x + p.w));
    const ny = Math.max(p.y, Math.min(f.y, p.y + p.h));
    if ((f.x - nx) ** 2 + (f.y - ny) ** 2 < 30) {
      s.bolts.splice(i, 1);
      hurt(s);
      if (s.phase !== 'play') return;
    }
  }
}

/* ----------------------------------------------------------- end of level */

function updateFlag(s: State, dt: number) {
  const p = s.p;
  const g = s.goal!;
  s.phaseT += dt;
  // Slide down the pole, then walk home.
  if (s.flagY < g.bottom - 16) s.flagY = Math.min(g.bottom - 16, s.flagY + 150 * dt);
  if (p.y + p.h < g.bottom) {
    p.y = Math.min(g.bottom - p.h, p.y + 140 * dt);
    return;
  }
  if (s.phaseT < 0.9) return;
  p.facing = 1;
  p.vx = 70;
  p.vy = Math.min(PHYS.maxFall, p.vy + PHYS.gravity * dt);
  moveBody(s.grid, p, dt);
  p.anim += 70 * dt * 0.08;
  s.cam += (clampCam(s, p.x - VIEW_W * 0.42) - s.cam) * Math.min(1, dt * 6);
  if (p.x > (g.c + 7) * T) {
    s.phase = 'tally';
    s.phaseT = 0;
  }
}

function updateTally(s: State, dt: number) {
  s.phaseT += dt;
  if (s.clock > 0) {
    const n = Math.min(s.clock, dt * 120);
    s.clock -= n;
    s.score += Math.round(n * 50);
    if (Math.floor(s.phaseT * 12) !== Math.floor((s.phaseT - dt) * 12)) sound(s, 'tick');
    if (s.clock <= 0) {
      s.clock = 0;
      s.phaseT = 0;
    }
    return;
  }
  if (s.phaseT < 0.9) return;
  s.stats.cleared++;
  const next = s.levelIndex + 1;
  if (next >= LEVEL_COUNT) {
    s.won = true;
    s.over = true;
    s.phase = 'done';
    return;
  }
  loadLevel(s, next);
}

export const SMALL = SMALL_H;
export const BIG = BIG_H;
