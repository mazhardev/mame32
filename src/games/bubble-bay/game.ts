import type { DifficultySetting } from '@/types';
import { baseState, circleRectHit, clamp } from '../_shared/arcade/kit';
import type { Input } from '../_shared/arcade/kit';
import { burst } from '../_shared/arcade/draw';
import { EMPTY, SOLID, boxesOverlap } from '../_shared/platformer/physics';
import type { TileQuery } from '../_shared/platformer/physics';
import { HERO, dropLoot, stepFlyer, stepHero, stepLoot, stepWalker } from '../_shared/arena/actors';
import { arenaFlow, coreState, enterStage, heroInput, killHero, popup, resetHero, sound, stageCleared } from '../_shared/arena/flow';
import type { FlowConfig } from '../_shared/arena/flow';
import { H, ROWS, T, W, stageQuery } from '../_shared/arena/stage';
import { bossBubbleRadius, hurtBoss, makeBoss, updateBoss } from './bosses';
import { HERO_START, LEVEL_COUNT, areaOf, isBossLevel, levelStage } from './stages';
import type { Boss, BossKind, Bubble, Critter, CritterKind, State } from './types';

/**
 * Bubble Bay rules. Ollie blows bubbles; a freshly blown bubble that touches
 * a critter traps it. Trapped critters float up to the surface, and touching
 * a bubble pops it — along with every bubble touching it, one after another.
 * Each critter popped in the same chain is worth double the one before, and
 * turns into treasure. Hold jump while falling onto a bubble to bounce off it.
 */

export const VIEW_W = W;
export const VIEW_H = H;

const GLYPH: Record<string, CritterKind> = { c: 'crab', p: 'puffer', j: 'jelly', s: 'squid', e: 'eel' };
export const BOSSES: BossKind[] = ['crab', 'ray', 'kraken'];

export const DIFF: Record<DifficultySetting, { lives: number; speed: number; hurry: number; trap: number }> = {
  easy: { lives: 5, speed: 0.82, hurry: 45, trap: 9 },
  normal: { lives: 3, speed: 1, hurry: 35, trap: 7.5 },
  hard: { lives: 3, speed: 1.2, hurry: 28, trap: 6 },
};

const SPEED: Record<CritterKind, number> = { crab: 38, puffer: 45, jelly: 36, squid: 34, eel: 60 };

export const BUBBLE = {
  /** Radius of an empty bubble (a full one is a little bigger). */
  r: 8,
  /** Launch speed; it slows as it goes. */
  speed: 300,
  /** Seconds a fresh bubble can trap before it starts to float (longer with the pink candy). */
  shoot: 0.24,
  shootLong: 0.38,
  cooldown: 0.3,
  cooldownRapid: 0.17,
  /** Floating speed up towards the surface. */
  rise: 42,
  /** Seconds an empty bubble lasts. */
  life: 9,
  /** Delay between the pops of a chain. */
  chainDelay: 0.06,
  max: 24,
};

export const TREASURES = [
  { kind: 'clam', value: 300 },
  { kind: 'starfish', value: 500 },
  { kind: 'pearl', value: 1000 },
  { kind: 'conch', value: 2000 },
  { kind: 'crown', value: 4000 },
  { kind: 'chest', value: 8000 },
];
export const POWER_NAMES: Record<string, string> = { range: 'Long bubbles!', rapid: 'Rapid bubbles!', speed: 'Speedy flippers!', shield: 'Golden bubble!' };

/** Score for the nth critter popped in one chain: 1,000, 2,000, 4,000 … up to 64,000. */
export const chainScore = (n: number) => 1000 * 2 ** Math.min(6, Math.max(0, n - 1));

export const BOSS_POP_SCORE = 20000;
export const LIFE_EVERY = 50000;

export interface Hooks {
  onLevelClear?: (index: number, s: State) => void;
}

function flowConfig(s: State): FlowConfig<State> {
  // Boss fights have no hurry-up.
  const hurry = isBossLevel(s.stageIndex) ? 1e9 : DIFF[s.difficulty].hurry;
  return {
    stages: LEVEL_COUNT,
    load: loadLevel,
    hurryAt: hurry,
    chaserAt: hurry + 15,
    lifeEvery: LIFE_EVERY,
    clearTime: 3,
    onRespawn: (st) => {
      st.powers = { range: false, rapid: false, speed: false, shield: 0 };
      st.stats.bounces = 0;
    },
  };
}

export function newCritter(kind: CritterKind, col: number, row: number, appear = 0.9): Critter {
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
    angry: false,
    timer: appear,
    fireCD: 2,
    spin: 0,
    chain: 0,
    seed: col * 1.7 + row * 0.9,
  };
}

export function loadLevel(s: State, index: number) {
  s.stage = levelStage(index);
  s.critters = s.stage.spawns.filter((sp) => GLYPH[sp.glyph]).map((sp) => newCritter(GLYPH[sp.glyph], sp.col, sp.row));
  s.bubbles = [];
  s.inks = [];
  s.chains = {};
  s.boss = isBossLevel(index) ? makeBoss(BOSSES[areaOf(index)], s.difficulty) : null;
  resetHero(s);
}

export function create(difficulty: DifficultySetting, startLevel = 0): State {
  const s: State = {
    ...baseState(),
    ...coreState(levelStage(startLevel), HERO_START, DIFF[difficulty].lives, LIFE_EVERY),
    difficulty,
    startLevel,
    critters: [],
    bubbles: [],
    inks: [],
    boss: null,
    powers: { range: false, rapid: false, speed: false, shield: 0 },
    fireCD: 0,
    blow: 0,
    chains: {},
    nextChain: 1,
    shake: 0,
    carry: null,
    stats: { bestChain: 0, bounces: 0, bestBounces: 0, treasures: 0, bosses: 0, levelsCleared: 0 },
  };
  enterStage(s, startLevel, flowConfig(s));
  return s;
}

/* ---------------------------------------------------------------- update */

export function update(s: State, dt: number, input: Input, random: () => number, hooks: Hooks = {}) {
  if (s.phase === 'clear') s.carry = { x: s.hero.x, y: s.hero.y };
  const active = arenaFlow(s, dt, flowConfig(s));
  s.shake = Math.max(0, s.shake - dt);
  s.blow = Math.max(0, s.blow - dt);
  // Critters swim into place while the level is introduced.
  if (s.phase === 'intro') for (const c of s.critters) if (c.state === 'spawn') c.timer = Math.max(0, c.timer - dt * 0.5);
  if (!active) return;

  const map = stageQuery(s.stage);
  const hero = s.hero;
  const hi = heroInput(input);
  const vyBefore = hero.vy;
  stepHero(hero, hi, dt, map, true, s.powers.speed ? 1.3 : 1);
  if (hero.vy < vyBefore - HERO.jump * 0.5) sound(s, 'jump');
  if (hero.onGround) s.stats.bounces = 0;
  s.powers.shield = Math.max(0, s.powers.shield - dt);

  // Blowing bubbles (hold to keep blowing).
  s.fireCD -= dt;
  const wantFire = input.pressed.has('action2') || (input.held.has('action2') && s.fireCD <= -0.05);
  if (wantFire && s.fireCD <= 0) blowBubble(s);

  updateBubbles(s, dt, hi.jump);
  updateCritters(s, dt, map, random);
  updateInks(s, dt);
  if (s.boss) bossFight(s, s.boss, dt, random);
  updateLoot(s, dt, lootQuery(map));

  if (s.phase === 'play' && !s.boss && s.critters.length === 0) {
    s.stats.levelsCleared++;
    stageCleared(s);
    hooks.onLevelClear?.(s.stageIndex, s);
  }
}

export function blowBubble(s: State) {
  if (s.bubbles.length >= BUBBLE.max) {
    // Too many about: the oldest empty one bursts to make room.
    const old = s.bubbles.findIndex((b) => b.state === 'float' && !b.critter);
    if (old < 0) return;
    s.bubbles.splice(old, 1);
  }
  const h = s.hero;
  const r = 4;
  s.bubbles.push({
    x: clamp(h.x + h.w / 2 + h.facing * 9, T + BUBBLE.r, W - T - BUBBLE.r),
    y: clamp(h.y + 7, T + BUBBLE.r, H - T - BUBBLE.r),
    r,
    vx: h.facing * BUBBLE.speed,
    vy: 0,
    state: 'shoot',
    age: 0,
    life: BUBBLE.life,
    critter: null,
    popDelay: 0,
    chainId: 0,
    wob: (s.time * 7.3) % (Math.PI * 2),
  });
  s.fireCD = s.powers.rapid ? BUBBLE.cooldownRapid : BUBBLE.cooldown;
  s.blow = 0.15;
  sound(s, 'pop');
}

/* --------------------------------------------------------------- bubbles */

function toFloat(b: Bubble) {
  b.state = 'float';
  b.r = BUBBLE.r;
  b.vx *= 0.15;
  b.vy = 0;
}

function trap(s: State, b: Bubble, c: Critter) {
  c.state = 'trapped';
  c.vx = 0;
  c.vy = 0;
  b.critter = c;
  b.state = 'float';
  b.r = BUBBLE.r + 2;
  b.vx = 0;
  b.vy = 0;
  b.life = DIFF[s.difficulty].trap;
  s.score += 10;
  sound(s, 'select');
}

/** The critter breaks out of its bubble, angry. */
function escape(s: State, b: Bubble) {
  const c = b.critter!;
  b.critter = null;
  b.state = 'gone';
  c.state = 'live';
  c.angry = true;
  c.x = clamp(b.x - c.w / 2, T, W - T - c.w);
  c.y = b.y - c.h / 2;
  c.vx = 0;
  c.vy = 0;
  c.think = 0;
  c.jumpCD = 0.8;
  burst(s.particles, b.x, b.y, '#fecaca', 6, 70);
  sound(s, 'whoosh');
}

/** A critter popped out of its bubble flies off and lands as treasure. */
function defeat(s: State, c: Critter, n: number, x: number, y: number) {
  c.state = 'out';
  c.chain = n;
  c.x = clamp(x - c.w / 2, T, W - T - c.w);
  c.y = y - c.h / 2;
  c.vx = (x < W / 2 ? 1 : -1) * (40 + ((n * 37) % 60));
  c.vy = -320;
  c.timer = 0.9;
  const score = chainScore(n);
  s.score += score;
  popup(s, x, y - 6, String(score), n >= 2 ? '#fde047' : '#ffffff');
  burst(s.particles, x, y, '#bae6fd', 10, 120);
  sound(s, 'hit');
}

/** Bursts a bubble, scoring what is inside, and sets the bubbles touching it popping too. */
function burstBubble(s: State, b: Bubble, chainId: number) {
  b.state = 'gone';
  burst(s.particles, b.x, b.y, '#e0f2fe', 6, 70);
  const c = b.critter;
  if (c) {
    b.critter = null;
    const n = (s.chains[chainId] = (s.chains[chainId] ?? 0) + 1);
    s.stats.bestChain = Math.max(s.stats.bestChain, n);
    defeat(s, c, n, b.x, b.y);
  } else {
    s.score += 10;
    sound(s, 'tick');
  }
  for (const o of s.bubbles) {
    if (o.state !== 'float') continue;
    if (Math.hypot(o.x - b.x, o.y - b.y) <= o.r + b.r + 3) {
      o.state = 'pop';
      o.popDelay = BUBBLE.chainDelay;
      o.chainId = chainId;
    }
  }
}

function keepInside(b: Bubble) {
  b.x = clamp(b.x, T + b.r, W - T - b.r);
  b.y = clamp(b.y, T + b.r + 1, H - T - b.r);
}

function updateBubbles(s: State, dt: number, jumpHeld: boolean) {
  const shootTime = s.powers.range ? BUBBLE.shootLong : BUBBLE.shoot;
  for (const b of s.bubbles) {
    b.age += dt;
    if (b.state === 'shoot') {
      b.r = Math.min(BUBBLE.r, 4 + b.age * 40);
      b.x += b.vx * dt;
      b.vx *= Math.max(0, 1 - dt * 2);
      if (b.x <= T + b.r || b.x >= W - T - b.r) {
        keepInside(b);
        toFloat(b);
        continue;
      }
      const c = s.critters.find((k) => k.state === 'live' && circleRectHit(b.x, b.y, b.r + 1, k));
      if (c) {
        trap(s, b, c);
        continue;
      }
      const boss = s.boss;
      if (boss && boss.state === 'move' && circleRectHit(b.x, b.y, b.r, boss)) {
        // Fresh bubbles burst against a boss and wear it down.
        b.state = 'gone';
        burst(s.particles, b.x, b.y, '#e0f2fe', 6, 80);
        s.score += 50;
        if (hurtBoss(s, boss)) bossBeaten(s, boss);
        continue;
      }
      if (b.age >= shootTime) toFloat(b);
      continue;
    }
    if (b.state === 'pop') {
      b.popDelay -= dt;
      if (b.popDelay <= 0) burstBubble(s, b, b.chainId);
      continue;
    }
    if (b.state !== 'float') continue;
    // Rise to the surface, drift towards the middle, bob a little.
    b.vy += (-BUBBLE.rise - b.vy) * Math.min(1, dt * 3);
    b.vx += (clamp((W / 2 - b.x) * 0.5, -22, 22) - b.vx) * Math.min(1, dt * 1.5);
    b.x += b.vx * dt;
    b.y += b.vy * dt + Math.sin(b.age * 2.4 + b.wob) * 5 * dt;
    keepInside(b);
    b.life -= dt;
    if (b.life <= 0) {
      if (b.critter) escape(s, b);
      else {
        b.state = 'gone';
        burst(s.particles, b.x, b.y, '#e0f2fe', 4, 40);
      }
    }
  }

  // Floating bubbles jostle for room.
  const floating = s.bubbles.filter((b) => b.state === 'float');
  for (let i = 0; i < floating.length; i++) {
    const a = floating[i];
    for (let j = i + 1; j < floating.length; j++) {
      const o = floating[j];
      let dx = o.x - a.x;
      let dy = o.y - a.y;
      let d = Math.hypot(dx, dy);
      const min = a.r + o.r;
      if (d >= min) continue;
      if (d < 0.01) {
        dx = 1;
        dy = 0;
        d = 1;
      }
      const push = (min - d) / 2;
      a.x -= (dx / d) * push;
      a.y -= (dy / d) * push;
      o.x += (dx / d) * push;
      o.y += (dy / d) * push;
    }
  }
  for (const b of floating) {
    keepInside(b);
    if (b.critter) {
      b.critter.x = b.x - b.critter.w / 2;
      b.critter.y = b.y - b.critter.h / 2;
    }
  }

  // Ollie and the floating bubbles: bounce off the top while holding jump, otherwise pop.
  const hero = s.hero;
  if (s.dying === 0) {
    for (const b of floating) {
      if (b.state !== 'float' || !circleRectHit(b.x, b.y, b.r, hero)) continue;
      const feet = hero.y + hero.h;
      const onTop = hero.vy > 0 && feet <= b.y - b.r * 0.25 && Math.abs(hero.x + hero.w / 2 - b.x) < b.r + 5;
      if (onTop && jumpHeld) {
        hero.y = b.y - b.r - hero.h - 0.5;
        hero.vy = -HERO.jump * 0.95;
        hero.jumping = true;
        hero.onGround = false;
        s.stats.bounces++;
        s.stats.bestBounces = Math.max(s.stats.bestBounces, s.stats.bounces);
        sound(s, 'jump');
        continue;
      }
      const id = s.nextChain++;
      s.chains[id] = 0;
      burstBubble(s, b, id);
    }
  }

  for (let i = s.bubbles.length - 1; i >= 0; i--) if (s.bubbles[i].state === 'gone') s.bubbles.splice(i, 1);
}

/* -------------------------------------------------------------- critters */

function treasureFor(chain: number, random: () => number): { kind: string; value: number } {
  if (random() < 0.1) {
    // The golden bubble (a few seconds' invincibility) is the rarest.
    const p = random();
    return { kind: `power-${p < 0.3 ? 'range' : p < 0.6 ? 'rapid' : p < 0.88 ? 'speed' : 'shield'}`, value: 0 };
  }
  const tier = Math.min(TREASURES.length - 1, Math.max(0, chain - 1) + (random() < 0.35 ? 1 : 0));
  return TREASURES[tier];
}

function updateCritters(s: State, dt: number, map: TileQuery, random: () => number) {
  const hero = s.hero;
  const target = { x: hero.x, y: hero.y };
  const base = DIFF[s.difficulty].speed;
  for (const c of s.critters) {
    c.spin += dt * 8;
    switch (c.state) {
      case 'spawn':
        c.timer -= dt;
        if (c.timer <= 0) c.state = 'live';
        break;
      case 'live':
        moveCritter(s, c, dt, map, target, base * (c.angry || s.hurry > 0 ? 1.5 : 1), random);
        break;
      case 'trapped':
        // Its bubble carries it.
        break;
      case 'out':
        c.timer -= dt;
        c.vy += 900 * dt;
        c.x = clamp(c.x + c.vx * dt, T, W - T - c.w);
        c.y = Math.min(H - T - c.h, c.y + c.vy * dt);
        if (c.y < 2) {
          c.y = 2;
          c.vy = Math.abs(c.vy) * 0.3;
        }
        break;
    }
  }

  // Touching a critter costs a life — unless Ollie has the golden bubble.
  if (s.dying === 0) {
    for (const c of s.critters) {
      if (c.state !== 'live' || !boxesOverlap(hero, { x: c.x + 2, y: c.y + 2, w: c.w - 4, h: c.h - 3 })) continue;
      if (s.powers.shield > 0) defeat(s, c, 1, c.x + c.w / 2, c.y + c.h / 2);
      else killHero(s);
    }
  }

  // Popped critters land as treasure.
  for (let i = s.critters.length - 1; i >= 0; i--) {
    const c = s.critters[i];
    if (c.state === 'out' && c.timer <= 0) {
      const t = treasureFor(c.chain, random);
      dropLoot(s.loot, t.kind, t.value, c.x + c.w / 2, c.y + c.h / 2, (random() - 0.5) * 50, -150);
      s.critters.splice(i, 1);
    }
  }
}

function moveCritter(s: State, c: Critter, dt: number, map: TileQuery, target: { x: number; y: number }, mul: number, random: () => number) {
  const speed = SPEED[c.kind] * mul;
  switch (c.kind) {
    case 'jelly':
      stepFlyer(c, dt, map, speed, true);
      break;
    case 'puffer':
      stepWalker(c, target, dt, map, { speed, jump: HERO.jump, wrap: true, random, chase: 0.8 });
      if (c.onGround && random() < dt * 0.9) {
        c.vy = -300;
        c.onGround = false;
      }
      break;
    case 'squid': {
      stepWalker(c, target, dt, map, { speed, jump: HERO.jump, wrap: true, random, chase: 0.5 });
      c.fireCD -= dt;
      const dx = target.x - c.x;
      if (c.fireCD <= 0 && Math.abs(target.y - c.y) < 10 && Math.abs(dx) < 7 * T && Math.sign(dx) === c.dir) {
        c.fireCD = 2.8;
        s.inks.push({ kind: 'ink', x: c.x + 2 + c.dir * 8, y: c.y + 3, w: 10, h: 8, vx: c.dir * 110, vy: 0, life: 3 });
        sound(s, 'shoot');
      }
      break;
    }
    case 'eel':
      stepWalker(c, target, dt, map, { speed, jump: HERO.jump, wrap: true, random, chase: 0.9 });
      break;
    default:
      stepWalker(c, target, dt, map, { speed, jump: HERO.jump, wrap: true, random, chase: 0.7 });
  }
}

/* ------------------------------------------------------------------ ink */

function updateInks(s: State, dt: number) {
  for (let i = s.inks.length - 1; i >= 0; i--) {
    const k = s.inks[i];
    k.life -= dt;
    k.x += k.vx * dt;
    k.y += k.vy * dt;
    if (k.life <= 0 || k.x < T - 4 || k.x + k.w > W - T + 4 || k.y < -10 || k.y > H + 10) {
      s.inks.splice(i, 1);
      continue;
    }
    // A fresh bubble swallows ink.
    const b = s.bubbles.find((bb) => bb.state === 'shoot' && circleRectHit(bb.x, bb.y, bb.r, k));
    if (b) {
      b.state = 'gone';
      burst(s.particles, k.x + k.w / 2, k.y + k.h / 2, '#c4b5fd', 5, 50);
      s.inks.splice(i, 1);
      s.score += 50;
      continue;
    }
    if (s.dying === 0 && s.powers.shield <= 0 && boxesOverlap({ x: k.x + 1, y: k.y + 1, w: k.w - 2, h: k.h - 2 }, s.hero)) killHero(s);
  }
}

/* ------------------------------------------------------------------ boss */

function summon(s: State, kind: CritterKind, random: () => number) {
  // Helpers drop in through the gap in the ceiling.
  const c = newCritter(kind, 8 + Math.floor(random() * 4), 0, 0.6);
  c.y = -14;
  s.critters.push(c);
}

function bossFight(s: State, b: Boss, dt: number, random: () => number) {
  updateBoss(s, b, dt, random, (kind) => summon(s, kind, random));
  if (b.state === 'popped') {
    // Tumbles away out of the bottom of the bay.
    b.vy += 700 * dt;
    b.y += b.vy * dt;
    if (b.y > H + 20) s.boss = null;
    return;
  }
  if (b.state === 'move') {
    // It bursts the bubbles it barges through.
    for (const bb of s.bubbles) if (bb.state === 'float' && !bb.critter && circleRectHit(bb.x, bb.y, bb.r, b)) bb.state = 'gone';
  }
  if (s.dying > 0) return;
  const hero = s.hero;
  if (b.state === 'trapped') {
    if (circleRectHit(b.x + b.w / 2, b.y + b.h / 2, bossBubbleRadius(b), hero)) popBoss(s, b, random);
    return;
  }
  if (s.powers.shield > 0) return;
  if (boxesOverlap(hero, { x: b.x + 4, y: b.y + 4, w: b.w - 8, h: b.h - 6 })) killHero(s);
  if (b.beam && b.beam.warn <= 0 && Math.abs(hero.y + hero.h / 2 - b.beam.y) < 9) killHero(s);
}

/** Beaten: sealed in a giant bubble. Its helpers and shots vanish. */
function bossBeaten(s: State, b: Boss) {
  s.inks = [];
  for (const bb of s.bubbles) {
    if (bb.critter) {
      defeat(s, bb.critter, 1, bb.x, bb.y);
      bb.critter = null;
      bb.state = 'gone';
    }
  }
  for (const c of s.critters) if (c.state === 'live' || c.state === 'spawn') defeat(s, c, 1, c.x + c.w / 2, Math.max(8, c.y + c.h / 2));
  popup(s, b.x + b.w / 2, b.y - 4, 'TRAPPED!', '#a5f3fc');
}

function popBoss(s: State, b: Boss, random: () => number) {
  b.state = 'popped';
  b.vy = -200;
  s.stats.bosses++;
  s.score += BOSS_POP_SCORE;
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  popup(s, cx, b.y, String(BOSS_POP_SCORE), '#fde047');
  burst(s.particles, cx, cy, '#e0f2fe', 24, 180);
  for (let k = 0; k < 10; k++) {
    const t = TREASURES[2 + Math.floor(random() * 4)];
    dropLoot(s.loot, t.kind, t.value, cx, cy, (random() - 0.5) * 240, -160 - random() * 200);
  }
  s.shake = 0.3;
  sound(s, 'explosion');
}

/* ------------------------------------------------------------------ loot */

/** Treasure does not drop through the gap in the sea floor. */
function lootQuery(map: TileQuery): TileQuery {
  return { size: T, at: (c, r) => (r >= ROWS - 1 ? SOLID : r < 0 ? EMPTY : map.at(c, r)) };
}

function updateLoot(s: State, dt: number, map: TileQuery) {
  for (let i = s.loot.length - 1; i >= 0; i--) {
    const l = s.loot[i];
    stepLoot(l, dt, map, false);
    if (l.life <= 0) {
      s.loot.splice(i, 1);
      continue;
    }
    if (l.life > 8.7 || s.dying > 0 || !boxesOverlap(l, s.hero)) continue;
    s.loot.splice(i, 1);
    if (l.kind.startsWith('power-')) {
      const p = l.kind.slice(6);
      if (p === 'range') s.powers.range = true;
      if (p === 'rapid') s.powers.rapid = true;
      if (p === 'speed') s.powers.speed = true;
      if (p === 'shield') s.powers.shield = 8;
      popup(s, l.x + 6, l.y, POWER_NAMES[p] ?? '', '#a5f3fc');
      sound(s, 'powerup');
    } else {
      s.score += l.value;
      s.stats.treasures++;
      popup(s, l.x + 6, l.y, String(l.value), '#fde68a');
      sound(s, 'coin');
    }
  }
}

export { killHero };
