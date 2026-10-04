import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState, clamp } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { burst, circle, drawSparks, gradientBg, starfield, text, updateSparks } from '../_shared/arcade/draw';
import type { Spark } from '../_shared/arcade/draw';
import { moveDir } from '../_shared/shooter/kit';

/**
 * Boss Battle: a one-on-one bullet-hell fight. The boss has three phases,
 * each with its own bullet patterns. Your ship fires automatically; hold
 * focus (X / Shift) to move slowly with a visible hitbox, and use a bomb to
 * clear every bullet on screen in an emergency.
 */
export const W = 400;
export const H = 600;
const HITBOX = 3;

export interface Shot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: string;
  grazed?: boolean;
}

export interface State extends BaseState {
  px: number;
  py: number;
  lives: number;
  bombs: number;
  invuln: number;
  bossX: number;
  bossHp: number;
  bossMax: number;
  phase: number;
  patternT: number;
  spin: number;
  shots: Shot[];
  bullets: Shot[];
  fireCd: number;
  speedMul: number;
  grazes: number;
  bombsUsed: number;
  won: boolean;
  sparks: Spark[];
}

const SPEED: Record<DifficultySetting, number> = { easy: 0.7, normal: 1, hard: 1.25 };
const BOSS_Y = 110;

export function create(difficulty: DifficultySetting): State {
  return {
    ...baseState(),
    px: W / 2,
    py: H - 70,
    lives: difficulty === 'easy' ? 5 : 3,
    bombs: 2,
    invuln: 1,
    bossX: W / 2,
    bossHp: 600,
    bossMax: 600,
    phase: 1,
    patternT: 0,
    spin: 0,
    shots: [],
    bullets: [],
    fireCd: 0,
    speedMul: SPEED[difficulty],
    grazes: 0,
    bombsUsed: 0,
    won: false,
    sparks: [],
  };
}

export const phaseFor = (hp: number, max: number) => (hp > max * 0.66 ? 1 : hp > max * 0.33 ? 2 : 3);

function ring(s: State, n: number, speed: number, offset: number, color: string) {
  for (let i = 0; i < n; i++) {
    const a = offset + (i / n) * Math.PI * 2;
    s.bullets.push({ x: s.bossX, y: BOSS_Y, vx: Math.cos(a) * speed * s.speedMul, vy: Math.sin(a) * speed * s.speedMul, r: 5, color });
  }
}

function aimedFan(s: State, n: number, spread: number, speed: number) {
  const a = Math.atan2(s.py - BOSS_Y, s.px - s.bossX);
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1) - 0.5;
    s.bullets.push({ x: s.bossX, y: BOSS_Y, vx: Math.cos(a + t * spread) * speed * s.speedMul, vy: Math.sin(a + t * spread) * speed * s.speedMul, r: 4, color: '#fca5a5' });
  }
}

/** Fires the boss's current phase pattern; `t` is time within the pattern. */
function pattern(s: State, dt: number, random: () => number) {
  s.patternT += dt;
  s.spin += dt;
  const every = (period: number) => Math.floor(s.patternT / period) !== Math.floor((s.patternT - dt) / period);
  if (s.phase === 1) {
    if (every(0.12)) {
      const a = s.spin * 2.2;
      s.bullets.push({ x: s.bossX, y: BOSS_Y, vx: Math.cos(a) * 130 * s.speedMul, vy: Math.sin(a) * 130 * s.speedMul, r: 5, color: '#c4b5fd' });
      s.bullets.push({ x: s.bossX, y: BOSS_Y, vx: Math.cos(a + Math.PI) * 130 * s.speedMul, vy: Math.sin(a + Math.PI) * 130 * s.speedMul, r: 5, color: '#c4b5fd' });
    }
    if (every(1.6)) aimedFan(s, 3, 0.4, 190);
  } else if (s.phase === 2) {
    if (every(0.9)) ring(s, 18, 120, s.spin, '#93c5fd');
    if (every(0.45)) aimedFan(s, 5, 0.9, 160);
    s.bossX = W / 2 + Math.sin(s.spin * 0.8) * 120;
  } else {
    if (every(0.07)) {
      // Rain from the top edge.
      s.bullets.push({ x: random() * W, y: -10, vx: 0, vy: (120 + random() * 80) * s.speedMul, r: 4, color: '#fdba74' });
    }
    if (every(1.1)) ring(s, 24, 100, s.spin * 1.7, '#f9a8d4');
    if (every(0.8)) aimedFan(s, 1, 0, 260);
    s.bossX = W / 2 + Math.sin(s.spin * 1.2) * 140;
  }
}

export function bomb(s: State, random: () => number) {
  if (s.bombs <= 0) return false;
  s.bombs -= 1;
  s.bombsUsed += 1;
  for (const b of s.bullets) burst(s.sparks, b.x, b.y, b.color, 1, 60, random);
  s.bullets = [];
  s.invuln = 1.5;
  s.bossHp = Math.max(1, s.bossHp - 20);
  s.events.push('explosion');
  return true;
}

export function update(s: State, dt: number, input: Input, random: () => number) {
  const focus = input.held.has('action2');
  const speed = focus ? 110 : 240;
  const [dx, dy] = moveDir(input);
  if (dx || dy) {
    s.px += dx * speed * dt;
    s.py += dy * speed * dt;
  } else if (input.pointer.down) {
    // Drag control: the ship follows the finger, offset upwards so it stays visible.
    const tx = input.pointer.x;
    const ty = input.pointer.y - 50;
    const d = Math.hypot(tx - s.px, ty - s.py);
    if (d > 1) {
      const step = Math.min(d, 300 * dt);
      s.px += ((tx - s.px) / d) * step;
      s.py += ((ty - s.py) / d) * step;
    }
  }
  s.px = clamp(s.px, 10, W - 10);
  s.py = clamp(s.py, 200, H - 10);
  if (input.pressed.has('action')) bomb(s, random);

  s.invuln = Math.max(0, s.invuln - dt);
  s.fireCd -= dt;
  if (s.fireCd <= 0) {
    s.fireCd = 0.09;
    for (const off of focus ? [-4, 4] : [-10, 0, 10]) s.shots.push({ x: s.px + off, y: s.py - 10, vx: off * (focus ? 0 : 6), vy: -560, r: 3, color: '#a7f3d0' });
  }
  for (const sh of s.shots) {
    sh.x += sh.vx * dt;
    sh.y += sh.vy * dt;
  }
  s.shots = s.shots.filter((sh) => {
    if (Math.hypot(sh.x - s.bossX, sh.y - BOSS_Y) < 40) {
      s.bossHp -= 1;
      s.score += 1;
      return false;
    }
    return sh.y > -10;
  });
  const newPhase = phaseFor(s.bossHp, s.bossMax);
  if (newPhase !== s.phase) {
    s.phase = newPhase;
    s.patternT = 0;
    s.bullets = [];
    s.events.push('powerup');
    burst(s.sparks, s.bossX, BOSS_Y, '#f472b6', 30, 220, random);
  }
  if (s.bossHp <= 0) {
    s.won = true;
    s.over = true;
    s.score += 1000 + s.lives * 300 + s.bombs * 150;
    s.events.push('levelComplete');
    burst(s.sparks, s.bossX, BOSS_Y, '#fde047', 60, 300, random);
    return;
  }
  pattern(s, dt, random);
  for (const b of s.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
  }
  s.bullets = s.bullets.filter((b) => b.x > -20 && b.x < W + 20 && b.y > -20 && b.y < H + 20);
  if (s.invuln === 0) {
    for (const b of s.bullets) {
      const d = Math.hypot(b.x - s.px, b.y - s.py);
      if (d < b.r + HITBOX) {
        s.lives -= 1;
        s.invuln = 2;
        s.bullets = [];
        s.events.push('hit');
        burst(s.sparks, s.px, s.py, '#38bdf8', 20, 180, random);
        if (s.lives <= 0) {
          s.over = true;
          s.events.push('gameOver');
        }
        break;
      }
      // Grazing: bullets that pass very close score a little.
      if (d < b.r + 14 && !b.grazed) {
        b.grazed = true;
        s.grazes += 1;
        s.score += 5;
      }
    }
  }
  updateSparks(s.sparks, dt);
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  gradientBg(ctx, W, H, '#0b1026', '#1e1b4b');
  starfield(ctx, W, H, s.time * 40);
  // Boss.
  if (!s.won) {
    const pulse = 1 + Math.sin(s.time * 6) * 0.05;
    circle(ctx, s.bossX, BOSS_Y, 36 * pulse, s.phase === 3 ? '#be185d' : s.phase === 2 ? '#7c3aed' : '#4f46e5');
    circle(ctx, s.bossX, BOSS_Y, 18, '#0f172a');
    circle(ctx, s.bossX + Math.cos(s.time * 2) * 6, BOSS_Y + 2, 7, '#fde047');
    text(ctx, '🐲', s.bossX, BOSS_Y - 46, { size: 22 });
  }
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(20, 14, W - 40, 8);
  ctx.fillStyle = '#f472b6';
  ctx.fillRect(20, 14, ((W - 40) * Math.max(0, s.bossHp)) / s.bossMax, 8);
  for (const sh of s.shots) circle(ctx, sh.x, sh.y, sh.r, sh.color);
  for (const b of s.bullets) {
    circle(ctx, b.x, b.y, b.r + 1.5, b.color);
    circle(ctx, b.x, b.y, b.r - 1.5, '#fff');
  }
  if (!s.over || s.won) {
    if (!(s.invuln > 0 && Math.floor(s.time * 16) % 2)) {
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(s.px, s.py - 14);
      ctx.lineTo(s.px + 11, s.py + 10);
      ctx.lineTo(s.px - 11, s.py + 10);
      ctx.closePath();
      ctx.fill();
    }
    circle(ctx, s.px, s.py, HITBOX + 1, '#fff');
    circle(ctx, s.px, s.py, HITBOX - 1, '#ef4444');
  }
  drawSparks(ctx, s.sparks);
  text(ctx, `${'❤'.repeat(Math.max(0, s.lives))}  ${'💣'.repeat(s.bombs)}`, 10, H - 16, { size: 14, align: 'left', color: '#fda4af' });
  text(ctx, `Phase ${s.phase}`, W - 12, H - 16, { size: 13, align: 'right', color: '#c7d2fe' });
}

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create,
  update,
  render,
  hud: (s) => [
    { label: 'Boss', value: `${Math.max(0, Math.round((s.bossHp / s.bossMax) * 100))}%` },
    { label: 'Lives', value: s.lives },
    { label: 'Bombs', value: s.bombs },
    { label: 'Score', value: s.score },
  ],
  result: (s) => ({
    score: s.score,
    won: s.won,
    lost: !s.won,
    title: s.won ? 'The dragon is defeated!' : `Defeated in phase ${s.phase}`,
    details: [
      { label: 'Boss health left', value: `${Math.max(0, Math.round((s.bossHp / s.bossMax) * 100))}%` },
      { label: 'Grazes', value: String(s.grazes) },
      { label: 'Time', value: `${Math.floor(s.time)} s` },
    ],
  }),
  onEnd: (s, difficulty) => {
    void reportProgress('boss-battle.phase-3', s.phase);
    if (s.won) {
      void reportProgress('boss-battle.win', 1);
      if (s.bombsUsed === 0) void reportProgress('boss-battle.no-bomb', 1);
      if (difficulty === 'hard') void reportProgress('boss-battle.hard', 1);
    }
    void incrementProgress('boss-battle.grazes', s.grazes);
  },
  touch: { pad: 'none', buttons: [{ action: 'action2', label: 'Focus' }, { action: 'action', label: 'Bomb' }] },
  startHint: 'Move with arrows/WASD or drag. You fire automatically. Hold X/Shift to focus, Space for a bomb.',
};
