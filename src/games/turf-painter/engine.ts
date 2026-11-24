import type { DifficultySetting } from '@/types';
import { baseState } from '../_shared/arcade/kit';
import type { Action, BaseState, Input } from '../_shared/arcade/kit';

/**
 * Turf Painter: leave your land, draw a trail and come back to claim
 * everything the trail encloses. Rivals do the same. Run into someone's trail
 * to knock them out; if anyone touches yours before you get home, you are out.
 *
 * The map is a grid. Each player moves one square at a time; a claim fills
 * the trail plus every square no longer reachable from the map's edge without
 * crossing your land.
 */
export const COLS = 36;
export const ROWS = 36;
export const CELL = 10;
export const W = COLS * CELL;
export const H = ROWS * CELL;

export const DX = [0, 1, 0, -1];
export const DY = [-1, 0, 1, 0];
export const COLORS = ['', '#3b82f6', '#ef4444', '#f59e0b', '#a855f7', '#10b981'];
export const NAMES = ['', 'You', 'Red', 'Amber', 'Violet', 'Green'];

export interface Cfg {
  bots: number;
  /** Squares per second. */
  you: number;
  bot: number;
  /** How far bots wander from home (squares), and how keen they are to chase you. */
  reach: [number, number];
  hunt: number;
  goal: number;
}

export const CFG: Record<DifficultySetting, Cfg> = {
  easy: { bots: 2, you: 7.5, bot: 5.5, reach: [3, 6], hunt: 0, goal: 0.25 },
  normal: { bots: 3, you: 7.5, bot: 6.5, reach: [4, 8], hunt: 0.2, goal: 0.33 },
  hard: { bots: 4, you: 7.5, bot: 6.8, reach: [4, 10], hunt: 0.35, goal: 0.4 },
};

export interface Player {
  id: number;
  x: number;
  y: number;
  dir: number;
  want: number;
  trail: number[];
  alive: boolean;
  /** Fraction of a square travelled toward the next one. */
  t: number;
  speed: number;
  respawn: number;
  /** Bot plan: squares still to walk out before turning, and turns made. */
  plan: { out: number; side: number; turns: number; home: boolean };
  kills: number;
}

export interface State extends BaseState {
  cfg: Cfg;
  owner: Uint8Array;
  trailOf: Uint8Array;
  players: Player[];
  share: number;
  best: number;
  won: boolean;
  /** Swipe start for touch steering. */
  swipe: { x: number; y: number } | null;
  /** How your run ended, for the result screen. */
  cause: string;
  /** You stand still until your first turn, so nobody loses before they start. */
  waiting: boolean;
  /** Short messages shown on the map (knockouts). */
  feed: { text: string; t: number }[];
}

const idx = (x: number, y: number) => y * COLS + x;
const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < COLS && y < ROWS;

function spawnSpot(s: State, random: () => number): [number, number] | null {
  for (let k = 0; k < 200; k++) {
    const x = 3 + Math.floor(random() * (COLS - 6));
    const y = 3 + Math.floor(random() * (ROWS - 6));
    let free = true;
    for (let dy = -2; dy <= 2 && free; dy++) for (let dx = -2; dx <= 2 && free; dx++) if (s.owner[idx(x + dx, y + dy)] || s.trailOf[idx(x + dx, y + dy)]) free = false;
    if (free) return [x, y];
  }
  return null;
}

function spawn(s: State, p: Player, x: number, y: number, random: () => number) {
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) s.owner[idx(x + dx, y + dy)] = p.id;
  p.x = x;
  p.y = y;
  p.dir = p.want = Math.floor(random() * 4);
  p.trail = [];
  p.alive = true;
  p.t = 0;
  p.plan = { out: 0, side: 0, turns: 0, home: true };
}

export function create(difficulty: DifficultySetting, random: () => number = Math.random): State {
  const cfg = CFG[difficulty];
  const s: State = {
    ...baseState(),
    cfg,
    owner: new Uint8Array(COLS * ROWS),
    trailOf: new Uint8Array(COLS * ROWS),
    players: [],
    share: 0,
    best: 0,
    won: false,
    swipe: null,
    cause: '',
    feed: [],
    waiting: true,
  };
  for (let id = 1; id <= cfg.bots + 1; id++) {
    const p: Player = { id, x: 0, y: 0, dir: 0, want: 0, trail: [], alive: true, t: 0, speed: id === 1 ? cfg.you : cfg.bot, respawn: 0, plan: { out: 0, side: 0, turns: 0, home: true }, kills: 0 };
    s.players.push(p);
    const spot = id === 1 ? ([Math.floor(COLS / 2), Math.floor(ROWS / 2)] as [number, number]) : spawnSpot(s, random);
    if (spot) spawn(s, p, spot[0], spot[1], random);
  }
  s.share = shareOf(s, 1);
  return s;
}

export function shareOf(s: State, id: number): number {
  let n = 0;
  for (let i = 0; i < s.owner.length; i++) if (s.owner[i] === id) n++;
  return n / s.owner.length;
}

/** Knocks a player out: their trail vanishes and their land is freed. */
export type Cause = 'edge' | 'self' | 'cut' | 'crash' | 'enclosed' | 'wiped';
const CAUSES: Record<Cause, string> = {
  edge: 'You ran off the edge of the map.',
  self: 'You crossed your own trail.',
  cut: 'cut across your trail.',
  crash: 'ran into you outside your land.',
  enclosed: 'boxed you in.',
  wiped: 'took all of your land.',
};

function knockOut(s: State, p: Player, by: Player | null, cause: Cause) {
  if (!p.alive) return;
  if (p.id === 1) s.cause = by && by.id !== 1 ? `${NAMES[by.id]} ${CAUSES[cause]}` : CAUSES[cause];
  else if (by?.id === 1) s.feed.push({ text: `You knocked out ${NAMES[p.id]}!`, t: 2 });
  p.alive = false;
  for (const c of p.trail) if (s.trailOf[c] === p.id) s.trailOf[c] = 0;
  p.trail = [];
  for (let i = 0; i < s.owner.length; i++) if (s.owner[i] === p.id) s.owner[i] = 0;
  p.respawn = 3;
  if (by && by !== p) by.kills++;
  if (p.id === 1) {
    s.over = true;
    s.events.push('gameOver');
  } else s.events.push(by?.id === 1 ? 'success' : 'pop');
}

/** Turns the trail into land and fills everything it encloses. */
export function claim(s: State, p: Player) {
  for (const c of p.trail) {
    s.owner[c] = p.id;
    s.trailOf[c] = 0;
  }
  p.trail = [];
  // Flood from the map edge through squares that are not this player's land.
  const seen = new Uint8Array(COLS * ROWS);
  const stack: number[] = [];
  for (let x = 0; x < COLS; x++)
    for (const y of [0, ROWS - 1]) {
      const i = idx(x, y);
      if (s.owner[i] !== p.id && !seen[i]) {
        seen[i] = 1;
        stack.push(i);
      }
    }
  for (let y = 0; y < ROWS; y++)
    for (const x of [0, COLS - 1]) {
      const i = idx(x, y);
      if (s.owner[i] !== p.id && !seen[i]) {
        seen[i] = 1;
        stack.push(i);
      }
    }
  while (stack.length) {
    const i = stack.pop() as number;
    const x = i % COLS;
    const y = Math.floor(i / COLS);
    for (let d = 0; d < 4; d++) {
      const nx = x + DX[d];
      const ny = y + DY[d];
      if (!inside(nx, ny)) continue;
      const j = idx(nx, ny);
      if (!seen[j] && s.owner[j] !== p.id) {
        seen[j] = 1;
        stack.push(j);
      }
    }
  }
  let gained = 0;
  for (let i = 0; i < s.owner.length; i++) {
    if (!seen[i] && s.owner[i] !== p.id) {
      s.owner[i] = p.id;
      gained++;
      // Anyone caught inside the new land is knocked out.
      if (s.trailOf[i] && s.trailOf[i] !== p.id) {
        const other = s.players[s.trailOf[i] - 1];
        knockOut(s, other, p, 'enclosed');
      }
    }
  }
  // A rival whose land is all gone is out too.
  for (const o of s.players) if (o !== p && o.alive && !s.owner.includes(o.id)) knockOut(s, o, p, 'wiped');
  if (p.id === 1) s.events.push(gained > 30 ? 'levelComplete' : 'coin');
}

/** Moves a player onto the next square in its direction. */
function advance(s: State, p: Player) {
  // Turn if asked, but never straight back on yourself.
  if (p.want !== (p.dir + 2) % 4) p.dir = p.want;
  const nx = p.x + DX[p.dir];
  const ny = p.y + DY[p.dir];
  if (!inside(nx, ny)) {
    // Hitting the edge of the map ends a run.
    knockOut(s, p, null, 'edge');
    return;
  }
  const i = idx(nx, ny);
  const tr = s.trailOf[i];
  if (tr) {
    const victim = s.players[tr - 1];
    knockOut(s, victim, victim === p ? null : p, victim === p ? 'self' : 'cut');
    if (victim === p) return;
  }
  // Head-on: someone else standing there.
  for (const o of s.players) {
    if (o !== p && o.alive && o.x === nx && o.y === ny) {
      // Whoever is out of their own land loses.
      const pSafe = s.owner[i] === p.id;
      const oSafe = s.owner[i] === o.id;
      if (!oSafe) knockOut(s, o, p, 'crash');
      if (!pSafe) {
        knockOut(s, p, o, 'crash');
        return;
      }
    }
  }
  p.x = nx;
  p.y = ny;
  if (s.owner[i] === p.id) {
    if (p.trail.length) claim(s, p);
  } else {
    s.trailOf[i] = p.id;
    p.trail.push(i);
  }
}

/** Shortest path direction home through squares that are not this bot's own trail. */
function homeward(s: State, p: Player): number {
  const prev = new Int16Array(COLS * ROWS).fill(-1);
  const start = idx(p.x, p.y);
  prev[start] = start;
  const queue = [start];
  let goal = -1;
  for (let q = 0; q < queue.length; q++) {
    const i = queue[q];
    if (i !== start && s.owner[i] === p.id) {
      goal = i;
      break;
    }
    const x = i % COLS;
    const y = Math.floor(i / COLS);
    for (let d = 0; d < 4; d++) {
      const nx = x + DX[d];
      const ny = y + DY[d];
      if (!inside(nx, ny)) continue;
      const j = idx(nx, ny);
      if (prev[j] >= 0 || s.trailOf[j] === p.id) continue;
      if (i === start && d === (p.dir + 2) % 4) continue;
      prev[j] = i;
      queue.push(j);
    }
  }
  if (goal < 0) return p.dir;
  let c = goal;
  while (prev[c] !== start) c = prev[c];
  const dx = (c % COLS) - p.x;
  const dy = Math.floor(c / COLS) - p.y;
  return dx === 1 ? 1 : dx === -1 ? 3 : dy === 1 ? 2 : 0;
}

/** Bot steering (exported so tests can let a bot play your side too). */
export function botThink(s: State, p: Player, random: () => number) {
  const you = p.id === 1 ? s.players[1] : s.players[0];
  const home = s.owner[idx(p.x, p.y)] === p.id;
  const ahead = [p.x + DX[p.dir], p.y + DY[p.dir]];
  const danger = !inside(ahead[0], ahead[1]) || s.trailOf[idx(ahead[0], ahead[1])] === p.id;
  // Go home if your trail is long or the player is close to it.
  const near = you.alive && p.trail.some((c) => Math.abs((c % COLS) - you.x) + Math.abs(Math.floor(c / COLS) - you.y) <= 3);
  if (!home && (p.plan.home || near || p.trail.length > s.cfg.reach[1] * 3)) {
    p.want = homeward(s, p);
    return;
  }
  // Now and then, go for the player's trail if it is close.
  if (s.cfg.hunt > 0 && you.alive && you.trail.length && random() < s.cfg.hunt * 0.15) {
    let best = -1;
    let bd = 9;
    for (const c of you.trail) {
      const d = Math.abs((c % COLS) - p.x) + Math.abs(Math.floor(c / COLS) - p.y);
      if (d < bd) {
        bd = d;
        best = c;
      }
    }
    if (best >= 0 && bd <= 6) {
      const dx = (best % COLS) - p.x;
      const dy = Math.floor(best / COLS) - p.y;
      const d = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : dy > 0 ? 2 : 0;
      if (d !== (p.dir + 2) % 4) {
        p.want = d;
        return;
      }
    }
  }
  if (home) {
    if (p.plan.home) {
      // Plan a new loop: out, along, then back.
      const [lo, hi] = s.cfg.reach;
      p.plan = { out: lo + Math.floor(random() * (hi - lo + 1)), side: lo + Math.floor(random() * (hi - lo + 1)), turns: 0, home: false };
      p.want = Math.floor(random() * 4);
    }
  } else {
    if (p.plan.turns === 0 && p.trail.length >= p.plan.out) {
      p.want = (p.dir + (random() < 0.5 ? 1 : 3)) % 4;
      p.plan.turns = 1;
    } else if (p.plan.turns === 1 && p.trail.length >= p.plan.out + p.plan.side) {
      p.plan.home = true;
      p.want = homeward(s, p);
    }
  }
  if (danger) {
    // Steer away from the edge or its own trail.
    for (const d of [(p.dir + 1) % 4, (p.dir + 3) % 4]) {
      const x = p.x + DX[d];
      const y = p.y + DY[d];
      if (inside(x, y) && s.trailOf[idx(x, y)] !== p.id) {
        p.want = d;
        break;
      }
    }
  }
}

function steer(s: State, input: Input) {
  const you = s.players[0];
  const keys: [Action, number][] = [
    ['up', 0],
    ['right', 1],
    ['down', 2],
    ['left', 3],
  ];
  for (const [k, d] of keys) {
    if (input.pressed.has(k) || input.held.has(k)) {
      you.want = d;
      if (s.waiting) you.dir = d;
      s.waiting = false;
    }
  }
  // Swipe anywhere on the map.
  const ptr = input.pointer;
  if (ptr.pressed) s.swipe = { x: ptr.x, y: ptr.y };
  if (s.swipe && ptr.down) {
    const dx = ptr.x - s.swipe.x;
    const dy = ptr.y - s.swipe.y;
    if (Math.hypot(dx, dy) > 14) {
      you.want = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : dy > 0 ? 2 : 0;
      if (s.waiting) you.dir = you.want;
      s.waiting = false;
      s.swipe = { x: ptr.x, y: ptr.y };
    }
  }
  if (!ptr.down) s.swipe = null;
}

export function update(s: State, dt: number, input: Input, random: () => number = Math.random) {
  if (s.over) return;
  steer(s, input);
  for (const p of s.players) {
    if (p.id === 1 && s.waiting) continue;
    if (!p.alive) {
      if (p.id === 1) continue;
      p.respawn -= dt;
      if (p.respawn <= 0) {
        const spot = spawnSpot(s, random);
        if (spot) spawn(s, p, spot[0], spot[1], random);
        else p.respawn = 1;
      }
      continue;
    }
    p.t += p.speed * dt;
    while (p.t >= 1 && p.alive && !s.over) {
      p.t -= 1;
      if (p.id !== 1) botThink(s, p, random);
      advance(s, p);
    }
  }
  for (const f of s.feed) f.t -= dt;
  s.feed = s.feed.filter((f) => f.t > 0);
  s.share = shareOf(s, 1);
  s.best = Math.max(s.best, s.share);
  s.score = Math.round(s.best * 1000) + s.players[0].kills * 150;
  if (s.share >= s.cfg.goal && !s.over) {
    s.won = true;
    s.over = true;
    s.events.push('levelComplete');
  }
}
