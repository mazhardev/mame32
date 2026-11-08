import type { DifficultySetting } from '@/types';
import { baseState } from '../_shared/arcade/kit';
import type { BaseState, Input } from '../_shared/arcade/kit';

/**
 * Neon Serpents rules. Snakes glide around a round arena eating glowing
 * pellets to grow. A snake whose head touches another snake's body, or the
 * arena wall, bursts into pellets. Boosting doubles your speed but sheds
 * length as you go. The player's snake is snakes[0]; the rest are computer
 * snakes that forage, dodge and sometimes try to cut you off.
 */
export const W = 480;
export const H = 320;
export const ARENA = 1500;
export const SEG = 7;
const SPEED = 115;
const BOOST = 230;
const BOOST_COST = 7;
const MIN_MASS = 10;
const FOOD_TARGET = 700;
const START_MASS = 20;

export interface Pt {
  x: number;
  y: number;
}

export interface Snake {
  id: number;
  name: string;
  hue: number;
  pts: Pt[];
  angle: number;
  /** Where it is steering. */
  want: number;
  mass: number;
  boosting: boolean;
  alive: boolean;
  bot: boolean;
  /** Bot brain: seconds to next decision, and a target to chase. */
  think: number;
  kills: number;
  dropT: number;
}

export interface Food {
  x: number;
  y: number;
  v: number;
  hue: number;
  /** Seconds the pellet has existed (for a pop-in) — and a wobble phase. */
  t: number;
}

export interface Skill {
  bots: number;
  /** Seconds between a bot's decisions. */
  react: number;
  /** How far ahead it looks for danger. */
  look: number;
  /** Chance to go after the player when close. */
  hunt: number;
}

export const SKILLS: Record<DifficultySetting, Skill> = {
  easy: { bots: 10, react: 0.35, look: 60, hunt: 0.05 },
  normal: { bots: 14, react: 0.2, look: 90, hunt: 0.15 },
  hard: { bots: 18, react: 0.12, look: 120, hunt: 0.3 },
};

export interface State extends BaseState {
  difficulty: DifficultySetting;
  skill: Skill;
  snakes: Snake[];
  food: Food[];
  nextId: number;
  rand: () => number;
  respawn: number[];
  deadT: number;
  /** Best leaderboard place reached, 1 = top. */
  bestRank: number;
  bursts: { x: number; y: number; t: number; hue: number }[];
  stats: { kills: number; maxMass: number; eaten: number };
  zoom: number;
  /** What ended the player's run. */
  killer: string;
}

const NAMES = ['Zigzag', 'Noodle', 'Viper', 'Glimmer', 'Sly', 'Pixel', 'Comet', 'Wisp', 'Fang', 'Ripple', 'Sprocket', 'Echo', 'Mamba', 'Flux', 'Nova', 'Scales', 'Volt', 'Ember', 'Drift', 'Twist'];

function seeded(seed: number) {
  let v = seed >>> 0 || 1;
  return () => ((v = (v * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export const radiusOf = (s: Snake) => Math.min(22, 6 + Math.sqrt(s.mass) * 0.55);
export const segmentsOf = (s: Snake) => Math.max(8, Math.floor(6 + s.mass * 0.55));

function makeSnake(st: State, x: number, y: number, bot: boolean, name: string, hue: number, mass = START_MASS): Snake {
  const angle = st.rand() * Math.PI * 2;
  const n = Math.max(8, Math.floor(6 + mass * 0.55));
  const pts: Pt[] = Array.from({ length: n }, (_, i) => ({ x: x - Math.cos(angle) * i * SEG, y: y - Math.sin(angle) * i * SEG }));
  return { id: st.nextId++, name, hue, pts, angle, want: angle, mass, boosting: false, alive: true, bot, think: 0, kills: 0, dropT: 0 };
}

function randomSpot(st: State, margin = 200): Pt {
  const r = Math.sqrt(st.rand()) * (ARENA - margin);
  const a = st.rand() * Math.PI * 2;
  return { x: Math.cos(a) * r, y: Math.sin(a) * r };
}

/** A spot at least `away` from every snake head. */
function safeSpot(st: State, away: number): Pt {
  for (let k = 0; k < 40; k++) {
    const p = randomSpot(st, 300);
    if (st.snakes.every((s) => !s.alive || Math.hypot(s.pts[0].x - p.x, s.pts[0].y - p.y) > away)) return p;
  }
  return randomSpot(st, 300);
}

function addFood(st: State, x: number, y: number, v: number, hue?: number) {
  st.food.push({ x, y, v, hue: hue ?? Math.floor(st.rand() * 360), t: 0 });
}

function spawnBot(st: State) {
  const p = safeSpot(st, 400);
  // A name no snake in the arena is using.
  const used = new Set(st.snakes.filter((o) => o.alive).map((o) => o.name));
  const free = NAMES.filter((n) => !used.has(n));
  const pool = free.length ? free : NAMES;
  const name = pool[Math.floor(st.rand() * pool.length)];
  st.snakes.push(makeSnake(st, p.x, p.y, true, name, Math.floor(st.rand() * 360), START_MASS + Math.floor(st.rand() * 80)));
}

export function create(difficulty: DifficultySetting, seed = Math.floor(Math.random() * 2 ** 31)): State {
  const skill = SKILLS[difficulty];
  const st = {
    ...baseState(),
    difficulty,
    skill,
    snakes: [],
    food: [],
    nextId: 1,
    rand: seeded(seed),
    respawn: [],
    deadT: 0,
    bestRank: 99,
    bursts: [],
    stats: { kills: 0, maxMass: START_MASS, eaten: 0 },
    zoom: 1,
    killer: '',
  } as State;
  st.snakes.push(makeSnake(st, 0, 0, false, 'You', 165));
  for (let i = 0; i < skill.bots; i++) spawnBot(st);
  for (let i = 0; i < FOOD_TARGET; i++) {
    const p = randomSpot(st, 20);
    addFood(st, p.x, p.y, 1 + Math.floor(st.rand() * 2));
  }
  st.score = START_MASS;
  return st;
}

export const player = (st: State) => st.snakes[0];

/* -------------------------------------------------------------- movement */
function turnToward(s: Snake, dt: number) {
  const rate = 4.4 / (1 + s.mass / 350);
  let d = s.want - s.angle;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  s.angle += Math.max(-rate * dt, Math.min(rate * dt, d));
}

function move(st: State, s: Snake, dt: number) {
  const boosting = s.boosting && s.mass > MIN_MASS + 2;
  const v = boosting ? BOOST : SPEED;
  const head = s.pts[0];
  head.x += Math.cos(s.angle) * v * dt;
  head.y += Math.sin(s.angle) * v * dt;
  // Each segment follows the one in front at a fixed spacing.
  for (let i = 1; i < s.pts.length; i++) {
    const a = s.pts[i - 1];
    const b = s.pts[i];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d > SEG) {
      b.x = a.x + (dx / d) * SEG;
      b.y = a.y + (dy / d) * SEG;
    }
  }
  // Grow or shrink the body to match its mass.
  const n = segmentsOf(s);
  while (s.pts.length < n) {
    const t = s.pts[s.pts.length - 1];
    s.pts.push({ x: t.x, y: t.y });
  }
  if (s.pts.length > n) s.pts.length = n;
  if (boosting) {
    s.mass -= BOOST_COST * dt;
    s.dropT -= dt;
    if (s.dropT <= 0) {
      s.dropT = 0.12;
      const tail = s.pts[s.pts.length - 1];
      addFood(st, tail.x + (st.rand() - 0.5) * 6, tail.y + (st.rand() - 0.5) * 6, 1, s.hue);
    }
  }
}

/* ------------------------------------------------------------------ bots */
/** How close the nearest body (or the wall) is along a ray from a snake's head. */
function clearance(st: State, me: Snake, angle: number, reach: number): number {
  const h = me.pts[0];
  const r = radiusOf(me);
  const best = reach;
  for (let d = 10; d <= reach; d += 12) {
    const x = h.x + Math.cos(angle) * d;
    const y = h.y + Math.sin(angle) * d;
    if (Math.hypot(x, y) > ARENA - r - 4) return Math.min(best, d);
    for (const o of st.snakes) {
      if (!o.alive || o === me) continue;
      const or = radiusOf(o) + r;
      // Cheap reject on the head distance.
      if (Math.abs(o.pts[0].x - x) > o.pts.length * SEG + or && Math.abs(o.pts[0].y - y) > o.pts.length * SEG + or) continue;
      for (let i = 0; i < o.pts.length; i += 2) {
        const p = o.pts[i];
        if ((p.x - x) ** 2 + (p.y - y) ** 2 < or * or) return Math.min(best, d);
      }
    }
  }
  return best;
}

function botThink(st: State, s: Snake) {
  const sk = st.skill;
  const h = s.pts[0];
  const look = sk.look + radiusOf(s) * 2;
  // 1. Danger ahead: steer to the side with more room.
  const ahead = clearance(st, s, s.angle, look);
  if (ahead < look) {
    const left = clearance(st, s, s.angle - 0.7, look);
    const right = clearance(st, s, s.angle + 0.7, look);
    const far = clearance(st, s, s.angle + (left > right ? -1.5 : 1.5), look);
    s.want = s.angle + (left > right ? -1 : 1) * (far > ahead ? 1.5 : 0.8);
    s.boosting = false;
    return;
  }
  // 2. Now and then, go after the player: cut across in front of them.
  const p = player(st);
  if (p.alive && st.rand() < sk.hunt) {
    const ph = p.pts[0];
    const dist = Math.hypot(ph.x - h.x, ph.y - h.y);
    if (dist < 260 && s.mass > 30) {
      const lead = 60 + dist * 0.3;
      const tx = ph.x + Math.cos(p.angle) * lead;
      const ty = ph.y + Math.sin(p.angle) * lead;
      s.want = Math.atan2(ty - h.y, tx - h.x);
      s.boosting = dist < 180 && s.mass > 45;
      return;
    }
  }
  // 3. Forage: the best pellet nearby, by value over distance.
  let best: Food | null = null;
  let score = 0;
  for (const f of st.food) {
    const dx = f.x - h.x;
    const dy = f.y - h.y;
    if (Math.abs(dx) > 260 || Math.abs(dy) > 260) continue;
    const d = Math.hypot(dx, dy) + 20;
    const v = f.v / d;
    if (v > score) {
      score = v;
      best = f;
    }
  }
  s.boosting = false;
  if (best) s.want = Math.atan2(best.y - h.y, best.x - h.x);
  else s.want = Math.atan2(-h.y, -h.x) + (st.rand() - 0.5);
  // Keep away from the wall.
  if (Math.hypot(h.x, h.y) > ARENA - 160) s.want = Math.atan2(-h.y, -h.x);
}

/* ------------------------------------------------------------ collisions */
function kill(st: State, s: Snake, by: Snake | null) {
  s.alive = false;
  // The body bursts into pellets worth most of its mass.
  const per = Math.max(1, (s.mass * 0.8) / Math.max(1, s.pts.length / 2));
  for (let i = 0; i < s.pts.length; i += 2) {
    const p = s.pts[i];
    addFood(st, p.x + (st.rand() - 0.5) * 10, p.y + (st.rand() - 0.5) * 10, Math.min(8, per), s.hue);
  }
  st.bursts.push({ x: s.pts[0].x, y: s.pts[0].y, t: 0, hue: s.hue });
  if (by) {
    by.kills++;
    if (!by.bot) {
      st.stats.kills++;
      st.events.push('success');
    }
  }
  if (s.bot) st.respawn.push(3);
  else {
    st.killer = by ? by.name : 'the wall';
    st.events.push('gameOver');
    st.deadT = 0;
  }
}

function collide(st: State) {
  const alive = st.snakes.filter((s) => s.alive);
  const dead = new Map<Snake, Snake | null>();
  for (const s of alive) {
    const h = s.pts[0];
    const r = radiusOf(s);
    if (Math.hypot(h.x, h.y) > ARENA - r) {
      dead.set(s, null);
      continue;
    }
    for (const o of alive) {
      if (o === s) continue;
      const or = radiusOf(o);
      const reach = o.pts.length * SEG + or + r;
      if (Math.abs(o.pts[0].x - h.x) > reach || Math.abs(o.pts[0].y - h.y) > reach) continue;
      const lim = (r * 0.8 + or * 0.8) ** 2;
      // Head to head: the smaller snake loses.
      const oh = o.pts[0];
      if ((oh.x - h.x) ** 2 + (oh.y - h.y) ** 2 < lim) {
        if (s.mass <= o.mass) dead.set(s, o);
        continue;
      }
      for (let i = 1; i < o.pts.length; i++) {
        const p = o.pts[i];
        if ((p.x - h.x) ** 2 + (p.y - h.y) ** 2 < lim) {
          dead.set(s, o);
          break;
        }
      }
      if (dead.has(s)) break;
    }
  }
  for (const [s, by] of dead) kill(st, s, by);
}

function eat(st: State) {
  const eaters = st.snakes.filter((s) => s.alive);
  st.food = st.food.filter((f) => {
    for (const s of eaters) {
      const h = s.pts[0];
      const r = radiusOf(s) + 6 + (s.boosting ? 4 : 0);
      if (Math.abs(f.x - h.x) < r && Math.abs(f.y - h.y) < r && (f.x - h.x) ** 2 + (f.y - h.y) ** 2 < r * r) {
        s.mass += f.v;
        if (!s.bot) {
          st.stats.eaten++;
          if (st.stats.eaten % 4 === 0) st.events.push('blip');
        }
        return false;
      }
    }
    return true;
  });
}

/* ------------------------------------------------------------------ step */
export function rankOf(st: State): number {
  const p = player(st);
  return 1 + st.snakes.filter((s) => s.alive && s !== p && s.mass > p.mass).length;
}

export function leaderboard(st: State): Snake[] {
  return st.snakes.filter((s) => s.alive).sort((a, b) => b.mass - a.mass);
}

export function step(st: State, dt: number) {
  for (const b of st.bursts) b.t += dt;
  st.bursts = st.bursts.filter((b) => b.t < 0.7);
  for (const f of st.food) f.t += dt;
  const p = player(st);
  if (!p.alive) {
    st.deadT += dt;
    if (st.deadT > 1.4) st.over = true;
  }
  for (const s of st.snakes) {
    if (!s.alive) continue;
    if (s.bot) {
      s.think -= dt;
      if (s.think <= 0) {
        s.think = st.skill.react * (0.7 + st.rand() * 0.6);
        botThink(st, s);
      }
    }
    turnToward(s, dt);
    move(st, s, dt);
  }
  collide(st);
  eat(st);
  st.snakes = st.snakes.filter((s, i) => s.alive || i === 0);
  // Bots come back after a while; pellets keep the arena fed.
  st.respawn = st.respawn.map((t) => t - dt);
  while (st.respawn.length && st.respawn[0] <= 0) {
    st.respawn.shift();
    spawnBot(st);
  }
  let deficit = FOOD_TARGET - st.food.length;
  while (deficit-- > 0 && st.rand() < 0.3) {
    const q = randomSpot(st, 20);
    addFood(st, q.x, q.y, 1 + Math.floor(st.rand() * 2));
  }
  if (p.alive) {
    st.score = Math.floor(p.mass);
    st.stats.maxMass = Math.max(st.stats.maxMass, p.mass);
    st.bestRank = Math.min(st.bestRank, rankOf(st));
    st.zoom += (1 / (1 + Math.max(0, p.mass - START_MASS) / 450) - st.zoom) * Math.min(1, dt * 2);
  }
}

/* ------------------------------------------------------------------ input */
const KEY_TURN = 3.2;

export function update(st: State, dt: number, input: Input) {
  const p = player(st);
  if (p.alive) {
    const ptr = input.pointer;
    const keys = input.held.has('left') || input.held.has('right');
    if (keys) {
      p.want = p.angle + (input.held.has('left') ? -1 : 1) * KEY_TURN * dt * 3;
    } else if (ptr.active) {
      // Steer toward the pointer, measured from the middle of the screen (where your head is).
      const dx = ptr.x - W / 2;
      const dy = ptr.y - H / 2;
      if (Math.hypot(dx, dy) > 8) p.want = Math.atan2(dy, dx);
    }
    // Boost: Space or ↑, the mouse button, the on-screen button, or a second finger.
    const mouseHeld = ptr.down && ptr.type !== 'touch' && ptr.type !== 'pen';
    const twoFingers = input.touches.length >= 2;
    p.boosting = input.held.has('action') || input.held.has('up') || input.held.has('action2') || mouseHeld || twoFingers;
  }
  let left = Math.min(dt, 0.05);
  while (left > 0) {
    const h = Math.min(left, 1 / 60);
    step(st, h);
    left -= h;
  }
}
