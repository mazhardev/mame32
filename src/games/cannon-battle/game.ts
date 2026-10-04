import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState, clamp } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { burst, circle, drawSparks, fillRound, gradientBg, text, updateSparks } from '../_shared/arcade/draw';
import type { Spark } from '../_shared/arcade/draw';

/**
 * Cannon Battle: turn-based artillery between two castles on rolling hills.
 * Set the angle and power, allow for the wind, and fire. Shells dig craters
 * in the ground; a castle takes damage when a shell explodes close to it.
 * Play against the computer (which aims by simulating its own shots) or a
 * friend on the same device.
 */
export const W = 600;
export const H = 400;
export const GRAVITY = 320;
const BLAST = 28;
export const CASTLE_HP = 3;

export type Side = 0 | 1;
type Phase = 'aim' | 'flying' | 'thinking' | 'pause';

export interface Shell {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface State extends BaseState {
  ground: number[];
  castleX: [number, number];
  hp: [number, number];
  angle: [number, number];
  power: [number, number];
  turn: Side;
  phase: Phase;
  timer: number;
  shell: Shell | null;
  trail: [number, number][];
  wind: number;
  vsAi: boolean;
  aiError: number;
  shotsFired: number;
  winner: Side | null;
  difficulty: DifficultySetting;
  /** A drag began during this aim phase (so its release should fire). */
  dragging: boolean;
  sparks: Spark[];
}

const ERROR: Record<DifficultySetting, number> = { easy: 70, normal: 35, hard: 14 };

/** Rolling hills from a few random sine waves, flattened under the castles. */
export function makeGround(random: () => number): number[] {
  const waves = [0, 1, 2].map(() => ({ a: 20 + random() * 35, f: 0.004 + random() * 0.012, p: random() * 6 }));
  const g = Array.from({ length: W }, (_, x) => H - 110 - waves.reduce((s, w) => s + Math.sin(x * w.f + w.p) * w.a, 0));
  // A hill in the middle so shots must arc.
  for (let x = 0; x < W; x++) g[x] -= Math.max(0, 70 - Math.abs(x - W / 2) * 0.45);
  for (const cx of [70, W - 70]) {
    const h = g[cx];
    for (let x = cx - 30; x <= cx + 30; x++) g[x] = h;
  }
  return g.map((v) => clamp(v, 120, H - 30));
}

export function create(difficulty: DifficultySetting, random: () => number = Math.random, vsAi = true): State {
  return {
    ...baseState(),
    ground: makeGround(random),
    castleX: [70, W - 70],
    hp: [CASTLE_HP, CASTLE_HP],
    angle: [45, 45],
    power: [55, 55],
    turn: 0,
    phase: 'aim',
    timer: 0,
    shell: null,
    trail: [],
    wind: (random() - 0.5) * 60,
    vsAi,
    aiError: ERROR[difficulty],
    shotsFired: 0,
    winner: null,
    difficulty,
    dragging: false,
    sparks: [],
  };
}

const groundAt = (s: State, x: number) => s.ground[clamp(Math.round(x), 0, W - 1)];
const muzzle = (s: State, side: Side) => ({ x: s.castleX[side], y: groundAt(s, s.castleX[side]) - 34 });

/** Launch velocity for a side's angle (degrees, measured towards the enemy) and power (0–100). */
export function launch(side: Side, angleDeg: number, power: number): [number, number] {
  const a = (angleDeg * Math.PI) / 180;
  const speed = 160 + power * 4.4;
  const dir = side === 0 ? 1 : -1;
  return [Math.cos(a) * speed * dir, -Math.sin(a) * speed];
}

/** Traces a shot (without side effects) and returns where it lands. */
export function simulateShot(s: State, side: Side, angle: number, power: number): { x: number; y: number } {
  const m = muzzle(s, side);
  let [vx, vy] = launch(side, angle, power);
  let x = m.x;
  let y = m.y;
  const dt = 1 / 120;
  for (let i = 0; i < 2400; i++) {
    vx += s.wind * dt;
    vy += GRAVITY * dt;
    x += vx * dt;
    y += vy * dt;
    if (x < 0 || x >= W) return { x, y };
    if (y >= groundAt(s, x)) return { x, y };
  }
  return { x, y };
}

/** The computer picks the shot whose landing point is nearest your castle, then adds human-like error. */
export function aiChoose(s: State, random: () => number): [number, number] {
  let best: [number, number] = [45, 60];
  let bestD = Infinity;
  const target = s.castleX[0];
  for (let angle = 20; angle <= 80; angle += 2) {
    for (let power = 20; power <= 100; power += 2) {
      const d = Math.abs(simulateShot(s, 1, angle, power).x - target);
      if (d < bestD) {
        bestD = d;
        best = [angle, power];
      }
    }
  }
  const errAngle = (random() - 0.5) * s.aiError * 0.12;
  const errPower = (random() - 0.5) * s.aiError * 0.15;
  return [clamp(best[0] + errAngle, 10, 85), clamp(best[1] + errPower, 10, 100)];
}

function fire(s: State) {
  const m = muzzle(s, s.turn);
  const [vx, vy] = launch(s.turn, s.angle[s.turn], s.power[s.turn]);
  s.shell = { x: m.x, y: m.y, vx, vy };
  s.trail = [];
  s.phase = 'flying';
  s.events.push('explosion');
  if (s.turn === 0 || !s.vsAi) s.shotsFired += 1;
}

/** Digs a crater and damages any castle in the blast. */
export function explode(s: State, x: number, y: number, random: () => number) {
  for (let i = Math.max(0, Math.floor(x - BLAST)); i <= Math.min(W - 1, Math.ceil(x + BLAST)); i++) {
    const depth = Math.sqrt(Math.max(0, BLAST * BLAST - (i - x) * (i - x)));
    s.ground[i] = Math.min(H - 10, Math.max(s.ground[i], y + depth));
  }
  ([0, 1] as const).forEach((side) => {
    const cx = s.castleX[side];
    const cy = groundAt(s, cx) - 16;
    const d = Math.hypot(cx - x, cy - y);
    if (d < BLAST + 22) {
      s.hp[side] = Math.max(0, s.hp[side] - (d < 18 ? 2 : 1));
      s.events.push('hit');
    }
  });
  burst(s.sparks, x, y, '#f97316', 22, 200, random);
  s.events.push('explosion');
}

export function update(s: State, dt: number, input: Input, random: () => number) {
  updateSparks(s.sparks, dt, 300);
  if (s.phase === 'pause') {
    s.timer -= dt;
    if (s.timer <= 0) {
      s.turn = s.turn === 0 ? 1 : 0;
      s.wind = clamp(s.wind + (random() - 0.5) * 40, -60, 60);
      if (s.vsAi && s.turn === 1) {
        s.phase = 'thinking';
        s.timer = 0.9;
      } else s.phase = 'aim';
    }
    return;
  }
  if (s.phase === 'thinking') {
    s.timer -= dt;
    if (s.timer <= 0) {
      const [a, p] = aiChoose(s, random);
      s.angle[1] = a;
      s.power[1] = p;
      fire(s);
    }
    return;
  }
  if (s.phase === 'aim') {
    const side = s.turn;
    if (input.held.has('up')) s.angle[side] = clamp(s.angle[side] + 40 * dt, 5, 88);
    if (input.held.has('down')) s.angle[side] = clamp(s.angle[side] - 40 * dt, 5, 88);
    if (input.held.has('right')) s.power[side] = clamp(s.power[side] + (side === 0 ? 30 : -30) * dt, 5, 100);
    if (input.held.has('left')) s.power[side] = clamp(s.power[side] - (side === 0 ? 30 : -30) * dt, 5, 100);
    if (input.pointer.down) {
      s.dragging = true;
      // Drag from the cannon: direction sets the angle, distance sets power.
      const m = muzzle(s, side);
      const dx = (input.pointer.x - m.x) * (side === 0 ? 1 : -1);
      const dy = m.y - input.pointer.y;
      if (dx > 0 || dy > 0) {
        s.angle[side] = clamp((Math.atan2(Math.max(0, dy), Math.max(0.01, dx)) * 180) / Math.PI, 5, 88);
        s.power[side] = clamp(Math.hypot(dx, dy) / 2.2, 5, 100);
      }
    }
    if (input.pressed.has('action') || (input.pointer.released && s.dragging)) {
      s.dragging = false;
      fire(s);
    }
    return;
  }
  const sh = s.shell;
  if (!sh) return;
  const steps = 4;
  for (let i = 0; i < steps; i++) {
    const h = dt / steps;
    sh.vx += s.wind * h;
    sh.vy += GRAVITY * h;
    sh.x += sh.vx * h;
    sh.y += sh.vy * h;
    if (sh.x < -40 || sh.x > W + 40 || sh.y > H + 40) {
      s.shell = null;
      break;
    }
    if (sh.x >= 0 && sh.x < W && sh.y >= groundAt(s, sh.x)) {
      explode(s, sh.x, sh.y, random);
      s.shell = null;
      break;
    }
  }
  if (s.shell) s.trail.push([s.shell.x, s.shell.y]);
  else {
    if (s.hp[0] === 0 || s.hp[1] === 0) {
      s.winner = s.hp[0] === 0 ? 1 : 0;
      s.over = true;
      s.events.push(s.vsAi && s.winner === 1 ? 'gameOver' : 'levelComplete');
      if (!s.vsAi || s.winner === 0) s.score = s.vsAi ? 300 + s.hp[0] * 150 + Math.max(0, 10 - s.shotsFired) * 30 : 0;
      return;
    }
    s.phase = 'pause';
    s.timer = 0.9;
  }
}

function drawCastle(ctx: CanvasRenderingContext2D, s: State, side: Side) {
  const x = s.castleX[side];
  const y = groundAt(s, x);
  const color = side === 0 ? '#2563eb' : '#dc2626';
  fillRound(ctx, x - 22, y - 30, 44, 30, 3, s.hp[side] > 0 ? '#a8a29e' : '#57534e');
  for (let i = -22; i < 22; i += 11) ctx.fillRect(x + i, y - 36, 7, 6);
  ctx.fillStyle = color;
  ctx.fillRect(x - 2, y - 52, 2, 18);
  ctx.beginPath();
  ctx.moveTo(x, y - 52);
  ctx.lineTo(x + (side === 0 ? 12 : -12), y - 47);
  ctx.lineTo(x, y - 42);
  ctx.fill();
  // Barrel.
  const a = (s.angle[side] * Math.PI) / 180;
  const dir = side === 0 ? 1 : -1;
  ctx.strokeStyle = '#1f2937';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(x, y - 34);
  ctx.lineTo(x + Math.cos(a) * 22 * dir, y - 34 - Math.sin(a) * 22);
  ctx.stroke();
  for (let i = 0; i < CASTLE_HP; i++) circle(ctx, x - 12 + i * 12, y + 10, 4, i < s.hp[side] ? color : '#d6d3d1');
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  gradientBg(ctx, W, H, '#93c5fd', '#dbeafe');
  ctx.fillStyle = '#65a30d';
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x < W; x += 2) ctx.lineTo(x, s.ground[x]);
  ctx.lineTo(W, H);
  ctx.fill();
  ctx.fillStyle = '#4d7c0f';
  for (let x = 0; x < W; x += 2) ctx.fillRect(x, s.ground[x], 2, 4);
  drawCastle(ctx, s, 0);
  drawCastle(ctx, s, 1);
  ctx.fillStyle = 'rgba(30,41,59,0.5)';
  for (const [x, y] of s.trail.filter((_, i) => i % 3 === 0)) ctx.fillRect(x - 1, y - 1, 2, 2);
  if (s.shell) circle(ctx, s.shell.x, s.shell.y, 5, '#111827');
  drawSparks(ctx, s.sparks);
  const arrow = s.wind > 0 ? '→' : '←';
  text(ctx, `Wind ${arrow} ${Math.abs(Math.round(s.wind / 6))}`, W / 2, 20, { size: 15, color: '#1e3a8a' });
  if (s.phase === 'aim' || s.phase === 'thinking') {
    const who = s.vsAi ? (s.turn === 0 ? 'Your turn' : 'Computer is aiming…') : `Player ${s.turn + 1}'s turn`;
    text(ctx, who, W / 2, 44, { size: 16, color: s.turn === 0 ? '#1d4ed8' : '#b91c1c' });
    text(ctx, `Angle ${Math.round(s.angle[s.turn])}°  Power ${Math.round(s.power[s.turn])}`, W / 2, 66, { size: 14, color: '#1f2937' });
  }
}

export function makeSpec(vsAi: boolean): ArcadeSpec<State> {
  return {
    width: W,
    height: H,
    create: (d, r) => create(d, r, vsAi),
    update,
    render,
    pointerStarts: true,
    hud: (s) => [
      { label: vsAi ? 'You' : 'Player 1', value: '❤'.repeat(s.hp[0]) || '–' },
      { label: vsAi ? 'Computer' : 'Player 2', value: '❤'.repeat(s.hp[1]) || '–' },
      { label: 'Shots', value: s.shotsFired },
    ],
    result: (s) => ({
      score: s.score,
      won: vsAi ? s.winner === 0 : undefined,
      lost: vsAi ? s.winner === 1 : undefined,
      title: vsAi ? (s.winner === 0 ? 'Enemy castle destroyed!' : 'Your castle has fallen') : `Player ${(s.winner ?? 0) + 1} wins!`,
      details: [{ label: 'Shots fired', value: String(s.shotsFired) }],
    }),
    onEnd: (s) => {
      if (!vsAi || s.winner !== 0) return;
      void reportProgress('cannon-battle.win', 1);
      if (s.hp[0] === CASTLE_HP) void reportProgress('cannon-battle.untouched', 1);
      if (s.difficulty === 'hard') void reportProgress('cannon-battle.hard', 1);
      void incrementProgress('cannon-battle.wins', 1);
    },
    touch: { pad: 'dpad', buttons: [{ action: 'action', label: 'Fire' }] },
    startHint: '↑↓ angle, ←→ power, Space fires — or drag from your cannon and release. Mind the wind!',
  };
}
