import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { burst, circle, drawSparks, fillRound, text, updateSparks } from '../_shared/arcade/draw';
import type { Spark } from '../_shared/arcade/draw';
import { actor, aim, chase, crosshair, cursor, damage, trackCursor, edgePoint, hpBar, separate, shoot, steerPlayer, tickActor, touching, updateBullets, wantsFire } from '../_shared/shooter/kit';
import type { Actor, Bullet, Cursor } from '../_shared/shooter/kit';

/**
 * Zombie Survival: hold out against waves of shambling (cartoon) zombies.
 * Your pistol has a 12-round magazine and a limited ammo reserve, so every
 * shot counts. Supply crates restore ammo or health. Waves grow and add fast
 * runners and big brutes.
 */
export const W = 520;
export const H = 400;
const MAG = 12;

type Kind = 'walker' | 'runner' | 'brute';
export interface Zombie extends Actor {
  kind: Kind;
  speed: number;
}

export interface Crate {
  x: number;
  y: number;
  r: number;
  kind: 'ammo' | 'health';
  life: number;
}

export interface State extends BaseState {
  player: Actor;
  zombies: Zombie[];
  bullets: Bullet[];
  crates: Crate[];
  wave: number;
  toSpawn: number;
  spawnIn: number;
  breather: number;
  mag: number;
  reserve: number;
  reloading: number;
  kills: number;
  shots: number;
  hits: number;
  speedMul: number;
  sparks: Spark[];
  cursor: Cursor;
}

const SPEED: Record<DifficultySetting, number> = { easy: 0.8, normal: 1, hard: 1.2 };

export function create(difficulty: DifficultySetting): State {
  return {
    ...baseState(),
    player: actor(W / 2, H / 2, 12, 5),
    zombies: [],
    bullets: [],
    crates: [],
    wave: 1,
    toSpawn: waveSize(1),
    spawnIn: 1,
    breather: 0,
    mag: MAG,
    reserve: 48,
    reloading: 0,
    kills: 0,
    shots: 0,
    hits: 0,
    speedMul: SPEED[difficulty],
    sparks: [],
    cursor: cursor(),
  };
}

export const waveSize = (wave: number) => 6 + wave * 4;

function spawnZombie(s: State, random: () => number) {
  const [x, y] = edgePoint(W, H, random);
  const r = random();
  const kind: Kind = s.wave >= 3 && r < 0.12 ? 'brute' : s.wave >= 2 && r < 0.35 ? 'runner' : 'walker';
  const stats = { walker: { r: 11, hp: 2, speed: 38 }, runner: { r: 9, hp: 1, speed: 78 }, brute: { r: 17, hp: 8, speed: 28 } }[kind];
  const z = actor(x, y, stats.r, stats.hp) as Zombie;
  z.kind = kind;
  z.speed = stats.speed * s.speedMul * (1 + s.wave * 0.03) * (0.85 + random() * 0.3);
  s.zombies.push(z);
}

export function reload(s: State) {
  if (s.reloading > 0 || s.mag === MAG || s.reserve === 0) return;
  s.reloading = 1.1;
  s.events.push('click');
}

export function update(s: State, dt: number, input: Input, random: () => number) {
  const p = s.player;
  trackCursor(s.cursor, input);
  tickActor(p, dt);
  steerPlayer(p, input, 150, dt, W, H);
  aim(p, input);

  if (s.reloading > 0) {
    s.reloading -= dt;
    if (s.reloading <= 0) {
      const take = Math.min(MAG - s.mag, s.reserve);
      s.mag += take;
      s.reserve -= take;
    }
  } else if (input.pressed.has('action2')) reload(s);

  if (wantsFire(input) && p.cooldown === 0 && s.reloading <= 0) {
    if (s.mag > 0) {
      shoot(s.bullets, p, p.angle + (random() - 0.5) * 0.06, 520, { damage: 1 });
      s.mag -= 1;
      s.shots += 1;
      p.cooldown = 0.22;
      s.events.push('shoot');
      if (s.mag === 0) reload(s);
    } else if (s.reserve > 0) reload(s);
  }

  // Waves: spawn the wave over time; a short breather between waves.
  if (s.breather > 0) {
    s.breather -= dt;
    if (s.breather <= 0) {
      s.wave += 1;
      s.toSpawn = waveSize(s.wave);
      s.events.push('powerup');
    }
  } else {
    s.spawnIn -= dt;
    if (s.toSpawn > 0 && s.spawnIn <= 0) {
      spawnZombie(s, random);
      s.toSpawn -= 1;
      s.spawnIn = Math.max(0.25, 1.2 - s.wave * 0.08) * (0.6 + random() * 0.8);
    }
    if (s.toSpawn === 0 && s.zombies.length === 0) {
      s.breather = 3;
      s.score += s.wave * 50;
      s.events.push('levelComplete');
      // A supply crate after every wave.
      s.crates.push({ x: 60 + random() * (W - 120), y: 60 + random() * (H - 120), r: 12, kind: p.hp <= 2 ? 'health' : 'ammo', life: 20 });
    }
  }

  for (const z of s.zombies) {
    tickActor(z, dt);
    chase(z, p.x, p.y, z.speed, dt);
    if (touching(z, p) && damage(p, 1, 1)) {
      s.over = true;
      s.events.push('gameOver');
      burst(s.sparks, p.x, p.y, '#ef4444', 24, 200, random);
      return;
    } else if (touching(z, p) && p.hurt > 0.95) s.events.push('hit');
  }
  separate(s.zombies);

  updateBullets(s.bullets, dt, W, H);
  for (let i = s.bullets.length - 1; i >= 0; i--) {
    const b = s.bullets[i];
    const z = s.zombies.find((zz) => touching(zz, b));
    if (!z) continue;
    s.bullets.splice(i, 1);
    s.hits += 1;
    z.x += (b.vx / 520) * 6;
    z.y += (b.vy / 520) * 6;
    if (damage(z, b.damage)) {
      s.zombies.splice(s.zombies.indexOf(z), 1);
      s.kills += 1;
      s.score += z.kind === 'brute' ? 50 : z.kind === 'runner' ? 15 : 10;
      s.events.push('explosion');
      burst(s.sparks, z.x, z.y, '#84cc16', 12, 140, random);
      // Fallen zombies sometimes leave a few rounds behind.
      if (random() < 0.12) s.crates.push({ x: z.x, y: z.y, r: 10, kind: 'ammo', life: 10 });
    }
  }

  for (let i = s.crates.length - 1; i >= 0; i--) {
    const c = s.crates[i];
    c.life -= dt;
    if (touching(c, p)) {
      if (c.kind === 'health') p.hp = Math.min(p.maxHp, p.hp + 2);
      else s.reserve += c.r > 10 ? 36 : 8;
      s.events.push('coin');
      s.crates.splice(i, 1);
    } else if (c.life <= 0) s.crates.splice(i, 1);
  }
  updateSparks(s.sparks, dt);
}

const ZCOLOR: Record<Kind, string> = { walker: '#65a30d', runner: '#a3e635', brute: '#3f6212' };

export function render(ctx: CanvasRenderingContext2D, s: State) {
  ctx.fillStyle = '#292524';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#3f3a36';
  for (let i = 0; i < 26; i++) ctx.fillRect((i * 137) % W, (i * 89) % H, 18, 10);
  for (const c of s.crates) {
    fillRound(ctx, c.x - c.r, c.y - c.r, c.r * 2, c.r * 2, 3, c.kind === 'health' ? '#f8fafc' : '#a16207');
    text(ctx, c.kind === 'health' ? '✚' : '▮', c.x, c.y + 1, { size: c.r * 1.3, color: c.kind === 'health' ? '#dc2626' : '#fde68a' });
  }
  for (const z of s.zombies) {
    circle(ctx, z.x, z.y, z.r, z.hurt > 0 ? '#fef08a' : ZCOLOR[z.kind]);
    // Arms reaching forward.
    ctx.strokeStyle = ZCOLOR[z.kind];
    ctx.lineWidth = 3;
    for (const side of [-0.5, 0.5]) {
      ctx.beginPath();
      ctx.moveTo(z.x + Math.cos(z.angle + side) * z.r * 0.8, z.y + Math.sin(z.angle + side) * z.r * 0.8);
      ctx.lineTo(z.x + Math.cos(z.angle + side * 0.4) * (z.r + 8), z.y + Math.sin(z.angle + side * 0.4) * (z.r + 8));
      ctx.stroke();
    }
    circle(ctx, z.x + Math.cos(z.angle - 0.4) * z.r * 0.5, z.y + Math.sin(z.angle - 0.4) * z.r * 0.5, 2, '#fef08a');
    circle(ctx, z.x + Math.cos(z.angle + 0.4) * z.r * 0.5, z.y + Math.sin(z.angle + 0.4) * z.r * 0.5, 2, '#fef08a');
    hpBar(ctx, z, '#84cc16');
  }
  for (const b of s.bullets) circle(ctx, b.x, b.y, b.r, b.color);
  const p = s.player;
  if (!s.over) {
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + Math.cos(p.angle) * (p.r + 8), p.y + Math.sin(p.angle) * (p.r + 8));
    ctx.stroke();
    circle(ctx, p.x, p.y, p.r, p.hurt > 0 && Math.floor(s.time * 20) % 2 ? '#fca5a5' : '#38bdf8');
    circle(ctx, p.x, p.y, p.r * 0.55, '#0ea5e9');
  }
  drawSparks(ctx, s.sparks);
  crosshair(ctx, s.cursor);
  text(ctx, '❤'.repeat(Math.max(0, p.hp)), 12, 18, { size: 16, color: '#ef4444', align: 'left' });
  text(ctx, s.reloading > 0 ? 'Reloading…' : `${s.mag} / ${s.reserve}`, W - 12, 18, { size: 15, align: 'right', color: s.mag === 0 && s.reserve === 0 ? '#f87171' : '#e7e5e4' });
  if (s.breather > 0) text(ctx, `Wave ${s.wave} cleared!`, W / 2, H / 2 - 30, { size: 26, color: '#fde047' });
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
    { label: 'Ammo', value: `${s.mag}/${s.reserve}` },
    { label: 'Score', value: s.score },
  ],
  result: (s) => ({
    score: s.score,
    title: `Overrun on wave ${s.wave}`,
    details: [
      { label: 'Zombies stopped', value: String(s.kills) },
      { label: 'Accuracy', value: s.shots ? `${Math.round((s.hits / s.shots) * 100)}%` : '–' },
    ],
  }),
  onEnd: (s) => {
    void reportProgress('zombie-survival.wave-5', s.wave);
    void reportProgress('zombie-survival.wave-10', s.wave);
    void reportProgress('zombie-survival.kills-100', s.kills);
    void incrementProgress('zombie-survival.total', s.kills);
  },
  touch: { pad: 'dpad', buttons: [{ action: 'action2', label: 'R' }] },
  startHint: 'Move with WASD / arrows, aim with the mouse, hold click or Space to fire, X to reload.',
};
