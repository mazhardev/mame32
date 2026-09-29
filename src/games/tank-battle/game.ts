import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState, circleRectHit } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { burst, drawSparks, fillRound, text, updateSparks } from '../_shared/arcade/draw';
import type { Spark } from '../_shared/arcade/draw';
import { ARENA_COUNT, ARENA_NAMES, BRICK, COLS, EMPTY, ROWS, SPAWNS, STEEL, TILE, buildArena } from './arena';
import type { Tile } from './arena';

/**
 * Tank Battle: two tanks, one arena. Shells destroy brick walls and ricochet
 * once off steel and the arena edge. A hit wins the round; first to five
 * rounds wins the match. Play against a local AI or a friend on the same
 * keyboard.
 */
export type Mode = 'cpu' | 'duo';

const TOP = 28;
export const W = COLS * TILE;
export const H = ROWS * TILE + TOP;
export const R = 11;
const SHELL_SPEED = 250;
const SHELL_R = 3;
const MAX_SHELLS = 2;
const TARGET = 5;

export interface Controls {
  fwd: number;
  turn: number;
  fire: boolean;
}

interface Brain {
  path: [number, number][];
  repathT: number;
  sightT: number;
  jitter: number;
  jitterT: number;
  stuckT: number;
  backT: number;
  lastX: number;
  lastY: number;
}

export interface Tank {
  x: number;
  y: number;
  angle: number;
  color: string;
  name: string;
  cooldown: number;
  alive: boolean;
  tread: number;
  brain: Brain;
}

export interface Shell {
  x: number;
  y: number;
  vx: number;
  vy: number;
  owner: number;
  age: number;
  bounces: number;
}

interface AiConfig {
  speed: number;
  turn: number;
  error: number;
  reaction: number;
  cooldown: number;
  dodge: boolean;
}

const AI: Record<DifficultySetting, AiConfig> = {
  easy: { speed: 60, turn: 2, error: 0.22, reaction: 0.7, cooldown: 1, dodge: false },
  normal: { speed: 74, turn: 2.6, error: 0.09, reaction: 0.4, cooldown: 0.65, dodge: false },
  hard: { speed: 88, turn: 3.2, error: 0.03, reaction: 0.18, cooldown: 0.42, dodge: true },
};
const PLAYER = { speed: 92, turn: 3.1, cooldown: 0.4 };

export interface State extends BaseState {
  mode: Mode;
  difficulty: DifficultySetting;
  ai: AiConfig;
  grid: Tile[][];
  arena: number;
  tanks: Tank[];
  shells: Shell[];
  wins: number[];
  round: number;
  roundT: number;
  endT: number;
  winner: number;
  sparks: Spark[];
  bankShot: boolean;
  target: number;
}

function brain(): Brain {
  return { path: [], repathT: 0, sightT: 0, jitter: 0, jitterT: 0, stuckT: 0, backT: 0, lastX: 0, lastY: 0 };
}

function spawnTanks(mode: Mode): Tank[] {
  const names = mode === 'cpu' ? ['You', 'CPU'] : ['Green', 'Blue'];
  const colors = mode === 'cpu' ? ['#22c55e', '#ef4444'] : ['#22c55e', '#3b82f6'];
  return SPAWNS.map((sp, i) => ({
    x: (sp.x + 0.5) * TILE,
    y: (sp.y + 0.5) * TILE,
    angle: sp.angle,
    color: colors[i],
    name: names[i],
    cooldown: 0.5,
    alive: true,
    tread: 0,
    brain: brain(),
  }));
}

export function create(difficulty: DifficultySetting, _random: () => number, mode: Mode = 'cpu'): State {
  return {
    ...baseState(),
    mode,
    difficulty,
    ai: AI[difficulty],
    grid: buildArena(0),
    arena: 0,
    tanks: spawnTanks(mode),
    shells: [],
    wins: [0, 0],
    round: 1,
    roundT: 1.2,
    endT: 0,
    winner: -1,
    sparks: [],
    bankShot: false,
    target: TARGET,
  };
}

/* ------------------------------------------------------------ geometry */

export function tileAt(s: State, px: number, py: number): Tile {
  const x = Math.floor(px / TILE);
  const y = Math.floor(py / TILE);
  if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return STEEL;
  return s.grid[y][x];
}

/** Would a tank centred on (x, y) overlap a wall, the edge or the other tank? */
export function blocked(s: State, x: number, y: number, self: number): boolean {
  if (x < R || y < R || x > W - R || y > ROWS * TILE - R) return true;
  for (let ty = Math.floor((y - R) / TILE); ty <= Math.floor((y + R) / TILE); ty++)
    for (let tx = Math.floor((x - R) / TILE); tx <= Math.floor((x + R) / TILE); tx++) {
      if (s.grid[ty]?.[tx] && circleRectHit(x, y, R - 0.5, { x: tx * TILE, y: ty * TILE, w: TILE, h: TILE })) return true;
    }
  const other = s.tanks[1 - self];
  return other.alive && Math.hypot(other.x - x, other.y - y) < R * 2;
}

/** True when nothing solid lies on the straight line between two points. */
export function clearLine(s: State, x1: number, y1: number, x2: number, y2: number): boolean {
  const steps = Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 5);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (tileAt(s, x1 + (x2 - x1) * t, y1 + (y2 - y1) * t) !== EMPTY) return false;
  }
  return true;
}

const angleDiff = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

/* ------------------------------------------------------------ driving */

export function drive(s: State, i: number, c: Controls, dt: number, speed: number, turn: number) {
  const t = s.tanks[i];
  t.angle += c.turn * turn * dt;
  const v = c.fwd * speed * (c.fwd < 0 ? 0.7 : 1) * dt;
  if (v) {
    const nx = t.x + Math.cos(t.angle) * v;
    if (!blocked(s, nx, t.y, i)) t.x = nx;
    const ny = t.y + Math.sin(t.angle) * v;
    if (!blocked(s, t.x, ny, i)) t.y = ny;
    t.tread += v;
  }
}

export function fire(s: State, i: number, cooldown: number): boolean {
  const t = s.tanks[i];
  if (t.cooldown > 0 || s.shells.filter((sh) => sh.owner === i).length >= MAX_SHELLS) return false;
  t.cooldown = cooldown;
  s.shells.push({
    x: t.x + Math.cos(t.angle) * (R + 5),
    y: t.y + Math.sin(t.angle) * (R + 5),
    vx: Math.cos(t.angle) * SHELL_SPEED,
    vy: Math.sin(t.angle) * SHELL_SPEED,
    owner: i,
    age: 0,
    bounces: 0,
  });
  s.events.push('shoot');
  return true;
}

function hitTile(s: State, sh: Shell, px: number, py: number): 'none' | 'brick' | 'bounce' {
  const tile = tileAt(s, px, py);
  if (tile === EMPTY) return 'none';
  if (tile === BRICK) {
    s.grid[Math.floor(py / TILE)][Math.floor(px / TILE)] = EMPTY;
    burst(s.sparks, (Math.floor(px / TILE) + 0.5) * TILE, (Math.floor(py / TILE) + 0.5) * TILE, '#d97706', 10);
    s.events.push('hit');
    return 'brick';
  }
  sh.bounces += 1;
  s.events.push('blip');
  return 'bounce';
}

function updateShells(s: State, dt: number) {
  const keep: Shell[] = [];
  // Small sub-steps so fast shells never skip through a wall or a tank.
  const steps = Math.max(1, Math.ceil((SHELL_SPEED * dt) / 6));
  const h = dt / steps;
  for (const sh of s.shells) {
    let alive = true;
    for (let k = 0; k < steps && alive; k++) {
      sh.age += h;
      // Move one axis at a time so ricochets reflect the right component.
      const nx = sh.x + sh.vx * h;
      const rx = hitTile(s, sh, nx, sh.y);
      if (rx === 'brick') alive = false;
      else if (rx === 'bounce') sh.vx = -sh.vx;
      else sh.x = nx;
      if (alive) {
        const ny = sh.y + sh.vy * h;
        const ry = hitTile(s, sh, sh.x, ny);
        if (ry === 'brick') alive = false;
        else if (ry === 'bounce') sh.vy = -sh.vy;
        else sh.y = ny;
      }
      if (sh.bounces > 1 || sh.age > 4) alive = false;
      if (alive)
        for (let i = 0; i < 2; i++) {
          const t = s.tanks[i];
          if (!t.alive || (sh.owner === i && sh.age < 0.25)) continue;
          if (Math.hypot(t.x - sh.x, t.y - sh.y) < R + SHELL_R) {
            alive = false;
            destroyTank(s, i, sh);
            break;
          }
        }
    }
    if (alive) keep.push(sh);
  }
  // Shells from opposite tanks cancel each other out.
  for (let a = 0; a < keep.length; a++)
    for (let b = a + 1; b < keep.length; b++)
      if (keep[a].owner !== keep[b].owner && Math.hypot(keep[a].x - keep[b].x, keep[a].y - keep[b].y) < SHELL_R * 3) {
        burst(s.sparks, keep[a].x, keep[a].y, '#fde68a', 6, 100);
        keep[a].age = keep[b].age = 99;
      }
  s.shells = keep.filter((sh) => sh.age < 99);
}

function destroyTank(s: State, i: number, sh: Shell) {
  const t = s.tanks[i];
  t.alive = false;
  s.winner = 1 - i;
  s.wins[s.winner] += 1;
  if (sh.owner === 0 && i === 1 && sh.bounces > 0) s.bankShot = true;
  s.endT = 1.6;
  burst(s.sparks, t.x, t.y, t.color, 30, 180);
  burst(s.sparks, t.x, t.y, '#fbbf24', 20, 120);
  s.events.push('explosion');
}

function nextRound(s: State) {
  s.round += 1;
  s.arena = (s.arena + 1) % ARENA_COUNT;
  s.grid = buildArena(s.arena);
  s.tanks = spawnTanks(s.mode);
  s.shells = [];
  s.winner = -1;
  s.roundT = 1.2;
}

/* ------------------------------------------------------------------ AI */

/**
 * Cheapest tile route from one tile to another. Bricks cost extra because
 * they have to be shot through first; steel is impassable.
 */
export function route(s: State, from: [number, number], to: [number, number]): [number, number][] {
  const cost = new Array<number>(COLS * ROWS).fill(Infinity);
  const prev = new Array<number>(COLS * ROWS).fill(-1);
  const start = from[1] * COLS + from[0];
  const goal = to[1] * COLS + to[0];
  cost[start] = 0;
  const open = [start];
  while (open.length) {
    // Tiny grid: a linear scan for the cheapest open node is fast enough.
    let bi = 0;
    for (let k = 1; k < open.length; k++) if (cost[open[k]] < cost[open[bi]]) bi = k;
    const cur = open.splice(bi, 1)[0];
    if (cur === goal) break;
    const cx = cur % COLS;
    const cy = Math.floor(cur / COLS);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
      const tile = s.grid[ny][nx];
      if (tile === STEEL) continue;
      const n = ny * COLS + nx;
      const c = cost[cur] + (tile === BRICK ? 5 : 1);
      if (c < cost[n]) {
        if (cost[n] === Infinity) open.push(n);
        cost[n] = c;
        prev[n] = cur;
      }
    }
  }
  if (cost[goal] === Infinity) return [];
  const path: [number, number][] = [];
  for (let n = goal; n !== start && n >= 0; n = prev[n]) path.unshift([n % COLS, Math.floor(n / COLS)]);
  return path;
}

function steerTo(t: Tank, angle: number, dt: number, turnRate: number): number {
  const d = angleDiff(angle, t.angle);
  const maxTurn = turnRate * dt;
  return Math.abs(d) <= maxTurn ? d / maxTurn : Math.sign(d);
}

/** Decides the computer tank's controls for this frame. */
export function aiControls(s: State, i: number, dt: number, random: () => number): Controls {
  const me = s.tanks[i];
  const foe = s.tanks[1 - i];
  const b = me.brain;
  const cfg = s.ai;
  const c: Controls = { fwd: 0, turn: 0, fire: false };
  if (!foe.alive) return c;

  b.jitterT -= dt;
  if (b.jitterT <= 0) {
    b.jitter = (random() * 2 - 1) * cfg.error;
    b.jitterT = 1.2;
  }

  // Unstick: if the tank has been trying to move but going nowhere, back off.
  if (b.backT > 0) {
    b.backT -= dt;
    return { fwd: -1, turn: 0.6, fire: false };
  }

  // Hard AI sidesteps incoming shells.
  if (cfg.dodge) {
    for (const sh of s.shells) {
      if (sh.owner === i) continue;
      const rx = me.x - sh.x;
      const ry = me.y - sh.y;
      const along = (rx * sh.vx + ry * sh.vy) / SHELL_SPEED;
      if (along <= 0 || along > 140) continue;
      const miss = Math.abs(rx * sh.vy - ry * sh.vx) / SHELL_SPEED;
      if (miss < R + 6) {
        const side = Math.cos(me.angle) * sh.vy - Math.sin(me.angle) * sh.vx;
        return { fwd: side > 0 ? -1 : 1, turn: 0, fire: false };
      }
    }
  }

  const seen = clearLine(s, me.x, me.y, foe.x, foe.y);
  if (seen) {
    b.sightT += dt;
    const aim = Math.atan2(foe.y - me.y, foe.x - me.x) + b.jitter;
    c.turn = steerTo(me, aim, dt, cfg.turn);
    const dist = Math.hypot(foe.x - me.x, foe.y - me.y);
    const facing = Math.abs(angleDiff(aim, me.angle));
    if (facing < 0.4) c.fwd = dist > 200 ? 1 : dist < 90 ? -0.6 : 0;
    c.fire = b.sightT >= cfg.reaction && facing < 0.06;
    return c;
  }
  b.sightT = 0;

  b.repathT -= dt;
  const here: [number, number] = [Math.floor(me.x / TILE), Math.floor(me.y / TILE)];
  if (b.repathT <= 0 || !b.path.length) {
    b.path = route(s, here, [Math.floor(foe.x / TILE), Math.floor(foe.y / TILE)]);
    b.repathT = 0.5;
  }
  // Drop waypoints that have been reached.
  while (b.path.length) {
    const [wx, wy] = b.path[0];
    if (Math.hypot((wx + 0.5) * TILE - me.x, (wy + 0.5) * TILE - me.y) < 6 || (wx === here[0] && wy === here[1] && b.path.length > 1)) b.path.shift();
    else break;
  }
  const next = b.path[0];
  if (!next) return c;
  const [wx, wy] = next;
  const aim = Math.atan2((wy + 0.5) * TILE - me.y, (wx + 0.5) * TILE - me.x);
  c.turn = steerTo(me, aim, dt, cfg.turn);
  const facing = Math.abs(angleDiff(aim, me.angle));
  if (s.grid[wy][wx] === BRICK) {
    // A brick is in the way: blast through it.
    c.fire = facing < 0.12;
  } else if (facing < 0.5) {
    c.fwd = 1;
    // Track progress so a wedged tank can reverse out.
    b.stuckT += dt;
    if (b.stuckT > 0.6) {
      if (Math.hypot(me.x - b.lastX, me.y - b.lastY) < 3) {
        b.backT = 0.35;
        b.path = [];
      }
      b.stuckT = 0;
      b.lastX = me.x;
      b.lastY = me.y;
    }
  }
  return c;
}

/* -------------------------------------------------------------- update */

const held = (input: Input, keys: string[]) => keys.some((k) => input.keysHeld.has(k));

export function playerControls(input: Input, which: 'arrows' | 'letters' | 'any'): Controls {
  if (which === 'letters')
    return {
      fwd: (held(input, ['w']) ? 1 : 0) - (held(input, ['s']) ? 1 : 0),
      turn: (held(input, ['d']) ? 1 : 0) - (held(input, ['a']) ? 1 : 0),
      fire: held(input, [' ', 'q']),
    };
  return {
    fwd: (input.held.has('up') ? 1 : 0) - (input.held.has('down') ? 1 : 0),
    turn: (input.held.has('right') ? 1 : 0) - (input.held.has('left') ? 1 : 0),
    fire: input.held.has('action'),
  };
}

export function update(s: State, dt: number, input: Input, random: () => number) {
  updateSparks(s.sparks, dt);
  if (s.roundT > 0) {
    s.roundT -= dt;
    return;
  }
  if (s.endT > 0) {
    s.endT -= dt;
    updateShells(s, dt);
    if (s.endT <= 0) {
      if (s.wins[s.winner] >= s.target) s.over = true;
      else nextRound(s);
    }
    return;
  }
  for (const t of s.tanks) t.cooldown = Math.max(0, t.cooldown - dt);

  const controls: Controls[] =
    s.mode === 'cpu' ? [playerControls(input, 'any'), aiControls(s, 1, dt, random)] : [playerControls(input, 'letters'), playerControls(input, 'arrows')];
  controls.forEach((c, i) => {
    if (!s.tanks[i].alive) return;
    const isAi = s.mode === 'cpu' && i === 1;
    drive(s, i, c, dt, isAi ? s.ai.speed : PLAYER.speed, isAi ? s.ai.turn : PLAYER.turn);
    if (c.fire) fire(s, i, isAi ? s.ai.cooldown : PLAYER.cooldown);
  });
  updateShells(s, dt);
}

/* -------------------------------------------------------------- render */

function drawTank(ctx: CanvasRenderingContext2D, t: Tank) {
  ctx.save();
  ctx.translate(t.x, t.y);
  ctx.rotate(t.angle);
  // Treads with moving stripes.
  ctx.fillStyle = '#111827';
  ctx.fillRect(-13, -12, 26, 6);
  ctx.fillRect(-13, 6, 26, 6);
  ctx.fillStyle = '#374151';
  const off = ((t.tread % 6) + 6) % 6;
  for (let x = -13 + off; x < 13; x += 6) {
    ctx.fillRect(x, -12, 2, 6);
    ctx.fillRect(x, 6, 2, 6);
  }
  fillRound(ctx, -11, -8, 22, 16, 4, t.color);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(-11, 3, 22, 5);
  ctx.fillStyle = '#e5e7eb';
  ctx.fillRect(4, -2.5, 14, 5);
  ctx.beginPath();
  ctx.arc(0, 0, 6.5, 0, Math.PI * 2);
  ctx.fillStyle = t.color;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(0, TOP);
  ctx.fillStyle = '#1f2a1f';
  ctx.fillRect(0, 0, W, ROWS * TILE);
  ctx.strokeStyle = 'rgba(255,255,255,0.035)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= COLS; x++) {
    ctx.beginPath();
    ctx.moveTo(x * TILE, 0);
    ctx.lineTo(x * TILE, ROWS * TILE);
    ctx.stroke();
  }
  for (let y = 0; y <= ROWS; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * TILE);
    ctx.lineTo(W, y * TILE);
    ctx.stroke();
  }
  s.grid.forEach((row, y) =>
    row.forEach((tile, x) => {
      const px = x * TILE;
      const py = y * TILE;
      if (tile === BRICK) {
        ctx.fillStyle = '#b45309';
        ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = '#78350f';
        for (let r = 0; r < 4; r++) {
          ctx.fillRect(px, py + r * 8 + 7, TILE, 1);
          const shift = r % 2 ? 8 : 0;
          for (let c = shift; c < TILE; c += 16) ctx.fillRect(px + c, py + r * 8, 1, 7);
        }
      } else if (tile === STEEL) {
        fillRound(ctx, px + 1, py + 1, TILE - 2, TILE - 2, 3, '#64748b');
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(px + 4, py + 4, TILE - 8, 3);
        ctx.fillStyle = '#334155';
        for (const [a, b] of [[6, 6], [TILE - 8, 6], [6, TILE - 8], [TILE - 8, TILE - 8]]) ctx.fillRect(px + a, py + b, 2, 2);
      }
    }),
  );
  for (const t of s.tanks) if (t.alive) drawTank(ctx, t);
  for (const sh of s.shells) {
    ctx.beginPath();
    ctx.arc(sh.x, sh.y, SHELL_R, 0, Math.PI * 2);
    ctx.fillStyle = s.tanks[sh.owner].color;
    ctx.fill();
    ctx.strokeStyle = '#fef3c7';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
  drawSparks(ctx, s.sparks);
  if (s.roundT > 0) {
    ctx.fillStyle = 'rgba(2,6,23,0.55)';
    ctx.fillRect(0, ROWS * TILE * 0.5 - 30, W, 60);
    text(ctx, `Round ${s.round} — ${ARENA_NAMES[s.arena]}`, W / 2, ROWS * TILE * 0.5, { size: 22 });
  }
  if (s.endT > 0 && s.winner >= 0) text(ctx, `${s.tanks[s.winner].name} ${s.mode === 'cpu' && s.winner === 0 ? 'win' : 'wins'} the round!`, W / 2, ROWS * TILE * 0.5, { size: 22, color: '#fde68a' });
  ctx.restore();
  const [a, b] = s.tanks;
  text(ctx, `${a.name} ${s.wins[0]}`, 12, TOP / 2, { size: 15, align: 'left', color: a.color });
  text(ctx, `${s.wins[1]} ${b.name}`, W - 12, TOP / 2, { size: 15, align: 'right', color: b.color });
  text(ctx, `First to ${s.target}`, W / 2, TOP / 2, { size: 12, color: '#94a3b8' });
}

/* ---------------------------------------------------------------- spec */

export function makeSpec(mode: Mode): ArcadeSpec<State> {
  return {
    width: W,
    height: H,
    create: (d, r) => create(d, r, mode),
    update,
    render,
    hud: (s) => [
      { label: s.tanks[0].name, value: s.wins[0] },
      { label: s.tanks[1].name, value: s.wins[1] },
      { label: 'Round', value: s.round },
    ],
    result: (s) => {
      const p1 = s.wins[0] >= s.target;
      if (s.mode === 'duo')
        return {
          title: `${p1 ? 'Green' : 'Blue'} wins the match!`,
          mode: '2 players',
          details: [{ label: 'Rounds', value: `${s.wins[0]} – ${s.wins[1]}` }],
        };
      return {
        title: p1 ? 'Victory!' : 'Defeated',
        won: p1,
        lost: !p1,
        score: s.wins[0] * 100 + (p1 ? 500 + (s.target - s.wins[1]) * 100 : 0),
        details: [{ label: 'Rounds', value: `${s.wins[0]} – ${s.wins[1]}` }],
      };
    },
    onEnd: (s, difficulty) => {
      if (s.mode === 'duo') {
        void reportProgress('tank-battle.duel', 1);
        return;
      }
      const won = s.wins[0] >= s.target;
      void reportProgress('tank-battle.win', won ? 1 : 0);
      void reportProgress('tank-battle.hard', won && difficulty === 'hard' ? 1 : 0);
      void reportProgress('tank-battle.flawless', won && s.wins[1] === 0 ? 1 : 0);
      void reportProgress('tank-battle.bank', s.bankShot ? 1 : 0);
      void incrementProgress('tank-battle.rounds', s.wins[0]);
    },
    keys:
      mode === 'duo'
        ? { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', Enter: 'action', '/': 'action', '0': 'action' }
        : undefined,
    customKeys: mode === 'duo' ? ['w', 'a', 's', 'd', 'q', ' '] : undefined,
    touch: mode === 'duo' ? { pad: 'none' } : { pad: 'dpad', buttons: [{ action: 'action', label: 'Fire' }] },
    pointerStarts: false,
    startHint:
      mode === 'duo'
        ? 'Green: W/S drive, A/D turn, Space or Q fires. Blue: arrow keys drive and turn, Enter or / fires.'
        : '↑/↓ or W/S drive, ←/→ or A/D turn, Space fires. Shells ricochet once off steel.',
  };
}
