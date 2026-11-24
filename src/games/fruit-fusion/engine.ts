import type { DifficultySetting } from '@/types';
import { baseState, clamp } from '../_shared/arcade/kit';
import type { BaseState, Input } from '../_shared/arcade/kit';

/**
 * Fruit Fusion: drop fruit into a jar. Two fruits of the same kind that touch
 * fuse into the next, larger kind. Keep the pile below the line at the top.
 *
 * Physics: circles under gravity, pushed apart where they overlap (heavier,
 * bigger fruit move less), with a little bounce and friction, solved in small
 * steps several times a frame so piles settle without jitter.
 */
export const W = 360;
export const H = 580;
export const JAR = { left: 16, right: 344, bottom: 560, top: 120 };
export const LINE_Y = 132;
export const DROP_Y = 72;

export const FRUITS = [
  { name: 'Cherry', r: 13, color: '#dc2626', points: 1 },
  { name: 'Strawberry', r: 17, color: '#f43f5e', points: 3 },
  { name: 'Grape', r: 22, color: '#8b5cf6', points: 6 },
  { name: 'Lime', r: 27, color: '#84cc16', points: 10 },
  { name: 'Orange', r: 32, color: '#f97316', points: 15 },
  { name: 'Apple', r: 38, color: '#ef4444', points: 21 },
  { name: 'Pear', r: 44, color: '#d9f99d', points: 28 },
  { name: 'Peach', r: 51, color: '#fdba74', points: 36 },
  { name: 'Pineapple', r: 58, color: '#facc15', points: 45 },
  { name: 'Melon', r: 66, color: '#86efac', points: 55 },
  { name: 'Watermelon', r: 75, color: '#16a34a', points: 66 },
] as const;
export const TOP_TIER = FRUITS.length - 1;

const G = 1500;
const SUBSTEPS = 4;
const ITERATIONS = 3;
const BOUNCE = 0.12;
const FRICTION = 0.985;
const DROP_COOLDOWN = 0.45;
/** Seconds a fruit may sit above the line before the game ends. */
export const DANGER_TIME = 2.2;

export interface Fruit {
  id: number;
  tier: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Seconds since dropped or created. */
  age: number;
  /** Seconds above the line. */
  over: number;
  dead: boolean;
}

/** Tiers you can be given to drop, by difficulty. */
const DROPPABLE: Record<DifficultySetting, number> = { easy: 4, normal: 5, hard: 5 };

export interface State extends BaseState {
  difficulty: DifficultySetting;
  fruits: Fruit[];
  nextId: number;
  aimX: number;
  current: number;
  next: number;
  cooldown: number;
  best: number;
  merges: number;
  danger: number;
  pops: { x: number; y: number; r: number; t: number; color: string }[];
}

function pickTier(s: State, random: () => number): number {
  // Smaller fruit are more common; Hard sometimes hands you a bigger one.
  const max = DROPPABLE[s.difficulty];
  const w = Array.from({ length: max }, (_, i) => (s.difficulty === 'hard' ? 1 : max - i));
  const total = w.reduce((a, b) => a + b, 0);
  let r = random() * total;
  for (let i = 0; i < max; i++) {
    r -= w[i];
    if (r < 0) return i;
  }
  return 0;
}

export function create(difficulty: DifficultySetting, random: () => number = Math.random): State {
  const s: State = {
    ...baseState(),
    difficulty,
    fruits: [],
    nextId: 1,
    aimX: W / 2,
    current: 0,
    next: 0,
    cooldown: 0,
    best: 0,
    merges: 0,
    danger: 0,
    pops: [],
  };
  s.current = pickTier(s, random);
  s.next = pickTier(s, random);
  return s;
}

export const radius = (tier: number) => FRUITS[tier].r;

export function drop(s: State, random: () => number = Math.random): boolean {
  if (s.cooldown > 0 || s.over) return false;
  const r = radius(s.current);
  s.fruits.push({ id: s.nextId++, tier: s.current, x: clamp(s.aimX, JAR.left + r, JAR.right - r), y: DROP_Y, vx: 0, vy: 0, age: 0, over: 0, dead: false });
  s.current = s.next;
  s.next = pickTier(s, random);
  s.cooldown = DROP_COOLDOWN;
  s.events.push('whoosh');
  return true;
}

function merge(s: State, a: Fruit, b: Fruit) {
  a.dead = b.dead = true;
  const tier = a.tier + 1;
  const x = (a.x + b.x) / 2;
  const y = (a.y + b.y) / 2;
  s.merges++;
  s.pops.push({ x, y, r: radius(a.tier) * 1.4, t: 0.3, color: FRUITS[a.tier].color });
  if (tier > TOP_TIER) {
    // Two watermelons: a burst of points and they are gone.
    s.score += FRUITS[TOP_TIER].points * 4;
    s.events.push('powerup');
    return;
  }
  s.score += FRUITS[tier].points;
  s.best = Math.max(s.best, tier);
  s.fruits.push({ id: s.nextId++, tier, x, y, vx: (a.vx + b.vx) / 2, vy: Math.min(a.vy, b.vy) - 60, age: 0, over: 0, dead: false });
  s.events.push(tier >= 6 ? 'levelComplete' : tier >= 3 ? 'success' : 'pop');
}

function step(s: State, h: number) {
  for (const f of s.fruits) {
    f.vy += G * h;
    f.vx *= FRICTION;
    f.x += f.vx * h;
    f.y += f.vy * h;
  }
  for (let it = 0; it < ITERATIONS; it++) {
    const list = s.fruits;
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      if (a.dead) continue;
      const ra = radius(a.tier);
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j];
        if (b.dead) continue;
        const rb = radius(b.tier);
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d2 = dx * dx + dy * dy;
        const min = ra + rb;
        if (d2 >= min * min) continue;
        if (a.tier === b.tier) {
          merge(s, a, b);
          break;
        }
        const d = Math.sqrt(d2) || 0.01;
        const nx = dx / d;
        const ny = dy / d;
        const overlap = min - d;
        // Push apart in proportion to size: the small one moves more.
        const ma = ra * ra;
        const mb = rb * rb;
        const ka = mb / (ma + mb);
        const kb = ma / (ma + mb);
        a.x -= nx * overlap * ka;
        a.y -= ny * overlap * ka;
        b.x += nx * overlap * kb;
        b.y += ny * overlap * kb;
        const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (rv < 0) {
          const imp = -(1 + BOUNCE) * rv;
          a.vx -= imp * nx * ka;
          a.vy -= imp * ny * ka;
          b.vx += imp * nx * kb;
          b.vy += imp * ny * kb;
        }
      }
    }
    s.fruits = s.fruits.filter((f) => !f.dead);
    for (const f of s.fruits) {
      const r = radius(f.tier);
      if (f.x < JAR.left + r) {
        f.x = JAR.left + r;
        f.vx = Math.abs(f.vx) * BOUNCE;
      } else if (f.x > JAR.right - r) {
        f.x = JAR.right - r;
        f.vx = -Math.abs(f.vx) * BOUNCE;
      }
      if (f.y > JAR.bottom - r) {
        f.y = JAR.bottom - r;
        if (f.vy > 0) f.vy = -f.vy * BOUNCE;
        f.vx *= 0.96;
      }
    }
  }
}

export function update(s: State, dt: number, input: Input, random: () => number = Math.random) {
  if (s.over) return;
  const ptr = input.pointer;
  // Aim: keys move the dropper; the mouse or a finger sets it directly.
  const dir = (input.held.has('right') ? 1 : 0) - (input.held.has('left') ? 1 : 0);
  if (dir) s.aimX += dir * 320 * dt;
  else if (ptr.active && (ptr.down || ptr.type === 'mouse' || ptr.type === undefined)) s.aimX = ptr.x;
  const r = radius(s.current);
  s.aimX = clamp(s.aimX, JAR.left + r, JAR.right - r);
  if (input.pressed.has('action') || input.pressed.has('down') || ptr.released) drop(s, random);
  s.cooldown = Math.max(0, s.cooldown - dt);

  const h = Math.min(dt, 1 / 30) / SUBSTEPS;
  for (let k = 0; k < SUBSTEPS; k++) step(s, h);

  for (const p of s.pops) p.t -= dt;
  s.pops = s.pops.filter((p) => p.t > 0);

  // Danger: a settled fruit poking above the line for too long ends the game.
  let worst = 0;
  for (const f of s.fruits) {
    f.age += dt;
    if (f.age > 1 && f.y - radius(f.tier) < LINE_Y && Math.abs(f.vy) < 120) f.over += dt;
    else f.over = Math.max(0, f.over - dt * 2);
    worst = Math.max(worst, f.over);
  }
  s.danger = worst / DANGER_TIME;
  if (worst >= DANGER_TIME) s.over = true;
}
