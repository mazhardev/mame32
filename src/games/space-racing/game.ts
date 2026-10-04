import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { text } from '../_shared/arcade/draw';

/**
 * Space Racing: fly down an endless tunnel at ever-increasing speed. The ship
 * rides the tunnel wall and you rotate around it. Walls with gaps rush
 * towards you; line the ship up with a gap before the wall arrives. Blue
 * boost rings add speed (and points) — but faster means less time to react.
 *
 * Geometry: each wall sits at depth z and blocks a set of angular sectors.
 * The ship is at depth 0, at angle `angle` around the tunnel.
 */
export const W = 480;
export const H = 480;
export const SECTORS = 12;
const FOCAL = 260;
const RADIUS = 200;

export interface Wall {
  z: number;
  /** blocked[i] covers the angle range [i, i+1) × 2π / SECTORS. */
  blocked: boolean[];
  hue: number;
  passed: boolean;
}

export interface Ring {
  z: number;
  sector: number;
  taken: boolean;
}

export interface State extends BaseState {
  angle: number;
  speed: number;
  baseSpeed: number;
  walls: Wall[];
  rings: Ring[];
  nextWall: number;
  gapSize: number;
  passed: number;
  boosts: number;
  boost: number;
  distance: number;
}

const SETTINGS: Record<DifficultySetting, { speed: number; gap: number }> = {
  easy: { speed: 900, gap: 4 },
  normal: { speed: 1100, gap: 3 },
  hard: { speed: 1300, gap: 2 },
};

export function create(difficulty: DifficultySetting): State {
  const c = SETTINGS[difficulty];
  return { ...baseState(), angle: Math.PI / 2, speed: c.speed, baseSpeed: c.speed, walls: [], rings: [], nextWall: 1400, gapSize: c.gap, passed: 0, boosts: 0, boost: 0, distance: 0 };
}

export const sectorOf = (angle: number) => {
  const a = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  return Math.floor((a / (Math.PI * 2)) * SECTORS) % SECTORS;
};

export function makeWall(z: number, gap: number, random: () => number): Wall {
  const start = Math.floor(random() * SECTORS);
  const blocked = Array.from({ length: SECTORS }, (_, i) => ((i - start + SECTORS) % SECTORS) >= gap);
  return { z, blocked, hue: Math.floor(random() * 360), passed: false };
}

export function update(s: State, dt: number, input: Input, random: () => number) {
  let turn = (input.held.has('right') ? 1 : 0) - (input.held.has('left') ? 1 : 0);
  if (!turn && input.pointer.down) turn = input.pointer.x > W / 2 ? 1 : -1;
  s.angle += turn * 3.6 * dt;
  s.boost = Math.max(0, s.boost - dt);
  s.speed = s.baseSpeed + Math.min(1200, s.time * 18) + (s.boost > 0 ? 500 : 0);
  const dz = s.speed * dt;
  s.distance += dz;
  s.nextWall -= dz;
  if (s.nextWall <= 0) {
    const gap = Math.max(2, s.gapSize - Math.floor(s.passed / 25));
    s.walls.push(makeWall(2600, gap, random));
    if (random() < 0.4) s.rings.push({ z: 2600 + 650, sector: Math.floor(random() * SECTORS), taken: false });
    s.nextWall = 1300;
  }
  const me = sectorOf(s.angle);
  for (const w of s.walls) {
    w.z -= dz;
    if (!w.passed && w.z <= 0) {
      w.passed = true;
      if (w.blocked[me]) {
        s.over = true;
        s.events.push('explosion');
        return;
      }
      s.passed += 1;
      s.score += 10 + Math.floor(s.speed / 200);
      s.events.push('whoosh');
    }
  }
  for (const r of s.rings) {
    r.z -= dz;
    if (!r.taken && r.z <= 0 && r.z > -dz - 1 && r.sector === me) {
      r.taken = true;
      s.boost = 1.5;
      s.boosts += 1;
      s.score += 50;
      s.events.push('powerup');
    }
  }
  s.walls = s.walls.filter((w) => w.z > -200);
  s.rings = s.rings.filter((r) => r.z > -200);
}

/** Screen point for a tunnel angle at depth z (the ship sits at the bottom). */
function project(angle: number, z: number, view: number): [number, number, number] {
  const scale = FOCAL / (FOCAL + Math.max(0, z));
  // Rotate the world so the ship is always at the bottom of the screen.
  const a = angle - view + Math.PI / 2;
  return [W / 2 + Math.cos(a) * RADIUS * scale, H / 2 + Math.sin(a) * RADIUS * scale, scale];
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  ctx.fillStyle = '#020617';
  ctx.fillRect(0, 0, W, H);
  // Tunnel rings for depth.
  for (let k = 0; k < 14; k++) {
    const z = ((k * 200 - (s.distance % 200)) + 2800) % 2800;
    const scale = FOCAL / (FOCAL + z);
    ctx.strokeStyle = `rgba(129,140,248,${0.08 + scale * 0.5})`;
    ctx.lineWidth = 1 + scale * 2;
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, RADIUS * scale, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (let i = 0; i < SECTORS; i++) {
    const [x1, y1] = project((i / SECTORS) * Math.PI * 2, 0, s.angle);
    const [x2, y2] = project((i / SECTORS) * Math.PI * 2, 2600, s.angle);
    ctx.strokeStyle = 'rgba(99,102,241,0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  // Walls, far to near.
  for (const w of [...s.walls].sort((a, b) => b.z - a.z)) {
    if (w.z < 0) continue;
    const near = Math.max(0, w.z);
    for (let i = 0; i < SECTORS; i++) {
      if (!w.blocked[i]) continue;
      const a0 = (i / SECTORS) * Math.PI * 2;
      const a1 = ((i + 1) / SECTORS) * Math.PI * 2;
      const [, , scale] = project(a0, near, s.angle);
      ctx.fillStyle = `hsla(${w.hue}, 80%, ${45 + scale * 20}%, ${0.25 + scale * 0.7})`;
      ctx.beginPath();
      const start = a0 - s.angle + Math.PI / 2;
      const end = a1 - s.angle + Math.PI / 2;
      ctx.arc(W / 2, H / 2, RADIUS * scale, start, end);
      ctx.arc(W / 2, H / 2, RADIUS * scale * 0.55, end, start, true);
      ctx.closePath();
      ctx.fill();
    }
  }
  for (const r of s.rings) {
    if (r.taken || r.z < 0) continue;
    const [x, y, scale] = project(((r.sector + 0.5) / SECTORS) * Math.PI * 2, r.z, s.angle);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3 * scale + 1;
    ctx.beginPath();
    ctx.arc(x, y, 26 * scale + 3, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Ship, always at the bottom.
  const sx = W / 2;
  const sy = H / 2 + RADIUS - 18;
  ctx.fillStyle = s.boost > 0 ? '#38bdf8' : '#f8fafc';
  ctx.beginPath();
  ctx.moveTo(sx, sy - 22);
  ctx.lineTo(sx + 18, sy + 10);
  ctx.lineTo(sx, sy + 4);
  ctx.lineTo(sx - 18, sy + 10);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = s.boost > 0 ? '#38bdf8' : '#f97316';
  ctx.fillRect(sx - 4, sy + 6, 8, 6 + Math.random() * 6);
  text(ctx, `${Math.round(s.speed / 10)} u/s`, W - 12, 20, { size: 15, align: 'right', color: '#c7d2fe' });
  text(ctx, String(s.passed), W / 2, 28, { size: 26, color: '#e0e7ff' });
}

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create,
  update,
  render,
  hud: (s) => [
    { label: 'Walls', value: s.passed },
    { label: 'Speed', value: Math.round(s.speed / 10) },
    { label: 'Boosts', value: s.boosts },
    { label: 'Score', value: s.score },
  ],
  result: (s) => ({
    score: s.score,
    title: 'Hit the wall!',
    details: [
      { label: 'Walls passed', value: String(s.passed) },
      { label: 'Boost rings', value: String(s.boosts) },
      { label: 'Top speed', value: `${Math.round(s.speed / 10)} u/s` },
    ],
  }),
  onEnd: (s) => {
    void reportProgress('space-racing.walls-50', s.passed);
    void reportProgress('space-racing.walls-150', s.passed);
    void reportProgress('space-racing.boosts-10', s.boosts);
    void incrementProgress('space-racing.total', s.passed);
  },
  touch: { pad: 'horizontal' },
  startHint: '← → rotate around the tunnel (or hold either side of the screen). Fly through the gaps; blue rings boost.',
};
