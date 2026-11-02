import type { DifficultySetting } from '@/types';
import { baseState } from '../_shared/arcade/kit';
import type { BaseState, Input } from '../_shared/arcade/kit';
import { COLS, LEVELS, PESTS, PLANTS, ROWS, plantsFor } from './data';
import type { LevelDef, PestId, PlantId } from './data';

/**
 * Garden Guard rules. Pests walk in from the right along five rows; plants
 * on the 9 × 5 lawn shoot, block, burst or make sunlight, which pays for
 * more plants. Each row has a garden roller that clears it once if a pest
 * gets through; a pest past a used roller reaches the house and the level is
 * lost. Survive every wave to win.
 */
export const W = 480;
export const H = 300;
export const LAWN_X = 40;
export const LAWN_Y = 50;
export const CELL_W = 48;
export const CELL_H = 50;

const SEED_SPEED = 230;
const SEED_DMG = 24;
const FIRE_EVERY = 1.4;
const SUN_VALUE = 25;
const SUNBLOOM_EVERY = 15;
const MINE_ARM = 12;
const POP_FUSE = 1;
const ROLLER_SPEED = 260;
const FIRST_WAVE = 22;
const WAVE_GAP = 24;
/** Where a garden roller waits until it is needed. */
export const PARKED = LAWN_X - 22;

export interface Plant {
  id: PlantId;
  row: number;
  col: number;
  hp: number;
  /** Seconds until it next acts (fires, makes sun, arms, bursts). */
  t: number;
  armed: boolean;
  /** Seconds of the "just hit" wobble. */
  hurt: number;
}

export interface Pest {
  id: PestId;
  row: number;
  x: number;
  hp: number;
  maxHp: number;
  slowT: number;
  eating: boolean;
  hurt: number;
  /** Hoppers vault over the first plant they meet. */
  vaulted: boolean;
  jumpT: number;
  anim: number;
}

export interface Seed {
  row: number;
  x: number;
  frost: boolean;
}

export interface Sun {
  x: number;
  y: number;
  /** Where a falling sun lands. */
  landY: number;
  t: number;
  /** Flying to the counter after being collected. */
  taken: boolean;
}

export interface Blast {
  x: number;
  y: number;
  t: number;
  big: boolean;
}

export type Phase = 'play' | 'won' | 'lost';

export interface State extends BaseState {
  difficulty: DifficultySetting;
  level: number;
  def: LevelDef;
  bank: PlantId[];
  sun: number;
  plants: Plant[];
  pests: Pest[];
  seeds: Seed[];
  suns: Sun[];
  blasts: Blast[];
  rollers: (number | null)[];
  /** Card cooldowns left, by plant. */
  cool: Partial<Record<PlantId, number>>;
  selected: PlantId | 'shovel' | null;
  cursor: { row: number; col: number };
  /** Lawn cell under the mouse, for the planting preview. */
  hover: { row: number; col: number } | null;
  wave: number;
  waveT: number;
  /** Pests queued for the current wave with their spawn delays. */
  queue: { id: PestId; row: number; at: number }[];
  waveHp: number;
  skyT: number;
  phase: Phase;
  phaseT: number;
  banner: { text: string; t: number } | null;
  rand: () => number;
  hpScale: number;
  autoSun: number;
  stats: { sun: number; rollers: number; popBest: number; planted: number; killed: number };
}

function seeded(seed: number) {
  let v = seed >>> 0 || 1;
  return () => ((v = (v * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export function create(difficulty: DifficultySetting, level: number, seed = Math.floor(Math.random() * 2 ** 31)): State {
  const def = LEVELS[Math.max(0, Math.min(LEVELS.length - 1, level))];
  return {
    ...baseState(),
    difficulty,
    level: def.index,
    def,
    bank: plantsFor(def.index),
    sun: def.startSun + (difficulty === 'easy' ? 100 : 0),
    plants: [],
    pests: [],
    seeds: [],
    suns: [],
    blasts: [],
    rollers: Array.from({ length: ROWS }, () => PARKED),
    cool: {},
    selected: null,
    cursor: { row: 2, col: 0 },
    hover: null,
    wave: 0,
    waveT: FIRST_WAVE,
    queue: [],
    waveHp: 0,
    skyT: 5,
    phase: 'play',
    phaseT: 0,
    banner: { text: def.name, t: 0 },
    rand: seeded(seed),
    hpScale: difficulty === 'easy' ? 0.8 : difficulty === 'hard' ? 1.25 : 1,
    autoSun: difficulty === 'easy' ? 3 : Infinity,
    stats: { sun: 0, rollers: 0, popBest: 0, planted: 0, killed: 0 },
  };
}

export const cellX = (col: number) => LAWN_X + col * CELL_W + CELL_W / 2;
export const cellY = (row: number) => LAWN_Y + row * CELL_H + CELL_H / 2;
export const plantAt = (s: State, row: number, col: number) => s.plants.find((p) => p.row === row && p.col === col);

/* ----------------------------------------------------------------- actions */
export function canPlant(s: State, id: PlantId, row: number, col: number): boolean {
  return (
    s.phase === 'play' &&
    row >= 0 &&
    row < ROWS &&
    col >= 0 &&
    col < COLS &&
    !plantAt(s, row, col) &&
    s.sun >= PLANTS[id].cost &&
    (s.cool[id] ?? 0) <= 0
  );
}

export function plant(s: State, id: PlantId, row: number, col: number): boolean {
  if (!canPlant(s, id, row, col)) return false;
  const def = PLANTS[id];
  s.sun -= def.cost;
  s.cool[id] = def.recharge;
  s.plants.push({
    id,
    row,
    col,
    hp: def.hp,
    t: id === 'sunbloom' ? 7 : id === 'mine' ? MINE_ARM : id === 'popberry' ? POP_FUSE : 0.6,
    armed: false,
    hurt: 0,
  });
  s.stats.planted++;
  s.events.push('pop');
  return true;
}

export function dig(s: State, row: number, col: number): boolean {
  const p = plantAt(s, row, col);
  if (!p) return false;
  s.plants = s.plants.filter((o) => o !== p);
  s.events.push('click');
  return true;
}

export function collectSun(s: State, x: number, y: number): boolean {
  const sun = s.suns.find((o) => !o.taken && Math.hypot(o.x - x, o.y - y) < 20);
  if (!sun) return false;
  takeSun(s, sun);
  return true;
}

function takeSun(s: State, sun: Sun) {
  sun.taken = true;
  sun.t = 0;
  s.sun += SUN_VALUE;
  s.stats.sun += SUN_VALUE;
  s.events.push('coin');
}

export function collectAll(s: State) {
  for (const sun of s.suns) if (!sun.taken) takeSun(s, sun);
}

/* ------------------------------------------------------------------- waves */
function buildWave(s: State, n: number): { id: PestId; row: number; at: number }[] {
  const def = s.def;
  const last = n === def.waves - 1;
  const flag = last || n === Math.floor(def.waves / 2);
  const f = def.waves > 1 ? n / (def.waves - 1) : 1;
  let budget = def.budget[0] + (def.budget[1] - def.budget[0]) * f;
  if (flag) budget *= 1.6;
  const total = def.pool.reduce((a, [, w]) => a + w, 0);
  const out: { id: PestId; row: number; at: number }[] = [];
  let guard = 0;
  while (budget > 0.5 && guard++ < 200) {
    let r = s.rand() * total;
    let id: PestId = 'snail';
    for (const [p, w] of def.pool) {
      r -= w;
      if (r <= 0) {
        id = p;
        break;
      }
    }
    if (PESTS[id].cost > budget + 0.5) id = 'snail';
    budget -= PESTS[id].cost;
    out.push({ id, row: Math.floor(s.rand() * ROWS), at: flag ? s.rand() * 6 : s.rand() * 12 });
  }
  // The first pest of a level always comes alone and slowly.
  if (n === 0) out.forEach((p, i) => (p.at = i * 6));
  return out;
}

function spawn(s: State, id: PestId, row: number) {
  const d = PESTS[id];
  const hp = Math.round(d.hp * s.hpScale);
  s.pests.push({ id, row, x: W + 14 + s.rand() * 10, hp, maxHp: hp, slowT: 0, eating: false, hurt: 0, vaulted: id !== 'hopper', jumpT: 0, anim: s.rand() * 10 });
}

function nextWave(s: State) {
  const n = s.wave;
  s.queue.push(...buildWave(s, n));
  s.waveHp = s.queue.reduce((a, q) => a + PESTS[q.id].hp * s.hpScale, 0) + s.pests.reduce((a, p) => a + p.hp, 0);
  s.wave++;
  s.waveT = WAVE_GAP;
  const last = s.wave === s.def.waves;
  if (last) s.banner = { text: 'Final wave!', t: 0 };
  else if (s.wave - 1 === Math.floor(s.def.waves / 2)) s.banner = { text: 'A big wave is coming!', t: 0 };
  s.events.push(last ? 'gameOver' : 'blip');
}

/* ------------------------------------------------------------------ update */
function hitPest(p: Pest, dmg: number) {
  p.hp -= dmg;
  p.hurt = 0.12;
}

function burst(s: State, x: number, y: number, rows: number[], x0: number, x1: number, dmg: number, big: boolean): number {
  let n = 0;
  for (const p of s.pests) {
    if (rows.includes(p.row) && p.x > x0 && p.x < x1 && p.hp > 0) {
      hitPest(p, dmg);
      if (p.hp <= 0) n++;
    }
  }
  s.blasts.push({ x, y, t: 0, big });
  s.events.push('explosion');
  return n;
}

export function step(s: State, dt: number) {
  s.phaseT += dt;
  if (s.banner) {
    s.banner.t += dt;
    if (s.banner.t > 2.4) s.banner = null;
  }
  for (const b of s.blasts) b.t += dt;
  s.blasts = s.blasts.filter((b) => b.t < 0.6);
  if (s.phase !== 'play') return;
  for (const id of Object.keys(s.cool) as PlantId[]) s.cool[id] = Math.max(0, (s.cool[id] ?? 0) - dt);

  // Sunlight: from the sky (by day) and from Sunblooms.
  {
    s.skyT -= dt;
    if (s.skyT <= 0) {
      s.skyT = s.def.skySun + s.rand() * 2;
      const x = LAWN_X + 20 + s.rand() * (CELL_W * COLS - 40);
      s.suns.push({ x, y: -12, landY: LAWN_Y + 30 + s.rand() * (CELL_H * ROWS - 60), t: 0, taken: false });
    }
  }
  for (const sun of s.suns) {
    sun.t += dt;
    if (sun.taken) continue;
    if (sun.y < sun.landY) sun.y = Math.min(sun.landY, sun.y + 40 * dt);
    if (sun.t > s.autoSun && sun.y >= sun.landY) takeSun(s, sun);
  }
  s.suns = s.suns.filter((o) => (o.taken ? o.t < 0.5 : o.t < 12));

  // Waves: on a timer, or early once most of the last wave is gone.
  if (s.wave < s.def.waves) {
    s.waveT -= dt;
    const alive = s.pests.reduce((a, p) => a + Math.max(0, p.hp), 0) + s.queue.reduce((a, q) => a + PESTS[q.id].hp, 0);
    if (s.waveT <= 0 || (s.wave > 0 && s.waveT < WAVE_GAP - 6 && alive < s.waveHp * 0.25)) nextWave(s);
  }
  for (const q of s.queue) q.at -= dt;
  for (const q of s.queue.filter((o) => o.at <= 0)) spawn(s, q.id, q.row);
  s.queue = s.queue.filter((q) => q.at > 0);

  // Plants act.
  for (const p of s.plants) {
    p.t -= dt;
    p.hurt = Math.max(0, p.hurt - dt);
    const x = cellX(p.col);
    const y = cellY(p.row);
    if (p.id === 'sunbloom' && p.t <= 0) {
      p.t = SUNBLOOM_EVERY;
      s.suns.push({ x: x + 6, y: y - 10, landY: y + 4, t: 0, taken: false });
    } else if ((p.id === 'spitter' || p.id === 'frost' || p.id === 'twin') && p.t <= 0) {
      const target = s.pests.some((e) => e.row === p.row && e.x > x - 4 && e.x < W + 4 && e.hp > 0);
      if (target) {
        p.t = FIRE_EVERY;
        s.seeds.push({ row: p.row, x: x + 14, frost: p.id === 'frost' });
        if (p.id === 'twin') s.seeds.push({ row: p.row, x: x - 2, frost: false });
        s.events.push('shoot');
      } else p.t = 0.2;
    } else if (p.id === 'mine') {
      if (!p.armed && p.t <= 0) p.armed = true;
      // Goes off as soon as a pest's front steps into its square (the same point a pest starts eating).
      if (p.armed && s.pests.some((e) => e.row === p.row && e.x - 10 < x + CELL_W / 2 && e.x > x - CELL_W / 2 && e.hp > 0)) {
        const n = burst(s, x, y, [p.row], x - 30, x + 34, 1800, false);
        s.stats.popBest = Math.max(s.stats.popBest, n);
        p.hp = 0;
      }
    } else if (p.id === 'popberry' && p.t <= 0) {
      const n = burst(s, x, y, [p.row - 1, p.row, p.row + 1], x - CELL_W * 1.6, x + CELL_W * 1.6, 1800, true);
      s.stats.popBest = Math.max(s.stats.popBest, n);
      p.hp = 0;
    }
  }

  // Seeds fly and hit the first pest in their row.
  for (const sd of s.seeds) {
    sd.x += SEED_SPEED * dt;
    let hit: Pest | null = null;
    for (const e of s.pests) if (e.row === sd.row && e.hp > 0 && Math.abs(e.x - sd.x) < 12 && (!hit || e.x < hit.x)) hit = e;
    if (hit) {
      hitPest(hit, SEED_DMG);
      if (sd.frost) hit.slowT = 4;
      sd.x = Infinity;
      s.events.push('hit');
    }
  }
  s.seeds = s.seeds.filter((sd) => sd.x < W + 10);

  // Pests walk, eat, or hop.
  for (const e of s.pests) {
    if (e.hp <= 0) continue;
    e.hurt = Math.max(0, e.hurt - dt);
    e.slowT = Math.max(0, e.slowT - dt);
    const def = PESTS[e.id];
    // Hoppers run in fast, but only walk once they have vaulted.
    const base = e.id === 'hopper' && e.vaulted ? PESTS.snail.speed : def.speed;
    const speed = base * (e.slowT > 0 ? 0.5 : 1);
    e.anim += dt * (e.slowT > 0 ? 0.5 : 1);
    if (e.jumpT > 0) {
      e.jumpT -= dt;
      e.x -= (CELL_W * 1.1 * dt) / 0.6;
      continue;
    }
    const col = Math.floor((e.x - 10 - LAWN_X) / CELL_W);
    const food = col >= 0 && col < COLS ? plantAt(s, e.row, col) : undefined;
    const mineUnder = food && food.id === 'mine' && !food.armed;
    if (food && !mineUnder && food.hp > 0) {
      if (!e.vaulted) {
        e.vaulted = true;
        e.jumpT = 0.6;
        s.events.push('jump');
        continue;
      }
      e.eating = true;
      food.hp -= def.bite * dt * (e.slowT > 0 ? 0.5 : 1);
      food.hurt = 0.1;
      if (Math.floor(e.anim * 3) !== Math.floor((e.anim - dt) * 3)) s.events.push('blip');
    } else {
      e.eating = false;
      e.x -= speed * dt;
    }
    // Into the rollers, then the house.
    const r = s.rollers[e.row];
    if (r === PARKED && e.x < LAWN_X + 6) {
      s.rollers[e.row] = PARKED + 1;
      s.stats.rollers++;
      s.events.push('whoosh');
    }
    if (e.x < 8 && s.rollers[e.row] === null) {
      s.phase = 'lost';
      s.phaseT = 0;
      s.events.push('failure');
    }
  }
  // Rollers on the move flatten everything in their row.
  for (let r = 0; r < ROWS; r++) {
    const x = s.rollers[r];
    if (x === null || x === PARKED) continue;
    const nx = x + ROLLER_SPEED * dt;
    for (const e of s.pests) if (e.row === r && e.x < nx + 16 && e.hp > 0) e.hp = 0;
    s.rollers[r] = nx > W + 30 ? null : nx;
  }
  for (const e of s.pests) if (e.hp <= 0) {
    s.stats.killed++;
    s.score += PESTS[e.id].cost * 10;
  }
  s.pests = s.pests.filter((e) => e.hp > 0);
  s.plants = s.plants.filter((p) => p.hp > 0);

  if (s.phase === 'play' && s.wave >= s.def.waves && !s.queue.length && !s.pests.length) {
    s.phase = 'won';
    s.phaseT = 0;
    s.score += 500 + s.rollers.filter((r) => r !== null).length * 200 + Math.floor(s.sun / 25) * 10;
    s.events.push('levelComplete');
  }
}

/** A pest has walked past every roller in its row. */
export const isLost = (s: State) => s.phase === 'lost';
export const rowsUsed = (s: State) => s.rollers.filter((r) => r === null).length;

/* ------------------------------------------------------------------- input */
export const BANK_Y = 4;
export const CARD_W = 44;
export const CARD_H = 40;
export const cardX = (i: number) => 70 + i * (CARD_W + 4);

/** What sits at a point of the seed bank: a card index, the shovel, or nothing. */
export function bankAt(s: State, x: number, y: number): PlantId | 'shovel' | null {
  if (y < BANK_Y || y > BANK_Y + CARD_H) return null;
  for (let i = 0; i <= s.bank.length; i++) {
    const cx = cardX(i);
    if (x >= cx && x <= cx + CARD_W) return i < s.bank.length ? s.bank[i] : 'shovel';
  }
  return null;
}

export function cellAt(x: number, y: number): { row: number; col: number } | null {
  const col = Math.floor((x - LAWN_X) / CELL_W);
  const row = Math.floor((y - LAWN_Y) / CELL_H);
  return row >= 0 && row < ROWS && col >= 0 && col < COLS ? { row, col } : null;
}

function select(s: State, what: PlantId | 'shovel') {
  s.selected = s.selected === what ? null : what;
  s.events.push('click');
}

/** Plants (or digs up) the selection at a cell. */
export function actOnCell(s: State, row: number, col: number) {
  const sel = s.selected;
  if (!sel) return;
  if (sel === 'shovel') {
    if (dig(s, row, col)) s.selected = null;
  } else if (plant(s, sel, row, col)) s.selected = null;
  else s.events.push('blip');
}

export function update(s: State, dt: number, input: Input) {
  const p = input.pointer;
  s.hover = p.active ? cellAt(p.x, p.y) : null;
  if (p.pressed && s.phase === 'play') {
    const card = bankAt(s, p.x, p.y);
    if (card) select(s, card);
    else if (!collectSun(s, p.x, p.y)) {
      const cell = cellAt(p.x, p.y);
      if (cell) {
        s.cursor = cell;
        actOnCell(s, cell.row, cell.col);
      }
    }
  }
  const c = s.cursor;
  if (input.pressed.has('left')) c.col = Math.max(0, c.col - 1);
  if (input.pressed.has('right')) c.col = Math.min(COLS - 1, c.col + 1);
  if (input.pressed.has('up')) c.row = Math.max(0, c.row - 1);
  if (input.pressed.has('down')) c.row = Math.min(ROWS - 1, c.row + 1);
  if (input.pressed.has('action')) actOnCell(s, c.row, c.col);
  for (const k of input.keys) {
    const n = Number(k);
    if (n >= 1 && n <= s.bank.length) select(s, s.bank[n - 1]);
    else if (k === 'q' || n === s.bank.length + 1) select(s, 'shovel');
    else if (k === 'c') collectAll(s);
  }
  step(s, Math.min(dt, 0.05));
}
