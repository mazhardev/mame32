import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState, clamp } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { burst, circle, drawSparks, fillRound, text, updateSparks } from '../_shared/arcade/draw';
import type { Spark } from '../_shared/arcade/draw';

/**
 * Air hockey against the computer. Mallets are treated as infinitely heavy:
 * the puck reflects off a moving mallet with the mallet's velocity added, so
 * a fast swipe makes a fast shot. Physics runs in sub-steps so a hard shot
 * cannot tunnel through a mallet or a wall.
 */
export const W = 360;
export const H = 600;
export const PUCK_R = 15;
export const MALLET_R = 25;
export const GOAL_W = 120;
export const TARGET = 7;
const WALL_E = 0.9;
const MALLET_E = 0.85;
const MAX_PUCK = 1500;
const SUBSTEPS = 6;

export interface Body {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface AiConfig {
  speed: number;
  /** Seconds between re-reading the puck. */
  think: number;
  /** How far into its half the computer will chase the puck (0–1). */
  attack: number;
  /** Random offset of its defensive line, in pixels. */
  wobble: number;
  /** How much it reads the puck's path rather than its current position (0–1). */
  predict: number;
}

const AI: Record<DifficultySetting, AiConfig> = {
  easy: { speed: 330, think: 0.22, attack: 0.55, wobble: 34, predict: 0 },
  normal: { speed: 480, think: 0.14, attack: 0.8, wobble: 20, predict: 0.55 },
  hard: { speed: 720, think: 0.06, attack: 1, wobble: 6, predict: 1 },
};

export interface State extends BaseState {
  puck: Body;
  me: Body;
  cpu: Body;
  goals: [number, number];
  pause: number;
  message: string;
  ai: AiConfig;
  aiGoal: { x: number; y: number };
  aiThink: number;
  follow: boolean;
  lastPointer: { x: number; y: number };
  sparks: Spark[];
  fastest: number;
}

export function create(difficulty: DifficultySetting): State {
  return {
    ...baseState(),
    puck: { x: W / 2, y: H * 0.68, vx: 0, vy: 0 },
    me: { x: W / 2, y: H - 70, vx: 0, vy: 0 },
    cpu: { x: W / 2, y: 70, vx: 0, vy: 0 },
    goals: [0, 0],
    pause: 0,
    message: '',
    ai: AI[difficulty],
    aiGoal: { x: W / 2, y: 70 },
    aiThink: 0,
    follow: false,
    lastPointer: { x: -1, y: -1 },
    sparks: [],
    fastest: 0,
  };
}

/** Keeps a mallet inside its own half. */
export function clampMallet(m: Body, top: boolean) {
  m.x = clamp(m.x, MALLET_R, W - MALLET_R);
  m.y = top ? clamp(m.y, MALLET_R, H / 2 - MALLET_R) : clamp(m.y, H / 2 + MALLET_R, H - MALLET_R);
}

/** Moves a mallet towards (x, y) at no more than `speed`, recording its velocity. */
function steer(m: Body, x: number, y: number, speed: number, dt: number, top: boolean) {
  const dx = x - m.x;
  const dy = y - m.y;
  const d = Math.hypot(dx, dy);
  const step = Math.min(d, speed * dt);
  const ox = m.x;
  const oy = m.y;
  if (d > 0) {
    m.x += (dx / d) * step;
    m.y += (dy / d) * step;
  }
  clampMallet(m, top);
  m.vx = (m.x - ox) / dt;
  m.vy = (m.y - oy) / dt;
}

/** Puck against a mallet; returns true on contact. */
export function collide(p: Body, m: Body): boolean {
  const dx = p.x - m.x;
  const dy = p.y - m.y;
  const d = Math.hypot(dx, dy);
  const min = PUCK_R + MALLET_R;
  if (d >= min || d === 0) return false;
  const nx = dx / d;
  const ny = dy / d;
  p.x = m.x + nx * min;
  p.y = m.y + ny * min;
  const rel = (p.vx - m.vx) * nx + (p.vy - m.vy) * ny;
  if (rel < 0) {
    p.vx -= (1 + MALLET_E) * rel * nx;
    p.vy -= (1 + MALLET_E) * rel * ny;
  }
  const sp = Math.hypot(p.vx, p.vy);
  if (sp > MAX_PUCK) {
    p.vx *= MAX_PUCK / sp;
    p.vy *= MAX_PUCK / sp;
  }
  return true;
}

/**
 * Moves the puck one sub-step and bounces it off the boards. Returns the side
 * that scored (0 = you, 1 = computer) when the puck leaves through a goal.
 */
export function movePuck(p: Body, dt: number): 0 | 1 | null {
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  if (p.x < PUCK_R) {
    p.x = PUCK_R;
    p.vx = Math.abs(p.vx) * WALL_E;
  } else if (p.x > W - PUCK_R) {
    p.x = W - PUCK_R;
    p.vx = -Math.abs(p.vx) * WALL_E;
  }
  const inMouth = Math.abs(p.x - W / 2) < GOAL_W / 2 - PUCK_R * 0.4;
  if (p.y < PUCK_R && !inMouth) {
    p.y = PUCK_R;
    p.vy = Math.abs(p.vy) * WALL_E;
  } else if (p.y > H - PUCK_R && !inMouth) {
    p.y = H - PUCK_R;
    p.vy = -Math.abs(p.vy) * WALL_E;
  }
  if (p.y < -PUCK_R) return 0;
  if (p.y > H + PUCK_R) return 1;
  return null;
}

function aiPlan(s: State, random: () => number) {
  const p = s.puck;
  const a = s.ai;
  const inMyHalf = p.y < H / 2;
  const reachLine = (H / 2) * a.attack;
  if (inMyHalf && p.y < reachLine + PUCK_R && (p.vy < 160 || p.y < 120)) {
    // Attack: get behind the puck on the line towards your goal and drive through it.
    const gx = W / 2 + (random() - 0.5) * GOAL_W * 0.6;
    const gy = H + 40;
    const dx = gx - p.x;
    const dy = gy - p.y;
    const d = Math.hypot(dx, dy) || 1;
    const behind = {
      x: p.x - (dx / d) * (MALLET_R + PUCK_R - 6),
      y: p.y - (dy / d) * (MALLET_R + PUCK_R - 6),
    };
    const lined = Math.hypot(s.cpu.x - behind.x, s.cpu.y - behind.y) < 14 || s.cpu.y < p.y - 10;
    s.aiGoal = lined ? { x: p.x + (dx / d) * 30, y: p.y + (dy / d) * 30 } : behind;
  } else {
    // Defend: stand between the puck and the goal, predicting its crossing.
    let px = p.x;
    if (p.vy < -40) {
      const t = (p.y - 80) / -p.vy;
      let ahead = p.x + p.vx * t;
      while (ahead < 0 || ahead > W) ahead = ahead < 0 ? -ahead : 2 * W - ahead;
      px = p.x + (ahead - p.x) * a.predict;
    }
    const x =
      W / 2 + clamp(px - W / 2, -GOAL_W * 0.75, GOAL_W * 0.75) + (random() - 0.5) * a.wobble;
    s.aiGoal = { x, y: 62 };
  }
}

function resetAfterGoal(s: State, scorer: 0 | 1) {
  s.puck = { x: W / 2, y: scorer === 0 ? H * 0.32 : H * 0.68, vx: 0, vy: 0 };
  s.me.x = W / 2;
  s.me.y = H - 70;
  s.cpu.x = W / 2;
  s.cpu.y = 70;
  s.me.vx = s.me.vy = s.cpu.vx = s.cpu.vy = 0;
}

export function update(s: State, dt: number, input: Input, random: () => number) {
  updateSparks(s.sparks, dt);
  if (s.pause > 0) {
    s.pause -= dt;
    return;
  }

  // Your mallet: pointer if it moved last, else the keys.
  const ptr = input.pointer;
  const kx = (input.held.has('right') ? 1 : 0) - (input.held.has('left') ? 1 : 0);
  const ky = (input.held.has('down') ? 1 : 0) - (input.held.has('up') ? 1 : 0);
  if (kx || ky) s.follow = false;
  if (ptr.active && (ptr.x !== s.lastPointer.x || ptr.y !== s.lastPointer.y || ptr.down)) {
    s.follow = true;
    s.lastPointer = { x: ptr.x, y: ptr.y };
  }
  const tx = s.follow ? ptr.x : s.me.x + kx * 60;
  const ty = s.follow ? ptr.y : s.me.y + ky * 60;
  steer(s.me, tx, ty, s.follow ? 1600 : 560, dt, false);

  s.aiThink -= dt;
  if (s.aiThink <= 0) {
    aiPlan(s, random);
    s.aiThink = s.ai.think;
  }
  steer(s.cpu, s.aiGoal.x, s.aiGoal.y, s.ai.speed, dt, true);

  const h = dt / SUBSTEPS;
  for (let i = 0; i < SUBSTEPS; i++) {
    const scored = movePuck(s.puck, h);
    if (scored !== null) {
      s.goals[scored] += 1;
      s.score = s.goals[0] * 100 + Math.max(0, s.goals[0] - s.goals[1]) * 20;
      s.events.push(scored === 0 ? 'success' : 'failure');
      s.message = scored === 0 ? 'Goal!' : 'Computer scores';
      s.pause = 1.1;
      burst(
        s.sparks,
        W / 2,
        scored === 0 ? 4 : H - 4,
        scored === 0 ? '#38bdf8' : '#f97316',
        24,
        260,
        random,
      );
      if (s.goals[scored] >= TARGET) {
        if (scored === 0) s.score += 300 + (s.goals[1] === 0 ? 200 : 0);
        s.over = true;
        s.events.push(scored === 0 ? 'levelComplete' : 'gameOver');
      }
      resetAfterGoal(s, scored);
      return;
    }
    const hitMe = collide(s.puck, s.me);
    const hitCpu = collide(s.puck, s.cpu);
    if ((hitMe || hitCpu) && i === 0) s.events.push('hit');
  }
  const sp = Math.hypot(s.puck.vx, s.puck.vy);
  s.fastest = Math.max(s.fastest, sp);
  const drag = 1 - 0.18 * dt;
  s.puck.vx *= drag;
  s.puck.vy *= drag;
  // A puck stuck dead in a corner is nudged back into play.
  if (sp < 8 && (s.puck.x < 40 || s.puck.x > W - 40)) s.puck.vx += (W / 2 - s.puck.x) * 0.5 * dt;
}

function mallet(ctx: CanvasRenderingContext2D, m: Body, color: string) {
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.arc(m.x + 3, m.y + 5, MALLET_R, 0, Math.PI * 2);
  ctx.fill();
  circle(ctx, m.x, m.y, MALLET_R, color);
  circle(ctx, m.x, m.y, MALLET_R * 0.62, 'rgba(255,255,255,0.25)');
  circle(ctx, m.x, m.y, MALLET_R * 0.42, color);
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#e0f2fe';
  ctx.fillRect(6, 6, W - 12, H - 12);
  ctx.strokeStyle = 'rgba(14,116,144,0.5)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(6, H / 2);
  ctx.lineTo(W - 6, H / 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(W / 2, H / 2, 50, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(220,38,38,0.45)';
  ctx.beginPath();
  ctx.arc(W / 2, 6, GOAL_W * 0.7, 0, Math.PI);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(W / 2, H - 6, GOAL_W * 0.7, Math.PI, Math.PI * 2);
  ctx.stroke();
  // Air holes.
  ctx.fillStyle = 'rgba(14,116,144,0.18)';
  for (let y = 30; y < H; y += 30)
    for (let x = 30; x < W; x += 30) ctx.fillRect(x - 1, y - 1, 2, 2);
  ctx.fillStyle = '#111827';
  ctx.fillRect(W / 2 - GOAL_W / 2, 0, GOAL_W, 8);
  ctx.fillRect(W / 2 - GOAL_W / 2, H - 8, GOAL_W, 8);

  const p = s.puck;
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.arc(p.x + 2, p.y + 4, PUCK_R, 0, Math.PI * 2);
  ctx.fill();
  circle(ctx, p.x, p.y, PUCK_R, '#111827');
  circle(ctx, p.x, p.y, PUCK_R * 0.6, '#374151');
  mallet(ctx, s.cpu, '#ea580c');
  mallet(ctx, s.me, '#0284c7');
  drawSparks(ctx, s.sparks);

  text(ctx, String(s.goals[1]), W - 26, H / 2 - 26, { size: 26, color: 'rgba(234,88,12,0.75)' });
  text(ctx, String(s.goals[0]), W - 26, H / 2 + 28, { size: 26, color: 'rgba(2,132,199,0.75)' });
  if (s.pause > 0 && s.message) {
    fillRound(ctx, 60, H / 2 - 24, W - 120, 48, 12, 'rgba(15,23,42,0.82)');
    text(ctx, s.message, W / 2, H / 2, { size: 22 });
  }
}

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create,
  update,
  render,
  hud: (s) => [
    { label: 'You', value: s.goals[0] },
    { label: 'Computer', value: s.goals[1] },
    { label: 'First to', value: TARGET },
  ],
  result: (s) => {
    const won = s.goals[0] >= TARGET;
    return {
      score: s.score,
      won,
      lost: !won,
      title: won
        ? `You win ${s.goals[0]}–${s.goals[1]}`
        : `Computer wins ${s.goals[1]}–${s.goals[0]}`,
      details: [
        { label: 'Score', value: `${s.goals[0]}–${s.goals[1]}` },
        { label: 'Fastest puck', value: `${Math.round(s.fastest / 10)} km/h` },
      ],
    };
  },
  onEnd: (s, difficulty) => {
    void incrementProgress('air-hockey.goals', s.goals[0]);
    if (s.goals[0] < TARGET) return;
    void reportProgress('air-hockey.win', 1);
    if (s.goals[1] === 0) void reportProgress('air-hockey.shutout', 1);
    if (difficulty === 'hard') void reportProgress('air-hockey.hard', 1);
  },
  touch: { pad: 'none' },
  startHint:
    'Drag your blue mallet (or use the arrow keys) and strike the puck into the top goal. First to 7.',
};
