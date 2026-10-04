import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { burst, circle, drawSparks, text, updateSparks } from '../_shared/arcade/draw';
import type { Spark } from '../_shared/arcade/draw';
import { actor, chase, cursor, damage, moveDir, separate, shoot, tickActor, touching, trackCursor, updateBullets } from '../_shared/shooter/kit';
import type { Actor, Bullet, Cursor } from '../_shared/shooter/kit';

/**
 * Survival Arena: no guns — your weapon is the dash. Dashing makes you
 * invulnerable for a moment and defeats every enemy you pass through.
 * Between dashes you are vulnerable, and the dash has a cooldown.
 * Slimes split when hit, bats flutter unpredictably, archers shoot arrows.
 */
export const W = 480;
export const H = 480;
export const ARENA_R = 220;
const CX = W / 2;
const CY = H / 2;
const DASH_TIME = 0.18;
const DASH_SPEED = 720;

type Kind = 'slime' | 'small' | 'bat' | 'archer';
export interface Foe extends Actor {
  kind: Kind;
  wobble: number;
}

export interface State extends BaseState {
  player: Actor;
  dash: number;
  dashCd: number;
  dashCooldown: number;
  dashDir: [number, number];
  foes: Foe[];
  arrows: Bullet[];
  hearts: { x: number; y: number; r: number; life: number }[];
  spawnIn: number;
  kills: number;
  combo: number;
  bestCombo: number;
  cursor: Cursor;
  sparks: Spark[];
}

const COOLDOWN: Record<DifficultySetting, number> = { easy: 0.8, normal: 1.0, hard: 1.25 };

export function create(difficulty: DifficultySetting): State {
  return {
    ...baseState(),
    player: actor(CX, CY, 11, 3),
    dash: 0,
    dashCd: 0,
    dashCooldown: COOLDOWN[difficulty],
    dashDir: [0, -1],
    foes: [],
    arrows: [],
    hearts: [],
    spawnIn: 1,
    kills: 0,
    combo: 0,
    bestCombo: 0,
    cursor: cursor(),
    sparks: [],
  };
}

function spawn(s: State, random: () => number) {
  const a = random() * Math.PI * 2;
  const x = CX + Math.cos(a) * (ARENA_R - 10);
  const y = CY + Math.sin(a) * (ARENA_R - 10);
  const r = random();
  const level = s.time / 30;
  const kind: Kind = level > 1 && r < 0.2 ? 'archer' : level > 0.5 && r < 0.45 ? 'bat' : 'slime';
  const f = actor(x, y, kind === 'slime' ? 15 : kind === 'bat' ? 9 : 11, 1) as Foe;
  f.kind = kind;
  f.wobble = random() * 10;
  f.cooldown = 1.5 + random();
  s.foes.push(f);
}

/** Starts a dash towards the pointer, or along the movement direction. */
export function startDash(s: State, input: Input): boolean {
  if (s.dashCd > 0 || s.dash > 0) return false;
  const p = s.player;
  let [dx, dy] = moveDir(input);
  if (input.pointer.active && (input.pointer.pressed || (!dx && !dy))) {
    const ax = input.pointer.x - p.x;
    const ay = input.pointer.y - p.y;
    const d = Math.hypot(ax, ay) || 1;
    [dx, dy] = [ax / d, ay / d];
  }
  if (!dx && !dy) [dx, dy] = s.dashDir;
  s.dashDir = [dx, dy];
  s.dash = DASH_TIME;
  s.dashCd = s.dashCooldown;
  s.combo = 0;
  s.events.push('whoosh');
  return true;
}

function keepInArena(a: { x: number; y: number; r: number }) {
  const dx = a.x - CX;
  const dy = a.y - CY;
  const d = Math.hypot(dx, dy);
  if (d > ARENA_R - a.r) {
    a.x = CX + (dx / d) * (ARENA_R - a.r);
    a.y = CY + (dy / d) * (ARENA_R - a.r);
  }
}

function defeat(s: State, f: Foe, random: () => number) {
  s.foes.splice(s.foes.indexOf(f), 1);
  s.kills += 1;
  s.combo += 1;
  s.bestCombo = Math.max(s.bestCombo, s.combo);
  s.score += 10 * s.combo;
  s.events.push('pop');
  burst(s.sparks, f.x, f.y, f.kind === 'bat' ? '#c084fc' : f.kind === 'archer' ? '#fb923c' : '#4ade80', 10, 150, random);
  if (f.kind === 'slime') {
    for (const side of [-1, 1]) {
      const small = actor(f.x + side * 10, f.y, 9, 1) as Foe;
      small.kind = 'small';
      small.wobble = 0;
      // Fresh halves are briefly harmless so a dash cannot trade into them.
      small.hurt = 0.4;
      s.foes.push(small);
    }
  }
  if (random() < 0.05) s.hearts.push({ x: f.x, y: f.y, r: 9, life: 8 });
}

export function update(s: State, dt: number, input: Input, random: () => number) {
  const p = s.player;
  trackCursor(s.cursor, input);
  tickActor(p, dt);
  s.dashCd = Math.max(0, s.dashCd - dt);
  if (input.pressed.has('action') || input.pointer.pressed) startDash(s, input);

  if (s.dash > 0) {
    s.dash -= dt;
    p.x += s.dashDir[0] * DASH_SPEED * dt;
    p.y += s.dashDir[1] * DASH_SPEED * dt;
  } else {
    const [dx, dy] = moveDir(input);
    p.x += dx * 150 * dt;
    p.y += dy * 150 * dt;
    if (dx || dy) s.dashDir = [dx, dy];
  }
  keepInArena(p);

  s.spawnIn -= dt;
  if (s.spawnIn <= 0) {
    spawn(s, random);
    s.spawnIn = Math.max(0.35, 1.6 - s.time * 0.015) * (0.6 + random() * 0.8);
  }

  for (const f of [...s.foes]) {
    tickActor(f, dt);
    if (f.kind === 'archer') {
      const d = Math.hypot(p.x - f.x, p.y - f.y);
      chase(f, p.x, p.y, d > 160 ? 40 : -30, dt);
      if (f.cooldown === 0) {
        shoot(s.arrows, f, Math.atan2(p.y - f.y, p.x - f.x), 220, { friendly: false, r: 3, life: 3, color: '#fb923c' });
        f.cooldown = 2 + random();
      }
    } else if (f.kind === 'bat') {
      f.wobble += dt * 6;
      chase(f, p.x + Math.cos(f.wobble) * 60, p.y + Math.sin(f.wobble * 1.3) * 60, 115, dt);
    } else chase(f, p.x, p.y, f.kind === 'small' ? 70 : 45, dt);
    keepInArena(f);
    if (!touching(f, p)) continue;
    if (s.dash > 0) {
      if (f.hurt === 0) defeat(s, f, random);
    }
    else if (f.hurt === 0 && damage(p, 1, 1.2)) {
      s.over = true;
      s.events.push('gameOver');
      burst(s.sparks, p.x, p.y, '#fde047', 24, 200, random);
      return;
    } else if (p.hurt > 1.1) s.events.push('hit');
  }
  separate(s.foes);

  updateBullets(s.arrows, dt, W, H);
  for (let i = s.arrows.length - 1; i >= 0; i--) {
    const a = s.arrows[i];
    if (Math.hypot(a.x - CX, a.y - CY) > ARENA_R) {
      s.arrows.splice(i, 1);
      continue;
    }
    if (touching(a, p)) {
      s.arrows.splice(i, 1);
      if (s.dash > 0) continue;
      if (damage(p, 1, 1.2)) {
        s.over = true;
        s.events.push('gameOver');
        return;
      }
      s.events.push('hit');
    }
  }
  for (let i = s.hearts.length - 1; i >= 0; i--) {
    const h = s.hearts[i];
    h.life -= dt;
    if (touching(h, p)) {
      p.hp = Math.min(p.maxHp, p.hp + 1);
      s.events.push('powerup');
      s.hearts.splice(i, 1);
    } else if (h.life <= 0) s.hearts.splice(i, 1);
  }
  updateSparks(s.sparks, dt);
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  ctx.fillStyle = '#1c1917';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#a8a29e';
  ctx.beginPath();
  ctx.arc(CX, CY, ARENA_R + 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#d6c4a0';
  ctx.beginPath();
  ctx.arc(CX, CY, ARENA_R, 0, Math.PI * 2);
  ctx.fill();
  for (const h of s.hearts) text(ctx, '❤', h.x, h.y, { size: 18, color: '#dc2626' });
  for (const f of s.foes) {
    const color = f.kind === 'bat' ? '#7e22ce' : f.kind === 'archer' ? '#c2410c' : '#16a34a';
    if (f.kind === 'bat') {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(f.x, f.y, f.r * 1.8, f.r * (0.6 + Math.abs(Math.sin(f.wobble * 3)) * 0.4), 0, 0, Math.PI * 2);
      ctx.fill();
    } else circle(ctx, f.x, f.y, f.r, f.hurt > 0 ? '#bbf7d0' : color);
    circle(ctx, f.x - f.r * 0.3, f.y - f.r * 0.2, 2, '#fff');
    circle(ctx, f.x + f.r * 0.3, f.y - f.r * 0.2, 2, '#fff');
  }
  for (const a of s.arrows) {
    ctx.strokeStyle = a.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(a.x - a.vx * 0.04, a.y - a.vy * 0.04);
    ctx.stroke();
  }
  const p = s.player;
  if (!s.over) {
    if (s.dash > 0) {
      ctx.globalAlpha = 0.35;
      circle(ctx, p.x - s.dashDir[0] * 20, p.y - s.dashDir[1] * 20, p.r, '#facc15');
      ctx.globalAlpha = 1;
    }
    circle(ctx, p.x, p.y, p.r, s.dash > 0 ? '#facc15' : p.hurt > 0 && Math.floor(s.time * 20) % 2 ? '#fecaca' : '#2563eb');
  }
  // Dash cooldown ring.
  ctx.strokeStyle = s.dashCd === 0 ? '#22c55e' : '#78716c';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.r + 5, -Math.PI / 2, -Math.PI / 2 + (1 - s.dashCd / s.dashCooldown) * Math.PI * 2);
  ctx.stroke();
  drawSparks(ctx, s.sparks);
  text(ctx, '❤'.repeat(Math.max(0, p.hp)), 14, 20, { size: 18, color: '#ef4444', align: 'left' });
  text(ctx, `${Math.floor(s.time)}s`, W - 14, 20, { size: 18, align: 'right' });
  if (s.combo >= 3) text(ctx, `${s.combo} hit combo!`, W / 2, 24, { size: 18, color: '#fde047' });
}

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create,
  update,
  render,
  hud: (s) => [
    { label: 'Score', value: s.score },
    { label: 'Defeated', value: s.kills },
    { label: 'Hearts', value: s.player.hp },
    { label: 'Time', value: `${Math.floor(s.time)}s` },
  ],
  result: (s) => ({
    score: s.score,
    title: `Fell after ${Math.floor(s.time)} seconds`,
    details: [
      { label: 'Defeated', value: String(s.kills) },
      { label: 'Best dash combo', value: String(s.bestCombo) },
    ],
  }),
  onEnd: (s) => {
    void reportProgress('survival-arena.survive-60', Math.floor(s.time));
    void reportProgress('survival-arena.combo-5', s.bestCombo);
    void reportProgress('survival-arena.kills-100', s.kills);
    void incrementProgress('survival-arena.total', s.kills);
  },
  touch: { pad: 'dpad', buttons: [{ action: 'action', label: 'Dash' }] },
  startHint: 'Move with WASD / arrows. Dash with Space or a click (towards the pointer) — dashing through enemies defeats them.',
};
