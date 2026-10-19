import type { DifficultySetting } from '@/types';
import type { SoundName } from '@/services/audio';
import { baseState } from '../_shared/arcade/kit';
import type { BaseState, Input } from '../_shared/arcade/kit';
import type { Spark } from '../_shared/arcade/draw';
import { burst, updateSparks } from '../_shared/arcade/draw';
import { AH, AT, AW, buildArena, makeBody, stepFlier, stepWalker } from '../_shared/platform/arena';
import type { Walker } from '../_shared/platform/arena';
import { moveBody, overlaps } from '../_shared/platform/tiles';
import type { Body, Grid } from '../_shared/platform/tiles';
import { BOSSES, LETTERS, STAGES, stagePlan } from './stages';
import type { EnemyKind, StagePlan } from './stages';

/**
 * Bubble Buddies rules. Blow bubbles to trap monsters, then pop the bubble
 * to defeat them — they turn into fruit. Bubbles float to the top of the
 * screen; jump onto one while holding jump to bounce off it.
 */

export const PHYS = { walk: 72, jump: 335, gravity: 980, maxFall: 330 };

export const DIFFICULTY: Record<DifficultySetting, { lives: number; speed: number; trap: number; bossHp: number }> = {
  easy: { lives: 5, speed: 0.8, trap: 11, bossHp: 0.75 },
  normal: { lives: 3, speed: 1, trap: 8, bossHp: 1 },
  hard: { lives: 3, speed: 1.2, trap: 6, bossHp: 1.35 },
};

const R = 8; // bubble radius
const CHAIN = [1000, 2000, 4000, 8000, 16000, 32000];
export const FRUITS = [
  { name: 'cherry', points: 100, color: '#dc2626' },
  { name: 'banana', points: 200, color: '#facc15' },
  { name: 'melon', points: 500, color: '#4ade80' },
  { name: 'grapes', points: 1000, color: '#a855f7' },
  { name: 'peach', points: 2000, color: '#fdba74' },
  { name: 'pineapple', points: 3000, color: '#eab308' },
];

export type BubbleKind = 'plain' | 'lightning' | 'fire' | 'letter';

export interface Bubble {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Seconds left of the "blown" phase, while it can catch monsters. */
  shot: number;
  life: number;
  kind: BubbleKind;
  letter: number;
  enemy: Enemy | null;
  wobble: number;
  popped: boolean;
  /** Seconds since it was blown; Fizz cannot pop her own bubble straight away. */
  age: number;
}

export interface Player extends Body {
  facing: 1 | -1;
  invuln: number;
  blowCd: number;
  anim: number;
  dead: boolean;
}

export interface Enemy {
  kind: EnemyKind;
  w: Walker;
  state: 'arrive' | 'free' | 'trapped' | 'dead';
  angry: boolean;
  timer: number;
  throwCd: number;
}

export interface Fruit {
  b: Body;
  kind: number;
  life: number;
  /** Seconds of the fly-off arc before it lands. */
  flying: number;
}

export interface Shot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  kind: 'rock' | 'bottle' | 'bolt' | 'flame';
}

export interface Boss {
  kind: number;
  b: Body;
  hp: number;
  maxHp: number;
  timer: number;
  invuln: number;
  dead: boolean;
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
  bubbles: Bubble[];
  fruits: Fruit[];
  shots: Shot[];
  flames: { x: number; y: number; life: number }[];
  boss: Boss | null;
  ghost: { x: number; y: number } | null;
  pops: { x: number; y: number; t: number; text: string }[];
  sparks: Spark[];
  lives: number;
  phase: Phase;
  phaseT: number;
  stageTime: number;
  specialT: number;
  letterT: number;
  letters: boolean[];
  power: { range: boolean; speed: boolean; rapid: boolean };
  pickups: { b: Body; kind: 'range' | 'speed' | 'rapid'; life: number }[];
  won: boolean;
  reached: number;
  nextLife: number;
  stats: { bestChain: number; bosses: number; cleared: number; deaths: number; splash: number; fruit: number };
}

/* ------------------------------------------------------------------ setup */

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
    s.nextLife += 60000;
    s.lives++;
    sound(s, 'powerup');
  }
}

function newEnemy(kind: EnemyKind, x: number, y: number, random: () => number): Enemy {
  const b = makeBody(x, y, 14, 14);
  if (kind === 'drifter') {
    b.vx = (random() < 0.5 ? -1 : 1) * 42;
    b.vy = (random() < 0.5 ? -1 : 1) * 42;
  }
  return { kind, w: { b, dir: random() < 0.5 ? -1 : 1, think: random(), dropping: false }, state: 'arrive', angry: false, timer: 1, throwCd: 2 + random() * 2 };
}

export function loadStage(s: State, index: number, random: () => number) {
  const plan = stagePlan(index);
  const arena = buildArena(plan.layout, { wrapY: true });
  s.stage = index;
  s.reached = Math.max(s.reached, index);
  s.plan = plan;
  s.grid = arena.grid;
  s.start = { x: arena.player.c * AT + 2, y: (arena.player.r + 1) * AT - 14 };
  s.enemies = [];
  s.bubbles = [];
  s.fruits = [];
  s.shots = [];
  s.flames = [];
  s.pickups = [];
  s.ghost = null;
  s.pops = [];
  s.stageTime = 0;
  s.specialT = 2;
  s.letterT = 6 + random() * 8;
  s.boss = null;
  const spots = [...arena.spawns];
  plan.enemies.forEach((kind, i) => {
    const k = Math.floor(random() * spots.length);
    const spot = spots.splice(k, 1)[0] ?? arena.spawns[i % arena.spawns.length];
    s.enemies.push(newEnemy(kind, spot.c * AT + 1, (spot.r + 1) * AT - 14, random));
  });
  if (plan.boss !== null) {
    const hp = Math.round((plan.boss === 0 ? 10 : 16) * DIFFICULTY[s.difficulty].bossHp);
    const b = makeBody(AW / 2 - 20, 40, 40, 40);
    b.vx = 60;
    b.vy = 50;
    s.boss = { kind: plan.boss, b, hp, maxHp: hp, timer: 2, invuln: 0, dead: false };
  }
  resetPlayer(s);
  s.phase = 'intro';
  s.phaseT = 1.5;
}

function resetPlayer(s: State) {
  s.p = { ...makeBody(s.start.x, s.start.y, 12, 14), facing: 1, invuln: 2.5, blowCd: 0, anim: 0, dead: false };
}

export function create(difficulty: DifficultySetting, random: () => number, startStage = 0): State {
  const s = {
    ...baseState(),
    difficulty,
    lives: DIFFICULTY[difficulty].lives,
    letters: LETTERS.map(() => false),
    power: { range: false, speed: false, rapid: false },
    won: false,
    reached: startStage,
    nextLife: 60000,
    sparks: [],
    stats: { bestChain: 0, bosses: 0, cleared: 0, deaths: 0, splash: 0, fruit: 0 },
  } as unknown as State;
  loadStage(s, startStage, random);
  return s;
}

/* ----------------------------------------------------------------- update */

export function update(s: State, dt: number, input: Input, random: () => number) {
  s.pops = s.pops.filter((q) => (q.t -= dt) > 0);
  updateSparks(s.sparks, dt, 200);
  if (s.phase === 'intro') {
    if ((s.phaseT -= dt) <= 0) s.phase = 'play';
    return;
  }
  if (s.phase === 'done') return;
  if (s.phase === 'dying') {
    s.p.vy += 600 * dt;
    s.p.y += s.p.vy * dt;
    if ((s.phaseT -= dt) <= 0) {
      s.lives--;
      if (s.lives < 0) {
        s.lives = 0;
        s.over = true;
        s.phase = 'done';
        return;
      }
      s.power = { range: false, speed: false, rapid: false };
      resetPlayer(s);
      s.phase = 'play';
    }
    return;
  }

  s.stageTime += dt;
  updatePlayer(s, dt, input);
  updateBubbles(s, dt, random);
  touchBubbles(s, input, random);
  updateEnemies(s, dt, random);
  if (s.boss) updateBoss(s, dt, random);
  updateShots(s, dt, random);
  updateFlames(s, dt, random);
  updateFruits(s, dt);
  updatePickups(s, dt);
  spawnSpecials(s, dt, random);
  updateGhost(s, dt);
  if (s.phase === 'play') touchEnemies(s);

  if (s.phase === 'play') {
    const left = s.enemies.some((e) => e.state !== 'dead') || (s.boss && !s.boss.dead);
    if (!left) {
      s.phase = 'clear';
      s.phaseT = 3.5;
      s.ghost = null;
      s.shots = s.shots.filter((x) => x.kind === 'bolt');
      addScore(s, s.stageTime < 25 ? 3000 : 1000, AW / 2, AH / 2 - 20);
      sound(s, 'levelComplete');
    }
  } else if (s.phase === 'clear') {
    if ((s.phaseT -= dt) <= 0) nextStage(s, random);
  }
}

function nextStage(s: State, random: () => number) {
  s.stats.cleared++;
  if (s.stage + 1 >= STAGES) {
    s.won = true;
    s.over = true;
    s.phase = 'done';
    return;
  }
  loadStage(s, s.stage + 1, random);
}

function updatePlayer(s: State, dt: number, input: Input) {
  const p = s.p;
  const dir = (input.held.has('right') ? 1 : 0) - (input.held.has('left') ? 1 : 0);
  p.vx = dir * PHYS.walk * (s.power.speed ? 1.35 : 1);
  if (dir) p.facing = dir as 1 | -1;
  p.anim += Math.abs(p.vx) * dt * 0.1;
  p.invuln = Math.max(0, p.invuln - dt);
  p.blowCd = Math.max(0, p.blowCd - dt);
  if ((input.pressed.has('action') || input.pressed.has('up')) && p.ground) {
    p.vy = -PHYS.jump;
    sound(s, 'jump');
  }
  p.vy = Math.min(PHYS.maxFall, p.vy + PHYS.gravity * dt);
  moveBody(s.grid, p, dt);

  if (input.pressed.has('action2') && p.blowCd <= 0 && s.bubbles.filter((b) => b.shot > 0).length < 3) {
    s.bubbles.push({
      x: p.x + p.w / 2 + p.facing * 8,
      y: p.y + 7,
      vx: p.facing * (s.power.range ? 290 : 230),
      vy: 0,
      shot: s.power.range ? 0.32 : 0.24,
      life: 9,
      kind: 'plain',
      letter: 0,
      enemy: null,
      wobble: Math.random() * 6,
      popped: false,
      age: 0,
    });
    p.blowCd = s.power.rapid ? 0.18 : 0.32;
    sound(s, 'blip');
  }
}

/* ---------------------------------------------------------------- bubbles */

function updateBubbles(s: State, dt: number, random: () => number) {
  const trap = DIFFICULTY[s.difficulty].trap;
  for (const bb of s.bubbles) {
    bb.wobble += dt * 3;
    bb.age += dt;
    if (bb.shot > 0) {
      bb.shot -= dt;
      bb.x += bb.vx * dt;
      bb.vx *= 1 - dt * 3;
      if (bb.x < AT + R) {
        bb.x = AT + R;
        bb.shot = 0;
      }
      if (bb.x > AW - AT - R) {
        bb.x = AW - AT - R;
        bb.shot = 0;
      }
      // A freshly blown bubble swallows the first monster it touches.
      if (!bb.enemy && bb.kind === 'plain') {
        for (const e of s.enemies) {
          if (e.state !== 'free') continue;
          const b = e.w.b;
          if (Math.abs(b.x + 7 - bb.x) < R + 6 && Math.abs(b.y + 7 - bb.y) < R + 6) {
            bb.enemy = e;
            e.state = 'trapped';
            e.timer = trap;
            bb.shot = 0;
            bb.life = trap + 0.5;
            sound(s, 'pop');
            break;
          }
        }
      }
      if (s.boss && !s.boss.dead && bb.shot > 0 && overlaps({ x: bb.x - R, y: bb.y - R, w: 2 * R, h: 2 * R }, s.boss.b)) bb.popped = true;
    } else {
      // Float up towards the ceiling, drifting to the middle of the room.
      const topY = AT + R + 2 + (bb.kind === 'plain' ? 0 : 0);
      bb.vy = bb.y > topY ? -26 - (bb.kind !== 'plain' ? 6 : 0) : (topY - bb.y) * 2;
      bb.vx = Math.max(-18, Math.min(18, (AW / 2 - bb.x) * 0.3)) + Math.sin(bb.wobble) * 6;
      bb.x += bb.vx * dt;
      bb.y += bb.vy * dt;
      bb.x = Math.max(AT + R, Math.min(AW - AT - R, bb.x));
    }
    bb.life -= dt;
    if (bb.enemy) {
      const e = bb.enemy;
      e.timer -= dt;
      e.w.b.x = bb.x - 7;
      e.w.b.y = bb.y - 7;
      if (e.timer <= 0) {
        // Broke out — and it is cross about it.
        e.state = 'free';
        e.angry = true;
        e.w.b.vy = 0;
        bb.enemy = null;
        bb.popped = true;
        sound(s, 'hit');
      }
    }
    if (bb.life <= 0 && !bb.enemy) bb.popped = true;
  }
  // Bubbles nudge each other apart.
  for (let i = 0; i < s.bubbles.length; i++) {
    for (let j = i + 1; j < s.bubbles.length; j++) {
      const a = s.bubbles[i];
      const b = s.bubbles[j];
      if (a.shot > 0 || b.shot > 0) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy) || 0.01;
      if (d < R * 2) {
        const push = (R * 2 - d) * 0.5;
        a.x -= (dx / d) * push;
        a.y -= (dy / d) * push;
        b.x += (dx / d) * push;
        b.y += (dy / d) * push;
      }
    }
  }
  s.bubbles = s.bubbles.filter((b) => !b.popped);
  void random;
}

/** Pops a bubble and every bubble touching it, counting trapped monsters. */
function popChain(s: State, first: Bubble, random: () => number) {
  const queue = [first];
  first.popped = true;
  let kills = 0;
  const popped: Bubble[] = [];
  while (queue.length) {
    const b = queue.shift()!;
    popped.push(b);
    for (const o of s.bubbles) {
      if (o.popped || o.shot > 0) continue;
      if (Math.hypot(o.x - b.x, o.y - b.y) < R * 2.6) {
        o.popped = true;
        queue.push(o);
      }
    }
  }
  for (const b of popped) {
    burst(s.sparks, b.x, b.y, '#bae6fd', 6, 70);
    if (b.enemy) {
      const e = b.enemy;
      e.state = 'dead';
      b.enemy = null;
      const fb = makeBody(b.x - 6, b.y - 6, 12, 12);
      fb.vx = (random() - 0.5) * 140;
      fb.vy = -220;
      const tier = Math.min(FRUITS.length - 1, kills + Math.floor(s.stage / 12));
      s.fruits.push({ b: fb, kind: tier, life: 10, flying: 0.8 });
      addScore(s, CHAIN[Math.min(kills, CHAIN.length - 1)], b.x, b.y);
      kills++;
    } else if (b.kind === 'lightning') {
      const dir = s.p.facing;
      s.shots.push({ x: b.x, y: b.y, vx: dir * 260, vy: 0, life: 1.4, kind: 'bolt' });
      sound(s, 'explosion');
    } else if (b.kind === 'fire') {
      s.shots.push({ x: b.x, y: b.y, vx: 0, vy: 40, life: 4, kind: 'flame' });
    } else if (b.kind === 'letter') {
      if (!s.letters[b.letter]) {
        s.letters[b.letter] = true;
        addScore(s, 500, b.x, b.y);
        sound(s, 'coin');
        if (s.letters.every(Boolean)) {
          s.letters = LETTERS.map(() => false);
          s.lives++;
          s.stats.splash++;
          pop(s, AW / 2, AH / 2, 'SPLASH! Extra life!');
          sound(s, 'achievement');
        }
      }
    } else addScore(s, 10);
  }
  if (kills) {
    s.stats.bestChain = Math.max(s.stats.bestChain, kills);
    sound(s, kills > 1 ? 'success' : 'pop');
  } else sound(s, 'pop');
}

/** Pip touching bubbles: pop them, or bounce off them while holding jump. */
function touchBubbles(s: State, input: Input, random: () => number) {
  const p = s.p;
  if (s.phase !== 'play' && s.phase !== 'clear') return;
  const jumpHeld = input.held.has('action') || input.held.has('up');
  for (const b of s.bubbles) {
    if (b.popped || b.age < 0.3) continue;
    const nx = Math.max(p.x, Math.min(b.x, p.x + p.w));
    const ny = Math.max(p.y, Math.min(b.y, p.y + p.h));
    if ((nx - b.x) ** 2 + (ny - b.y) ** 2 > R * R) continue;
    const above = p.vy > 0 && p.y + p.h < b.y;
    if (above && jumpHeld && !b.enemy && b.kind === 'plain') {
      p.vy = -PHYS.jump * 0.9;
      sound(s, 'jump');
      continue;
    }
    popChain(s, b, random);
  }
  s.bubbles = s.bubbles.filter((b) => !b.popped);
}

/* ---------------------------------------------------------------- enemies */

function updateEnemies(s: State, dt: number, random: () => number) {
  const p = s.p;
  const hurry = s.stageTime > 30;
  for (const e of s.enemies) {
    if (e.state === 'dead' || e.state === 'trapped') continue;
    const b = e.w.b;
    if (e.state === 'arrive') {
      if ((e.timer -= dt) <= 0) e.state = 'free';
      continue;
    }
    const spd = DIFFICULTY[s.difficulty].speed * (e.angry || hurry ? 1.5 : 1);
    if (e.kind === 'drifter') {
      const sp = Math.hypot(b.vx, b.vy) || 1;
      b.vx = (b.vx / sp) * 58 * spd;
      b.vy = (b.vy / sp) * 58 * spd;
      stepFlier(s.grid, b, dt);
      continue;
    }
    stepWalker(s.grid, e.w, dt, { x: p.x, y: p.y }, random, {
      speed: (e.kind === 'hopper' ? 46 : 40) * spd,
      jump: 340,
      gravity: PHYS.gravity,
      hop: e.kind === 'hopper' ? 0.9 : 0.6,
    });
    if (e.kind === 'hopper' && b.ground && random() < dt * 0.9) b.vy = -240;
    if (e.kind === 'thrower' && b.ground) {
      e.throwCd -= dt;
      if (e.throwCd <= 0) {
        e.throwCd = 2.2 + random() * 1.5;
        if (Math.abs(p.y - b.y) < 18) {
          const dir = p.x < b.x ? -1 : 1;
          e.w.dir = dir;
          s.shots.push({ x: b.x + 7 + dir * 8, y: b.y + 6, vx: dir * 120 * spd, vy: 0, life: 2.2, kind: 'rock' });
          sound(s, 'shoot');
        }
      }
    }
  }
}

function touchEnemies(s: State) {
  const p = s.p;
  for (const e of s.enemies) {
    if (e.state === 'free' && overlaps(p, e.w.b)) {
      hurt(s);
      return;
    }
  }
}

function hurt(s: State) {
  if (s.p.invuln > 0 || s.phase !== 'play') return;
  s.phase = 'dying';
  s.phaseT = 1.6;
  s.p.dead = true;
  s.p.vy = -260;
  s.stats.deaths++;
  sound(s, 'failure');
}

/* ------------------------------------------------- shots, flames, fruit */

function updateShots(s: State, dt: number, random: () => number) {
  const p = s.p;
  for (let i = s.shots.length - 1; i >= 0; i--) {
    const sh = s.shots[i];
    if (sh.kind === 'bottle') sh.vy += 200 * dt;
    if (sh.kind === 'flame') {
      // A fireball drops to the next floor, then burns there for a while.
      const b = makeBody(sh.x - 4, sh.y - 4, 8, 8);
      b.vy = 200;
      const res = moveBody(s.grid, b, dt);
      sh.x = b.x + 4;
      sh.y = b.y + 4;
      if (res.landed) {
        for (let k = -2; k <= 2; k++) s.flames.push({ x: sh.x + k * 10, y: sh.y + 4, life: 3 });
        s.shots.splice(i, 1);
        sound(s, 'whoosh');
      }
      continue;
    }
    sh.x += sh.vx * dt;
    sh.y += sh.vy * dt;
    if ((sh.life -= dt) <= 0 || sh.x < AT - 8 || sh.x > AW - AT + 8 || sh.y > AH + 10) {
      s.shots.splice(i, 1);
      continue;
    }
    if (sh.kind === 'bolt') {
      // Lightning zaps monsters and the boss; harmless to Fizz.
      for (const e of s.enemies) {
        if (e.state === 'free' && Math.abs(e.w.b.x + 7 - sh.x) < 10 && Math.abs(e.w.b.y + 7 - sh.y) < 10) defeat(s, e, random);
      }
      const boss = s.boss;
      if (boss && !boss.dead && boss.invuln <= 0 && sh.x > boss.b.x && sh.x < boss.b.x + boss.b.w && sh.y > boss.b.y && sh.y < boss.b.y + boss.b.h) {
        hitBoss(s);
        s.shots.splice(i, 1);
      }
      continue;
    }
    if (s.phase === 'play' && sh.x > p.x - 2 && sh.x < p.x + p.w + 2 && sh.y > p.y && sh.y < p.y + p.h) {
      s.shots.splice(i, 1);
      hurt(s);
    }
  }
}

function defeat(s: State, e: Enemy, random: () => number) {
  e.state = 'dead';
  const b = e.w.b;
  const fb = makeBody(b.x, b.y, 12, 12);
  fb.vx = (random() - 0.5) * 120;
  fb.vy = -220;
  s.fruits.push({ b: fb, kind: Math.min(FRUITS.length - 1, 1 + Math.floor(s.stage / 12)), life: 10, flying: 0.8 });
  addScore(s, 1000, b.x + 7, b.y);
  sound(s, 'hit');
}

function updateFlames(s: State, dt: number, random: () => number) {
  for (let i = s.flames.length - 1; i >= 0; i--) {
    const f = s.flames[i];
    if ((f.life -= dt) <= 0) {
      s.flames.splice(i, 1);
      continue;
    }
    for (const e of s.enemies) {
      if (e.state === 'free' && Math.abs(e.w.b.x + 7 - f.x) < 9 && Math.abs(e.w.b.y + 14 - f.y) < 10) defeat(s, e, random);
    }
  }
}

function updateFruits(s: State, dt: number) {
  const p = s.p;
  for (let i = s.fruits.length - 1; i >= 0; i--) {
    const f = s.fruits[i];
    if (f.flying > 0) {
      f.flying -= dt;
      f.b.vy += 600 * dt;
      f.b.x = Math.max(AT, Math.min(AW - AT - 12, f.b.x + f.b.vx * dt));
      f.b.y += f.b.vy * dt;
      if (f.b.y > AH) f.b.y -= AH;
      continue;
    }
    f.b.vx = 0;
    f.b.vy = Math.min(PHYS.maxFall, f.b.vy + PHYS.gravity * dt);
    moveBody(s.grid, f.b, dt);
    if ((f.life -= dt) <= 0) {
      s.fruits.splice(i, 1);
      continue;
    }
    if (s.phase !== 'dying' && overlaps(p, f.b)) {
      s.fruits.splice(i, 1);
      s.stats.fruit++;
      addScore(s, FRUITS[f.kind].points, f.b.x + 6, f.b.y);
      sound(s, 'coin');
    }
  }
}

function updatePickups(s: State, dt: number) {
  for (let i = s.pickups.length - 1; i >= 0; i--) {
    const it = s.pickups[i];
    it.b.vy = Math.min(PHYS.maxFall, it.b.vy + PHYS.gravity * dt);
    moveBody(s.grid, it.b, dt);
    if ((it.life -= dt) <= 0) {
      s.pickups.splice(i, 1);
      continue;
    }
    if (s.phase !== 'dying' && overlaps(s.p, it.b)) {
      s.pickups.splice(i, 1);
      s.power[it.kind] = true;
      pop(s, it.b.x + 6, it.b.y, it.kind === 'range' ? 'Long bubbles!' : it.kind === 'speed' ? 'Speedy!' : 'Rapid bubbles!');
      sound(s, 'powerup');
    }
  }
}

/** Lightning and fire bubbles rise from the floor; letters and power-ups turn up now and then. */
function spawnSpecials(s: State, dt: number, random: () => number) {
  if (s.phase !== 'play') return;
  const plan = s.plan;
  if (plan.special !== 'none') {
    s.specialT -= dt;
    if (s.specialT <= 0) {
      s.specialT = plan.boss !== null ? 1.1 : 5;
      s.bubbles.push(blank(AT * 2 + random() * (AW - AT * 4), AH - AT - R, plan.special));
    }
  }
  s.letterT -= dt;
  if (s.letterT <= 0) {
    s.letterT = 14 + random() * 10;
    const missing = s.letters.map((got, i) => (got ? -1 : i)).filter((i) => i >= 0);
    if (missing.length) {
      const b = blank(AT * 2 + random() * (AW - AT * 4), AH - AT - R, 'letter');
      b.letter = missing[Math.floor(random() * missing.length)];
      s.bubbles.push(b);
    }
    if (random() < 0.35 && s.pickups.length === 0) {
      const kinds = ['range', 'speed', 'rapid'] as const;
      s.pickups.push({ b: makeBody(AT * 2 + random() * (AW - AT * 5), 10, 12, 12), kind: kinds[Math.floor(random() * 3)], life: 12 });
    }
  }
}

function blank(x: number, y: number, kind: BubbleKind): Bubble {
  return { x, y, vx: 0, vy: 0, shot: 0, life: 12, kind, letter: 0, enemy: null, wobble: x, popped: false, age: 1 };
}

function updateGhost(s: State, dt: number) {
  if (s.phase !== 'play' || s.plan.boss !== null) return;
  if (!s.ghost && s.stageTime > 45) {
    s.ghost = { x: AW / 2, y: -10 };
    sound(s, 'whoosh');
  }
  if (!s.ghost) return;
  const g = s.ghost;
  const dx = s.p.x + 6 - g.x;
  const dy = s.p.y + 7 - g.y;
  const d = Math.hypot(dx, dy) || 1;
  const sp = 32 + Math.min(40, (s.stageTime - 45) * 1.5);
  g.x += (dx / d) * sp * dt;
  g.y += (dy / d) * sp * dt;
  if (d < 11) hurt(s);
}

/* ------------------------------------------------------------------- boss */

function hitBoss(s: State) {
  const boss = s.boss!;
  boss.hp -= 1;
  boss.invuln = 0.4;
  sound(s, 'explosion');
  burst(s.sparks, boss.b.x + 20, boss.b.y + 20, '#fde047', 14, 140);
  if (boss.hp <= 0) {
    boss.dead = true;
    boss.b.vy = -200;
    s.stats.bosses++;
    s.shots = [];
    addScore(s, 20000, boss.b.x + 20, boss.b.y);
  }
}

function updateBoss(s: State, dt: number, random: () => number) {
  const boss = s.boss!;
  const b = boss.b;
  boss.invuln = Math.max(0, boss.invuln - dt);
  if (boss.dead) {
    b.vy += 500 * dt;
    b.y += b.vy * dt;
    return;
  }
  const spd = DIFFICULTY[s.difficulty].speed * (1 + boss.kind * 0.25) * (boss.hp < boss.maxHp / 2 ? 1.25 : 1);
  // Bounces around the room, ignoring ledges.
  const sp = Math.hypot(b.vx, b.vy) || 1;
  b.vx = (b.vx / sp) * 75 * spd;
  b.vy = (b.vy / sp) * 75 * spd;
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  if (b.x < AT) {
    b.x = AT;
    b.vx = Math.abs(b.vx);
  }
  if (b.x + b.w > AW - AT) {
    b.x = AW - AT - b.w;
    b.vx = -Math.abs(b.vx);
  }
  if (b.y < AT) {
    b.y = AT;
    b.vy = Math.abs(b.vy);
  }
  if (b.y + b.h > AH - AT) {
    b.y = AH - AT - b.h;
    b.vy = -Math.abs(b.vy);
  }
  boss.timer -= dt;
  if (boss.timer <= 0) {
    boss.timer = 2.4 - boss.kind * 0.5;
    const p = s.p;
    const a0 = Math.atan2(p.y - b.y - 20, p.x - b.x - 20);
    const n = boss.kind === 0 ? 3 : 5;
    for (let k = 0; k < n; k++) {
      const a = a0 + (k - (n - 1) / 2) * 0.28;
      s.shots.push({ x: b.x + 20, y: b.y + 20, vx: Math.cos(a) * 95, vy: Math.sin(a) * 95, life: 4, kind: 'bottle' });
    }
    sound(s, 'shoot');
  }
  if (s.phase === 'play' && overlaps(s.p, { x: b.x + 4, y: b.y + 4, w: b.w - 8, h: b.h - 8 })) hurt(s);
  void random;
}

export { BOSSES };
