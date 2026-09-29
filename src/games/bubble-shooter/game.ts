import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { burst, circle, drawSparks, gradientBg, text, updateSparks } from '../_shared/arcade/draw';
import type { Spark } from '../_shared/arcade/draw';

/**
 * Bubble Shooter: aim and fire coloured bubbles into a hexagonal cluster.
 * Three or more of one colour touching pop, and anything no longer hanging
 * from the ceiling falls. Every few shots the ceiling drops a row; if the
 * bubbles reach the line at the bottom, the game is over.
 */
export const COLS = 10;
export const R = 19;
export const W = COLS * R * 2 + R;
export const H = 620;
const ROW_H = R * Math.sqrt(3);
const SHOOTER = { x: W / 2, y: H - 50 };
const DANGER_Y = H - 110;
export const COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#f97316'];
const MARKS = ['●', '■', '▲', '◆', '★', '♥'];

export interface State extends BaseState {
  grid: number[][];
  /** Flips each time a new row is pushed in, so hex offsets stay consistent. */
  parity: number;
  current: number;
  next: number;
  angle: number;
  flying: { x: number; y: number; vx: number; vy: number; color: number } | null;
  shots: number;
  dropEvery: number;
  colors: number;
  popped: number;
  bestPop: number;
  falling: { x: number; y: number; vy: number; color: number }[];
  sparks: Spark[];
  level: number;
}

const SETTINGS: Record<DifficultySetting, { colors: number; drop: number; rows: number }> = {
  easy: { colors: 4, drop: 8, rows: 5 },
  normal: { colors: 5, drop: 6, rows: 6 },
  hard: { colors: 6, drop: 5, rows: 7 },
};

export function shifted(s: Pick<State, 'parity'>, row: number): boolean {
  return (row + s.parity) % 2 === 1;
}

export function cellPos(s: Pick<State, 'parity'>, row: number, col: number): [number, number] {
  return [R + col * R * 2 + (shifted(s, row) ? R : 0), R + row * ROW_H];
}

export function neighbours(s: Pick<State, 'parity'>, row: number, col: number): [number, number][] {
  const d = shifted(s, row) ? [0, 1] : [-1, 0];
  return [
    [row, col - 1],
    [row, col + 1],
    [row - 1, col + d[0]],
    [row - 1, col + d[1]],
    [row + 1, col + d[0]],
    [row + 1, col + d[1]],
  ];
}

const inside = (s: State, r: number, c: number) => r >= 0 && r < s.grid.length && c >= 0 && c < COLS;

function randomColor(s: State, random: () => number): number {
  const present = [...new Set(s.grid.flat().filter((v) => v >= 0))];
  const pool = present.length ? present : Array.from({ length: s.colors }, (_, i) => i);
  return pool[Math.floor(random() * pool.length)];
}

function fillRows(s: State, rows: number, random: () => number) {
  s.grid = [];
  for (let r = 0; r < rows; r++) s.grid.push(Array.from({ length: COLS }, () => Math.floor(random() * s.colors)));
  for (let r = rows; r < 16; r++) s.grid.push(Array<number>(COLS).fill(-1));
}

export function create(difficulty: DifficultySetting, random: () => number = Math.random): State {
  const c = SETTINGS[difficulty];
  const s: State = {
    ...baseState(),
    grid: [],
    parity: 0,
    current: 0,
    next: 0,
    angle: -Math.PI / 2,
    flying: null,
    shots: 0,
    dropEvery: c.drop,
    colors: c.colors,
    popped: 0,
    bestPop: 0,
    falling: [],
    sparks: [],
    level: 1,
  };
  fillRows(s, c.rows, random);
  s.current = randomColor(s, random);
  s.next = randomColor(s, random);
  return s;
}

/** Same-colour group containing (row, col). */
export function cluster(s: State, row: number, col: number): [number, number][] {
  const color = s.grid[row][col];
  const seen = new Set([`${row},${col}`]);
  const out: [number, number][] = [[row, col]];
  for (let i = 0; i < out.length; i++) {
    for (const [r, c] of neighbours(s, out[i][0], out[i][1])) {
      if (!inside(s, r, c) || s.grid[r][c] !== color || seen.has(`${r},${c}`)) continue;
      seen.add(`${r},${c}`);
      out.push([r, c]);
    }
  }
  return out;
}

/** Bubbles not connected to the ceiling. */
export function floating(s: State): [number, number][] {
  const seen = new Set<string>();
  const stack: [number, number][] = [];
  for (let c = 0; c < COLS; c++)
    if (s.grid[0][c] >= 0) {
      seen.add(`0,${c}`);
      stack.push([0, c]);
    }
  while (stack.length) {
    const [r, c] = stack.pop()!;
    for (const [nr, nc] of neighbours(s, r, c)) {
      if (!inside(s, nr, nc) || s.grid[nr][nc] < 0 || seen.has(`${nr},${nc}`)) continue;
      seen.add(`${nr},${nc}`);
      stack.push([nr, nc]);
    }
  }
  const out: [number, number][] = [];
  s.grid.forEach((row, r) => row.forEach((v, c) => v >= 0 && !seen.has(`${r},${c}`) && out.push([r, c])));
  return out;
}

/** Places a bubble at (row, col) and resolves pops and drops. */
export function settle(s: State, row: number, col: number, color: number, random: () => number) {
  s.grid[row][col] = color;
  const group = cluster(s, row, col);
  if (group.length >= 3) {
    for (const [r, c] of group) {
      const [x, y] = cellPos(s, r, c);
      burst(s.sparks, x, y, COLORS[s.grid[r][c]], 5, 120, random);
      s.grid[r][c] = -1;
    }
    const drops = floating(s);
    for (const [r, c] of drops) {
      const [x, y] = cellPos(s, r, c);
      s.falling.push({ x, y, vy: 0, color: s.grid[r][c] });
      s.grid[r][c] = -1;
    }
    s.score += group.length * 10 + drops.length * 20 * (1 + Math.floor(drops.length / 5));
    s.popped += group.length + drops.length;
    s.bestPop = Math.max(s.bestPop, group.length + drops.length);
    s.events.push(drops.length ? 'powerup' : 'pop');
  } else s.events.push('click');
}

function snap(s: State, x: number, y: number): [number, number] {
  let best: [number, number] = [0, 0];
  let bestD = Infinity;
  for (let r = 0; r < s.grid.length; r++) {
    for (let c = 0; c < COLS; c++) {
      if (s.grid[r][c] >= 0) continue;
      const [cx, cy] = cellPos(s, r, c);
      const d = (cx - x) ** 2 + (cy - y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = [r, c];
      }
    }
  }
  return best;
}

function pushRow(s: State, random: () => number) {
  s.grid.pop();
  s.parity ^= 1;
  // The board is 21 radii wide, so shifted and unshifted rows both hold COLS bubbles.
  s.grid.unshift(Array.from({ length: COLS }, () => randomColor(s, random)));
  s.events.push('whoosh');
}

export function update(s: State, dt: number, input: Input, random: () => number) {
  updateSparks(s.sparks, dt, 300);
  for (const f of s.falling) {
    f.vy += 1200 * dt;
    f.y += f.vy * dt;
  }
  s.falling = s.falling.filter((f) => f.y < H + 30);

  // Aim at the pointer, or turn with the keys.
  if (input.pointer.active) {
    s.angle = Math.atan2(input.pointer.y - SHOOTER.y, input.pointer.x - SHOOTER.x);
  }
  s.angle += ((input.held.has('right') ? 1 : 0) - (input.held.has('left') ? 1 : 0)) * 1.8 * dt;
  s.angle = Math.max(-Math.PI + 0.12, Math.min(-0.12, s.angle));

  const fire = input.pressed.has('action') || input.pressed.has('up') || input.pointer.released;
  if (fire && !s.flying) {
    s.flying = { x: SHOOTER.x, y: SHOOTER.y, vx: Math.cos(s.angle) * 900, vy: Math.sin(s.angle) * 900, color: s.current };
    s.current = s.next;
    s.next = randomColor(s, random);
    s.events.push('shoot');
  }
  if (s.flying) {
    const b = s.flying;
    // Sub-steps so fast bubbles cannot tunnel through the cluster.
    const steps = 4;
    for (let k = 0; k < steps && s.flying; k++) {
      b.x += (b.vx * dt) / steps;
      b.y += (b.vy * dt) / steps;
      if (b.x < R) {
        b.x = R;
        b.vx = Math.abs(b.vx);
      }
      if (b.x > W - R) {
        b.x = W - R;
        b.vx = -Math.abs(b.vx);
      }
      let hit = b.y <= R;
      for (let r = 0; r < s.grid.length && !hit; r++)
        for (let c = 0; c < COLS && !hit; c++) {
          if (s.grid[r][c] < 0) continue;
          const [cx, cy] = cellPos(s, r, c);
          if ((cx - b.x) ** 2 + (cy - b.y) ** 2 < (R * 1.8) ** 2) hit = true;
        }
      if (hit) {
        const [r, c] = snap(s, b.x, b.y);
        s.flying = null;
        settle(s, r, c, b.color, random);
        s.shots += 1;
        if (s.shots % s.dropEvery === 0) pushRow(s, random);
      }
    }
  }
  // Lose when a bubble crosses the line; win the level when the board is clear.
  s.grid.forEach((row, r) =>
    row.forEach((v) => {
      if (v >= 0 && R + r * ROW_H + R > DANGER_Y) s.over = true;
    }),
  );
  if (s.over) {
    s.events.push('gameOver');
    return;
  }
  if (!s.grid.some((row) => row.some((v) => v >= 0))) {
    s.level += 1;
    s.score += 500;
    s.events.push('levelComplete');
    fillRows(s, SETTINGS.normal.rows + Math.min(3, s.level - 1), random);
    s.current = randomColor(s, random);
    s.next = randomColor(s, random);
  }
}

function bubble(ctx: CanvasRenderingContext2D, x: number, y: number, color: number) {
  circle(ctx, x, y, R - 1, COLORS[color]);
  circle(ctx, x - 6, y - 6, 5, 'rgba(255,255,255,0.45)');
  text(ctx, MARKS[color], x, y + 1, { size: 12, color: 'rgba(0,0,0,0.35)' });
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  gradientBg(ctx, W, H, '#1e3a8a', '#0f172a');
  s.grid.forEach((row, r) =>
    row.forEach((v, c) => {
      if (v < 0) return;
      const [x, y] = cellPos(s, r, c);
      bubble(ctx, x, y, v);
    }),
  );
  for (const f of s.falling) bubble(ctx, f.x, f.y, f.color);
  ctx.strokeStyle = 'rgba(248,113,113,0.6)';
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(0, DANGER_Y);
  ctx.lineTo(W, DANGER_Y);
  ctx.stroke();
  // Aiming guide with one wall bounce.
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  let x = SHOOTER.x;
  let y = SHOOTER.y;
  let dx = Math.cos(s.angle);
  const dy = Math.sin(s.angle);
  ctx.moveTo(x, y);
  for (let i = 0; i < 40; i++) {
    x += dx * 12;
    y += dy * 12;
    if (x < R || x > W - R) dx = -dx;
    if (y < 40) break;
    ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  if (s.flying) bubble(ctx, s.flying.x, s.flying.y, s.flying.color);
  bubble(ctx, SHOOTER.x, SHOOTER.y, s.current);
  bubble(ctx, SHOOTER.x + 70, SHOOTER.y + 16, s.next);
  text(ctx, 'next', SHOOTER.x + 70, SHOOTER.y - 12, { size: 11, color: '#cbd5e1' });
  const left = s.dropEvery - (s.shots % s.dropEvery);
  text(ctx, `Ceiling drops in ${left}`, 14, H - 20, { size: 12, align: 'left', color: '#93c5fd' });
  drawSparks(ctx, s.sparks);
}

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create,
  update,
  render,
  hud: (s) => [
    { label: 'Score', value: s.score },
    { label: 'Level', value: s.level },
    { label: 'Shots', value: s.shots },
  ],
  result: (s) => ({
    score: s.score,
    title: 'The bubbles reached the line',
    details: [
      { label: 'Bubbles popped', value: String(s.popped) },
      { label: 'Biggest pop', value: String(s.bestPop) },
      { label: 'Level', value: String(s.level) },
    ],
  }),
  onEnd: (s) => {
    void reportProgress('bubble-shooter.clear', s.level >= 2 ? 1 : 0);
    void reportProgress('bubble-shooter.big', s.bestPop);
    void reportProgress('bubble-shooter.score', s.score);
    void incrementProgress('bubble-shooter.popped', s.popped);
  },
  touch: { pad: 'none' },
  pointerStarts: true,
  startHint: 'Aim with the mouse or your finger and release to shoot. Keyboard: ← → aim, Space fires.',
};
