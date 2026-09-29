import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState, rectHit } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { circle, fillRound, text } from '../_shared/arcade/draw';

/**
 * Dino Runner: a little dinosaur sprints across the desert. Jump over
 * cacti, duck under or jump over swooping birds. The desert speeds up the
 * further you go, and day turns to night along the way.
 */
export const W = 640;
export const H = 240;
export const GROUND = 196;
const X = 70;

type ObKind = 'cactus-s' | 'cactus-l' | 'cactus-group' | 'bird';

export interface Obstacle {
  kind: ObKind;
  x: number;
  y: number;
  w: number;
  h: number;
  flap: number;
}

export interface State extends BaseState {
  y: number;
  vy: number;
  ducking: boolean;
  speed: number;
  maxSpeed: number;
  accel: number;
  distance: number;
  obstacles: Obstacle[];
  next: number;
  leg: number;
  birdsDodged: number;
  hiScoreFlash: number;
}

const SETTINGS: Record<DifficultySetting, { speed: number; max: number; accel: number }> = {
  easy: { speed: 280, max: 560, accel: 6 },
  normal: { speed: 320, max: 680, accel: 9 },
  hard: { speed: 380, max: 820, accel: 13 },
};

export const GRAVITY = 2300;
export const JUMP = -720;

export function create(difficulty: DifficultySetting): State {
  const s = SETTINGS[difficulty];
  return {
    ...baseState(),
    y: GROUND,
    vy: 0,
    ducking: false,
    speed: s.speed,
    maxSpeed: s.max,
    accel: s.accel,
    distance: 0,
    obstacles: [],
    next: 1.2,
    leg: 0,
    birdsDodged: 0,
    hiScoreFlash: 0,
  };
}

export function playerBox(s: State) {
  const h = s.ducking && s.y >= GROUND ? 26 : 46;
  const w = s.ducking && s.y >= GROUND ? 52 : 40;
  return { x: X, y: s.y - h, w, h };
}

function spawn(s: State, random: () => number) {
  const r = random();
  const score = Math.floor(s.distance / 10);
  let ob: Obstacle;
  if (score > 250 && r < 0.3) {
    // Birds fly at three heights: low (jump), middle (duck or jump) or high (duck).
    const heights = [GROUND - 26, GROUND - 52, GROUND - 78];
    const y = heights[Math.floor(random() * 3)];
    ob = { kind: 'bird', x: W + 20, y, w: 42, h: 26, flap: 0 };
  } else if (r < 0.55) {
    ob = { kind: 'cactus-s', x: W + 20, y: GROUND - 36, w: 18, h: 36, flap: 0 };
  } else if (r < 0.85) {
    ob = { kind: 'cactus-l', x: W + 20, y: GROUND - 50, w: 24, h: 50, flap: 0 };
  } else {
    ob = { kind: 'cactus-group', x: W + 20, y: GROUND - 36, w: 54, h: 36, flap: 0 };
  }
  s.obstacles.push(ob);
  // Gaps scale with speed so every pattern stays jumpable.
  s.next = (0.55 + random() * 0.9) * (380 / s.speed) + 0.35;
}

export function update(s: State, dt: number, input: Input, random: () => number) {
  const jump = input.pressed.has('action') || input.pressed.has('up') || input.pointer.pressed;
  s.ducking = input.held.has('down');
  if (jump && s.y >= GROUND) {
    s.vy = JUMP;
    s.events.push('jump');
  }
  // Holding down while airborne drops faster.
  s.vy += GRAVITY * dt * (s.ducking && s.y < GROUND ? 2.2 : 1);
  s.y = Math.min(GROUND, s.y + s.vy * dt);
  if (s.y >= GROUND) s.vy = 0;

  s.speed = Math.min(s.maxSpeed, s.speed + s.accel * dt);
  s.distance += s.speed * dt;
  const before = s.score;
  s.score = Math.floor(s.distance / 10);
  if (Math.floor(before / 100) !== Math.floor(s.score / 100) && s.score > 0) {
    s.events.push('coin');
    s.hiScoreFlash = 0.8;
  }
  s.hiScoreFlash = Math.max(0, s.hiScoreFlash - dt);
  s.leg += dt * s.speed * 0.03;

  s.next -= dt;
  if (s.next <= 0) spawn(s, random);
  const box = playerBox(s);
  for (const ob of s.obstacles) {
    ob.x -= (s.speed + (ob.kind === 'bird' ? 60 : 0)) * dt;
    ob.flap += dt;
    // Slightly forgiving hitboxes.
    if (rectHit({ x: box.x + 6, y: box.y + 6, w: box.w - 12, h: box.h - 8 }, { x: ob.x + 3, y: ob.y + 3, w: ob.w - 6, h: ob.h - 4 })) {
      s.over = true;
      s.events.push('hit');
    }
  }
  const leaving = s.obstacles.filter((o) => o.x + o.w < 0);
  s.birdsDodged += leaving.filter((o) => o.kind === 'bird').length;
  s.obstacles = s.obstacles.filter((o) => o.x + o.w >= 0);
}

function drawCactus(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, ink: string) {
  fillRound(ctx, x + w / 2 - 5, y, 10, h, 5, ink);
  fillRound(ctx, x, y + h * 0.3, 6, h * 0.35, 3, ink);
  fillRound(ctx, x, y + h * 0.55, w / 2, 5, 2, ink);
  fillRound(ctx, x + w - 6, y + h * 0.2, 6, h * 0.3, 3, ink);
  fillRound(ctx, x + w / 2, y + h * 0.45, w / 2, 5, 2, ink);
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  // Day turns to night every 700 points.
  const night = Math.floor(s.score / 700) % 2 === 1;
  const sky = night ? '#111827' : '#fef9ee';
  const ink = night ? '#e5e7eb' : '#4b5563';
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  if (night) {
    circle(ctx, 520, 50, 16, '#f3f4f6');
    circle(ctx, 527, 45, 14, sky);
  } else circle(ctx, 540, 50, 20, '#fde68a');
  // Distant dunes and clouds.
  for (let i = 0; i < 4; i++) {
    const x = ((i * 200 - s.distance * 0.15) % (W + 200) + W + 200) % (W + 200) - 100;
    ctx.fillStyle = night ? '#374151' : '#e7d8b8';
    ctx.beginPath();
    ctx.ellipse(x, GROUND + 6, 120, 34, 0, Math.PI, 0);
    ctx.fill();
  }
  ctx.fillStyle = ink;
  ctx.fillRect(0, GROUND, W, 2);
  for (let i = 0; i < 30; i++) {
    const x = ((i * 53 - s.distance) % W + W) % W;
    ctx.fillRect(x, GROUND + 6 + (i % 3) * 6, 3 + (i % 4), 2);
  }
  for (const ob of s.obstacles) {
    if (ob.kind === 'bird') {
      const up = Math.sin(ob.flap * 14) > 0;
      ctx.fillStyle = ink;
      fillRound(ctx, ob.x + 8, ob.y + 8, 28, 12, 6, ink);
      circle(ctx, ob.x + 36, ob.y + 11, 6, ink);
      ctx.beginPath();
      ctx.moveTo(ob.x + 42, ob.y + 10);
      ctx.lineTo(ob.x + 50, ob.y + 13);
      ctx.lineTo(ob.x + 42, ob.y + 15);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(ob.x + 14, ob.y + 12);
      ctx.lineTo(ob.x + 24, up ? ob.y - 8 : ob.y + 30);
      ctx.lineTo(ob.x + 30, ob.y + 12);
      ctx.fill();
    } else if (ob.kind === 'cactus-group') {
      drawCactus(ctx, ob.x, ob.y + 6, 16, ob.h - 6, ink);
      drawCactus(ctx, ob.x + 18, ob.y, 18, ob.h, ink);
      drawCactus(ctx, ob.x + 38, ob.y + 8, 16, ob.h - 8, ink);
    } else drawCactus(ctx, ob.x, ob.y, ob.w, ob.h, ink);
  }
  // The dinosaur: rounded body, tail, head, legs that alternate while running.
  const green = night ? '#86efac' : '#16a34a';
  const box = playerBox(s);
  const ducking = s.ducking && s.y >= GROUND;
  const top = box.y;
  ctx.fillStyle = green;
  if (ducking) {
    fillRound(ctx, X, top + 4, 44, 20, 10, green);
    fillRound(ctx, X + 30, top, 24, 16, 7, green);
  } else {
    fillRound(ctx, X + 4, top + 14, 28, 24, 10, green);
    fillRound(ctx, X + 18, top, 24, 20, 8, green);
    ctx.beginPath();
    ctx.moveTo(X + 6, top + 20);
    ctx.lineTo(X - 8, top + 30);
    ctx.lineTo(X + 8, top + 32);
    ctx.fill();
  }
  circle(ctx, ducking ? X + 46 : X + 34, top + 6, 3, sky);
  const step = s.y < GROUND ? 0 : Math.floor(s.leg) % 2;
  ctx.fillStyle = green;
  ctx.fillRect(X + 10, GROUND - 10 + (step ? -4 : 0), 6, 10 - (step ? 4 : 0));
  ctx.fillRect(X + 22, GROUND - 10 + (step ? 0 : -4), 6, 10 - (step ? 0 : 4));
  text(ctx, String(s.score).padStart(5, '0'), W - 16, 22, { size: 18, color: s.hiScoreFlash > 0 && Math.floor(s.hiScoreFlash * 8) % 2 ? sky : ink, align: 'right' });
}

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create,
  update,
  render,
  hud: (s) => [
    { label: 'Score', value: s.score },
    { label: 'Speed', value: `${Math.round(s.speed / 10)}` },
  ],
  result: (s) => ({
    score: s.score,
    title: 'Ouch!',
    details: [
      { label: 'Distance', value: `${Math.round(s.distance / 100)} m` },
      { label: 'Birds dodged', value: String(s.birdsDodged) },
    ],
  }),
  onEnd: (s) => {
    void reportProgress('dino-runner.score-500', s.score);
    void reportProgress('dino-runner.score-1500', s.score);
    void reportProgress('dino-runner.night', s.score >= 700 ? 1 : 0);
    void reportProgress('dino-runner.birds', s.birdsDodged);
    void incrementProgress('dino-runner.runs');
  },
  touch: { pad: 'none', buttons: [{ action: 'down', label: 'Duck' }, { action: 'action', label: 'Jump' }] },
  startHint: 'Space / ↑ / tap to jump, ↓ to duck. Avoid cacti and birds.',
};
