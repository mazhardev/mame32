import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { burst, circle, drawSparks, fillRound, starfield, text, updateSparks } from '../_shared/arcade/draw';
import type { Spark } from '../_shared/arcade/draw';

/**
 * Asteroid Defense: a cannon orbits a small planet. Rotate it to face
 * incoming asteroids from every direction and blast them before impact.
 * Big rocks break into smaller ones. Between waves, choose one upgrade:
 * faster fire, a twin cannon, or patching the planet's shield.
 */
export const W = 480;
export const H = 480;
const CX = W / 2;
const CY = H / 2;
export const PLANET_R = 46;
const ORBIT = 64;

export interface Rock {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  spin: number;
}

export type Upgrade = 'rate' | 'twin' | 'shield';
export const UPGRADES: { id: Upgrade; label: string; key: string }[] = [
  { id: 'rate', label: 'Faster fire', key: '1' },
  { id: 'twin', label: 'Twin cannon', key: '2' },
  { id: 'shield', label: 'Repair shield', key: '3' },
];

export interface State extends BaseState {
  angle: number;
  cd: number;
  fireDelay: number;
  twin: boolean;
  shield: number;
  rocks: Rock[];
  bolts: { x: number; y: number; vx: number; vy: number; life: number }[];
  wave: number;
  toSpawn: number;
  spawnIn: number;
  choosing: boolean;
  destroyed: number;
  speedMul: number;
  sparks: Spark[];
}

const SPEED: Record<DifficultySetting, number> = { easy: 0.75, normal: 1, hard: 1.3 };

export function create(difficulty: DifficultySetting): State {
  return {
    ...baseState(),
    angle: -Math.PI / 2,
    cd: 0,
    fireDelay: 0.28,
    twin: false,
    shield: 5,
    rocks: [],
    bolts: [],
    wave: 1,
    toSpawn: 6,
    spawnIn: 1,
    choosing: false,
    destroyed: 0,
    speedMul: SPEED[difficulty],
    sparks: [],
  };
}

export function applyUpgrade(s: State, u: Upgrade) {
  if (u === 'rate') s.fireDelay = Math.max(0.1, s.fireDelay * 0.8);
  if (u === 'twin') s.twin = true;
  if (u === 'shield') s.shield = Math.min(8, s.shield + 2);
  s.choosing = false;
  s.wave += 1;
  s.toSpawn = 5 + s.wave * 3;
  s.spawnIn = 1;
  s.events.push('powerup');
}

function spawnRock(s: State, random: () => number, r?: number, x?: number, y?: number) {
  const a = random() * Math.PI * 2;
  const px = x ?? CX + Math.cos(a) * 340;
  const py = y ?? CY + Math.sin(a) * 340;
  // Aim near the planet, not dead centre, so rocks curve past sometimes.
  const tx = CX + (random() - 0.5) * 60;
  const ty = CY + (random() - 0.5) * 60;
  const d = Math.hypot(tx - px, ty - py);
  const speed = (35 + random() * 25 + s.wave * 3) * s.speedMul;
  s.rocks.push({ x: px, y: py, vx: ((tx - px) / d) * speed, vy: ((ty - py) / d) * speed, r: r ?? (random() < 0.3 ? 26 : 16), spin: random() * 6 });
}

export function update(s: State, dt: number, input: Input, random: () => number) {
  if (s.choosing) {
    for (const u of UPGRADES) if (input.keys.has(u.key)) applyUpgrade(s, u.id);
    if (input.pointer.pressed) {
      const i = Math.floor((input.pointer.x - 40) / ((W - 80) / 3));
      if (input.pointer.y > CY + 60 && input.pointer.y < CY + 120 && i >= 0 && i < 3) applyUpgrade(s, UPGRADES[i].id);
    }
    return;
  }
  const turn = (input.held.has('right') ? 1 : 0) - (input.held.has('left') ? 1 : 0);
  if (turn) s.angle += turn * 3.2 * dt;
  else if (input.pointer.active) {
    const want = Math.atan2(input.pointer.y - CY, input.pointer.x - CX);
    const diff = Math.atan2(Math.sin(want - s.angle), Math.cos(want - s.angle));
    // The cannon has to travel around its orbit, so it turns at a limited rate.
    s.angle += Math.max(-5 * dt, Math.min(5 * dt, diff));
  }
  s.cd = Math.max(0, s.cd - dt);
  if ((input.held.has('action') || input.pointer.down) && s.cd === 0) {
    for (const off of s.twin ? [-0.08, 0.08] : [0]) {
      const a = s.angle + off;
      s.bolts.push({ x: CX + Math.cos(a) * (ORBIT + 10), y: CY + Math.sin(a) * (ORBIT + 10), vx: Math.cos(a) * 480, vy: Math.sin(a) * 480, life: 0.8 });
    }
    s.cd = s.fireDelay;
    s.events.push('shoot');
  }

  s.spawnIn -= dt;
  if (s.toSpawn > 0 && s.spawnIn <= 0) {
    spawnRock(s, random);
    s.toSpawn -= 1;
    s.spawnIn = Math.max(0.35, 1.6 - s.wave * 0.1) * (0.6 + random() * 0.8);
  }
  for (const r of s.rocks) {
    r.x += r.vx * dt;
    r.y += r.vy * dt;
  }
  for (const b of s.bolts) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
  }
  s.bolts = s.bolts.filter((b) => {
    if (b.life <= 0) return false;
    const r = s.rocks.find((rr) => Math.hypot(rr.x - b.x, rr.y - b.y) < rr.r);
    if (!r) return true;
    s.rocks.splice(s.rocks.indexOf(r), 1);
    s.destroyed += 1;
    s.score += r.r > 20 ? 20 : 10;
    s.events.push('explosion');
    burst(s.sparks, r.x, r.y, '#a8a29e', 12, 140, random);
    if (r.r > 20) for (let i = 0; i < 2; i++) spawnRock(s, random, 13, r.x + (i ? 8 : -8), r.y);
    return false;
  });
  s.rocks = s.rocks.filter((r) => {
    const d = Math.hypot(r.x - CX, r.y - CY);
    if (d < PLANET_R + r.r * 0.6) {
      s.shield -= r.r > 20 ? 2 : 1;
      s.events.push('hit');
      burst(s.sparks, r.x, r.y, '#f97316', 16, 160, random);
      return false;
    }
    return d < 420;
  });
  if (s.shield <= 0) {
    s.over = true;
    s.events.push('gameOver');
    return;
  }
  if (s.toSpawn === 0 && s.rocks.length === 0) {
    s.score += s.wave * 100;
    s.choosing = true;
    s.events.push('levelComplete');
  }
  updateSparks(s.sparks, dt);
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  ctx.fillStyle = '#030712';
  ctx.fillRect(0, 0, W, H);
  starfield(ctx, W, H, 0, 80);
  ctx.strokeStyle = 'rgba(148,163,184,0.15)';
  ctx.beginPath();
  ctx.arc(CX, CY, ORBIT, 0, Math.PI * 2);
  ctx.stroke();
  // Shield halo strength.
  ctx.strokeStyle = `rgba(56,189,248,${Math.min(0.8, s.shield * 0.1)})`;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(CX, CY, PLANET_R + 6, 0, Math.PI * 2);
  ctx.stroke();
  circle(ctx, CX, CY, PLANET_R, '#2563eb');
  circle(ctx, CX - 14, CY - 10, 14, '#16a34a');
  circle(ctx, CX + 18, CY + 12, 10, '#16a34a');
  for (const r of s.rocks) {
    ctx.save();
    ctx.translate(r.x, r.y);
    ctx.rotate(s.time * r.spin * 0.2);
    ctx.fillStyle = '#78716c';
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const rr = r.r * (0.8 + ((i * 37) % 10) / 40);
      if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  for (const b of s.bolts) circle(ctx, b.x, b.y, 3, '#fde047');
  const gx = CX + Math.cos(s.angle) * ORBIT;
  const gy = CY + Math.sin(s.angle) * ORBIT;
  ctx.save();
  ctx.translate(gx, gy);
  ctx.rotate(s.angle);
  fillRound(ctx, -8, -8, 16, 16, 4, '#e2e8f0');
  ctx.fillStyle = '#94a3b8';
  if (s.twin) {
    ctx.fillRect(4, -7, 14, 4);
    ctx.fillRect(4, 3, 14, 4);
  } else ctx.fillRect(4, -3, 16, 6);
  ctx.restore();
  drawSparks(ctx, s.sparks);
  text(ctx, `Shield ${Math.max(0, s.shield)}`, 12, 18, { size: 15, align: 'left', color: '#7dd3fc' });
  text(ctx, `Wave ${s.wave}`, W - 12, 18, { size: 15, align: 'right', color: '#e2e8f0' });
  if (s.choosing) {
    ctx.fillStyle = 'rgba(2,6,23,0.75)';
    ctx.fillRect(0, 0, W, H);
    text(ctx, `Wave ${s.wave} survived! Choose an upgrade`, CX, CY + 30, { size: 18 });
    UPGRADES.forEach((u, i) => {
      const bw = (W - 80) / 3;
      fillRound(ctx, 40 + i * bw + 4, CY + 60, bw - 8, 56, 10, '#1e293b');
      text(ctx, `${u.key}. ${u.label}`, 40 + i * bw + bw / 2, CY + 88, { size: 14 });
    });
  }
}

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create,
  update,
  render,
  customKeys: ['1', '2', '3'],
  hud: (s) => [
    { label: 'Wave', value: s.wave },
    { label: 'Shield', value: Math.max(0, s.shield) },
    { label: 'Rocks', value: s.destroyed },
    { label: 'Score', value: s.score },
  ],
  result: (s) => ({ score: s.score, title: `Impact in wave ${s.wave}`, details: [{ label: 'Asteroids destroyed', value: String(s.destroyed) }] }),
  onEnd: (s) => {
    void reportProgress('asteroid-defense.wave-5', s.wave);
    void reportProgress('asteroid-defense.wave-10', s.wave);
    void incrementProgress('asteroid-defense.total', s.destroyed);
  },
  touch: { pad: 'horizontal', buttons: [{ action: 'action', label: 'Fire' }] },
  startHint: 'Rotate the cannon with ← → or the mouse, hold to fire. Upgrades between waves: keys 1–3 or tap.',
};
