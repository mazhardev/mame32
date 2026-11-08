import type { DifficultySetting } from '@/types';
import { baseState } from '../_shared/arcade/kit';
import type { BaseState, Input } from '../_shared/arcade/kit';
import { D, H, LEVELS, W, at, track } from './paths';
import type { LevelDef, Track } from './paths';

/**
 * Marble Chain rules. A chain of coloured marbles rolls along the track
 * toward the pit, pushed from behind as new marbles roll in. The shooter
 * fires marbles into the chain; three or more of a colour touching vanish.
 * When a gap opens and the marbles either side of it share a colour, the
 * front part rolls back to close it, and a new match there is a combo.
 * Marbles are kept front first, each with its distance `s` along the track.
 */
export const COLORS = ['#e8453c', '#3a8de8', '#f2c230', '#3cbf5a', '#a35de0', '#f08a2c'];
export type Power = 'none' | 'bomb' | 'slow' | 'back';

export interface Marble {
  c: number;
  s: number;
  /** Drawn position along the track, easing toward s. */
  vs: number;
  power: Power;
  id: number;
}

export interface Shot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  c: number;
}

export interface Fx {
  x: number;
  y: number;
  t: number;
  c: number;
  kind: 'pop' | 'boom' | 'text';
  text?: string;
}

export type Phase = 'roll' | 'play' | 'clear' | 'lost' | 'won';

export interface State extends BaseState {
  difficulty: DifficultySetting;
  level: number;
  def: LevelDef;
  track: Track;
  chain: Marble[];
  /** Marbles still to roll in. */
  toCome: number;
  colors: number;
  speed: number;
  /** Intro rush until the chain is a good length. */
  rushing: boolean;
  slowT: number;
  backT: number;
  shots: Shot[];
  /** Shooter aim (radians) and the two marbles it holds. */
  aim: number;
  load: number;
  next: number;
  cool: number;
  combo: number;
  fx: Fx[];
  phase: Phase;
  phaseT: number;
  lives: number;
  reached: number;
  nextId: number;
  lastColor: number;
  rand: () => number;
  stats: { bestCombo: number; cleared: number; powers: number; levelsWon: number };
}

const SHOT_SPEED = 720;
const PULL_SPEED = 360;
const RUSH_SPEED = 240;
const COOLDOWN = 0.18;

function seeded(seed: number) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export function create(difficulty: DifficultySetting, start = 0, seed = Math.floor(Math.random() * 2 ** 31)): State {
  const s = {
    ...baseState(),
    difficulty,
    lives: difficulty === 'easy' ? 5 : 3,
    reached: start,
    nextId: 1,
    rand: seeded(seed),
    stats: { bestCombo: 0, cleared: 0, powers: 0, levelsWon: 0 },
  } as State;
  loadLevel(s, start);
  return s;
}

export function loadLevel(s: State, i: number) {
  const def = LEVELS[Math.min(i, LEVELS.length - 1)];
  const d = s.difficulty;
  s.level = def.index;
  s.def = def;
  s.track = track(def.track);
  s.chain = [];
  s.colors = Math.max(3, def.colors - (d === 'easy' ? 1 : 0));
  s.toCome = Math.round(def.count * (d === 'easy' ? 0.8 : d === 'hard' ? 1.15 : 1));
  s.speed = def.speed * (d === 'easy' ? 0.8 : d === 'hard' ? 1.15 : 1);
  s.rushing = true;
  s.slowT = 0;
  s.backT = 0;
  s.shots = [];
  s.aim = -Math.PI / 2;
  s.lastColor = Math.floor(s.rand() * s.colors);
  s.load = Math.floor(s.rand() * s.colors);
  s.next = Math.floor(s.rand() * s.colors);
  s.cool = 0;
  s.combo = 0;
  s.fx = [];
  s.phase = 'roll';
  s.phaseT = 0;
  s.reached = Math.max(s.reached, def.index);
}

/* --------------------------------------------------------------- the chain */
function newMarble(s: State, sPos: number): Marble {
  // Runs of the same colour make the chain readable and matchable.
  const c = s.rand() < 0.42 ? s.lastColor : Math.floor(s.rand() * s.colors);
  s.lastColor = c;
  const roll = s.rand();
  const power: Power = roll < 0.018 ? 'bomb' : roll < 0.03 ? 'slow' : roll < 0.04 ? 'back' : 'none';
  return { c, s: sPos, vs: sPos, power, id: s.nextId++ };
}

/** Index ranges of touching marbles, front first. */
export function segments(chain: Marble[]): [number, number][] {
  const out: [number, number][] = [];
  let start = 0;
  for (let i = 1; i <= chain.length; i++) {
    if (i === chain.length || chain[i - 1].s - chain[i].s > D + 0.5) {
      if (chain.length) out.push([start, i - 1]);
      start = i;
    }
  }
  return out;
}

/** Pushes overlapping marbles forward, from the back of the chain to the front. */
function settle(chain: Marble[]) {
  for (let i = chain.length - 1; i > 0; i--) if (chain[i - 1].s < chain[i].s + D) chain[i - 1].s = chain[i].s + D;
}

/** Colours still on the track (the shooter only gets these). */
function colorsInPlay(s: State): number[] {
  const set = new Set(s.chain.map((m) => m.c));
  return set.size ? [...set] : [Math.floor(s.rand() * s.colors)];
}

function reload(s: State) {
  const live = colorsInPlay(s);
  s.load = s.next;
  if (!live.includes(s.load)) s.load = live[Math.floor(s.rand() * live.length)];
  s.next = live[Math.floor(s.rand() * live.length)];
}

export function swap(s: State) {
  [s.load, s.next] = [s.next, s.load];
  s.events.push('click');
}

export function fire(s: State) {
  if (s.cool > 0 || (s.phase !== 'play' && s.phase !== 'roll')) return;
  const t = s.track;
  s.shots.push({ x: t.sx + Math.cos(s.aim) * 22, y: t.sy + Math.sin(s.aim) * 22, vx: Math.cos(s.aim) * SHOT_SPEED, vy: Math.sin(s.aim) * SHOT_SPEED, c: s.load });
  s.cool = COOLDOWN;
  reload(s);
  s.events.push('shoot');
}

/** Removes a run of three or more around index k; returns how many went. */
function matchAt(s: State, k: number, chainBonus: boolean): number {
  const ch = s.chain;
  if (k < 0 || k >= ch.length) return 0;
  const c = ch[k].c;
  let a = k;
  let b = k;
  while (a > 0 && ch[a - 1].c === c && ch[a - 1].s - ch[a].s <= D + 0.5) a--;
  while (b < ch.length - 1 && ch[b + 1].c === c && ch[b].s - ch[b + 1].s <= D + 0.5) b++;
  const n = b - a + 1;
  if (n < 3) return 0;
  const gone = ch.slice(a, b + 1);
  if (chainBonus) s.combo++;
  else s.combo = Math.max(s.combo, 1);
  s.stats.bestCombo = Math.max(s.stats.bestCombo, s.combo);
  const pts = n * 10 + (s.combo > 1 ? s.combo * 100 : 0);
  s.score += pts;
  s.stats.cleared += n;
  ch.splice(a, n);
  const [x, y] = at(s.track, gone[Math.floor(n / 2)].vs);
  s.fx.push({ x, y: y - 14, t: 0, c, kind: 'text', text: s.combo > 1 ? `COMBO ×${s.combo}  +${pts}` : `+${pts}` });
  for (const m of gone) {
    const [mx, my] = at(s.track, m.vs);
    s.fx.push({ x: mx, y: my, t: 0, c: m.c, kind: 'pop' });
  }
  s.events.push(s.combo > 1 ? 'success' : 'pop');
  for (const m of gone) if (m.power !== 'none') firePower(s, m);
  return n;
}

function firePower(s: State, m: Marble) {
  s.stats.powers++;
  const [x, y] = at(s.track, m.vs);
  if (m.power === 'bomb') {
    s.fx.push({ x, y, t: 0, c: 0, kind: 'boom' });
    const before = s.chain.length;
    s.chain = s.chain.filter((o) => {
      const [ox, oy] = at(s.track, o.vs);
      const hit = Math.hypot(ox - x, oy - y) < 58;
      if (hit) s.fx.push({ x: ox, y: oy, t: 0, c: o.c, kind: 'pop' });
      return !hit;
    });
    const n = before - s.chain.length;
    s.score += n * 10;
    s.stats.cleared += n;
    s.events.push('explosion');
  } else if (m.power === 'slow') {
    s.slowT = 7;
    s.fx.push({ x, y: y - 16, t: 0, c: 0, kind: 'text', text: 'SLOW DOWN' });
    s.events.push('powerup');
  } else {
    s.backT = 2.5;
    s.fx.push({ x, y: y - 16, t: 0, c: 0, kind: 'text', text: 'ROLL BACK' });
    s.events.push('powerup');
  }
}

/** A shot joins the chain next to the marble it hit. */
function insert(s: State, shot: Shot, hit: number) {
  const ch = s.chain;
  const m = ch[hit];
  // Front or behind the marble hit: compare with the track direction there.
  const [ax, ay] = at(s.track, m.s);
  const [bx, by] = at(s.track, m.s + 4);
  const ahead = (shot.x - ax) * (bx - ax) + (shot.y - ay) * (by - ay) > 0;
  const idx = ahead ? hit : hit + 1;
  const sPos = ahead ? m.s + D : m.s - D;
  const marble: Marble = { c: shot.c, s: sPos, vs: sPos, power: 'none', id: s.nextId++ };
  // Start the drawn position where the shot hit, so it slides in.
  marble.vs = m.s + (ahead ? D * 0.5 : -D * 0.5);
  ch.splice(idx, 0, marble);
  settle(ch);
  s.events.push('blip');
  if (!matchAt(s, idx, false)) s.combo = 0;
}

/* ------------------------------------------------------------------ update */
export function step(s: State, dt: number) {
  s.phaseT += dt;
  s.cool = Math.max(0, s.cool - dt);
  for (const f of s.fx) f.t += dt;
  s.fx = s.fx.filter((f) => f.t < (f.kind === 'text' ? 1.1 : 0.5));
  if (s.phase === 'won') return;
  const t = s.track;
  const ch = s.chain;

  if (s.phase === 'lost') {
    // The whole chain rushes into the pit.
    for (const m of ch) {
      m.s += 420 * dt;
      m.vs = m.s;
    }
    s.chain = ch.filter((m) => m.s < t.length);
    if (s.phaseT > 1.8) afterLoss(s);
    return;
  }
  if (s.phase === 'clear') {
    if (s.phaseT > 1.6) {
      if (s.level >= LEVELS.length - 1) {
        s.phase = 'won';
        s.over = true;
        s.events.push('levelComplete');
      } else loadLevel(s, s.level + 1);
    }
    return;
  }

  // Roll in new marbles behind the chain.
  const tail = ch[ch.length - 1];
  while (s.toCome > 0 && (!tail || tail.s >= D) && (ch.length === 0 || ch[ch.length - 1].s >= D)) {
    const back = ch[ch.length - 1];
    ch.push(newMarble(s, back ? back.s - D : 0));
    s.toCome--;
  }
  if (s.rushing && (ch.length && ch[0].s > t.length * 0.32)) {
    s.rushing = false;
    s.phase = 'play';
  }

  // Pushing from behind: the back segment rolls forward.
  const segs = segments(ch);
  let speed = s.rushing ? RUSH_SPEED : s.speed;
  // Near the pit the chain slows a little, giving a last chance.
  if (!s.rushing && ch.length && ch[0].s > t.length - 140) speed *= 0.75;
  if (s.slowT > 0) {
    s.slowT -= dt;
    speed *= 0.4;
  }
  if (s.backT > 0) {
    s.backT -= dt;
    speed = -speed * 2.2;
  }
  if (segs.length) {
    const [a, b] = segs[segs.length - 1];
    const minS = s.toCome > 0 ? -Infinity : -D;
    for (let i = a; i <= b; i++) ch[i].s = Math.max(ch[i].s + speed * dt, minS + (b - i) * D);
  }
  // Front segments roll back to close a gap where the colours match.
  for (let g = segs.length - 2; g >= 0; g--) {
    const [a, b] = segs[g];
    const behind = segs[g + 1][0];
    if (ch[b] && ch[behind] && ch[b].c === ch[behind].c) {
      const gap = ch[b].s - ch[behind].s - D;
      const move = Math.min(gap, PULL_SPEED * dt);
      for (let i = a; i <= b; i++) ch[i].s -= move;
      if (gap - move <= 0.01) {
        // Joined: a match here is a chain reaction.
        s.events.push('click');
        matchAt(s, b, true);
        break;
      }
    }
  }
  settle(ch);
  for (const m of ch) m.vs += (m.s - m.vs) * Math.min(1, dt * 18);

  // Shots in flight.
  for (let i = s.shots.length - 1; i >= 0; i--) {
    const sh = s.shots[i];
    const steps = 3;
    let done = false;
    for (let k = 0; k < steps && !done; k++) {
      sh.x += (sh.vx * dt) / steps;
      sh.y += (sh.vy * dt) / steps;
      for (let j = 0; j < ch.length; j++) {
        if (ch[j].s < 0) continue;
        const [mx, my] = at(t, ch[j].vs);
        if ((mx - sh.x) ** 2 + (my - sh.y) ** 2 < (D * 0.92) ** 2) {
          insert(s, sh, j);
          done = true;
          break;
        }
      }
    }
    if (done || sh.x < -20 || sh.x > W + 20 || sh.y < -20 || sh.y > H + 20) s.shots.splice(i, 1);
  }

  // Lost: the front marble reaches the pit.
  if (s.chain.length && s.chain[0].s >= t.length) {
    s.lives--;
    s.phase = 'lost';
    s.phaseT = 0;
    s.events.push('failure');
    return;
  }
  // Won: nothing left on the track and nothing more to come.
  if (s.toCome === 0 && s.chain.length === 0 && s.phase === 'play') {
    const bonus = 1000 + s.level * 250;
    s.score += bonus;
    s.stats.levelsWon++;
    s.fx.push({ x: W / 2, y: H / 2, t: 0, c: 0, kind: 'text', text: `TEMPLE CLEARED +${bonus}` });
    s.phase = 'clear';
    s.phaseT = 0;
    s.events.push('levelComplete');
  }
}

/** After a lost level: retry it while lives remain. */
export function afterLoss(s: State) {
  if (s.lives <= 0) {
    s.over = true;
    s.events.push('gameOver');
  } else loadLevel(s, s.level);
}

export const shooterPos = (s: State): [number, number] => [s.track.sx, s.track.sy];

/* ------------------------------------------------------------------- input */
const TURN = 2.6;

export function update(s: State, dt: number, input: Input) {
  const [sx, sy] = shooterPos(s);
  const p = input.pointer;
  if (p.active && (p.down || !input.held.size)) {
    const dx = p.x - sx;
    const dy = p.y - sy;
    if (Math.hypot(dx, dy) > 6) s.aim = Math.atan2(dy, dx);
  }
  if (input.held.has('left')) s.aim -= TURN * dt;
  if (input.held.has('right')) s.aim += TURN * dt;
  if (p.pressed) {
    if (Math.hypot(p.x - sx, p.y - sy) < 24) swap(s);
    else {
      s.aim = Math.atan2(p.y - sy, p.x - sx);
      fire(s);
    }
  }
  if (input.pressed.has('action') || input.pressed.has('up')) fire(s);
  if (input.pressed.has('down') || input.pressed.has('action2')) swap(s);
  step(s, Math.min(dt, 0.05));
}
