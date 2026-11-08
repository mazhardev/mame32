import type { DifficultySetting } from '@/types';
import { baseState } from '../_shared/arcade/kit';
import type { BaseState, Input } from '../_shared/arcade/kit';
import { LEVELS } from './levels';
import type { LevelDef } from './levels';

/**
 * Snip Snack physics and rules. Ropes are chains of points held together by
 * distance constraints (Verlet integration), the sweet hangs from their
 * ends, and swiping across a rope cuts it. Everything runs in fixed 1/60 s
 * steps with no randomness, so a sequence of cuts and taps always plays out
 * the same way; the level solutions in solutions.ts rely on that.
 */
export const W = 320;
export const H = 480;
export const STEP = 1 / 60;
export const CANDY_R = 12;
const GRAVITY = 900;
const ITER = 24;
const SEG_LEN = 12;
const MOUTH_R = 28;
const STAR_R = 20;
const BLOW_RANGE = 170;
const BLOW_SPEED = 520;
const FLOAT = -420;

export interface Pt {
  x: number;
  y: number;
  px: number;
  py: number;
  pinned: boolean;
  /** Inverse mass: how readily constraints move it (the sweet is heavier than rope). */
  w: number;
}

export interface Link {
  a: number;
  b: number;
  len: number;
  /** Rope index, for drawing and cutting. */
  rope: number;
  cut: boolean;
}

export interface Bubble {
  x: number;
  y: number;
  /** Carrying the sweet. */
  holding: boolean;
  popped: boolean;
}

export interface Pin {
  x: number;
  y: number;
  r: number;
  /** Already tied to the sweet. */
  used: boolean;
}

export type Phase = 'play' | 'won' | 'lost';

export interface State extends BaseState {
  difficulty: DifficultySetting;
  level: number;
  def: LevelDef;
  pts: Pt[];
  links: Link[];
  /** Index of the sweet in pts. */
  candy: number;
  ropes: number;
  /** Ropes that have been cut: their loose ends dangle from the sweet without dragging it. */
  severed: boolean[];
  stars: { x: number; y: number; got: boolean }[];
  bubbles: Bubble[];
  pins: Pin[];
  puffs: { x: number; y: number; t: number; dir: number }[];
  phase: Phase;
  phaseT: number;
  frame: number;
  /** The finger trail of the current swipe, for cutting and drawing. */
  swipe: { x: number; y: number; t: number }[];
  lastPtr: { x: number; y: number } | null;
  /** Frames at which each action happened (for replays and the solver). */
  log: Action[];
  lostWhy: string;
  stats: { cuts: number; taps: number };
  /** Unspent time carried between updates, so the physics always step at 60 Hz. */
  acc: number;
}

export type Action = { f: number; kind: 'cut'; rope: number } | { f: number; kind: 'pop' } | { f: number; kind: 'blow'; i: number };

function point(x: number, y: number, pinned = false, w = 1): Pt {
  return { x, y, px: x, py: y, pinned, w };
}

/** Ties a rope of length `len` from a fixed point to the sweet. */
function tie(s: State, ax: number, ay: number, len: number) {
  const c = s.pts[s.candy];
  const rope = s.ropes++;
  const n = Math.max(2, Math.round(len / SEG_LEN));
  const first = s.pts.length;
  s.pts.push(point(ax, ay, true, 0));
  for (let i = 1; i < n; i++) {
    const t = i / n;
    // Slack ropes start sagging a little below the straight line.
    const sag = Math.sin(t * Math.PI) * Math.max(0, len - Math.hypot(c.x - ax, c.y - ay)) * 0.35;
    s.pts.push(point(ax + (c.x - ax) * t, ay + (c.y - ay) * t + sag, false, 1));
  }
  for (let i = 0; i < n; i++) {
    const a = first + i;
    const b = i === n - 1 ? s.candy : first + i + 1;
    s.links.push({ a, b, len: len / n, rope, cut: false });
  }
}

export function create(difficulty: DifficultySetting, index: number): State {
  const def = LEVELS[Math.max(0, Math.min(LEVELS.length - 1, index))];
  const s: State = {
    ...baseState(),
    difficulty,
    level: def.index,
    def,
    pts: [point(def.candy[0], def.candy[1], false, 0.05)],
    links: [],
    candy: 0,
    ropes: 0,
    severed: [],
    stars: def.stars.map(([x, y]) => ({ x, y, got: false })),
    bubbles: (def.bubbles ?? []).map(([x, y]) => ({ x, y, holding: false, popped: false })),
    pins: (def.pins ?? []).map(([x, y, r]) => ({ x, y, r, used: false })),
    puffs: [],
    phase: 'play',
    phaseT: 0,
    frame: 0,
    swipe: [],
    lastPtr: null,
    log: [],
    lostWhy: '',
    stats: { cuts: 0, taps: 0 },
    acc: 0,
  };
  for (const [ax, ay, len] of def.ropes) tie(s, ax, ay, len);
  return s;
}

export const candyPos = (s: State) => s.pts[s.candy];

/* ----------------------------------------------------------------- actions */
export function cutRope(s: State, rope: number, linkIndex?: number): boolean {
  const live = s.links.filter((l) => l.rope === rope && !l.cut);
  if (!live.length) return false;
  const link = linkIndex !== undefined ? s.links[linkIndex] : live[Math.floor(live.length / 2)];
  if (s.severed[rope]) {
    // Already cut: a swipe can still snip the dangling pieces, but it isn't a new move.
    if (linkIndex !== undefined) link.cut = true;
    return false;
  }
  link.cut = true;
  s.severed[rope] = true;
  s.stats.cuts++;
  s.log.push({ f: s.frame, kind: 'cut', rope });
  s.events.push('whoosh');
  return true;
}

export function popBubble(s: State): boolean {
  const b = s.bubbles.find((o) => o.holding && !o.popped);
  if (!b) return false;
  b.popped = true;
  b.holding = false;
  s.stats.taps++;
  s.log.push({ f: s.frame, kind: 'pop' });
  s.events.push('pop');
  return true;
}

export function blow(s: State, i: number): boolean {
  const bl = s.def.blowers?.[i];
  if (!bl) return false;
  const [x, y, dir] = bl;
  const c = candyPos(s);
  const dx = c.x - x;
  const dy = c.y - y;
  const d = Math.hypot(dx, dy);
  s.puffs.push({ x, y, t: 0, dir });
  s.stats.taps++;
  s.log.push({ f: s.frame, kind: 'blow', i });
  s.events.push('whoosh');
  // Only pushes the sweet if it is in front of the blower and close enough.
  const along = (dx * Math.cos(dir) + dy * Math.sin(dir)) / (d || 1);
  if (d < BLOW_RANGE && along > Math.cos(0.7)) {
    const k = BLOW_SPEED * (1 - d / (BLOW_RANGE * 1.4));
    c.px -= Math.cos(dir) * k * STEP;
    c.py -= Math.sin(dir) * k * STEP;
  }
  return true;
}

/** Cuts every rope link crossed by the segment (x0,y0)–(x1,y1). */
export function slice(s: State, x0: number, y0: number, x1: number, y1: number): number {
  let n = 0;
  s.links.forEach((l, i) => {
    if (l.cut) return;
    const a = s.pts[l.a];
    const b = s.pts[l.b];
    if (cross(x0, y0, x1, y1, a.x, a.y, b.x, b.y)) {
      if (cutRope(s, l.rope, i)) n++;
    }
  });
  return n;
}

function cross(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number): boolean {
  const d1 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  const d2 = (bx - ax) * (dy - ay) - (by - ay) * (dx - ax);
  const d3 = (dx - cx) * (ay - cy) - (dy - cy) * (ax - cx);
  const d4 = (dx - cx) * (by - cy) - (dy - cy) * (bx - cx);
  // Touching counts (a swipe can end exactly on the rope), but not running along it.
  return d1 * d2 <= 0 && d3 * d4 <= 0 && !(d1 === 0 && d2 === 0);
}

/* ----------------------------------------------------------------- physics */
function integrate(s: State) {
  const c = s.candy;
  const floating = s.bubbles.some((b) => b.holding);
  for (let i = 0; i < s.pts.length; i++) {
    const p = s.pts[i];
    if (p.pinned) continue;
    const vx = (p.x - p.px) * 0.995;
    const vy = (p.y - p.py) * 0.995;
    p.px = p.x;
    p.py = p.y;
    const g = i === c && floating ? FLOAT : GRAVITY;
    p.x += vx;
    p.y += vy + g * STEP * STEP;
    if (i === c && floating) {
      // A bubble drifts gently: damp the sweet's speed.
      p.px += (p.x - p.px) * 0.05;
      p.py += (p.y - p.py) * 0.05;
    }
  }
}

function constrain(s: State) {
  for (let k = 0; k < ITER; k++) {
    for (const l of s.links) {
      if (l.cut) continue;
      const a = s.pts[l.a];
      const b = s.pts[l.b];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy) || 1e-6;
      // Ropes only pull: a slack rope doesn't push.
      if (d <= l.len) continue;
      const wa = a.pinned ? 0 : a.w;
      // A cut rope's dangling end follows the sweet but doesn't pull on it.
      const wb = b.pinned || (l.b === s.candy && s.severed[l.rope]) ? 0 : b.w;
      const total = wa + wb;
      if (!total) continue;
      const diff = (d - l.len) / d / total;
      a.x += dx * diff * wa;
      a.y += dy * diff * wa;
      b.x -= dx * diff * wb;
      b.y -= dy * diff * wb;
    }
  }
}

function stepOnce(s: State) {
  s.frame++;
  integrate(s);
  constrain(s);
  const c = candyPos(s);
  for (const st of s.stars) {
    if (!st.got && Math.hypot(st.x - c.x, st.y - c.y) < STAR_R + CANDY_R * 0.5) {
      st.got = true;
      s.events.push('coin');
    }
  }
  for (const b of s.bubbles) {
    if (b.popped) continue;
    if (b.holding) {
      b.x = c.x;
      b.y = c.y;
    } else if (!s.bubbles.some((o) => o.holding) && Math.hypot(b.x - c.x, b.y - c.y) < 26) {
      b.holding = true;
      // The bubble soaks up most of the sweet's speed as it closes round it.
      c.px = c.x - (c.x - c.px) * 0.25;
      c.py = c.y - (c.y - c.py) * 0.25;
      s.events.push('blip');
    }
  }
  for (const p of s.pins) {
    if (!p.used && Math.hypot(p.x - c.x, p.y - c.y) < p.r) {
      p.used = true;
      tie(s, p.x, p.y, Math.hypot(p.x - c.x, p.y - c.y));
      s.events.push('click');
    }
  }
  for (const [x1, y1, x2, y2] of s.def.spikes ?? []) {
    if (distToSeg(c.x, c.y, x1, y1, x2, y2) < CANDY_R + 3) {
      s.phase = 'lost';
      s.lostWhy = 'spikes';
      s.events.push('failure');
      return;
    }
  }
  const [mx, my] = s.def.monster;
  if (Math.hypot(mx - c.x, my - 6 - c.y) < MOUTH_R) {
    s.phase = 'won';
    s.events.push('levelComplete');
    s.score = 1000 + s.stars.filter((o) => o.got).length * 1000;
    return;
  }
  if (c.y > H + 40 || c.x < -50 || c.x > W + 50 || c.y < -80) {
    s.phase = 'lost';
    s.lostWhy = 'fell';
    s.events.push('failure');
  }
}

function distToSeg(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(px - x1 - dx * t, py - y1 - dy * t);
}

/** Advances one fixed step (and the end-of-level pause). */
export function step(s: State) {
  s.phaseT += STEP;
  for (const p of s.puffs) p.t += STEP;
  s.puffs = s.puffs.filter((p) => p.t < 0.5);
  if (s.phase !== 'play') {
    if (s.phaseT > 1.2) s.over = true;
    return;
  }
  s.phaseT = 0;
  stepOnce(s);
}

export const starsGot = (s: State) => s.stars.filter((o) => o.got).length;

/* ------------------------------------------------------------------- input */
export function update(s: State, dt: number, input: Input) {
  const p = input.pointer;
  const now = s.time;
  if (p.pressed) {
    s.lastPtr = { x: p.x, y: p.y };
    const c = candyPos(s);
    // Taps: pop the bubble round the sweet, or puff a blower.
    if (s.bubbles.some((b) => b.holding) && Math.hypot(p.x - c.x, p.y - c.y) < 34) popBubble(s);
    else (s.def.blowers ?? []).forEach(([x, y], i) => Math.hypot(p.x - x, p.y - y) < 26 && blow(s, i));
  }
  if (p.down && s.lastPtr) {
    if (Math.hypot(p.x - s.lastPtr.x, p.y - s.lastPtr.y) > 1) {
      slice(s, s.lastPtr.x, s.lastPtr.y, p.x, p.y);
      s.swipe.push({ x: p.x, y: p.y, t: now });
    }
    s.lastPtr = { x: p.x, y: p.y };
  }
  if (!p.down) s.lastPtr = null;
  s.swipe = s.swipe.filter((q) => now - q.t < 0.25);
  // Keyboard: number keys cut ropes, Space pops the bubble or blows the first blower.
  for (const k of input.keys) {
    const n = Number(k);
    if (n >= 1 && n <= 9) cutRope(s, n - 1);
  }
  if (input.pressed.has('action')) {
    if (!popBubble(s) && s.def.blowers?.length) blow(s, 0);
  }
  if (input.pressed.has('action2') && (s.def.blowers?.length ?? 0) > 1) blow(s, 1);
  // Easy runs the world a little slower to give more time to react; the paths stay the same.
  s.acc = Math.min(s.acc + Math.min(dt, 0.05) * SPEED[s.difficulty], STEP * 4);
  while (s.acc >= STEP) {
    step(s);
    s.acc -= STEP;
  }
}

export const SPEED: Record<DifficultySetting, number> = { easy: 0.75, normal: 1, hard: 1.2 };

/* -------------------------------------------------------------- replaying */
/** Plays a level from a list of actions; returns the final state. */
export function replay(index: number, actions: Action[], maxSecs = 9): State {
  const s = create('normal', index);
  const queue = [...actions].sort((a, b) => a.f - b.f);
  for (let f = 0; f < maxSecs * 60 && s.phase === 'play'; f++) {
    while (queue.length && queue[0].f <= s.frame) {
      const a = queue.shift() as Action;
      if (a.kind === 'cut') cutRope(s, a.rope);
      else if (a.kind === 'pop') popBubble(s);
      else blow(s, a.i);
    }
    step(s);
  }
  return s;
}
