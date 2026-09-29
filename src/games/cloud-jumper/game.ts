import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState, circleHit } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { circle, fillRound, gradientBg, text } from '../_shared/arcade/draw';

/**
 * Cloud Jumper: bounce ever upwards from cloud to cloud. The jumper
 * bounces automatically; steer left and right (the screen wraps). Some
 * clouds drift, some crumble, some have springs; a few grumpy storm
 * monsters can be stomped from above but hurt from any other side.
 */
export const W = 360;
export const H = 640;
const PW = 30;
export const BOUNCE = -640;
export const SPRING = -1050;
export const GRAVITY = 1250;

type Kind = 'normal' | 'moving' | 'crumble' | 'spring';

export interface Cloud {
  x: number;
  y: number;
  w: number;
  kind: Kind;
  vx: number;
  broken: boolean;
  fall: number;
}

export interface Monster {
  x: number;
  y: number;
  vx: number;
  alive: boolean;
}

export interface State extends BaseState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: number;
  clouds: Cloud[];
  monsters: Monster[];
  /** Highest point reached, in world units (upwards is negative y). */
  top: number;
  camera: number;
  nextY: number;
  gapScale: number;
  stomps: number;
}

const SETTINGS: Record<DifficultySetting, { gap: number }> = {
  easy: { gap: 0.85 },
  normal: { gap: 1 },
  hard: { gap: 1.15 },
};

export function create(difficulty: DifficultySetting, random: () => number = Math.random): State {
  const s: State = {
    ...baseState(),
    x: W / 2,
    y: H - 120,
    vx: 0,
    vy: BOUNCE,
    facing: 1,
    clouds: [{ x: W / 2 - 40, y: H - 90, w: 80, kind: 'normal', vx: 0, broken: false, fall: 0 }],
    monsters: [],
    top: H - 120,
    camera: 0,
    nextY: H - 170,
    gapScale: SETTINGS[difficulty].gap,
    stomps: 0,
  };
  fill(s, random);
  return s;
}

/** Adds clouds above until the view (plus a margin) is filled. */
export function fill(s: State, random: () => number) {
  while (s.nextY > s.camera - 200) {
    const height = Math.max(0, H - s.nextY) / 1000;
    const r = random();
    // Rarer normal clouds and more hazards the higher you climb.
    const kind: Kind = r < Math.min(0.3, 0.05 + height * 0.03) ? 'crumble' : r < Math.min(0.55, 0.2 + height * 0.04) ? 'moving' : r < 0.62 ? 'spring' : 'normal';
    const w = 64 - Math.min(18, height * 3);
    s.clouds.push({ x: random() * (W - w), y: s.nextY, w, kind, vx: kind === 'moving' ? (random() < 0.5 ? -1 : 1) * (50 + height * 15) : 0, broken: false, fall: 0 });
    if (kind === 'crumble') {
      // A crumbling cloud never replaces a usable one: add a solid one nearby.
      s.clouds.push({ x: random() * (W - w), y: s.nextY - 18, w, kind: 'normal', vx: 0, broken: false, fall: 0 });
    }
    if (height > 1.5 && random() < 0.05) s.monsters.push({ x: random() * (W - 40) + 20, y: s.nextY - 60, vx: 40, alive: true });
    const gap = Math.min(150, (55 + random() * 40 + height * 12) * s.gapScale);
    s.nextY -= gap;
  }
}

export function update(s: State, dt: number, input: Input, random: () => number) {
  let dir = (input.held.has('right') ? 1 : 0) - (input.held.has('left') ? 1 : 0);
  if (input.pointer.down) dir = input.pointer.x > W / 2 ? 1 : -1;
  s.vx += (dir * 420 - s.vx) * Math.min(1, dt * 10);
  if (dir) s.facing = dir;
  s.x += s.vx * dt;
  if (s.x < -PW / 2) s.x += W;
  if (s.x > W + PW / 2) s.x -= W;

  const prev = s.y;
  s.vy += GRAVITY * dt;
  s.y += s.vy * dt;

  for (const c of s.clouds) {
    if (c.kind === 'moving') {
      c.x += c.vx * dt;
      if (c.x < 0 || c.x + c.w > W) c.vx *= -1;
    }
    if (c.broken) {
      c.fall += 500 * dt;
      c.y += c.fall * dt;
    }
  }
  // Land only while falling, when the feet cross a cloud's top.
  if (s.vy > 0) {
    for (const c of s.clouds) {
      if (c.broken) continue;
      if (prev <= c.y && s.y >= c.y && s.x + PW / 2 > c.x && s.x - PW / 2 < c.x + c.w) {
        if (c.kind === 'crumble') {
          c.broken = true;
          s.events.push('pop');
          continue;
        }
        s.y = c.y;
        s.vy = c.kind === 'spring' ? SPRING : BOUNCE;
        s.events.push(c.kind === 'spring' ? 'powerup' : 'jump');
        break;
      }
    }
  }
  for (const m of s.monsters) {
    if (!m.alive) continue;
    m.x += m.vx * dt;
    if (m.x < 20 || m.x > W - 20) m.vx *= -1;
    if (circleHit(s.x, s.y - 14, 14, m.x, m.y, 18)) {
      if (s.vy > 0 && s.y - 14 < m.y) {
        m.alive = false;
        s.vy = BOUNCE;
        s.stomps += 1;
        s.score += 50;
        s.events.push('hit');
      } else {
        s.over = true;
        s.events.push('gameOver');
        return;
      }
    }
  }
  // The camera only moves up.
  s.camera = Math.min(s.camera, s.y - H * 0.4);
  s.top = Math.min(s.top, s.y);
  s.score = Math.max(s.score, Math.floor((H - 120 - s.top) / 10) + s.stomps * 50);
  fill(s, random);
  s.clouds = s.clouds.filter((c) => c.y - s.camera < H + 60);
  s.monsters = s.monsters.filter((m) => m.y - s.camera < H + 60);
  if (s.y - s.camera > H + 40) {
    s.over = true;
    s.events.push('gameOver');
  }
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  const height = (H - 120 - s.top) / 1000;
  const t = Math.min(1, height / 12);
  gradientBg(ctx, W, H, t < 0.5 ? '#7dd3fc' : '#312e81', t < 0.5 ? '#e0f2fe' : '#6366f1');
  const sy = (y: number) => y - s.camera;
  for (const c of s.clouds) {
    const y = sy(c.y);
    const color = c.kind === 'crumble' ? '#cbd5e1' : '#ffffff';
    ctx.globalAlpha = c.broken ? 0.5 : 1;
    fillRound(ctx, c.x, y - 6, c.w, 16, 8, color);
    circle(ctx, c.x + c.w * 0.3, y - 8, 10, color);
    circle(ctx, c.x + c.w * 0.62, y - 10, 12, color);
    if (c.kind === 'crumble') {
      ctx.strokeStyle = '#94a3b8';
      ctx.beginPath();
      ctx.moveTo(c.x + c.w * 0.4, y - 6);
      ctx.lineTo(c.x + c.w * 0.5, y + 4);
      ctx.lineTo(c.x + c.w * 0.45, y + 10);
      ctx.stroke();
    }
    if (c.kind === 'moving') {
      ctx.fillStyle = '#93c5fd';
      ctx.fillRect(c.x + 6, y + 6, c.w - 12, 3);
    }
    if (c.kind === 'spring') {
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(c.x + c.w / 2 - 8, y - 20, 16, 5);
      ctx.strokeStyle = '#78716c';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let k = 0; k < 4; k++) ctx.lineTo(c.x + c.w / 2 + (k % 2 ? 5 : -5), y - 15 + k * 3);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  for (const m of s.monsters) {
    if (!m.alive) continue;
    const y = sy(m.y);
    circle(ctx, m.x, y, 18, '#475569');
    circle(ctx, m.x - 12, y + 6, 10, '#475569');
    circle(ctx, m.x + 12, y + 6, 10, '#475569');
    circle(ctx, m.x - 6, y - 4, 4, '#fde047');
    circle(ctx, m.x + 6, y - 4, 4, '#fde047');
    ctx.strokeStyle = '#fde047';
    ctx.beginPath();
    ctx.moveTo(m.x - 4, y + 22);
    ctx.lineTo(m.x + 2, y + 30);
    ctx.lineTo(m.x - 2, y + 30);
    ctx.lineTo(m.x + 4, y + 38);
    ctx.stroke();
  }
  // The jumper: a round critter with little legs, facing where it moves.
  const y = sy(s.y);
  fillRound(ctx, s.x - PW / 2, y - 34, PW, 30, 12, '#22c55e');
  circle(ctx, s.x + s.facing * 6, y - 24, 5, '#fff');
  circle(ctx, s.x + s.facing * 7, y - 24, 2.5, '#111827');
  ctx.fillStyle = '#15803d';
  ctx.fillRect(s.x - 10, y - 5, 5, 5);
  ctx.fillRect(s.x + 5, y - 5, 5, 5);
  text(ctx, String(s.score), 16, 28, { size: 22, align: 'left', color: t < 0.5 ? '#0c4a6e' : '#e0e7ff' });
}

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create,
  update,
  render,
  hud: (s) => [
    { label: 'Height', value: s.score },
    { label: 'Stomps', value: s.stomps },
  ],
  result: (s) => ({
    score: s.score,
    title: 'Down you go!',
    details: [
      { label: 'Height reached', value: String(s.score) },
      { label: 'Monsters stomped', value: String(s.stomps) },
    ],
  }),
  onEnd: (s) => {
    void reportProgress('cloud-jumper.five-hundred', s.score);
    void reportProgress('cloud-jumper.two-thousand', s.score);
    void reportProgress('cloud-jumper.stomp', s.stomps);
    void incrementProgress('cloud-jumper.games');
  },
  touch: { pad: 'horizontal' },
  startHint: 'The jumper bounces by itself — steer with ← → or hold the left or right side of the game.',
};
