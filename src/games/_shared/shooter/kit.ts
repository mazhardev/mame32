import { clamp } from '../arcade/kit';
import type { Input } from '../arcade/kit';

/**
 * Shared pieces for the top-down action games: a player that moves with
 * WASD / arrows (or a touch pad) and aims at the pointer, bullets, enemies
 * that steer towards a target, and simple circle collisions.
 */
export interface Actor {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  hp: number;
  maxHp: number;
  /** Facing / aim angle in radians. */
  angle: number;
  /** Seconds until this actor may fire again. */
  cooldown: number;
  /** Seconds of flashing after being hit. */
  hurt: number;
}

export interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  life: number;
  damage: number;
  friendly: boolean;
  color: string;
}

export function actor(x: number, y: number, r: number, hp: number): Actor {
  return { x, y, vx: 0, vy: 0, r, hp, maxHp: hp, angle: -Math.PI / 2, cooldown: 0, hurt: 0 };
}

/** Normalised movement direction from the held direction actions. */
export function moveDir(input: Input): [number, number] {
  let dx = 0;
  let dy = 0;
  if (input.held.has('left')) dx -= 1;
  if (input.held.has('right')) dx += 1;
  if (input.held.has('up')) dy -= 1;
  if (input.held.has('down')) dy += 1;
  const len = Math.hypot(dx, dy);
  return len ? [dx / len, dy / len] : [0, 0];
}

/** Moves an actor with simple acceleration and friction, inside a box. */
export function steerPlayer(p: Actor, input: Input, speed: number, dt: number, w: number, h: number) {
  const [dx, dy] = moveDir(input);
  const accel = 10;
  p.vx += (dx * speed - p.vx) * Math.min(1, accel * dt);
  p.vy += (dy * speed - p.vy) * Math.min(1, accel * dt);
  p.x = clamp(p.x + p.vx * dt, p.r, w - p.r);
  p.y = clamp(p.y + p.vy * dt, p.r, h - p.r);
}

/**
 * Aim: towards the pointer once it has been used; otherwise towards the
 * direction of travel, so keyboard-only players can still aim.
 */
export function aim(p: Actor, input: Input) {
  if (input.pointer.active) p.angle = Math.atan2(input.pointer.y - p.y, input.pointer.x - p.x);
  else if (Math.hypot(p.vx, p.vy) > 20) p.angle = Math.atan2(p.vy, p.vx);
}

/** Fire is held with Space or a mouse / finger press. */
export const wantsFire = (input: Input) => input.held.has('action') || input.pointer.down;

export function shoot(
  list: Bullet[],
  from: { x: number; y: number; r: number },
  angle: number,
  speed: number,
  opts: Partial<Pick<Bullet, 'r' | 'life' | 'damage' | 'friendly' | 'color'>> = {},
) {
  list.push({
    x: from.x + Math.cos(angle) * (from.r + 4),
    y: from.y + Math.sin(angle) * (from.r + 4),
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    r: opts.r ?? 3,
    life: opts.life ?? 1.5,
    damage: opts.damage ?? 1,
    friendly: opts.friendly ?? true,
    color: opts.color ?? '#fde047',
  });
}

/** Advances bullets and drops expired or off-screen ones. */
export function updateBullets(list: Bullet[], dt: number, w: number, h: number) {
  for (let i = list.length - 1; i >= 0; i--) {
    const b = list[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.life <= 0 || b.x < -20 || b.x > w + 20 || b.y < -20 || b.y > h + 20) list.splice(i, 1);
  }
}

/** Moves an enemy towards a point at a given speed. */
export function chase(e: Actor, tx: number, ty: number, speed: number, dt: number) {
  const dx = tx - e.x;
  const dy = ty - e.y;
  const d = Math.hypot(dx, dy) || 1;
  e.vx = (dx / d) * speed;
  e.vy = (dy / d) * speed;
  e.x += e.vx * dt;
  e.y += e.vy * dt;
  e.angle = Math.atan2(dy, dx);
}

/** Pushes overlapping actors apart so crowds do not stack into one blob. */
export function separate(list: Actor[]) {
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i];
      const b = list[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      const min = a.r + b.r;
      if (d > 0 && d < min) {
        const push = (min - d) / 2;
        a.x -= (dx / d) * push;
        a.y -= (dy / d) * push;
        b.x += (dx / d) * push;
        b.y += (dy / d) * push;
      }
    }
  }
}

export const touching = (a: { x: number; y: number; r: number }, b: { x: number; y: number; r: number }) =>
  (a.x - b.x) ** 2 + (a.y - b.y) ** 2 <= (a.r + b.r) ** 2;

/** A point on the edge of the arena, for spawning enemies off-screen. */
export function edgePoint(w: number, h: number, random: () => number, margin = 20): [number, number] {
  const side = Math.floor(random() * 4);
  const t = random();
  if (side === 0) return [t * w, -margin];
  if (side === 1) return [w + margin, t * h];
  if (side === 2) return [t * w, h + margin];
  return [-margin, t * h];
}

/**
 * Damages an actor; returns true if it died. A short invulnerability window
 * stops one contact from draining all health at once.
 */
export function damage(a: Actor, amount: number, invulnerable = 0): boolean {
  if (a.hurt > 0 && invulnerable > 0) return false;
  a.hp -= amount;
  a.hurt = Math.max(a.hurt, invulnerable || 0.1);
  return a.hp <= 0;
}

export function tickActor(a: Actor, dt: number) {
  a.cooldown = Math.max(0, a.cooldown - dt);
  a.hurt = Math.max(0, a.hurt - dt);
}

export function hpBar(ctx: CanvasRenderingContext2D, a: Actor, color = '#22c55e') {
  if (a.hp >= a.maxHp) return;
  const w = a.r * 2;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(a.x - a.r, a.y - a.r - 8, w, 4);
  ctx.fillStyle = color;
  ctx.fillRect(a.x - a.r, a.y - a.r - 8, (w * Math.max(0, a.hp)) / a.maxHp, 4);
}

/** Where the pointer is, kept in game state so render() can draw a crosshair. */
export interface Cursor {
  x: number;
  y: number;
  active: boolean;
}

export const cursor = (): Cursor => ({ x: 0, y: 0, active: false });

export function trackCursor(c: Cursor, input: Input) {
  c.x = input.pointer.x;
  c.y = input.pointer.y;
  c.active = input.pointer.active;
}

export function crosshair(ctx: CanvasRenderingContext2D, c: Cursor) {
  if (!c.active) return;
  const { x, y } = c;
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, 9, 0, Math.PI * 2);
  ctx.moveTo(x - 14, y);
  ctx.lineTo(x - 5, y);
  ctx.moveTo(x + 5, y);
  ctx.lineTo(x + 14, y);
  ctx.moveTo(x, y - 14);
  ctx.lineTo(x, y - 5);
  ctx.moveTo(x, y + 5);
  ctx.lineTo(x, y + 14);
  ctx.stroke();
}
