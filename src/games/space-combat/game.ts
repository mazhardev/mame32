import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { burst, drawSparks, starfield, text, updateSparks } from '../_shared/arcade/draw';
import type { Spark } from '../_shared/arcade/draw';

/**
 * Space Combat: a Newtonian dogfight. Ships keep their momentum, so turning
 * and thrusting are separate from moving. Enemy fighters chase, lead their
 * shots and fire when lined up. Your shield regenerates slowly; your hull
 * does not.
 */
export const W = 560;
export const H = 420;
const TURN = 3.6;
const THRUST = 260;
const MAX_V = 260;

export interface Ship {
  x: number;
  y: number;
  vx: number;
  vy: number;
  a: number;
  r: number;
  shield: number;
  hull: number;
  cd: number;
  thrusting: boolean;
  hurt: number;
}

export interface Laser {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  friendly: boolean;
}

export interface State extends BaseState {
  me: Ship;
  foes: Ship[];
  lasers: Laser[];
  wave: number;
  kills: number;
  between: number;
  aimSkill: number;
  sparks: Spark[];
}

const AIM: Record<DifficultySetting, number> = { easy: 0.35, normal: 0.18, hard: 0.08 };

const ship = (x: number, y: number, a: number, hull: number, shield: number): Ship => ({ x, y, vx: 0, vy: 0, a, r: 11, shield, hull, cd: 0, thrusting: false, hurt: 0 });

function spawnWave(s: State, random: () => number) {
  const n = Math.min(6, 1 + s.wave);
  s.foes = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + random();
    return ship(W / 2 + Math.cos(a) * 240, H / 2 + Math.sin(a) * 180, a + Math.PI, 1 + Math.floor(s.wave / 3), 1);
  });
}

export function create(difficulty: DifficultySetting, random: () => number = Math.random): State {
  const s: State = { ...baseState(), me: ship(W / 2, H / 2, -Math.PI / 2, 4, 3), foes: [], lasers: [], wave: 1, kills: 0, between: 0, aimSkill: AIM[difficulty], sparks: [] };
  spawnWave(s, random);
  return s;
}

const wrap = (v: number, max: number) => ((v % max) + max) % max;
const angleDiff = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

/** Shortest offset between two points on the wrapping arena. */
export function delta(ax: number, ay: number, bx: number, by: number): [number, number] {
  let dx = bx - ax;
  let dy = by - ay;
  if (dx > W / 2) dx -= W;
  if (dx < -W / 2) dx += W;
  if (dy > H / 2) dy -= H;
  if (dy < -H / 2) dy += H;
  return [dx, dy];
}

export function physics(sh: Ship, turn: number, thrust: boolean, dt: number) {
  sh.a += turn * TURN * dt;
  sh.thrusting = thrust;
  if (thrust) {
    sh.vx += Math.cos(sh.a) * THRUST * dt;
    sh.vy += Math.sin(sh.a) * THRUST * dt;
  }
  const v = Math.hypot(sh.vx, sh.vy);
  if (v > MAX_V) {
    sh.vx *= MAX_V / v;
    sh.vy *= MAX_V / v;
  }
  sh.vx *= 1 - 0.25 * dt;
  sh.vy *= 1 - 0.25 * dt;
  sh.x = wrap(sh.x + sh.vx * dt, W);
  sh.y = wrap(sh.y + sh.vy * dt, H);
  sh.cd = Math.max(0, sh.cd - dt);
  sh.hurt = Math.max(0, sh.hurt - dt);
}

function fire(s: State, sh: Ship, friendly: boolean, spread = 0) {
  const a = sh.a + spread;
  s.lasers.push({ x: sh.x + Math.cos(a) * 14, y: sh.y + Math.sin(a) * 14, vx: sh.vx + Math.cos(a) * 420, vy: sh.vy + Math.sin(a) * 420, life: 1.1, friendly });
  sh.cd = friendly ? 0.18 : 0.9;
  s.events.push('shoot');
}

/** Applies a hit: shield first, then hull. Returns true if destroyed. */
export function hit(sh: Ship): boolean {
  sh.hurt = 0.2;
  if (sh.shield >= 1) {
    sh.shield -= 1;
    return false;
  }
  sh.hull -= 1;
  return sh.hull <= 0;
}

export function update(s: State, dt: number, input: Input, random: () => number) {
  if (s.between > 0) {
    s.between -= dt;
    if (s.between <= 0) spawnWave(s, random);
  }
  const me = s.me;
  let turn = (input.held.has('right') ? 1 : 0) - (input.held.has('left') ? 1 : 0);
  let thrust = input.held.has('up');
  let fireNow = input.held.has('action');
  if (input.pointer.down && !turn && !thrust) {
    // Pointer flying: turn towards the pointer and thrust; fire when an enemy is ahead.
    const [dx, dy] = delta(me.x, me.y, input.pointer.x, input.pointer.y);
    const d = angleDiff(Math.atan2(dy, dx), me.a);
    turn = Math.max(-1, Math.min(1, d * 3));
    thrust = Math.hypot(dx, dy) > 40;
    fireNow =
      fireNow ||
      s.foes.some((f) => {
        const [fx, fy] = delta(me.x, me.y, f.x, f.y);
        return Math.abs(angleDiff(Math.atan2(fy, fx), me.a)) < 0.25 && Math.hypot(fx, fy) < 320;
      });
  }
  physics(me, turn, thrust, dt);
  if (fireNow && me.cd === 0) fire(s, me, true);
  me.shield = Math.min(3, me.shield + dt * 0.25);

  for (const f of s.foes) {
    // Lead the target: aim where the player will be when the laser arrives.
    const [dx, dy] = delta(f.x, f.y, me.x, me.y);
    const dist = Math.hypot(dx, dy);
    const t = dist / 420;
    const lead = Math.atan2(dy + me.vy * t, dx + me.vx * t);
    const diff = angleDiff(lead, f.a);
    physics(f, Math.max(-0.8, Math.min(0.8, diff * 2)), dist > 120 && Math.abs(diff) < 1, dt);
    if (Math.abs(diff) < 0.15 && dist < 300 && f.cd === 0) fire(s, f, false, (random() - 0.5) * 2 * s.aimSkill);
  }

  for (const l of s.lasers) {
    l.x = wrap(l.x + l.vx * dt, W);
    l.y = wrap(l.y + l.vy * dt, H);
    l.life -= dt;
  }
  for (let i = s.lasers.length - 1; i >= 0; i--) {
    const l = s.lasers[i];
    if (l.life <= 0) {
      s.lasers.splice(i, 1);
      continue;
    }
    if (l.friendly) {
      const f = s.foes.find((ff) => Math.hypot(...delta(ff.x, ff.y, l.x, l.y)) < ff.r + 2);
      if (!f) continue;
      s.lasers.splice(i, 1);
      s.events.push('hit');
      if (hit(f)) {
        s.foes.splice(s.foes.indexOf(f), 1);
        s.kills += 1;
        s.score += 100;
        s.events.push('explosion');
        burst(s.sparks, f.x, f.y, '#fb923c', 24, 200, random);
      }
    } else if (Math.hypot(...delta(me.x, me.y, l.x, l.y)) < me.r + 2) {
      s.lasers.splice(i, 1);
      s.events.push('hit');
      if (hit(me)) {
        s.over = true;
        s.events.push('gameOver');
        burst(s.sparks, me.x, me.y, '#38bdf8', 30, 220, random);
        return;
      }
    }
  }
  if (!s.foes.length && s.between <= 0) {
    s.score += s.wave * 150;
    s.wave += 1;
    s.between = 2;
    me.hull = Math.min(4, me.hull + 1);
    s.events.push('levelComplete');
  }
  updateSparks(s.sparks, dt);
}

function drawShip(ctx: CanvasRenderingContext2D, sh: Ship, color: string, time: number) {
  ctx.save();
  ctx.translate(sh.x, sh.y);
  ctx.rotate(sh.a);
  if (sh.thrusting) {
    ctx.fillStyle = Math.floor(time * 30) % 2 ? '#fbbf24' : '#f97316';
    ctx.beginPath();
    ctx.moveTo(-9, -4);
    ctx.lineTo(-18, 0);
    ctx.lineTo(-9, 4);
    ctx.fill();
  }
  ctx.fillStyle = sh.hurt > 0 ? '#fff' : color;
  ctx.beginPath();
  ctx.moveTo(14, 0);
  ctx.lineTo(-9, -9);
  ctx.lineTo(-5, 0);
  ctx.lineTo(-9, 9);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  if (sh.shield >= 1) {
    ctx.strokeStyle = `rgba(56,189,248,${0.2 + Math.min(3, sh.shield) * 0.15})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sh.x, sh.y, sh.r + 6, 0, Math.PI * 2);
    ctx.stroke();
  }
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  ctx.fillStyle = '#020617';
  ctx.fillRect(0, 0, W, H);
  starfield(ctx, W, H, 0, 90);
  for (const l of s.lasers) {
    ctx.strokeStyle = l.friendly ? '#67e8f9' : '#f87171';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(l.x, l.y);
    ctx.lineTo(l.x - l.vx * 0.02, l.y - l.vy * 0.02);
    ctx.stroke();
  }
  for (const f of s.foes) drawShip(ctx, f, '#f97316', s.time);
  if (!s.over) drawShip(ctx, s.me, '#22d3ee', s.time);
  drawSparks(ctx, s.sparks);
  text(ctx, `Hull ${'▮'.repeat(Math.max(0, s.me.hull))}  Shield ${Math.floor(s.me.shield)}`, 10, 16, { size: 13, align: 'left', color: '#bae6fd' });
  if (s.between > 0) text(ctx, `Wave ${s.wave - 1} cleared`, W / 2, H / 2, { size: 24, color: '#fde047' });
}

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create,
  update,
  render,
  hud: (s) => [
    { label: 'Wave', value: s.wave },
    { label: 'Kills', value: s.kills },
    { label: 'Hull', value: s.me.hull },
    { label: 'Score', value: s.score },
  ],
  result: (s) => ({ score: s.score, title: `Shot down in wave ${s.wave}`, details: [{ label: 'Fighters destroyed', value: String(s.kills) }] }),
  onEnd: (s) => {
    void reportProgress('space-combat.ace', s.kills);
    void reportProgress('space-combat.wave-5', s.wave);
    void incrementProgress('space-combat.total', s.kills);
  },
  touch: { pad: 'dpad', buttons: [{ action: 'action', label: 'Fire' }] },
  startHint: '← → turn, ↑ thrust, Space fires. Or hold the mouse to fly towards it (auto-fire on targets ahead).',
};
