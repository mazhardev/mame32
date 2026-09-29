import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState, circleHit } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { burst, circle, drawSparks, starfield, text, updateSparks } from '../_shared/arcade/draw';
import type { Spark } from '../_shared/arcade/draw';

/**
 * Alien Shooter: aliens swoop in on curved flight paths, settle into a
 * formation at the top, and then peel off to dive-bomb your ship. Clear
 * the whole squadron to reach the next stage.
 */
export const W = 420;
export const H = 620;
const PLAYER_Y = H - 50;
const COLS = 8;
const ROWS = 4;

type Mode = 'entering' | 'formation' | 'diving' | 'returning';
type Pt = [number, number];

export interface Alien {
  slot: number;
  row: number;
  mode: Mode;
  t: number;
  path: Pt[];
  x: number;
  y: number;
  delay: number;
  alive: boolean;
  shots: number;
}

export interface Shot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  enemy: boolean;
}

export interface State extends BaseState {
  px: number;
  lives: number;
  invuln: number;
  aliens: Alien[];
  shots: Shot[];
  stage: number;
  diveT: number;
  diveRate: number;
  breathe: number;
  sparks: Spark[];
  kills: number;
  stageT: number;
}

const SETTINGS: Record<DifficultySetting, { dive: number; lives: number }> = {
  easy: { dive: 3.4, lives: 4 },
  normal: { dive: 2.4, lives: 3 },
  hard: { dive: 1.6, lives: 3 },
};

/** Cubic Bézier point. */
export function bezier(p: Pt[], t: number): Pt {
  const u = 1 - t;
  const [a, b, c, d] = p;
  return [
    u ** 3 * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t ** 3 * d[0],
    u ** 3 * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t ** 3 * d[1],
  ];
}

export function slotPos(s: Pick<State, 'breathe'>, slot: number): Pt {
  const col = slot % COLS;
  const row = Math.floor(slot / COLS);
  const spread = 1 + Math.sin(s.breathe) * 0.06;
  const cx = W / 2 + (col - (COLS - 1) / 2) * 42 * spread;
  return [cx, 80 + row * 38];
}

function newStage(s: State) {
  s.aliens = [];
  for (let slot = 0; slot < COLS * ROWS; slot++) {
    const group = Math.floor(slot / 8);
    const fromLeft = group % 2 === 0;
    const [sx, sy] = slotPos(s, slot);
    const start: Pt = [fromLeft ? -30 : W + 30, 140 + group * 30];
    s.aliens.push({
      slot,
      row: Math.floor(slot / COLS),
      mode: 'entering',
      t: 0,
      path: [start, [fromLeft ? W * 0.8 : W * 0.2, H * 0.55], [fromLeft ? W * 0.1 : W * 0.9, H * 0.35], [sx, sy]],
      x: start[0],
      y: start[1],
      delay: group * 1.3 + (slot % 8) * 0.12,
      alive: true,
      shots: 0,
    });
  }
  s.diveT = 3;
  s.stageT = 0;
}

export function create(difficulty: DifficultySetting): State {
  const c = SETTINGS[difficulty];
  const s: State = {
    ...baseState(),
    px: W / 2,
    lives: c.lives,
    invuln: 0,
    aliens: [],
    shots: [],
    stage: 1,
    diveT: 3,
    diveRate: c.dive,
    breathe: 0,
    sparks: [],
    kills: 0,
    stageT: 0,
  };
  newStage(s);
  return s;
}

const POINTS = [150, 80, 80, 50];

export function update(s: State, dt: number, input: Input, random: () => number) {
  updateSparks(s.sparks, dt);
  s.breathe += dt * 1.5;
  s.stageT += dt;
  s.invuln = Math.max(0, s.invuln - dt);
  const move = (input.held.has('right') ? 1 : 0) - (input.held.has('left') ? 1 : 0);
  if (input.pointer.down) s.px += Math.sign(input.pointer.x - s.px) * Math.min(Math.abs(input.pointer.x - s.px), 300 * dt);
  s.px = Math.max(18, Math.min(W - 18, s.px + move * 300 * dt));
  const fire = input.pressed.has('action') || input.pressed.has('up') || input.pointer.pressed;
  if (fire && s.shots.filter((b) => !b.enemy).length < 2) {
    s.shots.push({ x: s.px, y: PLAYER_Y - 16, vx: 0, vy: -560, enemy: false });
    s.events.push('shoot');
  }

  // Launch a diver (sometimes a pair) from the formation.
  s.diveT -= dt;
  const resting = s.aliens.filter((a) => a.alive && a.mode === 'formation');
  if (s.diveT <= 0 && resting.length) {
    const n = random() < 0.3 ? 2 : 1;
    for (let k = 0; k < n && resting.length; k++) {
      const a = resting.splice(Math.floor(random() * resting.length), 1)[0];
      const dir = a.x < W / 2 ? -1 : 1;
      a.mode = 'diving';
      a.t = 0;
      a.shots = 0;
      a.path = [[a.x, a.y], [a.x + dir * 90, a.y - 50], [s.px + (random() - 0.5) * 80, H * 0.7], [s.px + dir * 70, H + 40]];
    }
    s.diveT = s.diveRate * Math.pow(0.9, s.stage - 1) * (0.6 + random() * 0.8);
  }

  for (const a of s.aliens) {
    if (!a.alive) continue;
    if (a.mode === 'entering') {
      if (a.delay > 0) {
        a.delay -= dt;
        continue;
      }
      a.t += dt / 2.2;
      a.path[3] = slotPos(s, a.slot);
      [a.x, a.y] = bezier(a.path, Math.min(1, a.t));
      if (a.t >= 1) a.mode = 'formation';
    } else if (a.mode === 'formation') {
      [a.x, a.y] = slotPos(s, a.slot);
    } else if (a.mode === 'diving') {
      a.t += dt / 2.4;
      [a.x, a.y] = bezier(a.path, Math.min(1, a.t));
      // Fire once or twice on the way down.
      if (a.shots < 2 && a.y > 200 && a.y < PLAYER_Y - 100 && random() < dt * 2.5) {
        a.shots += 1;
        s.shots.push({ x: a.x, y: a.y, vx: (s.px - a.x) * 0.3, vy: 260, enemy: true });
      }
      if (a.t >= 1) {
        a.mode = 'returning';
        a.t = 0;
        a.x = slotPos(s, a.slot)[0];
        a.y = -30;
      }
    } else {
      const [sx, sy] = slotPos(s, a.slot);
      a.y += 200 * dt;
      a.x += (sx - a.x) * Math.min(1, dt * 3);
      if (a.y >= sy) a.mode = 'formation';
    }
  }

  for (const b of s.shots) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
  }
  for (const b of s.shots) {
    if (b.enemy) continue;
    const hit = s.aliens.find((a) => a.alive && a.delay <= 0 && circleHit(b.x, b.y, 3, a.x, a.y, 14));
    if (hit) {
      hit.alive = false;
      b.y = -999;
      // Divers are worth double.
      s.score += POINTS[hit.row] * (hit.mode === 'diving' ? 2 : 1);
      s.kills += 1;
      burst(s.sparks, hit.x, hit.y, '#fde047', 12, 150, random);
      s.events.push('explosion');
    }
  }
  if (s.invuln <= 0) {
    const bullet = s.shots.find((b) => b.enemy && circleHit(b.x, b.y, 4, s.px, PLAYER_Y, 12));
    const rammer = s.aliens.find((a) => a.alive && a.mode === 'diving' && circleHit(a.x, a.y, 13, s.px, PLAYER_Y, 12));
    if (bullet || rammer) {
      if (bullet) bullet.y = H + 999;
      if (rammer) rammer.alive = false;
      s.lives -= 1;
      s.invuln = 2;
      burst(s.sparks, s.px, PLAYER_Y, '#38bdf8', 26, 200, random);
      s.events.push('explosion');
      if (s.lives <= 0) s.over = true;
    }
  }
  s.shots = s.shots.filter((b) => b.y > -20 && b.y < H + 20);
  if (!s.aliens.some((a) => a.alive) && !s.over) {
    s.stage += 1;
    s.score += 500;
    s.events.push('levelComplete');
    newStage(s);
  }
}

function drawAlien(ctx: CanvasRenderingContext2D, a: Alien, time: number) {
  const colors = ['#f472b6', '#facc15', '#facc15', '#34d399'];
  const wing = Math.sin(time * 12 + a.slot) > 0 ? 1 : 0.6;
  ctx.fillStyle = colors[a.row];
  ctx.beginPath();
  ctx.ellipse(a.x - 9, a.y, 8 * wing, 5, -0.4, 0, Math.PI * 2);
  ctx.ellipse(a.x + 9, a.y, 8 * wing, 5, 0.4, 0, Math.PI * 2);
  ctx.fill();
  circle(ctx, a.x, a.y, 7, a.row === 0 ? '#be185d' : '#b45309');
  circle(ctx, a.x - 3, a.y - 2, 2, '#fff');
  circle(ctx, a.x + 3, a.y - 2, 2, '#fff');
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  ctx.fillStyle = '#030712';
  ctx.fillRect(0, 0, W, H);
  starfield(ctx, W, H, s.time * 40, 80);
  for (const a of s.aliens) if (a.alive && a.delay <= 0) drawAlien(ctx, a, s.time);
  for (const b of s.shots) {
    if (b.enemy) circle(ctx, b.x, b.y, 3.5, '#f87171');
    else {
      ctx.fillStyle = '#e0f2fe';
      ctx.fillRect(b.x - 1.5, b.y - 7, 3, 12);
    }
  }
  if (!s.over && (s.invuln <= 0 || Math.floor(s.invuln * 10) % 2)) {
    ctx.fillStyle = '#e5e7eb';
    ctx.beginPath();
    ctx.moveTo(s.px, PLAYER_Y - 18);
    ctx.lineTo(s.px - 16, PLAYER_Y + 12);
    ctx.lineTo(s.px + 16, PLAYER_Y + 12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(s.px - 16, PLAYER_Y + 4, 6, 8);
    ctx.fillRect(s.px + 10, PLAYER_Y + 4, 6, 8);
  }
  drawSparks(ctx, s.sparks);
  text(ctx, String(s.score), 14, 22, { size: 16, align: 'left' });
  text(ctx, `Stage ${s.stage}`, W / 2, 22, { size: 14, color: '#c4b5fd' });
  text(ctx, '▲'.repeat(Math.max(0, s.lives)), W - 14, 22, { size: 14, align: 'right', color: '#e5e7eb' });
  if (s.stageT < 2) text(ctx, `STAGE ${s.stage}`, W / 2, H / 2, { size: 30, color: '#a5b4fc' });
}

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create,
  update,
  render,
  hud: (s) => [
    { label: 'Score', value: s.score },
    { label: 'Stage', value: s.stage },
    { label: 'Lives', value: s.lives },
  ],
  result: (s) => ({
    score: s.score,
    title: 'Squadron lost',
    details: [
      { label: 'Stage reached', value: String(s.stage) },
      { label: 'Aliens downed', value: String(s.kills) },
    ],
  }),
  onEnd: (s) => {
    void reportProgress('alien-shooter.stage-2', s.stage);
    void reportProgress('alien-shooter.stage-5', s.stage);
    void reportProgress('alien-shooter.score', s.score);
    void incrementProgress('alien-shooter.kills', s.kills);
  },
  touch: { pad: 'horizontal', buttons: [{ action: 'action', label: 'Fire' }] },
  pointerStarts: false,
  startHint: '← → move, Space fires. Divers are worth double!',
};
