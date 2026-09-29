import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState, circleHit } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { burst, drawSparks, starfield, text, updateSparks } from '../_shared/arcade/draw';
import type { Spark } from '../_shared/arcade/draw';

/**
 * Asteroid Blaster: pilot a small ship in a wrap-around field of drifting
 * rocks. Shots split large asteroids into medium ones and medium into
 * small; small ones are destroyed. From wave 3 a saucer sometimes appears
 * and fires back.
 */
export const W = 640;
export const H = 480;

export interface Rock {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: 3 | 2 | 1;
  spin: number;
  angle: number;
  shape: number[];
}

export interface Shot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  enemy: boolean;
}

export interface State extends BaseState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  thrusting: boolean;
  lives: number;
  invuln: number;
  rocks: Rock[];
  shots: Shot[];
  cooldown: number;
  wave: number;
  rockSpeed: number;
  sparks: Spark[];
  saucer: { x: number; y: number; vx: number; fire: number } | null;
  saucerT: number;
  destroyed: number;
  respawn: number;
}

const SETTINGS: Record<DifficultySetting, { speed: number; lives: number }> = {
  easy: { speed: 45, lives: 4 },
  normal: { speed: 60, lives: 3 },
  hard: { speed: 80, lives: 3 },
};

export const RADIUS: Record<1 | 2 | 3, number> = { 3: 38, 2: 21, 1: 11 };
export const POINTS: Record<1 | 2 | 3, number> = { 3: 20, 2: 50, 1: 100 };
const SHIP_R = 11;

function rock(x: number, y: number, size: 3 | 2 | 1, speed: number, random: () => number): Rock {
  const a = random() * Math.PI * 2;
  const v = speed * (0.6 + random() * 0.8) * (4 - size) ** 0.5;
  return {
    x,
    y,
    vx: Math.cos(a) * v,
    vy: Math.sin(a) * v,
    size,
    spin: (random() - 0.5) * 2,
    angle: 0,
    shape: Array.from({ length: 11 }, () => 0.75 + random() * 0.3),
  };
}

function spawnWave(s: State, random: () => number) {
  const n = 3 + s.wave;
  for (let i = 0; i < n; i++) {
    // Start rocks near the edges, away from the ship.
    const edge = random() < 0.5;
    const x = edge ? (random() < 0.5 ? 0 : W) : random() * W;
    const y = edge ? random() * H : random() < 0.5 ? 0 : H;
    s.rocks.push(rock(x, y, 3, s.rockSpeed, random));
  }
}

export function create(difficulty: DifficultySetting, random: () => number = Math.random): State {
  const c = SETTINGS[difficulty];
  const s: State = {
    ...baseState(),
    x: W / 2,
    y: H / 2,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2,
    thrusting: false,
    lives: c.lives,
    invuln: 2,
    rocks: [],
    shots: [],
    cooldown: 0,
    wave: 1,
    rockSpeed: c.speed,
    sparks: [],
    saucer: null,
    saucerT: 12,
    destroyed: 0,
    respawn: 0,
  };
  spawnWave(s, random);
  return s;
}

const wrap = (v: number, max: number) => ((v % max) + max) % max;

/** Splits (or destroys) a rock, adding its points. */
export function breakRock(s: State, index: number, random: () => number) {
  const r = s.rocks[index];
  s.rocks.splice(index, 1);
  s.score += POINTS[r.size];
  s.destroyed += 1;
  s.events.push('explosion');
  burst(s.sparks, r.x, r.y, '#cbd5e1', 6 + r.size * 4, 120, random);
  if (r.size > 1) {
    const next = (r.size - 1) as 2 | 1;
    s.rocks.push(rock(r.x, r.y, next, s.rockSpeed, random), rock(r.x, r.y, next, s.rockSpeed, random));
  }
}

function loseLife(s: State, random: () => number) {
  s.lives -= 1;
  s.events.push('explosion');
  burst(s.sparks, s.x, s.y, '#fb923c', 24, 200, random);
  if (s.lives <= 0) {
    s.over = true;
    return;
  }
  s.respawn = 1.2;
}

export function update(s: State, dt: number, input: Input, random: () => number) {
  updateSparks(s.sparks, dt);
  if (s.respawn > 0) {
    s.respawn -= dt;
    if (s.respawn <= 0) Object.assign(s, { x: W / 2, y: H / 2, vx: 0, vy: 0, angle: -Math.PI / 2, invuln: 2.5 });
  } else {
    if (input.held.has('left')) s.angle -= 4.2 * dt;
    if (input.held.has('right')) s.angle += 4.2 * dt;
    s.thrusting = input.held.has('up');
    if (s.thrusting) {
      s.vx += Math.cos(s.angle) * 260 * dt;
      s.vy += Math.sin(s.angle) * 260 * dt;
    }
    // Space friction keeps the ship controllable.
    s.vx *= Math.pow(0.55, dt);
    s.vy *= Math.pow(0.55, dt);
    s.x = wrap(s.x + s.vx * dt, W);
    s.y = wrap(s.y + s.vy * dt, H);
    s.cooldown -= dt;
    const fire = input.held.has('action') || input.pointer.down;
    if (fire && s.cooldown <= 0 && s.shots.filter((b) => !b.enemy).length < 6) {
      s.shots.push({ x: s.x + Math.cos(s.angle) * 14, y: s.y + Math.sin(s.angle) * 14, vx: Math.cos(s.angle) * 480 + s.vx, vy: Math.sin(s.angle) * 480 + s.vy, life: 0.9, enemy: false });
      s.cooldown = 0.2;
      s.events.push('shoot');
    }
    // Hyperspace: jump to a random spot (risky!).
    if (input.pressed.has('action2') || input.pressed.has('down')) {
      s.x = random() * W;
      s.y = random() * H;
      s.vx = 0;
      s.vy = 0;
      s.events.push('whoosh');
    }
    s.invuln = Math.max(0, s.invuln - dt);
  }

  for (const r of s.rocks) {
    r.x = wrap(r.x + r.vx * dt, W);
    r.y = wrap(r.y + r.vy * dt, H);
    r.angle += r.spin * dt;
  }
  for (const b of s.shots) {
    b.x = wrap(b.x + b.vx * dt, W);
    b.y = wrap(b.y + b.vy * dt, H);
    b.life -= dt;
  }
  // Player shots against rocks and the saucer.
  for (const b of s.shots) {
    if (b.enemy || b.life <= 0) continue;
    const i = s.rocks.findIndex((r) => circleHit(b.x, b.y, 2, r.x, r.y, RADIUS[r.size]));
    if (i >= 0) {
      b.life = 0;
      breakRock(s, i, random);
    } else if (s.saucer && circleHit(b.x, b.y, 2, s.saucer.x, s.saucer.y, 14)) {
      b.life = 0;
      s.score += 200;
      burst(s.sparks, s.saucer.x, s.saucer.y, '#a78bfa', 20, 180, random);
      s.saucer = null;
      s.events.push('explosion');
    }
  }
  // The saucer crosses the screen and fires roughly at the ship.
  if (s.wave >= 3) {
    s.saucerT -= dt;
    if (!s.saucer && s.saucerT <= 0) {
      const fromLeft = random() < 0.5;
      s.saucer = { x: fromLeft ? -20 : W + 20, y: 60 + random() * (H - 120), vx: fromLeft ? 110 : -110, fire: 1.2 };
      s.saucerT = 15 + random() * 10;
    }
  }
  if (s.saucer) {
    const u = s.saucer;
    u.x += u.vx * dt;
    u.y += Math.sin(s.time * 2) * 40 * dt;
    u.fire -= dt;
    if (u.fire <= 0 && s.respawn <= 0) {
      const a = Math.atan2(s.y - u.y, s.x - u.x) + (random() - 0.5) * 0.5;
      s.shots.push({ x: u.x, y: u.y, vx: Math.cos(a) * 260, vy: Math.sin(a) * 260, life: 1.6, enemy: true });
      u.fire = 1.4;
    }
    if (u.x < -40 || u.x > W + 40) s.saucer = null;
  }
  s.shots = s.shots.filter((b) => b.life > 0);

  if (s.respawn <= 0 && s.invuln <= 0) {
    const hitRock = s.rocks.findIndex((r) => circleHit(s.x, s.y, SHIP_R, r.x, r.y, RADIUS[r.size] * 0.85));
    const hitShot = s.shots.find((b) => b.enemy && circleHit(s.x, s.y, SHIP_R, b.x, b.y, 3));
    if (hitRock >= 0) {
      breakRock(s, hitRock, random);
      loseLife(s, random);
    } else if (hitShot) {
      hitShot.life = 0;
      loseLife(s, random);
    }
  }
  if (!s.rocks.length && !s.over) {
    s.wave += 1;
    s.score += 250;
    s.events.push('levelComplete');
    spawnWave(s, random);
    s.invuln = Math.max(s.invuln, 1.5);
  }
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  ctx.fillStyle = '#030712';
  ctx.fillRect(0, 0, W, H);
  starfield(ctx, W, H, 0, 90);
  ctx.lineWidth = 2;
  for (const r of s.rocks) {
    const rad = RADIUS[r.size];
    ctx.strokeStyle = '#cbd5e1';
    ctx.fillStyle = '#1f2937';
    ctx.beginPath();
    r.shape.forEach((k, i) => {
      const a = r.angle + (i / r.shape.length) * Math.PI * 2;
      const px = r.x + Math.cos(a) * rad * k;
      const py = r.y + Math.sin(a) * rad * k;
      if (i) ctx.lineTo(px, py);
      else ctx.moveTo(px, py);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  for (const b of s.shots) {
    ctx.fillStyle = b.enemy ? '#f472b6' : '#fde047';
    ctx.fillRect(b.x - 2, b.y - 2, 4, 4);
  }
  if (s.saucer) {
    const u = s.saucer;
    ctx.fillStyle = '#a78bfa';
    ctx.beginPath();
    ctx.ellipse(u.x, u.y, 18, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ddd6fe';
    ctx.beginPath();
    ctx.ellipse(u.x, u.y - 5, 8, 6, 0, Math.PI, 0);
    ctx.fill();
  }
  if (s.respawn <= 0 && (s.invuln <= 0 || Math.floor(s.invuln * 10) % 2)) {
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.angle);
    ctx.strokeStyle = '#38bdf8';
    ctx.fillStyle = '#0c4a6e';
    ctx.beginPath();
    ctx.moveTo(15, 0);
    ctx.lineTo(-10, -9);
    ctx.lineTo(-6, 0);
    ctx.lineTo(-10, 9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    if (s.thrusting) {
      ctx.fillStyle = '#fb923c';
      ctx.beginPath();
      ctx.moveTo(-7, -4);
      ctx.lineTo(-16 - Math.random() * 6, 0);
      ctx.lineTo(-7, 4);
      ctx.fill();
    }
    ctx.restore();
  }
  drawSparks(ctx, s.sparks);
  text(ctx, `${s.score}`, 16, 20, { size: 18, align: 'left' });
  text(ctx, '▲'.repeat(Math.max(0, s.lives)), W - 16, 20, { size: 14, align: 'right', color: '#38bdf8' });
}

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create,
  update,
  render,
  hud: (s) => [
    { label: 'Score', value: s.score },
    { label: 'Lives', value: s.lives },
    { label: 'Wave', value: s.wave },
  ],
  result: (s) => ({
    score: s.score,
    title: 'Ship lost',
    details: [
      { label: 'Wave reached', value: String(s.wave) },
      { label: 'Rocks destroyed', value: String(s.destroyed) },
    ],
  }),
  onEnd: (s) => {
    void reportProgress('asteroid-blaster.score-5000', s.score);
    void reportProgress('asteroid-blaster.score-20000', s.score);
    void reportProgress('asteroid-blaster.wave-5', s.wave);
    void incrementProgress('asteroid-blaster.rocks', s.destroyed);
  },
  touch: {
    pad: 'horizontal',
    buttons: [
      { action: 'up', label: 'Thrust' },
      { action: 'action', label: 'Fire' },
    ],
  },
  pointerStarts: false,
  startHint: '← → turn, ↑ thrust, Space fires, X or ↓ jumps to hyperspace.',
};
