import type { DifficultySetting } from '@/types';
import { baseState } from '../_shared/arcade/kit';
import type { Input } from '../_shared/arcade/kit';
import { burst } from '../_shared/arcade/draw';
import { boxesOverlap, moveBody } from '../_shared/platformer/physics';
import type { TileQuery } from '../_shared/platformer/physics';
import { HERO, dropLoot, stepFlyer, stepHero, stepLoot, stepWalker } from '../_shared/arena/actors';
import { arenaFlow, coreState, enterStage, heroInput, killHero, popup, resetHero, sound, stageCleared } from '../_shared/arena/flow';
import type { FlowConfig } from '../_shared/arena/flow';
import { H, T, W, stageQuery } from '../_shared/arena/stage';
import { ROLL_DAMAGE, damageBoss, makeBoss, updateBoss } from './bosses';
import { FLOOR_COUNT, HERO_START, floorStage, isBossFloor, zoneOf } from './stages';
import type { Boss, BossKind, Foe, FoeKind, State } from './types';

export const VIEW_W = W;
export const VIEW_H = H;

const GLYPH: Record<string, FoeKind> = { g: 'goblin', h: 'hopper', f: 'imp', b: 'bat' };
const BOSSES: BossKind[] = ['troll', 'djinn', 'king'];

export const DIFF: Record<DifficultySetting, { lives: number; speed: number; hurry: number }> = {
  easy: { lives: 5, speed: 0.82, hurry: 50 },
  normal: { lives: 3, speed: 1, hurry: 40 },
  hard: { lives: 3, speed: 1.2, hurry: 32 },
};

const SPEED: Record<FoeKind, number> = { goblin: 40, hopper: 50, imp: 34, bat: 44 };
const CHAIN_SCORES = [500, 1000, 2000, 4000, 8000, 16000];
export const TREATS: { kind: string; value: number }[] = [
  { kind: 'cherry', value: 200 },
  { kind: 'icecream', value: 300 },
  { kind: 'cake', value: 500 },
  { kind: 'cocoa', value: 700 },
  { kind: 'donut', value: 1000 },
  { kind: 'gift', value: 2000 },
];
export const POTIONS = ['red', 'blue', 'yellow', 'green'];

export interface Hooks {
  onFloorClear?: (index: number, s: State) => void;
}

function flowConfig(s: State): FlowConfig<State> {
  const hurry = DIFF[s.difficulty].hurry;
  return {
    stages: FLOOR_COUNT,
    load: loadFloor,
    hurryAt: hurry,
    chaserAt: hurry + 15,
    lifeEvery: 40000,
    clearTime: 3,
    onRespawn: (st) => {
      st.potions = { speed: false, power: false, range: false, shield: 0 };
    },
  };
}

export function newFoe(kind: FoeKind, col: number, row: number, appear = 0.9): Foe {
  return {
    kind,
    x: col * T + 1,
    y: (row + 1) * T - 14,
    w: 14,
    h: 14,
    vx: 0,
    vy: 0,
    onGround: false,
    dir: col < 10 ? 1 : -1,
    think: 0.5,
    jumpCD: 1.5,
    state: 'spawn',
    snow: 0,
    melt: 0,
    timer: appear,
    bounces: 0,
    chain: 0,
    fireCD: 2,
    spin: 0,
  };
}

export function loadFloor(s: State, index: number) {
  s.stage = floorStage(index);
  s.foes = s.stage.spawns.filter((sp) => GLYPH[sp.glyph]).map((sp) => newFoe(GLYPH[sp.glyph], sp.col, sp.row));
  s.shots = [];
  s.fires = [];
  s.bolts = [];
  s.boss = isBossFloor(index) ? makeBoss(BOSSES[zoneOf(index)], s.difficulty) : null;
  resetHero(s);
}

export function create(difficulty: DifficultySetting, startFloor = 0): State {
  const stage = floorStage(startFloor);
  const s: State = {
    ...baseState(),
    ...coreState(stage, HERO_START, DIFF[difficulty].lives, 40000),
    difficulty,
    startFloor,
    foes: [],
    shots: [],
    fires: [],
    bolts: [],
    boss: null,
    potions: { speed: false, power: false, range: false, shield: 0 },
    fireCD: 0,
    shake: 0,
    stats: { frozen: 0, bestChain: 0, bosses: 0, potionKinds: [], floorsCleared: 0 },
  };
  enterStage(s, startFloor, flowConfig(s));
  return s;
}

/* ---------------------------------------------------------------- update */

export function update(s: State, dt: number, input: Input, random: () => number, hooks: Hooks = {}) {
  const cfg = flowConfig(s);
  const active = arenaFlow(s, dt, cfg);
  s.shake = Math.max(0, s.shake - dt);
  // Enemies pop in while the floor is introduced.
  if (s.phase === 'intro') for (const f of s.foes) if (f.state === 'spawn') f.timer = Math.max(0, f.timer - dt * 0.5);
  if (!active) return;

  const map = stageQuery(s.stage);
  const hero = s.hero;
  const speedMul = s.potions.speed ? 1.3 : 1;
  const hi = heroInput(input);
  const wasGround = hero.onGround;
  stepHero(hero, hi, dt, map, false, speedMul);
  if (wasGround && hero.vy === -HERO.jump) sound(s, 'jump');
  s.potions.shield = Math.max(0, s.potions.shield - dt);

  // Throwing snow (hold to keep throwing).
  s.fireCD -= dt;
  const wantFire = input.pressed.has('action2') || (input.held.has('action2') && s.fireCD <= -0.05);
  if (wantFire && s.fireCD <= 0 && s.shots.length < (s.potions.power ? 4 : 3)) throwSnow(s);

  updateShots(s, dt, map);
  updateFoes(s, dt, map, random);
  updateFires(s, dt, map);
  updateBolts(s, dt);
  if (s.boss) bossFight(s, s.boss, dt, map, random);
  updateLoot(s, dt, map);

  if (s.phase === 'play' && !s.boss && s.foes.length === 0) {
    s.stats.floorsCleared++;
    stageCleared(s);
    hooks.onFloorClear?.(s.stageIndex, s);
  }
}

function throwSnow(s: State) {
  const h = s.hero;
  const big = s.potions.power;
  const size = big ? 12 : 8;
  s.shots.push({
    x: h.x + h.w / 2 - size / 2 + h.facing * 6,
    y: h.y + 2,
    w: size,
    h: size,
    vx: h.facing * 230,
    vy: -40,
    life: s.potions.range ? 0.66 : 0.42,
    power: big ? 2 : 1,
  });
  s.fireCD = 0.28;
  sound(s, 'shoot');
}

/* ----------------------------------------------------------------- shots */

function updateShots(s: State, dt: number, map: TileQuery) {
  for (let i = s.shots.length - 1; i >= 0; i--) {
    const sh = s.shots[i];
    sh.life -= dt;
    sh.vy += 300 * dt;
    sh.x += sh.vx * dt;
    sh.y += sh.vy * dt;
    const c = Math.floor((sh.x + sh.w / 2) / T);
    const r = Math.floor((sh.y + sh.h / 2) / T);
    let gone = sh.life <= 0 || map.at(c, r) === 1;
    if (!gone) {
      for (const f of s.foes) {
        if ((f.state === 'live' || f.state === 'ball') && boxesOverlap(sh, f)) {
          hitFoe(s, f, sh);
          gone = true;
          break;
        }
      }
    }
    if (!gone && s.boss && s.boss.dying === 0 && boxesOverlap(sh, s.boss)) {
      if (damageBoss(s, s.boss, sh.power)) bossDown(s);
      gone = true;
    }
    if (!gone) {
      for (let k = s.fires.length - 1; k >= 0; k--) {
        if (boxesOverlap(sh, s.fires[k])) {
          s.fires.splice(k, 1);
          s.score += 50;
          gone = true;
          break;
        }
      }
    }
    if (gone) {
      burst(s.particles, sh.x + sh.w / 2, sh.y + sh.h / 2, '#ffffff', 5, 60);
      s.shots.splice(i, 1);
    }
  }
}

function hitFoe(s: State, f: Foe, sh: { vx: number; power: number }) {
  if (f.state === 'ball') {
    // A snowball shot sends a packed snowball rolling.
    kick(s, f, sh.vx > 0 ? 1 : -1);
    return;
  }
  f.snow = Math.min(4, f.snow + sh.power);
  f.melt = 2.4;
  s.score += 10;
  sound(s, 'blip');
  if (f.snow >= 4) {
    f.state = 'ball';
    f.melt = 7;
    f.vx = 0;
    s.score += 100;
    s.stats.frozen++;
    sound(s, 'pop');
  }
}

function kick(s: State, f: Foe, dir: number) {
  f.state = 'roll';
  f.dir = dir;
  f.bounces = 0;
  f.timer = 0;
  sound(s, 'whoosh');
}

/* ------------------------------------------------------------------ foes */

function knockOut(s: State, f: Foe, chain: number) {
  f.state = 'out';
  f.chain = chain;
  f.vx = (f.x < W / 2 ? 1 : -1) * (50 + Math.random() * 60);
  f.vy = -340;
  f.timer = 0.85;
  const score = CHAIN_SCORES[Math.min(chain, CHAIN_SCORES.length - 1)];
  s.score += score;
  popup(s, f.x + 7, f.y, String(score), chain >= 2 ? '#fde047' : '#ffffff');
  burst(s.particles, f.x + 7, f.y + 7, '#e0f2fe', 10, 120);
  sound(s, 'explosion');
}

function treatFor(chain: number, random: () => number): { kind: string; value: number } {
  const r = random();
  if (r < 0.11) {
    // Green (the shield) is the rarest potion.
    const p = random();
    return { kind: `potion-${p < 0.3 ? 'red' : p < 0.6 ? 'blue' : p < 0.9 ? 'yellow' : 'green'}`, value: 0 };
  }
  const tier = Math.min(TREATS.length - 1, Math.floor(r * 4) + Math.min(chain, 3));
  return TREATS[tier];
}

function updateFoes(s: State, dt: number, map: TileQuery, random: () => number) {
  const hero = s.hero;
  const target = { x: hero.x, y: hero.y };
  const mul = DIFF[s.difficulty].speed * (s.hurry > 0 ? 1.5 : 1);

  for (const f of s.foes) {
    f.spin += dt * (f.state === 'roll' ? f.dir * 14 : 6);
    switch (f.state) {
      case 'spawn':
        f.timer -= dt;
        if (f.timer <= 0) f.state = 'live';
        break;
      case 'live':
        if (f.snow > 0) {
          f.vx = 0;
          f.vy = Math.min(HERO.fall, f.vy + HERO.gravity * dt);
          moveBody(f, dt, map);
          f.melt -= dt;
          if (f.melt <= 0) {
            f.snow--;
            f.melt = 1.6;
          }
          break;
        }
        moveFoe(s, f, dt, map, target, mul, random);
        break;
      case 'ball':
        f.vx = 0;
        f.vy = Math.min(HERO.fall, f.vy + HERO.gravity * dt);
        moveBody(f, dt, map);
        f.melt -= dt;
        if (f.melt <= 0) {
          // It breaks out bit by bit.
          f.state = 'live';
          f.snow = 3;
          f.melt = 1.6;
        }
        break;
      case 'roll': {
        f.timer += dt;
        f.vx = f.dir * 250;
        f.vy = Math.min(HERO.fall, f.vy + HERO.gravity * dt);
        const res = moveBody(f, dt, map);
        if (res.hitLeft || res.hitRight) {
          f.dir = -f.dir;
          f.bounces++;
          sound(s, 'hit');
        }
        const onBottom = f.y + f.h >= H - T - 1;
        if ((onBottom && f.bounces >= 3) || f.bounces >= 6 || f.timer > 8) {
          // The snowball bursts.
          knockOut(s, f, f.chain);
        }
        break;
      }
      case 'out':
        f.timer -= dt;
        f.vy += 900 * dt;
        f.x = Math.max(T, Math.min(W - T - f.w, f.x + f.vx * dt));
        f.y = Math.min(H - T - f.h, f.y + f.vy * dt);
        break;
    }
  }

  // Rolling snowballs knock out what they touch and set other snowballs rolling.
  for (const r of s.foes) {
    if (r.state !== 'roll') continue;
    for (const f of s.foes) {
      if (f === r || !boxesOverlap(r, f)) continue;
      if (f.state === 'live' || f.state === 'spawn') {
        knockOut(s, f, r.chain);
        r.chain++;
        s.stats.bestChain = Math.max(s.stats.bestChain, r.chain);
      } else if (f.state === 'ball') {
        kick(s, f, r.dir);
        f.chain = r.chain;
      }
    }
  }

  // Pebble and the foes.
  for (const f of s.foes) {
    if (!boxesOverlap(hero, f)) continue;
    if (f.state === 'live' && f.snow === 0) {
      if (s.potions.shield > 0) knockOut(s, f, 0);
      else killHero(s);
    } else if (f.state === 'ball') {
      pushBall(s, f, map, dt);
    }
  }

  // Knocked-out foes become treats.
  for (let i = s.foes.length - 1; i >= 0; i--) {
    const f = s.foes[i];
    if (f.state === 'out' && f.timer <= 0) {
      const t = treatFor(f.chain, random);
      dropLoot(s.loot, t.kind, t.value, f.x + 7, f.y + 7, (random() - 0.5) * 60, -160);
      s.foes.splice(i, 1);
    }
  }
}

function moveFoe(s: State, f: Foe, dt: number, map: TileQuery, target: { x: number; y: number }, mul: number, random: () => number) {
  const speed = SPEED[f.kind] * mul;
  switch (f.kind) {
    case 'bat':
      stepFlyer(f, dt, map, speed, false);
      break;
    case 'hopper':
      stepWalker(f, target, dt, map, { speed, jump: HERO.jump, wrap: false, random, chase: 0.9 });
      if (f.onGround && random() < dt * 0.8) {
        f.vy = -300;
        f.onGround = false;
      }
      break;
    case 'imp': {
      stepWalker(f, target, dt, map, { speed, jump: HERO.jump, wrap: false, random, chase: 0.5 });
      f.fireCD -= dt;
      const dx = target.x - f.x;
      if (f.fireCD <= 0 && Math.abs(target.y - f.y) < 10 && Math.abs(dx) < 7 * T && Math.sign(dx) === f.dir) {
        f.fireCD = 2.6;
        s.fires.push({ x: f.x + 2 + f.dir * 8, y: f.y + 3, w: 10, h: 8, vx: f.dir * 120, vy: 0, life: 3 });
        sound(s, 'shoot');
      }
      break;
    }
    default:
      stepWalker(f, target, dt, map, { speed, jump: HERO.jump, wrap: false, random, chase: 0.7 });
  }
}

/** Pebble walking into a snowball pushes it along. */
function pushBall(s: State, f: Foe, map: TileQuery, dt: number) {
  const h = s.hero;
  const dir = Math.sign(h.vx);
  const centre = h.x + h.w / 2 < f.x + f.w / 2 ? 1 : -1;
  if (dir !== 0 && dir === centre && Math.abs(h.y - f.y) < 8) {
    const before = f.x;
    f.vx = dir * HERO.speed * 0.8;
    f.vy = 0;
    moveBody(f, dt, map);
    f.vx = 0;
    if (f.x === before) {
      // Wedged against a wall: Pebble stops.
      h.x = dir > 0 ? f.x - h.w : f.x + f.w;
    }
  }
}

/* ----------------------------------------------------------- fire/bolts */

function updateFires(s: State, dt: number, map: TileQuery) {
  for (let i = s.fires.length - 1; i >= 0; i--) {
    const fb = s.fires[i];
    fb.life -= dt;
    fb.x += fb.vx * dt;
    fb.y += fb.vy * dt;
    const solid = map.at(Math.floor((fb.x + fb.w / 2) / T), Math.floor((fb.y + fb.h / 2) / T)) === 1;
    if (fb.life <= 0 || solid || fb.y > H) {
      burst(s.particles, fb.x + 5, fb.y + 5, '#fb923c', 5, 50);
      s.fires.splice(i, 1);
      continue;
    }
    if (boxesOverlap(fb, s.hero) && s.potions.shield <= 0) killHero(s);
  }
}

function updateBolts(s: State, dt: number) {
  for (let i = s.bolts.length - 1; i >= 0; i--) {
    const b = s.bolts[i];
    if (b.warn > 0) {
      b.warn -= dt;
      if (b.warn <= 0) {
        sound(s, 'explosion');
        s.shake = 0.2;
      }
      continue;
    }
    b.life -= dt;
    if (Math.abs(s.hero.x + s.hero.w / 2 - b.x) < 9 && s.potions.shield <= 0) killHero(s);
    if (b.life <= 0) s.bolts.splice(i, 1);
  }
}

/* ------------------------------------------------------------------ boss */

function spawnMinion(s: State, kind: FoeKind, random: () => number) {
  const col = 2 + Math.floor(random() * 16);
  const f = newFoe(kind, col, 1, 0.5);
  f.y = -14;
  s.foes.push(f);
}

function bossFight(s: State, b: Boss, dt: number, map: TileQuery, random: () => number) {
  updateBoss(s, b, dt, map, random, (kind) => spawnMinion(s, kind, random));
  if (b.dying > 0) {
    if (random() < 0.5) burst(s.particles, b.x + random() * b.w, b.y + random() * b.h, '#fde68a', 4, 140);
    if (b.dying > 2) {
      for (let k = 0; k < 10; k++) {
        const t = TREATS[2 + Math.floor(random() * 4)];
        dropLoot(s.loot, t.kind, t.value, b.x + b.w / 2, b.y + b.h / 2, (random() - 0.5) * 220, -200 - random() * 200);
      }
      s.boss = null;
    }
    return;
  }
  // Rolling snowballs are what really hurt.
  for (const f of s.foes) {
    if (f.state === 'roll' && boxesOverlap(f, b)) {
      knockOut(s, f, f.chain);
      if (damageBoss(s, b, ROLL_DAMAGE)) bossDown(s);
    }
  }
  if (boxesOverlap(s.hero, { x: b.x + 4, y: b.y + 4, w: b.w - 8, h: b.h - 6 })) {
    if (s.potions.shield <= 0) killHero(s);
  }
}

function bossDown(s: State) {
  s.stats.bosses++;
  s.score += 10000;
  const b = s.boss!;
  popup(s, b.x + b.w / 2, b.y, '10000', '#fde047');
  // Its minions give up too.
  for (const f of s.foes) if (f.state !== 'out') knockOut(s, f, 0);
  s.fires = [];
  s.bolts = [];
}

/* ------------------------------------------------------------------ loot */

function updateLoot(s: State, dt: number, map: TileQuery) {
  for (let i = s.loot.length - 1; i >= 0; i--) {
    const l = s.loot[i];
    stepLoot(l, dt, map, false);
    if (l.life <= 0) {
      s.loot.splice(i, 1);
      continue;
    }
    if (l.life > 8.7 || !boxesOverlap(l, s.hero) || s.dying > 0) continue;
    s.loot.splice(i, 1);
    if (l.kind.startsWith('potion-')) {
      const p = l.kind.slice(7);
      if (p === 'red') s.potions.speed = true;
      if (p === 'blue') s.potions.power = true;
      if (p === 'yellow') s.potions.range = true;
      if (p === 'green') s.potions.shield = 8;
      if (!s.stats.potionKinds.includes(p)) s.stats.potionKinds.push(p);
      popup(s, l.x + 6, l.y, { red: 'Speed!', blue: 'Power!', yellow: 'Range!', green: 'Invincible!' }[p] ?? '', '#a5f3fc');
      sound(s, 'powerup');
    } else {
      s.score += l.value;
      popup(s, l.x + 6, l.y, String(l.value), '#fde68a');
      sound(s, 'coin');
    }
  }
}

export { killHero, ROLL_DAMAGE };
