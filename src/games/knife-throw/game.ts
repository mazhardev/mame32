import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { burst, circle, drawSparks, gradientBg, text, updateSparks } from '../_shared/arcade/draw';
import type { Spark } from '../_shared/arcade/draw';

/**
 * Knife Throw: throw knives into a spinning log. A knife that hits another
 * knife bounces off and ends the game. Stick all of a stage's knives to
 * split the log and move on; every fifth log is a tough "boss" log.
 */
export const W = 360;
export const H = 640;
export const LOG_X = W / 2;
export const LOG_Y = 210;
export const LOG_R = 72;
const KNIFE_LEN = 64;
const THROW_Y = H - 110;
const THROW_SPEED = 1500;

export interface State extends BaseState {
  stage: number;
  rotation: number;
  spin: number;
  spinTime: number;
  pattern: number;
  /** Local angles (relative to the log's rotation) of stuck knives. */
  knives: number[];
  apples: number[];
  left: number;
  flying: number | null;
  bounced: { x: number; y: number; vx: number; vy: number; a: number } | null;
  apples_hit: number;
  sparks: Spark[];
  splitT: number;
  gapAngle: number;
  speedScale: number;
}

const SETTINGS: Record<DifficultySetting, { gap: number; speed: number }> = {
  easy: { gap: 0.19, speed: 0.85 },
  normal: { gap: 0.16, speed: 1 },
  hard: { gap: 0.14, speed: 1.25 },
};

const norm = (a: number) => ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
export function angleGap(a: number, b: number): number {
  const d = Math.abs(norm(a) - norm(b));
  return Math.min(d, Math.PI * 2 - d);
}

export function setupStage(s: State, random: () => number) {
  const boss = s.stage % 5 === 0;
  s.knives = [];
  s.apples = [];
  const preset = boss ? 3 : Math.min(3, Math.floor(s.stage / 2));
  for (let i = 0; i < preset; i++) {
    let a = random() * Math.PI * 2;
    for (let t = 0; t < 20 && s.knives.some((k) => angleGap(k, a) < 0.6); t++) a = random() * Math.PI * 2;
    s.knives.push(a);
  }
  if (random() < 0.6) {
    let a = random() * Math.PI * 2;
    for (let t = 0; t < 20 && s.knives.some((k) => angleGap(k, a) < 0.5); t++) a = random() * Math.PI * 2;
    s.apples.push(a);
  }
  s.left = boss ? 9 : 5 + Math.min(4, Math.floor(s.stage / 2));
  s.pattern = boss ? 3 : (s.stage - 1) % 3;
  s.spin = (1.6 + s.stage * 0.08) * s.speedScale * (random() < 0.5 ? 1 : -1);
  s.spinTime = 0;
}

export function create(difficulty: DifficultySetting, random: () => number = Math.random): State {
  const c = SETTINGS[difficulty];
  const s: State = {
    ...baseState(),
    stage: 1,
    rotation: 0,
    spin: 0,
    spinTime: 0,
    pattern: 0,
    knives: [],
    apples: [],
    left: 0,
    flying: null,
    bounced: null,
    apples_hit: 0,
    sparks: [],
    splitT: 0,
    gapAngle: c.gap,
    speedScale: c.speed,
  };
  setupStage(s, random);
  return s;
}

/** Angular speed of the log over time for each rotation pattern. */
function angularSpeed(s: State): number {
  const t = s.spinTime;
  switch (s.pattern) {
    case 1:
      return s.spin * (0.4 + 0.9 * Math.abs(Math.sin(t * 1.2)));
    case 2:
      return s.spin * (Math.floor(t / 2.2) % 2 ? -1 : 1);
    case 3:
      return s.spin * (Math.sin(t * 0.9) * 1.6);
    default:
      return s.spin;
  }
}

/** The knife hits the log's bottom point: its local angle there. */
export function impactAngle(rotation: number): number {
  return norm(Math.PI / 2 - rotation);
}

/** Resolves a knife arriving at the log. Returns 'stick', 'bounce'. */
export function land(s: State, random: () => number): 'stick' | 'bounce' {
  const a = impactAngle(s.rotation);
  if (s.knives.some((k) => angleGap(k, a) < s.gapAngle)) {
    s.bounced = { x: LOG_X, y: LOG_Y + LOG_R, vx: (random() - 0.5) * 300, vy: 500, a: 0 };
    s.over = true;
    s.events.push('hit');
    return 'bounce';
  }
  s.knives.push(a);
  s.left -= 1;
  s.score += 1;
  s.events.push('pop');
  burst(s.sparks, LOG_X, LOG_Y + LOG_R, '#fcd34d', 6, 120, random);
  const apple = s.apples.findIndex((p) => angleGap(p, a) < 0.25);
  if (apple >= 0) {
    s.apples.splice(apple, 1);
    s.apples_hit += 1;
    s.score += 5;
    s.events.push('coin');
    burst(s.sparks, LOG_X, LOG_Y + LOG_R, '#ef4444', 10, 160, random);
  }
  if (s.left === 0) {
    s.splitT = 0.7;
    s.score += 3;
    s.events.push('levelComplete');
  }
  return 'stick';
}

export function update(s: State, dt: number, input: Input, random: () => number) {
  updateSparks(s.sparks, dt, 600);
  if (s.splitT > 0) {
    s.splitT -= dt;
    if (s.splitT <= 0) {
      s.stage += 1;
      setupStage(s, random);
    }
    return;
  }
  s.spinTime += dt;
  s.rotation += angularSpeed(s) * dt;
  if ((input.pressed.has('action') || input.pressed.has('up') || input.pointer.pressed) && s.flying === null && s.left > 0) {
    s.flying = THROW_Y;
    s.events.push('whoosh');
  }
  if (s.flying !== null) {
    s.flying -= THROW_SPEED * dt;
    if (s.flying <= LOG_Y + LOG_R) {
      s.flying = null;
      land(s, random);
    }
  }
}

function drawKnife(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  // Blade points "up" in local space (towards negative y).
  ctx.fillStyle = '#e5e7eb';
  ctx.beginPath();
  ctx.moveTo(0, -KNIFE_LEN / 2);
  ctx.lineTo(6, -KNIFE_LEN / 2 + 14);
  ctx.lineTo(5, 4);
  ctx.lineTo(-5, 4);
  ctx.lineTo(-6, -KNIFE_LEN / 2 + 14);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#7c2d12';
  ctx.fillRect(-5, 4, 10, KNIFE_LEN / 2 - 4);
  ctx.fillStyle = '#9ca3af';
  ctx.fillRect(-8, 2, 16, 4);
  ctx.restore();
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  gradientBg(ctx, W, H, '#1e293b', '#0f172a');
  const boss = s.stage % 5 === 0;
  // Stuck knives point towards the centre from outside the rim.
  for (const k of s.knives) {
    const a = k + s.rotation;
    const x = LOG_X + Math.cos(a) * (LOG_R + KNIFE_LEN / 2 - 12);
    const y = LOG_Y + Math.sin(a) * (LOG_R + KNIFE_LEN / 2 - 12);
    // Local −y is the blade, so rotating by a − π/2 points it at the centre.
    drawKnife(ctx, x, y, a - Math.PI / 2);
  }
  if (s.splitT > 0) {
    const t = 0.7 - s.splitT;
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - t * 1.4);
    circle(ctx, LOG_X - t * 160, LOG_Y + t * t * 400, LOG_R, boss ? '#7f1d1d' : '#a16207');
    circle(ctx, LOG_X + t * 160, LOG_Y + t * t * 400, LOG_R, boss ? '#7f1d1d' : '#a16207');
    ctx.restore();
  } else {
    circle(ctx, LOG_X, LOG_Y, LOG_R, boss ? '#991b1b' : '#b45309');
    ctx.strokeStyle = boss ? '#7f1d1d' : '#92400e';
    ctx.lineWidth = 3;
    for (const r of [LOG_R * 0.75, LOG_R * 0.5, LOG_R * 0.25]) {
      ctx.beginPath();
      ctx.arc(LOG_X, LOG_Y, r, s.rotation, s.rotation + Math.PI * 1.7);
      ctx.stroke();
    }
    for (const p of s.apples) {
      const a = p + s.rotation;
      circle(ctx, LOG_X + Math.cos(a) * (LOG_R + 12), LOG_Y + Math.sin(a) * (LOG_R + 12), 11, '#ef4444');
      circle(ctx, LOG_X + Math.cos(a) * (LOG_R + 12) - 3, LOG_Y + Math.sin(a) * (LOG_R + 12) - 3, 3, '#fecaca');
    }
  }
  if (s.flying !== null) drawKnife(ctx, LOG_X, s.flying, 0);
  else if (!s.over && s.left > 0 && s.splitT <= 0) drawKnife(ctx, LOG_X, THROW_Y, 0);
  if (s.bounced) {
    drawKnife(ctx, s.bounced.x + 26, s.bounced.y + 46, 2.6);
  }
  drawSparks(ctx, s.sparks);
  // Remaining knives shown as ticks on the left.
  for (let i = 0; i < s.left; i++) {
    ctx.fillStyle = '#e5e7eb';
    ctx.fillRect(22, H - 60 - i * 22, 6, 16);
  }
  text(ctx, boss ? `BOSS · Stage ${s.stage}` : `Stage ${s.stage}`, W / 2, 50, { size: 20, color: boss ? '#fca5a5' : '#e2e8f0' });
  text(ctx, String(s.score), W - 24, 50, { size: 22, align: 'right' });
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
    { label: 'Knives left', value: s.left },
  ],
  result: (s) => ({
    score: s.score,
    title: 'Clang!',
    message: 'Your knife hit another knife.',
    details: [
      { label: 'Stage reached', value: String(s.stage) },
      { label: 'Apples hit', value: String(s.apples_hit) },
    ],
  }),
  onEnd: (s) => {
    void reportProgress('knife-throw.stage-5', s.stage);
    void reportProgress('knife-throw.stage-15', s.stage);
    void reportProgress('knife-throw.apples', s.apples_hit);
    void incrementProgress('knife-throw.throws', s.score);
  },
  touch: { pad: 'none' },
  startHint: 'Tap or press Space to throw. Never hit a knife that is already in the log!',
};
