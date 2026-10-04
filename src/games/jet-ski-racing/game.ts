import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState, clamp } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { burst, circle, drawSparks, fillRound, text, updateSparks } from '../_shared/arcade/draw';
import type { Spark } from '../_shared/arcade/draw';

/**
 * Jet Ski Racing: an endless slalom on choppy water. Steer between each pair
 * of buoys; every gate adds time to the clock, every missed gate takes some
 * away. The jet ski slides — steering sets where it wants to go, but it
 * drifts there — and a crosswind current shifts as you go. Rocks are solid.
 */
export const W = 420;
export const H = 620;
export const SKI_Y = H - 120;

export interface Gate {
  x: number;
  y: number;
  width: number;
  done: boolean;
}

export interface Rock {
  x: number;
  y: number;
  r: number;
}

export interface State extends BaseState {
  x: number;
  vx: number;
  speed: number;
  timeLeft: number;
  gates: Gate[];
  rocks: Rock[];
  nextGate: number;
  passed: number;
  missed: number;
  streak: number;
  bestStreak: number;
  current: number;
  gateWidth: number;
  stun: number;
  scroll: number;
  sparks: Spark[];
}

const SETTINGS: Record<DifficultySetting, { gate: number; speed: number }> = {
  easy: { gate: 140, speed: 260 },
  normal: { gate: 115, speed: 300 },
  hard: { gate: 95, speed: 340 },
};

export function create(difficulty: DifficultySetting): State {
  const c = SETTINGS[difficulty];
  return { ...baseState(), x: W / 2, vx: 0, speed: c.speed, timeLeft: 20, gates: [], rocks: [], nextGate: 0, passed: 0, missed: 0, streak: 0, bestStreak: 0, current: 0, gateWidth: c.gate, stun: 0, scroll: 0, sparks: [] };
}

function spawnRow(s: State, y: number, random: () => number) {
  const width = Math.max(70, s.gateWidth - s.passed * 0.6);
  const prev = s.gates[s.gates.length - 1];
  // Gates zigzag so you must steer, but never jump impossibly far.
  const base = prev ? prev.x + (random() < 0.5 ? -1 : 1) * (90 + random() * 90) : W / 2;
  const x = clamp(base, width / 2 + 30, W - width / 2 - 30);
  s.gates.push({ x, y, width, done: false });
  if (random() < 0.45) {
    const side = random() < 0.5 ? -1 : 1;
    s.rocks.push({ x: clamp(x + side * (width / 2 + 40 + random() * 60), 20, W - 20), y: y - 90, r: 14 + random() * 10 });
  }
}

export function update(s: State, dt: number, input: Input, random: () => number) {
  s.stun = Math.max(0, s.stun - dt);
  let dir = (input.held.has('right') ? 1 : 0) - (input.held.has('left') ? 1 : 0);
  if (!dir && input.pointer.down) dir = clamp((input.pointer.x - s.x) / 40, -1, 1);
  const boost = input.held.has('up') ? 1.25 : input.held.has('down') ? 0.75 : 1;
  s.current = Math.sin(s.time * 0.35) * 40;
  // Steering targets a sideways speed; the ski slides towards it.
  const want = (s.stun > 0 ? 0 : dir * 230) + s.current;
  s.vx += (want - s.vx) * Math.min(1, dt * 2.2);
  s.x = clamp(s.x + s.vx * dt, 16, W - 16);
  const v = s.speed * boost * (s.stun > 0 ? 0.4 : 1) * (1 + Math.min(0.5, s.time / 120));
  s.scroll = (s.scroll + v * dt) % 60;
  s.timeLeft -= dt;

  s.nextGate -= v * dt;
  if (s.nextGate <= 0) {
    spawnRow(s, -40, random);
    s.nextGate = 230;
  }
  for (const g of s.gates) {
    g.y += v * dt;
    if (!g.done && g.y >= SKI_Y) {
      g.done = true;
      if (Math.abs(s.x - g.x) < g.width / 2 - 6) {
        s.passed += 1;
        s.streak += 1;
        s.bestStreak = Math.max(s.bestStreak, s.streak);
        s.timeLeft += 2.2;
        s.score += 100 + Math.min(10, s.streak) * 20;
        s.events.push('coin');
      } else {
        s.missed += 1;
        s.streak = 0;
        s.timeLeft -= 3;
        s.events.push('failure');
      }
    }
  }
  for (const r of s.rocks) {
    r.y += v * dt;
    if (s.stun === 0 && Math.hypot(r.x - s.x, r.y - SKI_Y) < r.r + 12) {
      s.stun = 1;
      s.streak = 0;
      s.timeLeft -= 2;
      s.events.push('explosion');
      burst(s.sparks, s.x, SKI_Y, '#e0f2fe', 18, 160, random);
    }
  }
  s.gates = s.gates.filter((g) => g.y < H + 40);
  s.rocks = s.rocks.filter((r) => r.y < H + 40);
  if (s.timeLeft <= 0) {
    s.timeLeft = 0;
    s.over = true;
    s.events.push('gameOver');
  }
  updateSparks(s.sparks, dt);
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  ctx.fillStyle = '#0369a1';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(186,230,253,0.35)';
  ctx.lineWidth = 2;
  for (let y = -60 + s.scroll; y < H; y += 60) {
    ctx.beginPath();
    for (let x = 0; x <= W; x += 20) {
      const yy = y + Math.sin(x * 0.05 + s.time * 2) * 5;
      if (x === 0) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
  for (const r of s.rocks) {
    circle(ctx, r.x, r.y, r.r, '#57534e');
    circle(ctx, r.x - r.r * 0.3, r.y - r.r * 0.3, r.r * 0.35, '#78716c');
  }
  for (const g of s.gates) {
    const color = g.done ? 'rgba(255,255,255,0.4)' : '#f97316';
    circle(ctx, g.x - g.width / 2, g.y, 9, color);
    circle(ctx, g.x + g.width / 2, g.y, 9, g.done ? color : '#facc15');
    if (!g.done) {
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(g.x - g.width / 2 + 10, g.y);
      ctx.lineTo(g.x + g.width / 2 - 10, g.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  // Wake and jet ski.
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(s.x - 8, SKI_Y + 18);
  ctx.lineTo(s.x - 18 - s.vx * 0.05, SKI_Y + 60);
  ctx.moveTo(s.x + 8, SKI_Y + 18);
  ctx.lineTo(s.x + 18 - s.vx * 0.05, SKI_Y + 60);
  ctx.stroke();
  ctx.save();
  ctx.translate(s.x, SKI_Y);
  ctx.rotate(s.vx * 0.0015);
  fillRound(ctx, -11, -22, 22, 44, 10, s.stun > 0 ? '#fca5a5' : '#facc15');
  circle(ctx, 0, 0, 7, '#1e3a8a');
  ctx.restore();
  drawSparks(ctx, s.sparks);
  fillRound(ctx, W / 2 - 46, 10, 92, 32, 8, 'rgba(0,0,0,0.4)');
  text(ctx, `${Math.ceil(s.timeLeft)}`, W / 2, 26, { size: 22, color: s.timeLeft < 6 ? '#f87171' : '#fde047' });
  text(ctx, `Current ${s.current > 5 ? '→' : s.current < -5 ? '←' : '·'}`, 12, H - 18, { size: 13, align: 'left', color: '#e0f2fe' });
}

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create,
  update,
  render,
  hud: (s) => [
    { label: 'Gates', value: s.passed },
    { label: 'Time', value: `${Math.ceil(s.timeLeft)}s` },
    { label: 'Streak', value: s.streak },
    { label: 'Score', value: s.score },
  ],
  result: (s) => ({
    score: s.score,
    title: 'Out of time',
    details: [
      { label: 'Gates passed', value: String(s.passed) },
      { label: 'Gates missed', value: String(s.missed) },
      { label: 'Best streak', value: String(s.bestStreak) },
    ],
  }),
  onEnd: (s) => {
    void reportProgress('jet-ski-racing.gates-30', s.passed);
    void reportProgress('jet-ski-racing.streak-20', s.bestStreak);
    void incrementProgress('jet-ski-racing.total', s.passed);
  },
  touch: { pad: 'horizontal' },
  startHint: 'Steer ← → between each pair of buoys. ↑ boosts, ↓ eases off. The jet ski slides and the current pushes you!',
};
