import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState } from '../_shared/arcade/kit';
import type { Action, ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { circle, text } from '../_shared/arcade/draw';
import { COLS, DOOR, HOUSE, MAZE, PLAYER_START, ROWS, TUNNEL_ROW, ghostWalkable, walkable } from './maze';

/**
 * Maze Muncher: eat every dot in the maze while four ghosts hunt you.
 * Power pellets turn the ghosts blue for a few seconds so you can eat them.
 *
 * Everything moves tile to tile: an entity sits on tile (tx, ty) and is a
 * fraction `p` of the way towards the neighbouring tile in `dir`. Turning
 * decisions are made only at tile centres (p = 0), which keeps movement
 * exact and easy to test.
 */
export const T = 20;
const TOP = 24;
export const W = COLS * T;
export const H = ROWS * T + TOP;

export type Dir = readonly [number, number];
const UP: Dir = [0, -1];
const DOWN: Dir = [0, 1];
const LEFT: Dir = [-1, 0];
const RIGHT: Dir = [1, 0];
/** Tie-break order when two turns are equally good. */
const DIRS: Dir[] = [UP, LEFT, DOWN, RIGHT];
const ACTION_DIR: [Action, Dir][] = [
  ['up', UP],
  ['down', DOWN],
  ['left', LEFT],
  ['right', RIGHT],
];

export interface Mover {
  tx: number;
  ty: number;
  dir: Dir;
  p: number;
}

export type GhostMode = 'house' | 'leaving' | 'active' | 'frightened' | 'eyes';

export interface Ghost extends Mover {
  name: string;
  color: string;
  mode: GhostMode;
  release: number;
  corner: [number, number];
}

export interface State extends BaseState {
  player: Mover;
  want: Dir;
  mouth: number;
  dots: Set<number>;
  pellets: Set<number>;
  ghosts: Ghost[];
  lives: number;
  level: number;
  phaseT: number;
  scatter: boolean;
  frightT: number;
  frightTime: number;
  eatChain: number;
  deathT: number;
  speed: number;
  ghostSpeed: number;
  readyT: number;
  ghostsEaten: number;
  bonusLife: boolean;
}

const SETTINGS: Record<DifficultySetting, { speed: number; ghost: number; fright: number }> = {
  easy: { speed: 6.6, ghost: 5.2, fright: 9 },
  normal: { speed: 7, ghost: 6.3, fright: 7 },
  hard: { speed: 7.4, ghost: 7.1, fright: 5 },
};

export const cellKey = (x: number, y: number) => y * COLS + x;
const wrap = (x: number) => ((x % COLS) + COLS) % COLS;
const same = (a: Dir, b: Dir) => a[0] === b[0] && a[1] === b[1];
const opposite = (d: Dir): Dir => [-d[0], -d[1]];

function freshDots() {
  const dots = new Set<number>();
  const pellets = new Set<number>();
  MAZE.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === '.') dots.add(cellKey(x, y));
      if (ch === 'o') pellets.add(cellKey(x, y));
    }),
  );
  return { dots, pellets };
}

function makeGhosts(): Ghost[] {
  const g = (name: string, color: string, tx: number, ty: number, mode: GhostMode, release: number, corner: [number, number]): Ghost => ({
    name,
    color,
    tx,
    ty,
    dir: mode === 'active' ? LEFT : UP,
    p: 0,
    mode,
    release,
    corner,
  });
  return [
    g('Blaze', '#ef4444', DOOR.x, DOOR.y - 1, 'active', 0, [COLS - 2, -2]),
    g('Petal', '#f9a8d4', HOUSE.x, HOUSE.y, 'house', 1.5, [1, -2]),
    g('Splash', '#22d3ee', HOUSE.x - 1, HOUSE.y, 'house', 5, [COLS - 1, ROWS]),
    g('Sunny', '#fb923c', HOUSE.x + 1, HOUSE.y, 'house', 9, [0, ROWS]),
  ];
}

export function create(difficulty: DifficultySetting): State {
  const c = SETTINGS[difficulty];
  const { dots, pellets } = freshDots();
  return {
    ...baseState(),
    player: { tx: PLAYER_START.x, ty: PLAYER_START.y, dir: LEFT, p: 0 },
    want: LEFT,
    mouth: 0,
    dots,
    pellets,
    ghosts: makeGhosts(),
    lives: 3,
    level: 1,
    phaseT: 7,
    scatter: true,
    frightT: 0,
    frightTime: c.fright,
    eatChain: 0,
    deathT: 0,
    speed: c.speed,
    ghostSpeed: c.ghost,
    readyT: 1.5,
    ghostsEaten: 0,
    bonusLife: false,
  };
}

/** Continuous position of a mover, in tiles. */
export function pos(m: Mover): [number, number] {
  return [m.tx + m.dir[0] * m.p, m.ty + m.dir[1] * m.p];
}

/** Can a mover standing on (x, y) step in direction d? */
export function canStep(x: number, y: number, d: Dir, ghost = false): boolean {
  const nx = x + d[0];
  const ny = y + d[1];
  // Only the tunnel row wraps around the sides.
  if ((nx < 0 || nx >= COLS) && ny !== TUNNEL_ROW) return false;
  return ghost ? ghostWalkable(wrap(nx), ny) : walkable(wrap(nx), ny);
}

/**
 * Advances a mover by `dist` tiles. At each tile centre `choose` picks the
 * next direction (or null to stand still) and `arrive` runs on reaching a
 * new tile.
 */
export function advance(m: Mover, dist: number, choose: (m: Mover) => Dir | null, arrive?: (m: Mover) => void) {
  let left = dist;
  for (let guard = 0; guard < 6 && left > 1e-9; guard++) {
    if (m.p === 0) {
      const d = choose(m);
      if (!d) return;
      m.dir = d;
    }
    const need = 1 - m.p;
    if (left < need) {
      m.p += left;
      return;
    }
    left -= need;
    m.tx = wrap(m.tx + m.dir[0]);
    m.ty += m.dir[1];
    m.p = 0;
    arrive?.(m);
  }
}

/** Turns a mover around on the spot, even between two tiles. */
export function reverse(m: Mover) {
  if (m.p > 0) {
    m.tx = wrap(m.tx + m.dir[0]);
    m.ty += m.dir[1];
    m.p = 1 - m.p;
  }
  m.dir = opposite(m.dir);
}

function ghostTarget(s: State, g: Ghost, index: number): [number, number] {
  if (g.mode === 'eyes') return [HOUSE.x, HOUSE.y];
  if (g.mode === 'leaving') return [DOOR.x, DOOR.y - 1];
  if (s.scatter) return g.corner;
  const { tx: px, ty: py, dir } = s.player;
  switch (index) {
    // Petal aims four tiles ahead of the muncher to cut it off.
    case 1:
      return [px + dir[0] * 4, py + dir[1] * 4];
    // Splash mirrors Blaze around a point just ahead of the muncher, so the
    // two of them tend to pincer.
    case 2: {
      const ax = px + dir[0] * 2;
      const ay = py + dir[1] * 2;
      const b = s.ghosts[0];
      return [2 * ax - b.tx, 2 * ay - b.ty];
    }
    // Sunny chases from afar but loses its nerve up close.
    case 3:
      return Math.hypot(px - g.tx, py - g.ty) > 7 ? [px, py] : g.corner;
    // Blaze heads straight for the muncher.
    default:
      return [px, py];
  }
}

export function chooseGhostDir(s: State, g: Ghost, index: number, random: () => number): Dir {
  const viaDoor = g.mode === 'eyes' || g.mode === 'leaving';
  // Ghosts never reverse on their own, except when leaving the house.
  let options = DIRS.filter((d) => (g.mode === 'leaving' || !same(d, opposite(g.dir))) && canStep(g.tx, g.ty, d, viaDoor));
  if (!options.length) options = [opposite(g.dir)];
  if (g.mode === 'frightened') return options[Math.floor(random() * options.length)];
  const [tx, ty] = ghostTarget(s, g, index);
  let best = options[0];
  let bestD = Infinity;
  for (const d of options) {
    const dd = (g.tx + d[0] - tx) ** 2 + (g.ty + d[1] - ty) ** 2;
    if (dd < bestD) {
      bestD = dd;
      best = d;
    }
  }
  return best;
}

function resetPositions(s: State) {
  s.player = { tx: PLAYER_START.x, ty: PLAYER_START.y, dir: LEFT, p: 0 };
  s.want = LEFT;
  s.ghosts = makeGhosts();
  s.frightT = 0;
  s.readyT = 1.5;
}

export function eatAt(s: State, x: number, y: number) {
  const k = cellKey(x, y);
  if (s.dots.delete(k)) {
    s.score += 10;
    s.events.push('tick');
  }
  if (s.pellets.delete(k)) {
    s.score += 50;
    s.frightT = s.frightTime;
    s.eatChain = 0;
    for (const g of s.ghosts)
      if (g.mode === 'active' || g.mode === 'frightened') {
        if (g.mode === 'active') reverse(g);
        g.mode = 'frightened';
      }
    s.events.push('powerup');
  }
}

function ghostSpeed(s: State, g: Ghost): number {
  if (g.mode === 'eyes') return 15;
  if (g.mode === 'leaving') return 4;
  if (g.mode === 'frightened') return s.ghostSpeed * 0.55;
  // Ghosts are slowed down in the side tunnels.
  if (g.ty === TUNNEL_ROW && (g.tx < 4 || g.tx > COLS - 5)) return s.ghostSpeed * 0.5;
  return s.ghostSpeed * (1 + (s.level - 1) * 0.05);
}

function steer(s: State, input: Input) {
  for (const [a, d] of ACTION_DIR) if (input.held.has(a)) s.want = d;
  // A fresh press wins over keys that are still held.
  for (const [a, d] of ACTION_DIR) if (input.pressed.has(a)) s.want = d;
  // Touch or mouse: hold the pointer on the side of the muncher to head that way.
  const pt = input.pointer;
  if (pt.down) {
    const [x, y] = pos(s.player);
    const dx = pt.x - (x * T + T / 2);
    const dy = pt.y - TOP - (y * T + T / 2);
    if (Math.max(Math.abs(dx), Math.abs(dy)) > T * 0.75) s.want = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? RIGHT : LEFT) : dy > 0 ? DOWN : UP;
  }
}

export function update(s: State, dt: number, input: Input, random: () => number) {
  steer(s, input);
  if (s.readyT > 0) {
    s.readyT -= dt;
    return;
  }
  if (s.deathT > 0) {
    s.deathT -= dt;
    if (s.deathT <= 0) {
      if (s.lives <= 0) s.over = true;
      else resetPositions(s);
    }
    return;
  }

  // Scatter and chase alternate; the clock stops while ghosts are frightened.
  if (s.frightT > 0) {
    s.frightT -= dt;
    if (s.frightT <= 0) for (const g of s.ghosts) if (g.mode === 'frightened') g.mode = 'active';
  } else {
    s.phaseT -= dt;
    if (s.phaseT <= 0) {
      s.scatter = !s.scatter;
      s.phaseT = s.scatter ? Math.max(3, 8 - s.level) : 20;
      for (const g of s.ghosts) if (g.mode === 'active') reverse(g);
    }
  }

  // The muncher reverses instantly and turns at tile centres when it can.
  const pl = s.player;
  if (same(s.want, opposite(pl.dir))) reverse(pl);
  advance(
    pl,
    s.speed * (1 + (s.level - 1) * 0.04) * dt,
    (m) => (canStep(m.tx, m.ty, s.want) ? s.want : canStep(m.tx, m.ty, m.dir) ? m.dir : null),
    (m) => eatAt(s, m.tx, m.ty),
  );
  s.mouth += dt * 12;

  s.ghosts.forEach((g, i) => {
    if (g.mode === 'house') {
      g.release -= dt * (1 + (s.level - 1) * 0.3);
      if (g.release <= 0) g.mode = 'leaving';
      return;
    }
    advance(
      g,
      ghostSpeed(s, g) * dt,
      (m) => chooseGhostDir(s, m as Ghost, i, random),
      (m) => {
        if (g.mode === 'leaving' && m.tx === DOOR.x && m.ty === DOOR.y - 1) g.mode = 'active';
        if (g.mode === 'eyes' && m.tx === HOUSE.x && m.ty === HOUSE.y) g.mode = 'leaving';
      },
    );
  });

  // Collisions, measured across the tunnel wrap too.
  const [px, py] = pos(pl);
  for (const g of s.ghosts) {
    if (g.mode === 'house' || g.mode === 'eyes' || g.mode === 'leaving') continue;
    const [gx, gy] = pos(g);
    const dx = Math.abs(gx - px);
    if (Math.min(dx, COLS - dx) < 0.6 && Math.abs(gy - py) < 0.6) {
      if (g.mode === 'frightened') {
        g.mode = 'eyes';
        s.eatChain += 1;
        s.ghostsEaten += 1;
        s.score += 100 * 2 ** s.eatChain;
        s.events.push('coin');
      } else {
        s.lives -= 1;
        s.deathT = 1.5;
        s.events.push('gameOver');
        return;
      }
    }
  }

  if (!s.bonusLife && s.score >= 10000) {
    s.bonusLife = true;
    s.lives += 1;
    s.events.push('powerup');
  }

  if (s.dots.size === 0 && s.pellets.size === 0) {
    s.level += 1;
    s.score += 1000;
    s.frightTime = Math.max(2, s.frightTime - 1);
    s.events.push('levelComplete');
    const fresh = freshDots();
    s.dots = fresh.dots;
    s.pellets = fresh.pellets;
    s.scatter = true;
    s.phaseT = 7;
    resetPositions(s);
  }
}

function drawGhost(ctx: CanvasRenderingContext2D, s: State, g: Ghost, bob: number) {
  const [gx, gy] = pos(g);
  const x = gx * T + T / 2;
  const y = gy * T + T / 2 + bob;
  const scared = g.mode === 'frightened';
  const flashing = scared && s.frightT < 2 && Math.floor(s.frightT * 6) % 2 === 1;
  if (g.mode !== 'eyes') {
    ctx.fillStyle = scared ? (flashing ? '#f8fafc' : '#2563eb') : g.color;
    ctx.beginPath();
    ctx.arc(x, y - 1, 8.5, Math.PI, 0);
    ctx.lineTo(x + 8.5, y + 8);
    // Wavy hem.
    for (let k = 1; k <= 4; k++) ctx.lineTo(x + 8.5 - k * 4.25, y + (k % 2 ? 5 : 8));
    ctx.closePath();
    ctx.fill();
  }
  if (scared) {
    circle(ctx, x - 3, y - 2, 1.6, '#fde68a');
    circle(ctx, x + 3, y - 2, 1.6, '#fde68a');
    return;
  }
  for (const side of [-3.5, 3.5]) {
    circle(ctx, x + side, y - 2, 3, '#fff');
    circle(ctx, x + side + g.dir[0] * 1.3, y - 2 + g.dir[1] * 1.3, 1.5, '#1e3a8a');
  }
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  ctx.fillStyle = '#020617';
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(0, TOP);
  MAZE.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === '#') {
        ctx.fillStyle = '#172554';
        ctx.fillRect(x * T + 1, y * T + 1, T - 2, T - 2);
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x * T + 3.5, y * T + 3.5, T - 7, T - 7);
      } else if (ch === '=') {
        ctx.fillStyle = '#f9a8d4';
        ctx.fillRect(x * T, y * T + T / 2 - 2, T, 4);
      }
    }),
  );
  for (const k of s.dots) circle(ctx, (k % COLS) * T + T / 2, Math.floor(k / COLS) * T + T / 2, 2.4, '#fde68a');
  if (Math.floor(s.time * 4) % 2 === 0 || s.readyT > 0)
    for (const k of s.pellets) circle(ctx, (k % COLS) * T + T / 2, Math.floor(k / COLS) * T + T / 2, 6, '#fde68a');

  s.ghosts.forEach((g, i) => drawGhost(ctx, s, g, g.mode === 'house' ? Math.sin(s.time * 6 + i) * 3 : 0));

  // The muncher: a yellow disc whose mouth opens towards where it is heading.
  const [px, py] = pos(s.player);
  const cx = px * T + T / 2;
  const cy = py * T + T / 2;
  const open = s.deathT > 0 ? Math.min(Math.PI * 2, (1.5 - s.deathT) * 4.5) : Math.abs(Math.sin(s.mouth)) * 0.8 + 0.05;
  const angle = Math.atan2(s.player.dir[1], s.player.dir[0]);
  if (open < Math.PI * 2) {
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, 8.5, angle + open / 2, angle + Math.PI * 2 - open / 2);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  text(ctx, String(s.score), 10, 13, { size: 14, align: 'left' });
  text(ctx, `Level ${s.level}`, W / 2, 13, { size: 13, color: '#93c5fd' });
  for (let i = 0; i < s.lives; i++) circle(ctx, W - 14 - i * 18, 12, 6, '#facc15');
  if (s.readyT > 0) text(ctx, 'READY!', W / 2, TOP + 11.5 * T, { size: 15, color: '#fde047' });
}

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create,
  update,
  render,
  hud: (s) => [
    { label: 'Score', value: s.score },
    { label: 'Lives', value: s.lives },
    { label: 'Level', value: s.level },
    { label: 'Dots left', value: s.dots.size + s.pellets.size },
  ],
  result: (s) => ({
    score: s.score,
    title: 'Caught!',
    details: [
      { label: 'Level reached', value: String(s.level) },
      { label: 'Ghosts eaten', value: String(s.ghostsEaten) },
    ],
  }),
  onEnd: (s) => {
    void reportProgress('maze-muncher.clear', s.level - 1);
    void reportProgress('maze-muncher.level-4', s.level);
    void reportProgress('maze-muncher.score', s.score);
    void incrementProgress('maze-muncher.ghosts', s.ghostsEaten);
  },
  touch: { pad: 'dpad' },
  startHint: 'Arrow keys, WASD or the pad to steer — or hold a finger on the side you want to go. Power pellets let you eat the ghosts.',
};
