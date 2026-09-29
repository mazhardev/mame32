import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState, clamp } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { burst, circle, drawSparks, fillRound, gradientBg, text, updateSparks } from '../_shared/arcade/draw';
import type { Spark } from '../_shared/arcade/draw';

/**
 * Falling Blocks: blocks rain into a narrow well and pile up. Dodge them —
 * one landing on your head is the end — and climb the growing stack to stay
 * ahead of the rising tide.
 *
 * World units are cells, measured upwards from the floor: a thing at height
 * h sits h cells above the floor. The grid holds settled blocks (grid[row][col]).
 */
export const COLS = 10;
export const CELL = 36;
export const VIEW_ROWS = 16;
export const W = COLS * CELL;
export const H = VIEW_ROWS * CELL;

export const PW = 0.6;
export const PH = 0.9;
export const GRAVITY = 42;
export const JUMP = Math.sqrt(2 * GRAVITY * 1.55);
const RUN = 5.2;

export interface Block {
  col: number;
  width: number;
  h: number;
  speed: number;
  color: string;
}

export interface Player {
  x: number;
  h: number;
  vx: number;
  vh: number;
  grounded: boolean;
  ride: Block | null;
  face: number;
}

export interface State extends BaseState {
  grid: (string | null)[][];
  blocks: Block[];
  player: Player;
  water: number;
  cam: number;
  spawnT: number;
  maxH: number;
  lines: number;
  counted: Set<number>;
  cause: 'crushed' | 'drowned' | null;
  speedMult: number;
  sparks: Spark[];
  jumpBuffer: number;
}

const COLORS = ['#f97316', '#22c55e', '#3b82f6', '#a855f7', '#eab308', '#ec4899', '#14b8a6'];
const SPEED: Record<DifficultySetting, number> = { easy: 0.8, normal: 1, hard: 1.25 };

export function create(difficulty: DifficultySetting): State {
  return {
    ...baseState(),
    grid: [],
    blocks: [],
    player: { x: COLS / 2, h: 0, vx: 0, vh: 0, grounded: true, ride: null, face: 1 },
    water: -3,
    cam: 0,
    spawnT: 1,
    maxH: 0,
    lines: 0,
    counted: new Set(),
    cause: null,
    speedMult: SPEED[difficulty],
    sparks: [],
    jumpBuffer: 0,
  };
}

export const filled = (s: State, row: number, col: number) => row < 0 || col < 0 || col >= COLS || !!s.grid[row]?.[col];

/** Height a block covering these columns would come to rest at, from height `from`. */
export function restingHeight(s: State, col: number, width: number, from: number): number {
  let rest = 0;
  for (let c = col; c < col + width; c++)
    for (let r = Math.min(s.grid.length, Math.floor(from + 1e-6)) - 1; r >= 0; r--)
      if (s.grid[r]?.[c]) {
        rest = Math.max(rest, r + 1);
        break;
      }
  return rest;
}

export function lock(s: State, b: Block) {
  const row = Math.round(b.h);
  while (s.grid.length <= row) s.grid.push(new Array<string | null>(COLS).fill(null));
  for (let c = b.col; c < b.col + b.width; c++) s.grid[row][c] = b.color;
  s.events.push('hit');
  if (!s.counted.has(row) && s.grid[row].every(Boolean)) {
    s.counted.add(row);
    s.lines += 1;
    s.score += 25;
    s.events.push('success');
    for (let c = 0; c < COLS; c++) burst(s.sparks, (c + 0.5) * CELL, 0, '#fde68a', 3, 80);
  }
}

interface Box {
  x0: number;
  x1: number;
  h0: number;
  h1: number;
  block?: Block;
}

const overlaps = (a: Box, b: Box, eps = 1e-6) => a.x0 < b.x1 - eps && a.x1 > b.x0 + eps && a.h0 < b.h1 - eps && a.h1 > b.h0 + eps;
const playerBox = (p: Player): Box => ({ x0: p.x - PW / 2, x1: p.x + PW / 2, h0: p.h, h1: p.h + PH });

function solidsNear(s: State, p: Player): Box[] {
  const out: Box[] = [];
  for (let r = Math.max(0, Math.floor(p.h) - 2); r <= Math.floor(p.h) + 3 && r < s.grid.length; r++)
    for (let c = 0; c < COLS; c++) if (s.grid[r][c]) out.push({ x0: c, x1: c + 1, h0: r, h1: r + 1 });
  for (const b of s.blocks) out.push({ x0: b.col, x1: b.col + b.width, h0: b.h, h1: b.h + 1, block: b });
  // The floor and the well's walls.
  out.push({ x0: -1, x1: COLS + 1, h0: -1, h1: 0 });
  out.push({ x0: -1, x1: 0, h0: -1, h1: 1e6 });
  out.push({ x0: COLS, x1: COLS + 1, h0: -1, h1: 1e6 });
  return out;
}

export function movePlayer(s: State, dt: number) {
  const p = s.player;
  const solids = solidsNear(s, p);
  p.x += p.vx * dt;
  for (const b of solids) {
    if (!overlaps(playerBox(p), b)) continue;
    if (p.vx > 0) p.x = b.x0 - PW / 2;
    else if (p.vx < 0) p.x = b.x1 + PW / 2;
    else p.x = p.x < (b.x0 + b.x1) / 2 ? b.x0 - PW / 2 : b.x1 + PW / 2;
  }
  p.vh -= GRAVITY * dt;
  p.h += p.vh * dt;
  p.grounded = false;
  p.ride = null;
  for (const b of solids) {
    if (!overlaps(playerBox(p), b)) continue;
    if (p.vh <= 0) {
      p.h = b.h1;
      p.vh = 0;
      p.grounded = true;
      p.ride = b.block ?? null;
    } else {
      p.h = b.h0 - PH;
      p.vh = Math.min(0, -(b.block?.speed ?? 0));
    }
  }
}

/** Moves falling blocks; a block coming down on the player's head ends the game. */
export function moveBlocks(s: State, dt: number) {
  const p = s.player;
  for (const b of [...s.blocks]) {
    const before = b.h;
    const rest = restingHeight(s, b.col, b.width, before + 1e-6);
    b.h = Math.max(rest, b.h - b.speed * dt);
    const drop = before - b.h;
    if (p.ride === b) p.h -= drop;
    // Crushed when the block's underside sweeps past the top of the player's head.
    const across = Math.min(b.col + b.width, p.x + PW / 2) - Math.max(b.col, p.x - PW / 2);
    if (across > 0.12 && before >= p.h + PH - 1e-6 && b.h < p.h + PH - 0.02 && p.ride !== b) {
      s.cause = 'crushed';
      s.over = true;
      s.events.push('gameOver');
      burst(s.sparks, p.x * CELL, 0, '#f43f5e', 20, 150);
      return;
    }
    if (b.h <= rest + 1e-9) {
      b.h = rest;
      s.blocks.splice(s.blocks.indexOf(b), 1);
      lock(s, b);
    }
  }
}

function spawn(s: State, random: () => number) {
  const width = 1 + Math.floor(random() * 3);
  // Some blocks are aimed at the player to keep them moving.
  const aimed = random() < 0.35;
  const col = aimed
    ? clamp(Math.floor(s.player.x) - Math.floor(random() * width), 0, COLS - width)
    : Math.floor(random() * (COLS - width + 1));
  const top = Math.max(s.cam + VIEW_ROWS + 1, restingHeight(s, col, width, 1e9) + 4);
  s.blocks.push({
    col,
    width,
    h: top,
    speed: Math.min(8, 3.4 + s.time * 0.03) * s.speedMult,
    color: COLORS[Math.floor(random() * COLORS.length)],
  });
}

export function update(s: State, dt: number, input: Input, random: () => number) {
  updateSparks(s.sparks, dt, 300);
  const p = s.player;
  const dir = (input.held.has('right') ? 1 : 0) - (input.held.has('left') ? 1 : 0);
  p.vx = dir * RUN;
  if (dir) p.face = dir;
  // A jump pressed just before landing still counts.
  if (input.pressed.has('up') || input.pressed.has('action')) s.jumpBuffer = 0.12;
  else s.jumpBuffer = Math.max(0, s.jumpBuffer - dt);
  if (s.jumpBuffer > 0 && p.grounded) {
    p.vh = JUMP;
    p.grounded = false;
    s.jumpBuffer = 0;
    s.events.push('jump');
  }

  moveBlocks(s, dt);
  if (s.over) return;
  movePlayer(s, dt);

  s.spawnT -= dt;
  if (s.spawnT <= 0) {
    spawn(s, random);
    s.spawnT = Math.max(0.4, 1.05 - s.time * 0.008) / s.speedMult;
  }

  // The tide rises steadily, a little faster as time goes on.
  s.water += (0.16 + s.time * 0.0035) * s.speedMult * dt;
  // It never lags too far behind, so waiting at the top is not safe forever.
  s.water = Math.max(s.water, s.maxH - 9);
  if (s.water > p.h + PH * 0.7) {
    s.cause = 'drowned';
    s.over = true;
    s.events.push('gameOver');
    return;
  }

  if (p.h > s.maxH + 0.5 && p.grounded) {
    const gained = Math.floor(p.h) - Math.floor(s.maxH);
    if (gained > 0) s.score += gained * 10;
    s.maxH = Math.max(s.maxH, Math.floor(p.h));
  }
  s.cam += (Math.max(0, p.h - 5) - s.cam) * Math.min(1, dt * 4);
}

/* -------------------------------------------------------------- render */

/** Screen y (pixels) of height h. */
const sy = (s: State, h: number) => H - (h - s.cam) * CELL;

function drawCell(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, color: string) {
  fillRound(ctx, x + 1, y + 1, w - 2, CELL - 2, 5, color);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(x + 4, y + 4, w - 8, 4);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(x + 4, y + CELL - 8, w - 8, 4);
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  gradientBg(ctx, W, H, '#1e1b4b', '#312e81');
  // Faint well guides.
  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  for (let c = 0; c < COLS; c += 2) ctx.fillRect(c * CELL, 0, CELL, H);

  const first = Math.max(0, Math.floor(s.cam) - 1);
  for (let r = first; r < Math.min(s.grid.length, first + VIEW_ROWS + 2); r++)
    for (let c = 0; c < COLS; c++) {
      const color = s.grid[r][c];
      if (color) drawCell(ctx, c * CELL, sy(s, r + 1), CELL, color);
    }
  if (s.cam < 1) {
    ctx.fillStyle = '#475569';
    ctx.fillRect(0, sy(s, 0), W, CELL);
  }

  for (const b of s.blocks) {
    const y = sy(s, b.h + 1);
    if (y < -CELL) {
      // Off-screen blocks show a warning marker at the top.
      ctx.fillStyle = 'rgba(248,113,113,0.8)';
      ctx.beginPath();
      const cx = (b.col + b.width / 2) * CELL;
      ctx.moveTo(cx - 8, 4);
      ctx.lineTo(cx + 8, 4);
      ctx.lineTo(cx, 14);
      ctx.fill();
      continue;
    }
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(b.col * CELL, y, b.width * CELL, H);
    drawCell(ctx, b.col * CELL, y, b.width * CELL, b.color);
  }

  // The climber: a round little character with a face.
  const p = s.player;
  const px = p.x * CELL;
  const py = sy(s, p.h + PH);
  if (s.cause !== 'crushed') {
    fillRound(ctx, px - (PW * CELL) / 2, py, PW * CELL, PH * CELL, 9, '#fbbf24');
    circle(ctx, px + p.face * 4, py + 11, 2.6, '#1f2937');
    circle(ctx, px + p.face * 4 + 8 * p.face, py + 11, 2.6, '#1f2937');
    ctx.fillStyle = '#b45309';
    ctx.fillRect(px - 6, py + PH * CELL - 5, 5, 5);
    ctx.fillRect(px + 1, py + PH * CELL - 5, 5, 5);
  }

  // Rising water.
  const wy = sy(s, s.water);
  if (wy < H) {
    ctx.fillStyle = 'rgba(56,189,248,0.55)';
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 12) ctx.lineTo(x, wy + Math.sin(x / 20 + s.time * 3) * 3);
    ctx.lineTo(W, H);
    ctx.fill();
  }
  drawSparks(ctx, s.sparks);
  text(ctx, String(s.score), 12, 20, { size: 18, align: 'left' });
  text(ctx, `${s.maxH} m`, W - 12, 20, { size: 15, align: 'right', color: '#c7d2fe' });
}

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create,
  update,
  render,
  hud: (s) => [
    { label: 'Score', value: s.score },
    { label: 'Height', value: `${s.maxH} m` },
    { label: 'Full rows', value: s.lines },
  ],
  result: (s) => ({
    score: s.score,
    title: s.cause === 'drowned' ? 'Swept away by the tide!' : 'Squashed!',
    details: [
      { label: 'Best height', value: `${s.maxH} m` },
      { label: 'Full rows', value: String(s.lines) },
      { label: 'Survived', value: `${Math.floor(s.time)} s` },
    ],
  }),
  onEnd: (s) => {
    void reportProgress('falling-blocks.height-20', s.maxH);
    void reportProgress('falling-blocks.height-50', s.maxH);
    void reportProgress('falling-blocks.survive', Math.floor(s.time));
    void incrementProgress('falling-blocks.rows', s.lines);
  },
  touch: { pad: 'horizontal', buttons: [{ action: 'action', label: 'Jump' }] },
  startHint: '←/→ or A/D to run, ↑, W or Space to jump. Don’t get squashed — and keep above the water.',
};
