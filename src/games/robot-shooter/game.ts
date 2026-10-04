import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState, circleRectHit, clamp } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { burst, circle, drawSparks, fillRound, text, updateSparks } from '../_shared/arcade/draw';
import type { Spark } from '../_shared/arcade/draw';
import { actor, aim, chase, crosshair, cursor, damage, edgePoint, hpBar, separate, shoot, steerPlayer, tickActor, touching, trackCursor, updateBullets, wantsFire } from '../_shared/shooter/kit';
import type { Actor, Bullet, Cursor } from '../_shared/shooter/kit';

/**
 * Robot Shooter: robots that shoot back. Duck behind cover blocks (which stop
 * every bullet), let your shield recharge, and pick the robots off. Drones
 * fire single shots, gunners keep their distance and fire bursts, chargers
 * rush you. Shield absorbs hits first and recharges after a few quiet seconds.
 */
export const W = 560;
export const H = 400;

type Kind = 'drone' | 'gunner' | 'charger';
export interface Robot extends Actor {
  kind: Kind;
  burst: number;
}

export interface Block {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface State extends BaseState {
  player: Actor;
  shield: number;
  maxShield: number;
  calm: number;
  robots: Robot[];
  bullets: Bullet[];
  blocks: Block[];
  wave: number;
  toSpawn: number;
  spawnIn: number;
  breather: number;
  kills: number;
  aimMul: number;
  cursor: Cursor;
  sparks: Spark[];
}

const BLOCKS: Block[] = [
  { x: 110, y: 90, w: 60, h: 24 },
  { x: 390, y: 90, w: 60, h: 24 },
  { x: 250, y: 180, w: 60, h: 40 },
  { x: 110, y: 290, w: 60, h: 24 },
  { x: 390, y: 290, w: 60, h: 24 },
];

const ACCURACY: Record<DifficultySetting, number> = { easy: 0.25, normal: 0.12, hard: 0.05 };

export function create(difficulty: DifficultySetting): State {
  return {
    ...baseState(),
    player: actor(W / 2, H - 50, 11, 4),
    shield: 3,
    maxShield: 3,
    calm: 0,
    robots: [],
    bullets: [],
    blocks: BLOCKS.map((b) => ({ ...b })),
    wave: 1,
    toSpawn: 4,
    spawnIn: 0.8,
    breather: 0,
    kills: 0,
    aimMul: ACCURACY[difficulty],
    cursor: cursor(),
    sparks: [],
  };
}

const blocked = (s: State, x: number, y: number, r: number) => s.blocks.some((b) => circleRectHit(x, y, r, b));

function spawnRobot(s: State, random: () => number) {
  const [x, y] = edgePoint(W, H, random, 10);
  const r = random();
  const kind: Kind = s.wave >= 3 && r < 0.3 ? 'charger' : s.wave >= 2 && r < 0.6 ? 'gunner' : 'drone';
  const hp = kind === 'gunner' ? 4 : kind === 'charger' ? 3 : 2;
  const bot = actor(clamp(x, 20, W - 20), clamp(y, 20, H - 20), kind === 'gunner' ? 13 : 11, hp) as Robot;
  bot.kind = kind;
  bot.burst = 0;
  bot.cooldown = 1 + random();
  s.robots.push(bot);
}

/** Damage to the player goes to the shield first. Returns true if fatal. */
export function hurtPlayer(s: State, amount: number): boolean {
  s.calm = 0;
  if (s.shield > 0) {
    s.shield = Math.max(0, s.shield - amount);
    return false;
  }
  return damage(s.player, amount, 0.6);
}

export function update(s: State, dt: number, input: Input, random: () => number) {
  const p = s.player;
  trackCursor(s.cursor, input);
  tickActor(p, dt);
  const ox = p.x;
  const oy = p.y;
  steerPlayer(p, input, 160, dt, W, H);
  if (blocked(s, p.x, p.y, p.r)) {
    // Slide along cover: try each axis separately.
    if (!blocked(s, p.x, oy, p.r)) p.y = oy;
    else if (!blocked(s, ox, p.y, p.r)) p.x = ox;
    else [p.x, p.y] = [ox, oy];
  }
  aim(p, input);
  if (wantsFire(input) && p.cooldown === 0) {
    shoot(s.bullets, p, p.angle, 560, { color: '#7dd3fc' });
    p.cooldown = 0.16;
    s.events.push('shoot');
  }

  s.calm += dt;
  if (s.calm > 3 && s.shield < s.maxShield) s.shield = Math.min(s.maxShield, s.shield + dt * 0.8);

  if (s.breather > 0) {
    s.breather -= dt;
    if (s.breather <= 0) {
      s.wave += 1;
      s.toSpawn = 3 + s.wave * 2;
    }
  } else {
    s.spawnIn -= dt;
    if (s.toSpawn > 0 && s.spawnIn <= 0 && s.robots.length < 4 + s.wave) {
      spawnRobot(s, random);
      s.toSpawn -= 1;
      s.spawnIn = 1.2 + random();
    }
    if (s.toSpawn === 0 && s.robots.length === 0) {
      s.breather = 2.5;
      s.score += s.wave * 40;
      s.events.push('levelComplete');
    }
  }

  for (const r of s.robots) {
    tickActor(r, dt);
    const d = Math.hypot(p.x - r.x, p.y - r.y);
    const ox2 = r.x;
    const oy2 = r.y;
    if (r.kind === 'charger') chase(r, p.x, p.y, 120, dt);
    else if (r.kind === 'gunner') {
      // Keep a medium distance, strafing.
      const want = d < 170 ? -60 : d > 230 ? 60 : 0;
      chase(r, p.x, p.y, want, dt);
      r.x += Math.cos(r.angle + Math.PI / 2) * 30 * dt * (Math.sin(s.time + r.maxHp) > 0 ? 1 : -1);
      r.y += Math.sin(r.angle + Math.PI / 2) * 30 * dt * (Math.sin(s.time + r.maxHp) > 0 ? 1 : -1);
    } else chase(r, p.x, p.y, d > 140 ? 55 : 0, dt);
    if (blocked(s, r.x, r.y, r.r)) [r.x, r.y] = [ox2 + (r.x - ox2) * -0.2, oy2 + (r.y - oy2) * -0.2];
    r.x = clamp(r.x, r.r, W - r.r);
    r.y = clamp(r.y, r.r, H - r.r);
    if (r.kind !== 'charger' && r.cooldown === 0) {
      const lead = Math.atan2(p.y - r.y, p.x - r.x) + (random() - 0.5) * 2 * s.aimMul;
      shoot(s.bullets, r, lead, 240, { friendly: false, color: '#f87171', r: 4, life: 3 });
      if (r.kind === 'gunner' && r.burst < 2) {
        r.burst += 1;
        r.cooldown = 0.15;
      } else {
        r.burst = 0;
        r.cooldown = (r.kind === 'gunner' ? 2.2 : 1.6) * (0.8 + random() * 0.4);
      }
    }
    if (r.kind === 'charger' && touching(r, p) && r.cooldown === 0) {
      r.cooldown = 1;
      if (hurtPlayer(s, 1)) return end(s, random);
      s.events.push('hit');
    }
  }
  separate(s.robots);

  updateBullets(s.bullets, dt, W, H);
  for (let i = s.bullets.length - 1; i >= 0; i--) {
    const b = s.bullets[i];
    if (blocked(s, b.x, b.y, b.r)) {
      s.bullets.splice(i, 1);
      continue;
    }
    if (b.friendly) {
      const r = s.robots.find((rr) => touching(rr, b));
      if (!r) continue;
      s.bullets.splice(i, 1);
      if (damage(r, 1)) {
        s.robots.splice(s.robots.indexOf(r), 1);
        s.kills += 1;
        s.score += r.kind === 'gunner' ? 30 : 20;
        s.events.push('explosion');
        burst(s.sparks, r.x, r.y, '#94a3b8', 14, 160, random);
      }
    } else if (touching(p, b)) {
      s.bullets.splice(i, 1);
      if (hurtPlayer(s, 1)) return end(s, random);
      s.events.push('hit');
    }
  }
  updateSparks(s.sparks, dt);
}

function end(s: State, random: () => number) {
  s.over = true;
  s.events.push('gameOver');
  burst(s.sparks, s.player.x, s.player.y, '#38bdf8', 24, 200, random);
}

const RCOLOR: Record<Kind, string> = { drone: '#94a3b8', gunner: '#f59e0b', charger: '#ef4444' };

export function render(ctx: CanvasRenderingContext2D, s: State) {
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(148,163,184,0.08)';
  for (let x = 0; x < W; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (const b of s.blocks) fillRound(ctx, b.x, b.y, b.w, b.h, 4, '#334155');
  for (const r of s.robots) {
    fillRound(ctx, r.x - r.r, r.y - r.r, r.r * 2, r.r * 2, 4, r.hurt > 0 ? '#fff' : RCOLOR[r.kind]);
    circle(ctx, r.x + Math.cos(r.angle) * r.r * 0.45, r.y + Math.sin(r.angle) * r.r * 0.45, 3.5, '#0f172a');
    hpBar(ctx, r, '#f59e0b');
  }
  for (const b of s.bullets) circle(ctx, b.x, b.y, b.r, b.color);
  const p = s.player;
  if (!s.over) {
    if (s.shield > 0) {
      ctx.strokeStyle = `rgba(56,189,248,${0.25 + (s.shield / s.maxShield) * 0.6})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r + 6, 0, Math.PI * 2);
      ctx.stroke();
    }
    circle(ctx, p.x, p.y, p.r, p.hurt > 0 ? '#fca5a5' : '#22d3ee');
    ctx.strokeStyle = '#e0f2fe';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + Math.cos(p.angle) * (p.r + 7), p.y + Math.sin(p.angle) * (p.r + 7));
    ctx.stroke();
  }
  drawSparks(ctx, s.sparks);
  crosshair(ctx, s.cursor);
  text(ctx, `Shield ${'▮'.repeat(Math.ceil(s.shield))}${'▯'.repeat(s.maxShield - Math.ceil(s.shield))}  Hull ${'❤'.repeat(Math.max(0, p.hp))}`, 10, 16, { size: 13, align: 'left', color: '#e2e8f0' });
  if (s.breather > 0) text(ctx, `Wave ${s.wave} cleared`, W / 2, H / 2, { size: 24, color: '#fde047' });
}

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create,
  update,
  render,
  hud: (s) => [
    { label: 'Wave', value: s.wave },
    { label: 'Robots', value: s.kills },
    { label: 'Hull', value: s.player.hp },
    { label: 'Score', value: s.score },
  ],
  result: (s) => ({ score: s.score, title: `Scrapped on wave ${s.wave}`, details: [{ label: 'Robots destroyed', value: String(s.kills) }] }),
  onEnd: (s) => {
    void reportProgress('robot-shooter.wave-5', s.wave);
    void reportProgress('robot-shooter.wave-10', s.wave);
    void reportProgress('robot-shooter.kills-50', s.kills);
    void incrementProgress('robot-shooter.total', s.kills);
  },
  touch: { pad: 'dpad' },
  startHint: 'Move with WASD / arrows, aim with the mouse and hold to fire. Hide behind blocks to recharge your shield.',
};
