import type { DifficultySetting } from '@/types';
import { baseState } from '../_shared/arcade/kit';
import type { Input } from '../_shared/arcade/kit';
import { burst, updateSparks } from '../_shared/arcade/draw';
import { boxesOverlap, tilesUnder } from '../_shared/platformer/physics';
import type { TileQuery } from '../_shared/platformer/physics';
import { BOSS_INFO, STOMP_DAMAGE, bossHarmful, bossVulnerable, damageBoss, makeBoss, updateBoss } from './bosses';
import {
  isGone,
  lavaSpriteAt,
  spawnEnemy,
  spawnItem,
  stompable,
  updateEnemy,
  updateItem,
  updateShot,
  wheelBalls,
  WHEEL_BALL,
} from './enemies';
import { LEVEL_COUNT, LEVELS_PER_WORLD, ROWS, TILE, WORLD_NAMES, buildLevel, moverAt } from './levels';
import type { LevelData } from './levels';
import { PHYS, glyphAt, gridMap, hazardUnder, newPlayer, setBig, stepPlayer, worldFor } from './player';
import type { PadInput } from './player';
import type { Enemy, ItemKind, State } from './types';

export const VIEW_W = 24 * TILE;
export const VIEW_H = ROWS * TILE;

export const DIFF: Record<DifficultySetting, { lives: number; speed: number; time: number; bossExtra: number; invuln: number }> = {
  easy: { lives: 5, speed: 0.85, time: 400, bossExtra: 0, invuln: 2 },
  normal: { lives: 3, speed: 1, time: 300, bossExtra: 0, invuln: 1.6 },
  hard: { lives: 3, speed: 1.2, time: 240, bossExtra: 1, invuln: 1.4 },
};

const STOMP_SCORES = [100, 200, 400, 800, 1000, 2000, 4000, 8000];

export interface Hooks {
  /** Called the moment a level is finished (goal pole or boss key). */
  onLevelClear?: (index: number, s: State) => void;
}

const cache = new Map<number, LevelData>();
export function getLevel(index: number): LevelData {
  let l = cache.get(index);
  if (!l) {
    l = buildLevel(index);
    cache.set(index, l);
  }
  return l;
}

export function create(difficulty: DifficultySetting, startLevel = 0): State {
  const level = getLevel(startLevel);
  const s: State = {
    ...baseState(),
    difficulty,
    levelIndex: startLevel,
    startLevel,
    level,
    grid: level.grid.slice(),
    phase: 'intro',
    phaseTime: 0,
    player: newPlayer(level.start.x, level.start.y),
    power: 'none',
    invuln: 0,
    star: 0,
    lives: DIFF[difficulty].lives,
    gems: 0,
    timeLeft: DIFF[difficulty].time,
    levelTime: 0,
    respawn: null,
    enemies: [],
    items: [],
    sparks: [],
    hostile: [],
    popups: [],
    bumps: [],
    debris: [],
    particles: [],
    camera: 0,
    arenaLocked: false,
    boss: null,
    orb: null,
    stompChain: 0,
    gemBricks: {},
    cannons: {},
    shake: 0,
    won: false,
    poleBonus: 0,
    banner: null,
    stats: { stomps: 0, bestChain: 0, shellChain: 0, levelsCleared: 0, bosses: 0, hitsThisLevel: 0, flawless: 0, gemsCollected: 0 },
    prevBottom: 0,
  };
  loadLevel(s, startLevel, true);
  return s;
}

/** Starts (or restarts after losing a life) a level. */
export function loadLevel(s: State, index: number, fresh: boolean) {
  const level = getLevel(index);
  s.levelIndex = index;
  s.level = level;
  s.grid = level.grid.slice();
  if (fresh) {
    s.respawn = null;
    s.stats.hitsThisLevel = 0;
  }
  const at = s.respawn ?? level.start;
  const keepBig = fresh && s.player.big;
  s.player = newPlayer(at.x, at.y, keepBig);
  if (!fresh) s.power = 'none';
  // Checkpoints already passed stay raised.
  if (s.respawn) {
    for (let i = 0; i < s.grid.length; i++) {
      if (s.grid[i] === 'K' && (i % level.cols) * TILE <= s.respawn.x) s.grid[i] = 'k';
    }
  }
  const map = gridMap(s.grid, level.cols);
  s.enemies = level.spawns.filter((sp) => sp.x > at.x + 3 * TILE || sp.x < at.x - 3 * TILE).map((sp) => spawnEnemy(sp, map));
  s.items = [];
  s.sparks = [];
  s.hostile = [];
  s.popups = [];
  s.bumps = [];
  s.debris = [];
  s.particles = [];
  s.timeLeft = DIFF[s.difficulty].time;
  s.levelTime = 0;
  s.camera = clampCamera(s, at.x - VIEW_W * 0.35);
  s.arenaLocked = false;
  s.boss = level.boss ? makeBoss(level.boss.kind, level.boss.x, level.boss.y, DIFF[s.difficulty].bossExtra) : null;
  s.orb = null;
  s.stompChain = 0;
  s.gemBricks = {};
  s.cannons = {};
  s.invuln = 0;
  s.star = 0;
  s.shake = 0;
  s.phase = 'intro';
  s.phaseTime = 0;
  s.banner = null;
}

function clampCamera(s: State, x: number): number {
  return Math.max(0, Math.min(s.level.cols * TILE - VIEW_W, x));
}

function popup(s: State, x: number, y: number, text: string, color = '#fff') {
  s.popups.push({ x, y, text, life: 0.9, color });
}

function addScore(s: State, points: number, x: number, y: number) {
  s.score += points;
  popup(s, x, y, String(points));
}

function addGem(s: State, x: number, y: number) {
  s.gems++;
  s.stats.gemsCollected++;
  s.score += 50;
  s.events.push('coin');
  burst(s.particles, x, y, '#67e8f9', 5, 70);
  if (s.gems >= 100) {
    s.gems -= 100;
    gainLife(s, x, y);
  }
}

function gainLife(s: State, x: number, y: number) {
  s.lives++;
  popup(s, x, y, '1UP', '#4ade80');
  s.events.push('success');
}

function wallCol(s: State): number {
  return s.arenaLocked && s.level.arenaX !== null ? s.level.arenaX / TILE - 1 : -1;
}

/* ------------------------------------------------------------- update */

export function update(s: State, dt: number, input: Input, random: () => number, hooks: Hooks = {}) {
  s.phaseTime += dt;
  updateEffects(s, dt);
  if (s.banner) {
    s.banner.time -= dt;
    if (s.banner.time <= 0) s.banner = null;
  }
  const jumpPressed = input.pressed.has('action') || input.pressed.has('up');
  switch (s.phase) {
    case 'intro':
      if (s.phaseTime > 1.6 || (s.phaseTime > 0.35 && jumpPressed)) {
        s.phase = 'play';
        s.phaseTime = 0;
      }
      return;
    case 'play':
      play(s, dt, input, random, hooks);
      return;
    case 'dying':
      dying(s, dt);
      return;
    case 'goal':
      goal(s, dt);
      return;
    case 'tally':
      tally(s, dt);
      return;
  }
}

function updateEffects(s: State, dt: number) {
  updateSparks(s.particles, dt, 300);
  for (let i = s.popups.length - 1; i >= 0; i--) {
    const pp = s.popups[i];
    pp.life -= dt;
    pp.y -= 30 * dt;
    if (pp.life <= 0) s.popups.splice(i, 1);
  }
  for (let i = s.bumps.length - 1; i >= 0; i--) {
    s.bumps[i].t -= dt;
    if (s.bumps[i].t <= 0) s.bumps.splice(i, 1);
  }
  for (let i = s.debris.length - 1; i >= 0; i--) {
    const d = s.debris[i];
    d.life -= dt;
    d.vy += 1100 * dt;
    d.x += d.vx * dt;
    d.y += d.vy * dt;
    d.spin += dt * 12;
    if (d.life <= 0) s.debris.splice(i, 1);
  }
  s.shake = Math.max(0, s.shake - dt);
}

function padFrom(input: Input): PadInput {
  return {
    left: input.held.has('left'),
    right: input.held.has('right'),
    jump: input.held.has('action') || input.held.has('up'),
    jumpPressed: input.pressed.has('action') || input.pressed.has('up'),
    downPressed: input.pressed.has('down'),
  };
}

function play(s: State, dt: number, input: Input, random: () => number, hooks: Hooks) {
  const level = s.level;
  const p = s.player;
  const d = DIFF[s.difficulty];

  const t0 = s.levelTime;
  s.levelTime += dt;
  s.timeLeft -= dt;
  if (s.timeLeft <= 0) {
    s.timeLeft = 0;
    die(s);
    return;
  }
  s.invuln = Math.max(0, s.invuln - dt);
  if (s.star > 0) {
    s.star = Math.max(0, s.star - dt);
    if (random() < 0.5) burst(s.particles, p.x + random() * p.w, p.y + random() * p.h, `hsl(${(s.levelTime * 400) % 360} 90% 65%)`, 1, 30);
  }

  // Boss arena: once Pip is inside, the way back closes and the camera stops.
  if (level.arenaX !== null && !s.arenaLocked && p.x > level.arenaX + 2 * TILE) {
    s.arenaLocked = true;
    s.events.push('whoosh');
    if (s.boss) s.banner = { text: BOSS_INFO[s.boss.kind].name, sub: 'Stomp it!', time: 2 };
  }

  const ledges = level.movers.map((m) => ({ ...moverAt(m, s.levelTime), w: m.w }));
  const moves = level.movers.map((m) => {
    const a = moverAt(m, t0);
    const b = moverAt(m, s.levelTime);
    return { dx: b.x - a.x, dy: b.y - a.y };
  });
  const world = worldFor(level, s.grid, ledges, moves, wallCol(s));
  const map = world.map;

  const pad = padFrom(input);
  const prevBottom = p.y + p.h;
  s.prevBottom = prevBottom;
  const { res, events } = stepPlayer(p, pad, dt, world);
  for (const e of events) s.events.push(e === 'jump' ? 'jump' : 'whoosh');
  if (p.onGround) s.stompChain = 0;

  if (res.hitCeiling && res.ceilingTiles.length) {
    // Bump the block nearest Pip's middle.
    const mid = p.x + p.w / 2;
    const [c, r] = res.ceilingTiles.reduce((a, b) => (Math.abs((b[0] + 0.5) * TILE - mid) < Math.abs((a[0] + 0.5) * TILE - mid) ? b : a));
    bumpBlock(s, c, r, random);
  }

  // Loose gems, checkpoints and the goal.
  for (const [c, r] of tilesUnder(p.x, p.y, p.w, p.h, TILE)) {
    const g = glyphAt(s.grid, level.cols, c, r);
    if (g === 'o') {
      s.grid[r * level.cols + c] = '.';
      addGem(s, (c + 0.5) * TILE, (r + 0.5) * TILE);
    } else if (g === 'K') {
      // Mark every checkpoint up to here as reached.
      for (let i = 0; i < s.grid.length; i++) if (s.grid[i] === 'K' && i % level.cols <= c) s.grid[i] = 'k';
      s.respawn = { x: (c + 0.5) * TILE, y: (r + 1) * TILE };
      s.events.push('select');
      popup(s, (c + 0.5) * TILE, r * TILE, 'Checkpoint!', '#fde68a');
    }
  }
  if (level.goalX !== null && p.x + p.w >= level.goalX - 3) {
    reachGoal(s, hooks);
    return;
  }

  // Hazards and pits.
  const hazard = hazardUnder(p, s.grid, level.cols);
  if (hazard === 'lava' || p.y > ROWS * TILE) {
    die(s);
    return;
  }
  if (hazard === 'spikes') hurt(s);

  // Sparks.
  if (input.pressed.has('action2') && s.power === 'spark' && s.sparks.length < 2) {
    s.sparks.push({ kind: 'spark', x: p.x + p.w / 2 - 4 + p.facing * 6, y: p.y + 4, w: 8, h: 8, vx: p.facing * 240, vy: 60, onGround: false, life: 2.2 });
    s.events.push('shoot');
  }

  updateCannons(s, map);
  updateEnemies(s, dt, map, d.speed, prevBottom, pad);
  if (s.phase !== 'play') return;
  updateItems(s, dt, map);
  updateShots(s, dt, map);
  if (s.phase !== 'play') return;
  touchHazards(s);
  if (s.phase !== 'play') return;
  updateBossFight(s, dt, map, random, prevBottom, pad, hooks);
  if (s.phase !== 'play') return;

  // Camera follows Pip, a little ahead in the direction of travel.
  if (s.arenaLocked && level.arenaX !== null) {
    s.camera += Math.sign(level.arenaX - s.camera) * Math.min(Math.abs(level.arenaX - s.camera), 320 * dt);
  } else {
    const target = clampCamera(s, p.x + p.w / 2 - VIEW_W * 0.42 + p.facing * 18);
    s.camera += (target - s.camera) * Math.min(1, dt * 5);
  }
  s.camera = clampCamera(s, s.camera);
}

/* ------------------------------------------------------------- blocks */

function bumpBlock(s: State, c: number, r: number, random: () => number) {
  const cols = s.level.cols;
  const i = r * cols + c;
  const g = s.grid[i];
  const cx = (c + 0.5) * TILE;
  const giftItem: Record<string, ItemKind | undefined> = { U: 'life', '*': 'feather' };
  let bumped = true;
  if (g === '?') {
    s.grid[i] = 'u';
    s.debris.push({ x: cx, y: r * TILE, vx: 0, vy: -320, life: 0.45, kind: 'gem', spin: 0 });
    addGem(s, cx, r * TILE - 8);
  } else if (g === 'Q') {
    const left = (s.gemBricks[i] ?? 6) - 1;
    s.gemBricks[i] = left;
    s.debris.push({ x: cx, y: r * TILE, vx: 0, vy: -320, life: 0.45, kind: 'gem', spin: 0 });
    addGem(s, cx, r * TILE - 8);
    if (left <= 0) s.grid[i] = 'u';
  } else if (g === 'P' || giftItem[g]) {
    s.grid[i] = 'u';
    const kind: ItemKind = g === 'P' ? (s.player.big ? 'pepper' : 'berry') : giftItem[g]!;
    s.items.push(spawnItem(kind, c, r));
    s.events.push('powerup');
  } else if (g === 'B') {
    if (s.player.big) {
      s.grid[i] = '.';
      for (const [vx, vy] of [[-60, -380], [60, -380], [-40, -260], [40, -260]]) {
        s.debris.push({ x: cx, y: (r + 0.5) * TILE, vx: vx + (random() - 0.5) * 20, vy, life: 1.2, kind: 'brick', spin: random() * 6 });
      }
      s.score += 50;
      s.events.push('explosion');
      bumped = false;
    } else {
      s.events.push('blip');
    }
  } else {
    s.events.push('blip');
    bumped = false;
  }
  if (bumped) s.bumps.push({ c, r, t: 0.18 });

  // Whatever stands on a bumped block is knocked out; gems on it are collected.
  const top = r * TILE;
  for (const e of s.enemies) {
    if (e.state === 'dead' || e.state === 'hang') continue;
    if (Math.abs(e.y + e.h - top) < 3 && e.x + e.w > c * TILE && e.x < (c + 1) * TILE) knockOut(s, e, 200);
  }
  if (glyphAt(s.grid, cols, c, r - 1) === 'o') {
    s.grid[(r - 1) * cols + c] = '.';
    addGem(s, cx, top - 8);
  }
}

/* ------------------------------------------------------------- damage */

export function hurt(s: State) {
  if (s.star > 0 || s.invuln > 0 || s.phase !== 'play') return;
  s.stats.hitsThisLevel++;
  if (s.power === 'spark') {
    s.power = 'none';
    s.invuln = DIFF[s.difficulty].invuln;
    s.events.push('hit');
  } else if (s.player.big) {
    setBig(s.player, false);
    s.invuln = DIFF[s.difficulty].invuln;
    s.events.push('hit');
  } else {
    die(s);
  }
}

export function die(s: State) {
  if (s.phase !== 'play') return;
  s.phase = 'dying';
  s.phaseTime = 0;
  s.player.vy = -360;
  s.player.vx = 0;
  s.power = 'none';
  s.star = 0;
  s.events.push('failure');
}

function dying(s: State, dt: number) {
  const p = s.player;
  if (s.phaseTime > 0.35) {
    p.vy += 1200 * dt;
    p.y += p.vy * dt;
  }
  if (s.phaseTime > 1.9) {
    s.lives--;
    if (s.lives <= 0) {
      s.over = true;
      return;
    }
    setBig(p, false);
    loadLevel(s, s.levelIndex, false);
    s.phaseTime = 0.6;
  }
}

/* ------------------------------------------------------------- enemies */

function knockOut(s: State, e: Enemy, points: number) {
  e.state = 'dead';
  e.vy = -240;
  e.vx = (s.player.x < e.x ? 1 : -1) * 50;
  addScore(s, points, e.x + e.w / 2, e.y);
  s.events.push('hit');
}

function stompScore(s: State, x: number, y: number) {
  const i = s.stompChain;
  s.stompChain++;
  s.stats.stomps++;
  s.stats.bestChain = Math.max(s.stats.bestChain, s.stompChain);
  if (i >= STOMP_SCORES.length) gainLife(s, x, y);
  else addScore(s, STOMP_SCORES[i], x, y);
}

function bounce(s: State, pad: PadInput) {
  const p = s.player;
  p.vy = -(pad.jump ? PHYS.stompHold : PHYS.stomp);
  p.jumping = pad.jump;
  p.onGround = false;
}

function kickShell(s: State, e: Enemy, dir: number) {
  e.state = 'slide';
  e.dir = dir;
  e.chain = 0;
  e.grace = 0.25;
  s.events.push('hit');
  addScore(s, 100, e.x + e.w / 2, e.y);
}

function updateEnemies(s: State, dt: number, map: TileQuery, speedMul: number, prevBottom: number, pad: PadInput) {
  const p = s.player;
  const px = p.x + p.w / 2;
  const py = p.y + p.h / 2;
  const lo = s.camera - VIEW_W * 0.6;
  const hi = s.camera + VIEW_W * 1.4;

  for (const e of s.enemies) {
    const awake = e.state === 'dead' || e.state === 'slide' || e.state === 'swoop' || (e.x > lo && e.x < hi);
    if (!awake) continue;
    updateEnemy(e, dt, map, speedMul, px, py);
  }

  // Sliding shells knock out what they hit.
  for (const sh of s.enemies) {
    if (sh.state !== 'slide') continue;
    for (const e of s.enemies) {
      if (e === sh || e.state === 'dead' || e.state === 'flat' || e.state === 'hang') continue;
      if (boxesOverlap(sh, e)) {
        sh.chain++;
        s.stats.shellChain = Math.max(s.stats.shellChain, sh.chain);
        const score = 200 * 2 ** (sh.chain - 1);
        knockOut(s, e, Math.min(score, 8000));
        if (score > 8000) gainLife(s, e.x, e.y);
      }
    }
  }

  // Walkers turn around when they bump into each other.
  for (let i = 0; i < s.enemies.length; i++) {
    const a = s.enemies[i];
    if (a.state !== 'walk' || a.kind === 'bee' || a.kind === 'frog') continue;
    for (let j = i + 1; j < s.enemies.length; j++) {
      const b = s.enemies[j];
      if (b.state !== 'walk' || b.kind === 'bee' || b.kind === 'frog') continue;
      if (boxesOverlap(a, b) && Math.abs(a.y - b.y) < 6) {
        if (a.x < b.x) {
          a.dir = -1;
          b.dir = 1;
        } else {
          a.dir = 1;
          b.dir = -1;
        }
      }
    }
  }

  // Sparks.
  for (const sp of s.sparks) {
    for (const e of s.enemies) {
      if (e.state === 'dead' || e.state === 'flat' || sp.life <= 0) continue;
      if (boxesOverlap(sp, e)) {
        knockOut(s, e, 200);
        sp.life = 0;
        burst(s.particles, sp.x + 4, sp.y + 4, '#fb923c', 8, 90);
      }
    }
  }

  // Pip against enemies.
  for (const e of s.enemies) {
    if (s.phase !== 'play') break;
    if (e.state === 'dead' || e.state === 'flat') continue;
    if (!boxesOverlap(p, e)) continue;
    if (s.star > 0) {
      knockOut(s, e, 200);
      continue;
    }
    const fromAbove = p.vy > 0 && prevBottom <= e.y + 6;
    if (e.state === 'shell') {
      if (fromAbove) bounce(s, pad);
      kickShell(s, e, px < e.x + e.w / 2 ? 1 : -1);
      continue;
    }
    if (fromAbove && stompable(e)) {
      stompScore(s, e.x + e.w / 2, e.y);
      bounce(s, pad);
      s.events.push('hit');
      if (e.state === 'slide') {
        e.state = 'shell';
        e.timer = 7;
      } else if (e.kind === 'snail') {
        e.state = 'shell';
        e.timer = 7;
        e.y += e.h - 12;
        e.h = 12;
      } else {
        e.state = 'flat';
        e.timer = 0.45;
      }
      continue;
    }
    if (e.state === 'slide' && e.grace > 0) continue;
    hurt(s);
  }

  s.enemies = s.enemies.filter((e) => !isGone(e, s.camera, VIEW_W));
}

/* ------------------------------------------------------------- cannons */

function updateCannons(s: State, map: TileQuery) {
  const cols = s.level.cols;
  const c0 = Math.max(0, Math.floor(s.camera / TILE) - 2);
  const c1 = Math.min(cols - 1, Math.floor((s.camera + VIEW_W) / TILE) + 2);
  const p = s.player;
  for (let r = 0; r < ROWS; r++) {
    for (let c = c0; c <= c1; c++) {
      const i = r * cols + c;
      if (s.grid[i] !== 'C') continue;
      const cx = (c + 0.5) * TILE;
      const dx = p.x + p.w / 2 - cx;
      const next = s.cannons[i] ?? s.levelTime + 1.2;
      s.cannons[i] = next;
      if (s.levelTime < next || Math.abs(dx) < 28 || Math.abs(dx) > VIEW_W * 0.7) continue;
      s.cannons[i] = s.levelTime + 2.8;
      const dir = dx < 0 ? -1 : 1;
      const x = dir > 0 ? (c + 1) * TILE : c * TILE - 10;
      if (map.at(Math.floor((x + 5) / TILE), r) === 1) continue;
      s.hostile.push({ kind: 'acorn', x, y: r * TILE + 3, w: 10, h: 10, vx: dir * 95, vy: 0, onGround: false, life: 6 });
      s.events.push('shoot');
    }
  }
}

/* --------------------------------------------------------------- items */

function updateItems(s: State, dt: number, map: TileQuery) {
  const p = s.player;
  for (let i = s.items.length - 1; i >= 0; i--) {
    const it = s.items[i];
    updateItem(it, dt, map);
    if (it.y > ROWS * TILE) {
      s.items.splice(i, 1);
      continue;
    }
    if (it.emerge > 0 || !boxesOverlap(p, it)) continue;
    s.items.splice(i, 1);
    const cx = it.x + it.w / 2;
    switch (it.kind) {
      case 'berry':
        if (!p.big) setBig(p, true);
        addScore(s, 1000, cx, it.y);
        s.events.push('powerup');
        break;
      case 'pepper':
        if (!p.big) setBig(p, true);
        s.power = 'spark';
        addScore(s, 1000, cx, it.y);
        s.events.push('powerup');
        break;
      case 'feather':
        s.star = 9;
        addScore(s, 1000, cx, it.y);
        s.events.push('powerup');
        break;
      case 'life':
        gainLife(s, cx, it.y);
        break;
    }
  }
}

/* --------------------------------------------------------------- shots */

function updateShots(s: State, dt: number, map: TileQuery) {
  const p = s.player;
  s.sparks = s.sparks.filter((sh) => {
    if (!updateShot(sh, dt, map) || sh.x < s.camera - 32 || sh.x > s.camera + VIEW_W + 32) {
      if (sh.life > 0) burst(s.particles, sh.x + 4, sh.y + 4, '#fb923c', 5, 60);
      return false;
    }
    return true;
  });
  s.hostile = s.hostile.filter((sh) => {
    if (!updateShot(sh, dt, map) || sh.x < s.camera - VIEW_W || sh.x > s.camera + VIEW_W * 2) {
      if (sh.kind === 'lava' || sh.kind === 'shard') burst(s.particles, sh.x + sh.w / 2, sh.y + sh.h / 2, sh.kind === 'lava' ? '#f97316' : '#a5f3fc', 6, 70);
      return false;
    }
    // Sparks put out acorns.
    for (const sp of s.sparks) {
      if (sh.kind === 'acorn' && sp.life > 0 && boxesOverlap(sp, sh)) {
        sp.life = 0;
        addScore(s, 100, sh.x, sh.y);
        return false;
      }
    }
    if (s.phase === 'play' && boxesOverlap(p, sh)) {
      if (s.star > 0) return false;
      // Acorns can be stomped.
      if (sh.kind === 'acorn' && p.vy > 0 && s.prevBottom <= sh.y + 5) {
        stompScore(s, sh.x + sh.w / 2, sh.y);
        bounce(s, { left: false, right: false, jump: true, jumpPressed: false, downPressed: false });
        s.events.push('hit');
        return false;
      }
      hurt(s);
    }
    return true;
  });
}

/* ------------------------------------------------------ fixed hazards */

function touchHazards(s: State) {
  const p = s.player;
  const cx = p.x + p.w / 2;
  if (s.level.wheels.length) {
    for (const b of wheelBalls(s.level, s.levelTime)) {
      if (Math.abs(b.x - cx) < 80 && boxesOverlap(p, { x: b.x - WHEEL_BALL + 1, y: b.y - WHEEL_BALL + 1, w: 2 * WHEEL_BALL - 2, h: 2 * WHEEL_BALL - 2 })) {
        hurt(s);
        return;
      }
    }
  }
  for (let i = 0; i < s.level.lavaSprites.length; i++) {
    const l = lavaSpriteAt(s.level, i, s.levelTime);
    if (l && boxesOverlap(p, { x: l.x - 5, y: l.y - 5, w: 10, h: 10 })) {
      hurt(s);
      return;
    }
  }
}

/* --------------------------------------------------------------- boss */

function updateBossFight(s: State, dt: number, map: TileQuery, random: () => number, prevBottom: number, pad: PadInput, hooks: Hooks) {
  const p = s.player;
  const b = s.boss;
  if (b && s.arenaLocked) {
    updateBoss(s, b, dt, map, random);
    if (b.dying > 0) {
      if (random() < 0.4) burst(s.particles, b.x + random() * b.w, b.y + random() * b.h, '#fde68a', 3, 120);
      if (b.dying > 1.6) {
        s.boss = null;
        s.orb = { x: (s.level.arenaX ?? 0) + VIEW_W / 2, y: 8 * TILE };
        s.events.push('powerup');
        s.score += 5000;
        popup(s, s.orb.x, s.orb.y, '5000', '#fde68a');
      }
    } else {
      for (const sp of s.sparks) {
        if (sp.life > 0 && boxesOverlap(sp, b)) {
          sp.life = 0;
          burst(s.particles, sp.x + 4, sp.y + 4, '#fb923c', 6, 80);
          if (damageBoss(s, b, 1)) s.stats.bosses++;
        }
      }
      if (boxesOverlap(p, b)) {
        const fromAbove = p.vy > 0 && prevBottom <= b.y + 10;
        if (fromAbove && bossVulnerable(b)) {
          bounce(s, pad);
          p.vy = Math.min(p.vy, -420);
          if (damageBoss(s, b, STOMP_DAMAGE)) s.stats.bosses++;
          s.score += 1000;
          popup(s, b.x + b.w / 2, b.y, '1000');
        } else if (s.star > 0 && bossVulnerable(b)) {
          if (damageBoss(s, b, 2)) s.stats.bosses++;
        } else if (bossHarmful(b) && !fromAbove) {
          hurt(s);
          // Knock Pip back so one touch is not several hits.
          p.vx = (p.x < b.x ? -1 : 1) * 160;
        } else if (fromAbove) {
          bounce(s, pad);
        }
      }
    }
  }
  if (s.orb) {
    s.orb.y = 8 * TILE + Math.sin(s.levelTime * 3) * 4;
    if (boxesOverlap(p, { x: s.orb.x - 9, y: s.orb.y - 9, w: 18, h: 18 })) {
      s.orb = null;
      finishLevel(s, hooks);
      s.phase = 'tally';
      s.phaseTime = 0;
      s.banner = { text: `World ${s.level.world + 1} clear!`, sub: WORLD_NAMES[s.level.world], time: 3 };
    }
  }
}

/* ---------------------------------------------------- goal and tally */

function finishLevel(s: State, hooks: Hooks) {
  s.stats.levelsCleared++;
  if (s.stats.hitsThisLevel === 0) s.stats.flawless++;
  s.events.push('levelComplete');
  hooks.onLevelClear?.(s.levelIndex, s);
}

function reachGoal(s: State, hooks: Hooks) {
  const p = s.player;
  const top = 3 * TILE;
  const base = 13 * TILE;
  const frac = (base - (p.y + p.h)) / (base - top);
  const bonus = frac > 0.85 ? 5000 : frac > 0.65 ? 2000 : frac > 0.45 ? 1000 : frac > 0.25 ? 500 : frac > 0.1 ? 200 : 100;
  s.poleBonus = bonus;
  s.score += bonus;
  popup(s, s.level.goalX ?? p.x, p.y, String(bonus), '#fde68a');
  p.x = (s.level.goalX ?? p.x) - p.w - 2;
  p.vx = 0;
  p.vy = 0;
  s.phase = 'goal';
  s.phaseTime = 0;
  finishLevel(s, hooks);
}

function goal(s: State, dt: number) {
  const p = s.player;
  const ground = 13 * TILE;
  if (p.y + p.h < ground - 0.5) {
    p.y = Math.min(ground - p.h, p.y + 150 * dt);
    s.phaseTime = 0;
    return;
  }
  // Walk off towards the hut.
  if (s.phaseTime > 0.3) {
    const world = worldFor(s.level, s.grid, [], []);
    stepPlayer(p, { left: false, right: true, jump: false, jumpPressed: false, downPressed: false }, dt, world);
    p.vx = Math.min(p.vx, 70);
  }
  const target = Math.min(s.level.cols * TILE - VIEW_W, p.x - VIEW_W * 0.42);
  s.camera += (Math.max(s.camera, target) - s.camera) * Math.min(1, dt * 4);
  if (s.phaseTime > 1.8) {
    s.phase = 'tally';
    s.phaseTime = 0;
  }
}

function tally(s: State, dt: number) {
  if (s.timeLeft > 0) {
    const take = Math.min(s.timeLeft, dt * 120);
    const before = Math.ceil(s.timeLeft);
    s.timeLeft -= take;
    const after = Math.ceil(s.timeLeft);
    s.score += (before - after) * 10;
    if (before !== after && Math.floor(s.phaseTime * 20) % 2 === 0) s.events.push('tick');
    s.phaseTime = Math.min(s.phaseTime, 0.2);
    return;
  }
  if (s.phaseTime < 1.2) return;
  const next = s.levelIndex + 1;
  if (next >= LEVEL_COUNT) {
    s.won = true;
    s.over = true;
    return;
  }
  loadLevel(s, next, true);
}

export const isBossLevel = (index: number) => index % LEVELS_PER_WORLD === LEVELS_PER_WORLD - 1;

