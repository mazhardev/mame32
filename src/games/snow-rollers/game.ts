import type { DifficultySetting } from '@/types';
import type { SoundName } from '@/services/audio';
import { baseState } from '../_shared/arcade/kit';
import type { BaseState, Input } from '../_shared/arcade/kit';
import type { Spark } from '../_shared/arcade/draw';
import { burst, updateSparks } from '../_shared/arcade/draw';
import { AH, AT, AW, buildArena, clampTop, makeBody, stepFlier, stepWalker } from '../_shared/platform/arena';
import type { Walker } from '../_shared/platform/arena';
import { moveBody, overlaps } from '../_shared/platform/tiles';
import type { Body, Grid } from '../_shared/platform/tiles';
import { BOSSES, PER_LAND, STAGES, stagePlan } from './stages';
import type { EnemyKind, StagePlan } from './stages';

/**
 * Snow Rollers rules. Throw snow at enemies until they are packed into a
 * snowball, then kick the ball: it rolls, bounces off walls and flattens
 * every enemy in its way. Clear every enemy to finish a stage.
 */

export const PHYS = { walk: 74, jump: 335, gravity: 980, maxFall: 400 };

export const DIFFICULTY: Record<DifficultySetting, { lives: number; speed: number; melt: number; bossHp: number }> = {
  easy: { lives: 5, speed: 0.8, melt: 1.35, bossHp: 0.75 },
  normal: { lives: 3, speed: 1, melt: 1, bossHp: 1 },
  hard: { lives: 3, speed: 1.2, melt: 0.75, bossHp: 1.35 },
};

const FULL = 4;
const FOODS = [
  { name: 'cocoa', points: 100 },
  { name: 'cookie', points: 200 },
  { name: 'cake', points: 500 },
  { name: 'pie', points: 1000 },
  { name: 'sundae', points: 2000 },
];

export type PickupKind = 'food' | 'red' | 'blue' | 'yellow' | 'green';

export interface Player extends Body {
  facing: 1 | -1;
  invuln: number;
  shootCd: number;
  anim: number;
  dead: boolean;
}

export interface Enemy {
  kind: EnemyKind | 'minion';
  base: EnemyKind;
  w: Walker;
  /** 0 free … 4 a full snowball. */
  snow: number;
  melt: number;
  state: 'arrive' | 'free' | 'rolling' | 'dead';
  /** Arrival animation / death fade. */
  timer: number;
  bounces: number;
  combo: number;
  fireCd: number;
  spin: number;
}

export interface Shot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

export interface Pickup {
  b: Body;
  kind: PickupKind;
  food: number;
  life: number;
}

export interface Fire {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

export interface Boss {
  kind: number;
  b: Body;
  hp: number;
  maxHp: number;
  timer: number;
  spawn: number;
  invuln: number;
  dir: number;
  phase: number;
  swoop: number;
  dead: boolean;
}

export interface Pop {
  x: number;
  y: number;
  t: number;
  text: string;
}

export type Phase = 'intro' | 'play' | 'dying' | 'clear' | 'done';

export interface State extends BaseState {
  difficulty: DifficultySetting;
  stage: number;
  plan: StagePlan;
  grid: Grid;
  start: { x: number; y: number };
  p: Player;
  enemies: Enemy[];
  shots: Shot[];
  pickups: Pickup[];
  fires: Fire[];
  boss: Boss | null;
  ghost: { x: number; y: number } | null;
  pops: Pop[];
  sparks: Spark[];
  flakes: { x: number; y: number; s: number }[];
  lives: number;
  phase: Phase;
  phaseT: number;
  stageTime: number;
  power: { speed: boolean; strong: boolean; range: boolean };
  giant: number;
  won: boolean;
  reached: number;
  nextLife: number;
  stats: { bestCombo: number; bosses: number; cleared: number; deaths: number; giant: boolean; foods: number };
}

/* ----------------------------------------------------------------- setup */

function sound(s: State, n: SoundName) {
  if (!s.events.includes(n)) s.events.push(n);
}

function pop(s: State, x: number, y: number, text: string) {
  s.pops.push({ x, y, t: 1, text });
}

function addScore(s: State, n: number, x?: number, y?: number) {
  s.score += n;
  if (x !== undefined && y !== undefined) pop(s, x, y, String(n));
  while (s.score >= s.nextLife) {
    s.nextLife += 50000;
    s.lives++;
    sound(s, 'powerup');
    pop(s, s.p.x + 6, s.p.y - 8, '1UP');
  }
}

function newEnemy(kind: EnemyKind | 'minion', base: EnemyKind, x: number, y: number, random: () => number): Enemy {
  const b = makeBody(x, y, 14, 14);
  if (base === 'wisp') {
    b.vx = (random() < 0.5 ? -1 : 1) * 46;
    b.vy = (random() < 0.5 ? -1 : 1) * 38;
  }
  return {
    kind,
    base,
    w: { b, dir: random() < 0.5 ? -1 : 1, think: random(), dropping: false },
    snow: 0,
    melt: 0,
    state: 'arrive',
    timer: 0.9,
    bounces: 0,
    combo: 0,
    fireCd: 1.5 + random() * 2,
    spin: 0,
  };
}

export function loadStage(s: State, index: number, random: () => number) {
  const plan = stagePlan(index);
  const arena = buildArena(plan.layout);
  s.stage = index;
  s.reached = Math.max(s.reached, index);
  s.plan = plan;
  s.grid = arena.grid;
  s.start = { x: arena.player.c * AT + 2, y: (arena.player.r + 1) * AT - 15 };
  s.enemies = [];
  s.shots = [];
  s.pickups = [];
  s.fires = [];
  s.ghost = null;
  s.pops = [];
  s.stageTime = 0;
  s.boss = null;
  const spots = [...arena.spawns];
  plan.enemies.forEach((kind, i) => {
    const k = Math.floor(random() * spots.length);
    const spot = spots.splice(k, 1)[0] ?? arena.spawns[i % arena.spawns.length];
    s.enemies.push(newEnemy(kind, kind, spot.c * AT + 1, (spot.r + 1) * AT - 14, random));
  });
  if (plan.boss) {
    const hp = Math.round((6 + plan.land) * DIFFICULTY[s.difficulty].bossHp);
    const w = plan.land === 1 ? 44 : 40;
    const h = plan.land === 1 ? 28 : 40;
    s.boss = {
      kind: plan.land,
      b: makeBody(AW / 2 - w / 2, plan.land === 1 ? 30 : 13 * AT - h, w, h),
      hp,
      maxHp: hp,
      timer: 1.5,
      spawn: 2,
      invuln: 0,
      dir: -1,
      phase: 0,
      swoop: 0,
      dead: false,
    };
  }
  resetPlayer(s);
  s.phase = 'intro';
  s.phaseT = 1.5;
}

function resetPlayer(s: State) {
  s.p = { ...makeBody(s.start.x, s.start.y, 12, 15), facing: 1, invuln: 2, shootCd: 0, anim: 0, dead: false };
}

export function create(difficulty: DifficultySetting, random: () => number, startStage = 0): State {
  const s = {
    ...baseState(),
    difficulty,
    lives: DIFFICULTY[difficulty].lives,
    power: { speed: false, strong: false, range: false },
    giant: 0,
    won: false,
    reached: startStage,
    nextLife: 50000,
    sparks: [],
    flakes: Array.from({ length: 40 }, (_, i) => ({ x: (i * 53) % AW, y: (i * 97) % AH, s: 0.5 + ((i * 7) % 5) / 4 })),
    stats: { bestCombo: 0, bosses: 0, cleared: 0, deaths: 0, giant: false, foods: 0 },
  } as unknown as State;
  loadStage(s, startStage, random);
  return s;
}

/* ---------------------------------------------------------------- update */

export function update(s: State, dt: number, input: Input, random: () => number) {
  s.pops = s.pops.filter((q) => (q.t -= dt) > 0);
  updateSparks(s.sparks, dt, 300);
  for (const f of s.flakes) {
    f.y += f.s * 18 * dt;
    f.x += Math.sin(s.time + f.y * 0.05) * 6 * dt;
    if (f.y > AH) f.y -= AH;
  }
  if (s.phase === 'intro') {
    if ((s.phaseT -= dt) <= 0) s.phase = 'play';
    return;
  }
  if (s.phase === 'done') return;
  if (s.phase === 'dying') {
    s.p.vy += 700 * dt;
    s.p.y += s.p.vy * dt;
    if ((s.phaseT -= dt) <= 0) {
      s.lives--;
      if (s.lives < 0) {
        s.lives = 0;
        s.over = true;
        s.phase = 'done';
        return;
      }
      s.power = { speed: false, strong: false, range: false };
      resetPlayer(s);
      s.phase = 'play';
    }
    return;
  }

  s.stageTime += dt;
  updatePlayer(s, dt, input);
  updateShots(s, dt);
  updateEnemies(s, dt, random);
  if (s.boss) updateBoss(s, dt, random);
  updateFires(s, dt);
  updatePickups(s, dt);
  updateGhost(s, dt);
  if (s.phase === 'play') touchEnemies(s);

  if (s.phase === 'play') {
    const left = s.enemies.some((e) => e.state !== 'dead') || (s.boss && !s.boss.dead);
    if (!left) {
      s.phase = 'clear';
      s.phaseT = 3;
      s.ghost = null;
      s.fires = [];
      const bonus = s.stageTime < 30 ? 3000 : 1000;
      addScore(s, bonus, AW / 2, AH / 2 - 20);
      sound(s, 'levelComplete');
    }
  } else if (s.phase === 'clear') {
    if ((s.phaseT -= dt) <= 0) {
      s.stats.cleared++;
      if (s.stage + 1 >= STAGES) {
        s.won = true;
        s.over = true;
        s.phase = 'done';
        return;
      }
      loadStage(s, s.stage + 1, random);
    }
  }
}

function updatePlayer(s: State, dt: number, input: Input) {
  const p = s.p;
  const speed = PHYS.walk * (s.power.speed ? 1.35 : 1) * (s.giant > 0 ? 1.25 : 1);
  const dir = (input.held.has('right') ? 1 : 0) - (input.held.has('left') ? 1 : 0);
  p.vx = dir * speed;
  if (dir) p.facing = dir as 1 | -1;
  p.anim += Math.abs(p.vx) * dt * 0.1;
  p.invuln = Math.max(0, p.invuln - dt);
  p.shootCd = Math.max(0, p.shootCd - dt);
  s.giant = Math.max(0, s.giant - dt);
  const jump = input.pressed.has('action') || input.pressed.has('up');
  const drop = input.held.has('down') && jump;
  if (jump && p.ground && !drop) {
    p.vy = -PHYS.jump;
    sound(s, 'jump');
  }
  p.vy = Math.min(PHYS.maxFall, p.vy + PHYS.gravity * dt);
  const prevX = p.x;
  moveBody(s.grid, p, dt, drop || (input.held.has('down') && p.vy > 0 && dropping(s)));
  clampTop(p);

  // Pushing a snowball along.
  const moved = p.x - prevX;
  if (moved !== 0) {
    for (const e of s.enemies) {
      if (e.state !== 'free' || e.snow < FULL || !overlaps(p, e.w.b)) continue;
      const b = e.w.b;
      b.vx = moved / dt * 0.7;
      b.vy = 0;
      const res = moveBody(s.grid, b, dt);
      if (res.wall) p.x = moved > 0 ? b.x - p.w : b.x + b.w;
      else p.x = moved > 0 ? Math.min(p.x, b.x - p.w + 2) : Math.max(p.x, b.x + b.w - 2);
    }
  }

  if (input.pressed.has('action2') && p.shootCd <= 0) {
    // Kick a snowball right in front of Yuki, otherwise throw snow.
    const reach = { x: p.facing > 0 ? p.x + p.w - 2 : p.x - 8, y: p.y, w: 10, h: p.h };
    const ball = s.enemies.find((e) => e.state === 'free' && e.snow >= FULL && overlaps(reach, e.w.b));
    if (ball) {
      ball.state = 'rolling';
      ball.w.dir = p.facing;
      ball.bounces = 0;
      ball.combo = 0;
      ball.timer = 6;
      sound(s, 'hit');
      p.shootCd = 0.2;
    } else if (s.shots.length < (s.power.range ? 4 : 3)) {
      s.shots.push({ x: p.x + p.w / 2 + p.facing * 6, y: p.y + 5, vx: p.facing * 210, vy: -20, life: s.power.range ? 0.55 : 0.34 });
      p.shootCd = 0.16;
      sound(s, 'shoot');
    }
  }
}

function dropping(s: State) {
  return s.p.y + s.p.h < 13 * AT - 2;
}

function updateShots(s: State, dt: number) {
  for (let i = s.shots.length - 1; i >= 0; i--) {
    const sh = s.shots[i];
    sh.vy += 160 * dt;
    sh.x += sh.vx * dt;
    sh.y += sh.vy * dt;
    sh.life -= dt;
    const col = Math.floor(sh.x / AT);
    const row = Math.floor(sh.y / AT);
    let gone = sh.life <= 0 || col <= 0 || col >= 15 || (s.grid.cells[row * s.grid.cols + col] === 1 && row >= 0);
    const hitBox = { x: sh.x - 3, y: sh.y - 3, w: 6, h: 6 };
    if (!gone) {
      for (const e of s.enemies) {
        if ((e.state === 'free' || e.state === 'arrive') && e.snow < FULL && overlaps(hitBox, e.w.b)) {
          e.snow = Math.min(FULL, e.snow + (s.power.strong ? 2 : 1));
          e.melt = 2.6 * DIFFICULTY[s.difficulty].melt;
          if (e.state === 'arrive') e.state = 'free';
          addScore(s, 10);
          sound(s, e.snow >= FULL ? 'pop' : 'blip');
          gone = true;
          break;
        }
      }
    }
    const boss = s.boss;
    if (!gone && boss && !boss.dead && overlaps(hitBox, boss.b)) {
      if (boss.invuln <= 0) hitBoss(s, 0.06);
      gone = true;
    }
    if (gone) {
      burst(s.sparks, sh.x, sh.y, '#e0f2fe', 4, 50);
      s.shots.splice(i, 1);
    }
  }
}

function killEnemy(s: State, e: Enemy, points: number, random: () => number) {
  const b = e.w.b;
  e.state = 'dead';
  e.timer = 0.6;
  addScore(s, points, b.x + 7, b.y);
  burst(s.sparks, b.x + 7, b.y + 7, '#bae6fd', 12, 120);
  // Every defeated enemy leaves a treat; some leave a potion.
  const roll = random();
  const kind: PickupKind = roll < 0.05 ? 'green' : roll < 0.13 ? 'red' : roll < 0.21 ? 'blue' : roll < 0.29 ? 'yellow' : 'food';
  const pb = makeBody(b.x, b.y, 12, 12);
  pb.vy = -180;
  s.pickups.push({ b: pb, kind, food: Math.min(FOODS.length - 1, Math.floor(random() * (2 + s.plan.land))), life: 9 });
}

function updateEnemies(s: State, dt: number, random: () => number) {
  const p = s.p;
  const target = { x: p.x, y: p.y };
  const spd = DIFFICULTY[s.difficulty].speed;
  for (const e of s.enemies) {
    const b = e.w.b;
    if (e.state === 'dead') {
      e.timer -= dt;
      continue;
    }
    if (e.state === 'arrive') {
      if ((e.timer -= dt) <= 0) e.state = 'free';
      continue;
    }
    if (e.state === 'rolling') {
      b.vx = e.w.dir * 220;
      b.vy = Math.min(PHYS.maxFall, b.vy + PHYS.gravity * dt);
      const res = moveBody(s.grid, b, dt);
      e.spin += e.w.dir * dt * 14;
      if (res.wall) {
        e.w.dir = -res.wall;
        e.bounces++;
        sound(s, 'blip');
      }
      e.timer -= dt;
      // Flatten everything in the way.
      for (const o of s.enemies) {
        if (o === e || o.state === 'dead' || !overlaps(b, o.w.b)) continue;
        e.combo++;
        s.stats.bestCombo = Math.max(s.stats.bestCombo, e.combo);
        killEnemy(s, o, Math.min(8000, 500 * 2 ** (e.combo - 1)), random);
        sound(s, 'hit');
      }
      const boss = s.boss;
      if (boss && !boss.dead && overlaps(b, boss.b)) {
        if (boss.invuln <= 0) hitBoss(s, 1);
        e.bounces = 99;
      }
      const onFloor = b.y + b.h >= 13 * AT - 1;
      if (e.bounces >= 4 || (onFloor && e.bounces >= 2) || e.timer <= 0) {
        killEnemy(s, e, 500, random);
        sound(s, 'explosion');
      }
      continue;
    }
    // Snow melts unless topped up.
    if (e.snow > 0) {
      e.melt -= dt;
      if (e.melt <= 0) {
        e.snow--;
        e.melt = 1.3 * DIFFICULTY[s.difficulty].melt;
      }
      b.vx = 0;
      if (e.base === 'wisp') b.vx = 0;
      b.vy = Math.min(PHYS.maxFall, b.vy + PHYS.gravity * dt);
      moveBody(s.grid, b, dt);
      if (e.snow === 0 && e.base === 'wisp') {
        b.vx = (random() < 0.5 ? -1 : 1) * 46;
        b.vy = -38;
      }
      continue;
    }
    if (e.base === 'wisp') {
      const sp = Math.hypot(b.vx, b.vy) || 1;
      const want = 60 * spd;
      b.vx = (b.vx / sp) * want;
      b.vy = (b.vy / sp) * want;
      stepFlier(s.grid, b, dt);
      continue;
    }
    const hop = e.base === 'hopper' ? 0.9 : 0.55;
    stepWalker(s.grid, e.w, dt, target, random, { speed: (e.base === 'hopper' ? 50 : 40) * spd, jump: 345, gravity: PHYS.gravity, hop });
    clampTop(b);
    if (e.base === 'hopper' && b.ground && random() < dt * 0.8) b.vy = -230;
    if (e.base === 'flamer' && b.ground) {
      e.fireCd -= dt;
      if (e.fireCd <= 0) {
        e.fireCd = 2.2 + random() * 1.5;
        if (Math.abs(p.y - b.y) < 20) {
          const dir = p.x < b.x ? -1 : 1;
          e.w.dir = dir;
          s.fires.push({ x: b.x + 7 + dir * 8, y: b.y + 6, vx: dir * 115 * spd, vy: 0, life: 2.5 });
          sound(s, 'shoot');
        }
      }
    }
  }
}

function touchEnemies(s: State) {
  const p = s.p;
  for (const e of s.enemies) {
    if (e.state !== 'free' || e.snow > 0 || !overlaps(p, e.w.b)) continue;
    if (s.giant > 0) {
      e.state = 'dead';
      e.timer = 0.6;
      addScore(s, 1000, e.w.b.x, e.w.b.y);
      sound(s, 'hit');
      continue;
    }
    hurt(s);
    return;
  }
}

function hurt(s: State) {
  if (s.p.invuln > 0 || s.giant > 0 || s.phase !== 'play') return;
  s.phase = 'dying';
  s.phaseT = 1.6;
  s.p.dead = true;
  s.p.vy = -280;
  s.stats.deaths++;
  s.shots = [];
  sound(s, 'failure');
}

function updateFires(s: State, dt: number) {
  for (let i = s.fires.length - 1; i >= 0; i--) {
    const f = s.fires[i];
    f.vy += (f.vy !== 0 ? 300 : 0) * dt;
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    if ((f.life -= dt) <= 0 || f.x < AT || f.x > AW - AT || f.y > AH) {
      s.fires.splice(i, 1);
      continue;
    }
    const p = s.p;
    if (s.phase === 'play' && f.x > p.x && f.x < p.x + p.w && f.y > p.y && f.y < p.y + p.h) {
      s.fires.splice(i, 1);
      hurt(s);
    }
  }
}

function updatePickups(s: State, dt: number) {
  const p = s.p;
  for (let i = s.pickups.length - 1; i >= 0; i--) {
    const it = s.pickups[i];
    it.b.vx = 0;
    it.b.vy = Math.min(PHYS.maxFall, it.b.vy + PHYS.gravity * dt);
    moveBody(s.grid, it.b, dt);
    if ((it.life -= dt) <= 0) {
      s.pickups.splice(i, 1);
      continue;
    }
    if (s.phase === 'dying' || !overlaps(p, it.b)) continue;
    s.pickups.splice(i, 1);
    if (it.kind === 'food') {
      s.stats.foods++;
      addScore(s, FOODS[it.food].points, it.b.x, it.b.y);
      sound(s, 'coin');
    } else {
      if (it.kind === 'red') s.power.speed = true;
      if (it.kind === 'blue') s.power.strong = true;
      if (it.kind === 'yellow') s.power.range = true;
      if (it.kind === 'green') {
        s.giant = 8;
        s.stats.giant = true;
      }
      pop(s, it.b.x, it.b.y, it.kind === 'red' ? 'Speed!' : it.kind === 'blue' ? 'Power!' : it.kind === 'yellow' ? 'Range!' : 'Super Yuki!');
      sound(s, 'powerup');
    }
  }
}

function updateGhost(s: State, dt: number) {
  if (s.phase !== 'play') return;
  if (!s.ghost && s.stageTime > 50 && !s.plan.boss) {
    s.ghost = { x: AW / 2, y: -20 };
    sound(s, 'whoosh');
  }
  if (!s.ghost) return;
  const g = s.ghost;
  const dx = s.p.x + 6 - g.x;
  const dy = s.p.y + 7 - g.y;
  const d = Math.hypot(dx, dy) || 1;
  const sp = 30 + Math.min(40, (s.stageTime - 50) * 1.5);
  g.x += (dx / d) * sp * dt;
  g.y += (dy / d) * sp * dt;
  if (d < 11) hurt(s);
}

/* ------------------------------------------------------------------ boss */

function hitBoss(s: State, n: number) {
  const boss = s.boss!;
  boss.hp -= n;
  if (n >= 1) {
    boss.invuln = 0.8;
    sound(s, 'explosion');
    burst(s.sparks, boss.b.x + boss.b.w / 2, boss.b.y + boss.b.h / 2, '#fde047', 16, 160);
  }
  if (boss.hp <= 0 && !boss.dead) {
    boss.dead = true;
    boss.b.vy = -250;
    s.stats.bosses++;
    s.fires = [];
    addScore(s, 10000, boss.b.x + boss.b.w / 2, boss.b.y);
    // Minions vanish with their master.
    for (const e of s.enemies) if (e.state !== 'dead') {
      e.state = 'dead';
      e.timer = 0.6;
    }
  }
}

function updateBoss(s: State, dt: number, random: () => number) {
  const boss = s.boss!;
  const b = boss.b;
  const p = s.p;
  boss.invuln = Math.max(0, boss.invuln - dt);
  if (boss.dead) {
    b.vy += 600 * dt;
    b.y += b.vy * dt;
    return;
  }
  const spd = DIFFICULTY[s.difficulty].speed;
  boss.timer -= dt;
  boss.spawn -= dt;
  const minions = s.enemies.filter((e) => e.state !== 'dead').length;
  if (boss.spawn <= 0) {
    boss.spawn = 4 - boss.kind * 0.4;
    if (minions < 3 + boss.kind) {
      const kind: EnemyKind = boss.kind === 0 ? 'imp' : boss.kind === 1 ? 'wisp' : 'flamer';
      const e = newEnemy('minion', kind, b.x + b.w / 2 - 7, b.y + b.h - 14, random);
      e.timer = 0.3;
      if (kind !== 'wisp') e.w.b.vy = -200;
      s.enemies.push(e);
      sound(s, 'pop');
    }
  }
  if (boss.kind === 1) {
    // Gloomwing glides about the top of the room and dives at Yuki.
    boss.phase += dt;
    if (boss.swoop > 0) {
      boss.swoop -= dt;
      b.x += (p.x - b.x - b.w / 2 + 6) * dt * 1.6;
      b.y += ((boss.swoop > 0.9 ? p.y - 10 : 30) - b.y) * dt * 2.2;
    } else {
      b.x = AW / 2 - b.w / 2 + Math.sin(boss.phase * 0.9) * 80;
      b.y += (30 + Math.sin(boss.phase * 2) * 10 - b.y) * dt * 3;
      if (boss.timer <= 0) {
        boss.swoop = 1.8;
        boss.timer = 4.5 / spd;
        sound(s, 'whoosh');
      }
    }
  } else {
    // Big Lumpkin and Magmaw bound about the floor; Magmaw also breathes fire.
    if (b.ground && boss.timer <= 0) {
      boss.dir = p.x < b.x ? -1 : 1;
      if (boss.kind === 2 && random() < 0.5) {
        for (const a of [-0.5, -0.25, 0]) {
          s.fires.push({ x: b.x + b.w / 2, y: b.y + 14, vx: boss.dir * 120 * Math.cos(a) * spd, vy: 160 * Math.sin(a) - 30, life: 3 });
        }
        sound(s, 'shoot');
        boss.timer = 1.8;
      } else {
        b.vy = -380 - random() * 80;
        b.vx = boss.dir * (60 + random() * 50) * spd;
        boss.timer = (boss.kind === 0 ? 2 : 2.4) / spd;
      }
    }
    b.vy = Math.min(PHYS.maxFall, b.vy + PHYS.gravity * dt);
    const wasGround = b.ground;
    const res = moveBody(s.grid, b, dt, true);
    if (res.wall) b.vx = -b.vx * 0.5;
    if (b.ground) {
      b.vx *= 0.8;
      if (!wasGround) sound(s, 'hit');
    }
  }
  if (s.phase === 'play' && overlaps(p, { x: b.x + 4, y: b.y + 4, w: b.w - 8, h: b.h - 6 })) {
    if (s.giant > 0) {
      if (boss.invuln <= 0) hitBoss(s, 1);
    } else hurt(s);
  }
}

export { BOSSES, PER_LAND };
