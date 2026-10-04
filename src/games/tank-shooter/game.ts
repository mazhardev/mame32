import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState, circleRectHit } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { burst, circle, drawSparks, fillRound, text, updateSparks } from '../_shared/arcade/draw';
import type { Spark } from '../_shared/arcade/draw';
import { cursor, crosshair, damage, trackCursor, touching } from '../_shared/shooter/kit';
import type { Actor, Cursor } from '../_shared/shooter/kit';

/**
 * Tank Shooter: drive a tank with real tank controls — turn the hull, then
 * drive forwards or backwards — while the turret aims on its own at the
 * pointer. Brick walls crumble after two shells; steel walls never do. Enemy
 * tanks patrol and fire when they can see you. Clear the map to advance.
 */
export const TILE = 40;
export const COLS = 14;
export const ROWS = 10;
export const W = COLS * TILE;
export const H = ROWS * TILE;

export type Tile = 0 | 1 | 2 | 3; // empty, brick, damaged brick, steel

export interface Tank extends Actor {
  turret: number;
  /** AI: seconds until choosing a new heading. */
  think: number;
  player: boolean;
}

export interface Shell {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  friendly: boolean;
  life: number;
}

export interface State extends BaseState {
  map: Tile[];
  player: Tank;
  enemies: Tank[];
  shells: Shell[];
  level: number;
  kills: number;
  aimSkill: number;
  between: number;
  cursor: Cursor;
  sparks: Spark[];
}

const AIM: Record<DifficultySetting, number> = { easy: 0.3, normal: 0.15, hard: 0.06 };

function tank(x: number, y: number, player: boolean, hp: number): Tank {
  return { x, y, vx: 0, vy: 0, r: 13, hp, maxHp: hp, angle: player ? -Math.PI / 2 : Math.PI / 2, cooldown: 1, hurt: 0, turret: player ? -Math.PI / 2 : Math.PI / 2, think: 0, player };
}

/** A symmetric-ish random map with clear spawn zones top and bottom. */
export function makeMap(level: number, random: () => number): Tile[] {
  const map: Tile[] = Array(COLS * ROWS).fill(0);
  for (let r = 2; r < ROWS - 2; r++) {
    for (let c = 0; c < COLS / 2; c++) {
      const v = random();
      const t: Tile = v < 0.22 ? 1 : v < 0.22 + Math.min(0.12, level * 0.02) ? 3 : 0;
      map[r * COLS + c] = t;
      map[r * COLS + (COLS - 1 - c)] = t;
    }
  }
  return map;
}

const tileAt = (s: State, x: number, y: number): Tile => {
  const c = Math.floor(x / TILE);
  const r = Math.floor(y / TILE);
  if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return 3;
  return s.map[r * COLS + c];
};

function hitsWall(s: State, x: number, y: number, r: number): boolean {
  if (x < r || y < r || x > W - r || y > H - r) return true;
  for (let i = 0; i < s.map.length; i++) {
    if (!s.map[i]) continue;
    const rect = { x: (i % COLS) * TILE, y: Math.floor(i / COLS) * TILE, w: TILE, h: TILE };
    if (circleRectHit(x, y, r - 1, rect)) return true;
  }
  return false;
}

export function lineOfSight(s: State, ax: number, ay: number, bx: number, by: number): boolean {
  const steps = Math.ceil(Math.hypot(bx - ax, by - ay) / 10);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (tileAt(s, ax + (bx - ax) * t, ay + (by - ay) * t) !== 0) return false;
  }
  return true;
}

function startLevel(s: State, random: () => number) {
  s.map = makeMap(s.level, random);
  s.player.x = W / 2;
  s.player.y = H - TILE / 2 - 4;
  s.player.angle = s.player.turret = -Math.PI / 2;
  s.shells = [];
  // Up to six tanks on distinct spawn columns; later sectors toughen them up instead.
  const count = Math.min(6, 2 + s.level);
  const tough = Math.max(0, s.level - 4);
  s.enemies = Array.from({ length: count }, (_, i) =>
    tank(TILE * (1 + ((i * 5) % (COLS - 2))) + TILE / 2, TILE / 2 + (i % 2) * TILE, false, 2 + (i < tough ? 1 : 0) + (s.level >= 8 ? 1 : 0)),
  );
}

export function create(difficulty: DifficultySetting, random: () => number = Math.random): State {
  const s: State = {
    ...baseState(),
    map: [],
    player: tank(W / 2, H - 24, true, 5),
    enemies: [],
    shells: [],
    level: 1,
    kills: 0,
    aimSkill: AIM[difficulty],
    between: 0,
    cursor: cursor(),
    sparks: [],
  };
  startLevel(s, random);
  return s;
}

function fire(s: State, t: Tank) {
  const speed = 330;
  s.shells.push({ x: t.x + Math.cos(t.turret) * 18, y: t.y + Math.sin(t.turret) * 18, vx: Math.cos(t.turret) * speed, vy: Math.sin(t.turret) * speed, r: 4, friendly: t.player, life: 2.5 });
  t.cooldown = t.player ? 0.55 : 1.6;
  s.events.push('shoot');
}

/** Drives a tank: positive `drive` forwards, `turn` rotates the hull. */
export function drive(s: State, t: Tank, driveDir: number, turn: number, dt: number) {
  t.angle += turn * 2.6 * dt;
  const speed = t.player ? 110 : 70;
  const nx = t.x + Math.cos(t.angle) * speed * driveDir * dt;
  const ny = t.y + Math.sin(t.angle) * speed * driveDir * dt;
  const others = [s.player, ...s.enemies].filter((o) => o !== t);
  const clear = (x: number, y: number) => !hitsWall(s, x, y, t.r) && !others.some((o) => Math.hypot(o.x - x, o.y - y) < o.r + t.r);
  if (clear(nx, ny)) {
    t.x = nx;
    t.y = ny;
    return true;
  }
  return false;
}

export function update(s: State, dt: number, input: Input, random: () => number) {
  trackCursor(s.cursor, input);
  if (s.between > 0) {
    s.between -= dt;
    if (s.between <= 0) startLevel(s, random);
    return;
  }
  const p = s.player;
  p.cooldown = Math.max(0, p.cooldown - dt);
  p.hurt = Math.max(0, p.hurt - dt);
  const forward = (input.held.has('up') ? 1 : 0) - (input.held.has('down') ? 1 : 0);
  const turn = (input.held.has('right') ? 1 : 0) - (input.held.has('left') ? 1 : 0);
  drive(s, p, forward, turn, dt);
  p.turret = input.pointer.active ? Math.atan2(input.pointer.y - p.y, input.pointer.x - p.x) : p.angle;
  if ((input.held.has('action') || input.pointer.down) && p.cooldown === 0) fire(s, p);

  for (const e of s.enemies) {
    e.cooldown = Math.max(0, e.cooldown - dt);
    e.hurt = Math.max(0, e.hurt - dt);
    e.think -= dt;
    if (e.think <= 0) {
      // Turn towards the player half the time, otherwise pick a random heading.
      e.angle = random() < 0.5 ? Math.atan2(p.y - e.y, p.x - e.x) : Math.round(random() * 4) * (Math.PI / 2);
      e.think = 1 + random() * 2;
    }
    if (!drive(s, e, 1, 0, dt)) e.think = 0;
    const sees = lineOfSight(s, e.x, e.y, p.x, p.y);
    const want = Math.atan2(p.y - e.y, p.x - e.x);
    e.turret += Math.atan2(Math.sin(want - e.turret), Math.cos(want - e.turret)) * Math.min(1, dt * 3);
    if (sees && e.cooldown === 0 && Math.abs(Math.atan2(Math.sin(want - e.turret), Math.cos(want - e.turret))) < 0.2) {
      e.turret += (random() - 0.5) * 2 * s.aimSkill;
      fire(s, e);
    }
  }

  for (let i = s.shells.length - 1; i >= 0; i--) {
    const sh = s.shells[i];
    sh.x += sh.vx * dt;
    sh.y += sh.vy * dt;
    sh.life -= dt;
    const c = Math.floor(sh.x / TILE);
    const r = Math.floor(sh.y / TILE);
    const tile = tileAt(s, sh.x, sh.y);
    if (tile !== 0 || sh.life <= 0) {
      if (tile === 1 || tile === 2) s.map[r * COLS + c] = tile === 1 ? 2 : 0;
      burst(s.sparks, sh.x, sh.y, tile === 3 ? '#cbd5e1' : '#f97316', 6, 90, random);
      s.shells.splice(i, 1);
      continue;
    }
    const targets: Tank[] = sh.friendly ? s.enemies : [p];
    const hit = targets.find((t) => touching(t, sh));
    if (!hit) continue;
    s.shells.splice(i, 1);
    burst(s.sparks, sh.x, sh.y, '#fde047', 10, 140, random);
    if (damage(hit, 1, hit.player ? 0.5 : 0)) {
      if (hit.player) {
        s.over = true;
        s.events.push('gameOver');
        return;
      }
      s.enemies.splice(s.enemies.indexOf(hit), 1);
      s.kills += 1;
      s.score += 100;
      s.events.push('explosion');
      burst(s.sparks, hit.x, hit.y, '#ef4444', 24, 200, random);
    } else s.events.push('hit');
  }
  if (s.enemies.length === 0) {
    s.score += s.level * 200 + p.hp * 50;
    s.level += 1;
    s.between = 2;
    p.hp = Math.min(p.maxHp, p.hp + 1);
    s.events.push('levelComplete');
  }
  updateSparks(s.sparks, dt);
}

function drawTank(ctx: CanvasRenderingContext2D, t: Tank, color: string) {
  ctx.save();
  ctx.translate(t.x, t.y);
  ctx.rotate(t.angle);
  fillRound(ctx, -15, -12, 30, 24, 4, t.hurt > 0 ? '#fff' : color);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(-15, -14, 30, 4);
  ctx.fillRect(-15, 10, 30, 4);
  ctx.restore();
  ctx.save();
  ctx.translate(t.x, t.y);
  ctx.rotate(t.turret);
  ctx.fillStyle = '#1f2937';
  ctx.fillRect(0, -3, 20, 6);
  ctx.restore();
  circle(ctx, t.x, t.y, 7, '#1f2937');
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  ctx.fillStyle = '#4d7c0f';
  ctx.fillRect(0, 0, W, H);
  s.map.forEach((t, i) => {
    if (!t) return;
    const x = (i % COLS) * TILE;
    const y = Math.floor(i / COLS) * TILE;
    if (t === 3) fillRound(ctx, x + 1, y + 1, TILE - 2, TILE - 2, 3, '#94a3b8');
    else {
      ctx.fillStyle = t === 1 ? '#b45309' : '#78350f';
      ctx.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.strokeRect(x + 1, y + TILE / 2, TILE - 2, 0.5);
      ctx.strokeRect(x + TILE / 2, y + 1, 0.5, TILE / 2);
    }
  });
  for (const e of s.enemies) drawTank(ctx, e, '#b91c1c');
  if (!s.over) drawTank(ctx, s.player, '#1d4ed8');
  for (const sh of s.shells) circle(ctx, sh.x, sh.y, sh.r, sh.friendly ? '#fde047' : '#fca5a5');
  drawSparks(ctx, s.sparks);
  crosshair(ctx, s.cursor);
  text(ctx, '❤'.repeat(Math.max(0, s.player.hp)), 8, 14, { size: 14, color: '#fecaca', align: 'left' });
  if (s.between > 0) text(ctx, `Sector ${s.level - 1} cleared!`, W / 2, H / 2, { size: 28, color: '#fde047' });
}

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create,
  update,
  render,
  hud: (s) => [
    { label: 'Sector', value: s.level },
    { label: 'Enemies', value: s.enemies.length },
    { label: 'Armour', value: s.player.hp },
    { label: 'Score', value: s.score },
  ],
  result: (s) => ({ score: s.score, title: `Knocked out in sector ${s.level}`, details: [{ label: 'Tanks destroyed', value: String(s.kills) }] }),
  onEnd: (s) => {
    void reportProgress('tank-shooter.level-3', s.level);
    void reportProgress('tank-shooter.level-6', s.level);
    void incrementProgress('tank-shooter.total', s.kills);
  },
  touch: { pad: 'dpad', buttons: [{ action: 'action', label: 'Fire' }] },
  startHint: '↑/↓ drive, ←/→ turn the hull. Aim the turret with the mouse; click or Space fires.',
};
