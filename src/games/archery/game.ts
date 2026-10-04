import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState, clamp } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { circle, fillRound, text } from '../_shared/arcade/draw';

/**
 * Target archery against a computer archer: four ends of three arrows at 30,
 * 50, 70 and 90 metres on a 122 cm ten-ring face. Arrows drop with distance
 * and drift with the wind, and your bow arm settles, holds, then tires.
 */
export const W = 420;
export const H = 600;
export const DISTANCES = [30, 50, 70, 90];
export const ARROWS = 3;
const FACE_R = 61;
const CX = W / 2;
const CY = 270;

interface Tuning {
  /** Steady sway amplitude at 30 m (cm). */
  sway: number;
  wind: number;
  /** 2 = aim mark allows for drop and wind, 1 = drop only, 0 = none. */
  aid: number;
  ai: { mean: number; sd: number };
}

const TUNING: Record<DifficultySetting, Tuning> = {
  easy: { sway: 3, wind: 0, aid: 2, ai: { mean: 7.2, sd: 1.7 } },
  normal: { sway: 4.5, wind: 3.5, aid: 1, ai: { mean: 8.3, sd: 1.3 } },
  hard: { sway: 6, wind: 6.5, aid: 0, ai: { mean: 9.1, sd: 0.9 } },
};

export interface Arrow {
  x: number;
  y: number;
  ring: number;
}

export interface State extends BaseState {
  end: number;
  arrows: Arrow[];
  ends: number[][];
  aiEnds: number[][];
  aimX: number;
  aimY: number;
  drawT: number;
  drawing: boolean;
  phase: 'aim' | 'flight' | 'endResult';
  phaseT: number;
  last: Arrow | null;
  wind: number;
  tuning: Tuning;
  swayPhase: number;
  lastPointer: { x: number; y: number };
}

/** Ring score for a hit at (x, y) cm from the centre (10 = inner gold, 0 = miss). */
export function ringAt(x: number, y: number): number {
  const r = Math.hypot(x, y);
  if (r > FACE_R) return 0;
  return Math.min(10, 10 - Math.floor(r / 6.1));
}

/** How far an arrow falls below a 30 m sight setting (cm). */
export function dropAt(dist: number): number {
  return 0.026 * (dist * dist - 900);
}

export function driftAt(dist: number, wind: number): number {
  return wind * dist * 0.08;
}

/** Bow-arm sway (cm at the target) after holding for `held` seconds. */
export function swayAmplitude(held: number, base: number, dist: number): number {
  const settle = Math.max(0, 1 - held / 1.1) * 3;
  const fatigue = Math.max(0, held - 4) * 1.4;
  return base * (dist / 30) * (1 + settle + fatigue);
}

function gaussian(random: () => number) {
  return Math.sqrt(-2 * Math.log(Math.max(1e-9, random()))) * Math.cos(2 * Math.PI * random());
}

function startEnd(s: State, random: () => number) {
  s.arrows = [];
  s.aimX = 0;
  s.aimY = 0;
  s.drawing = false;
  s.drawT = 0;
  s.phase = 'aim';
  s.wind = s.tuning.wind ? Math.round((random() - 0.5) * 2 * s.tuning.wind * 10) / 10 : 0;
}

export function create(difficulty: DifficultySetting, random: () => number): State {
  const s: State = {
    ...baseState(),
    end: 0,
    arrows: [],
    ends: [],
    aiEnds: [],
    aimX: 0,
    aimY: 0,
    drawT: 0,
    drawing: false,
    phase: 'aim',
    phaseT: 0,
    last: null,
    wind: 0,
    tuning: TUNING[difficulty],
    swayPhase: random() * 10,
    lastPointer: { x: -1, y: -1 },
  };
  startEnd(s, random);
  return s;
}

const scale = (dist: number) => (140 / FACE_R) * (30 / dist);

export function sway(s: State): { x: number; y: number } {
  if (!s.drawing) return { x: 0, y: 0 };
  const amp = swayAmplitude(s.drawT, s.tuning.sway, DISTANCES[s.end]);
  const t = s.time + s.swayPhase;
  return {
    x: Math.sin(t * 1.9) * amp + Math.sin(t * 4.7) * amp * 0.3,
    y: Math.cos(t * 1.4) * amp * 0.8 + Math.sin(t * 3.9) * amp * 0.25,
  };
}

export function loose(s: State, random: () => number) {
  const dist = DISTANCES[s.end];
  const sw = sway(s);
  const x = s.aimX + sw.x + driftAt(dist, s.wind) + gaussian(random) * 1.2;
  const y = s.aimY + sw.y + dropAt(dist) + gaussian(random) * 1.2;
  const arrow = { x, y, ring: ringAt(x, y) };
  s.last = arrow;
  s.drawing = false;
  s.drawT = 0;
  s.phase = 'flight';
  s.phaseT = 0;
  s.events.push('whoosh');
}

function aiEnd(s: State, random: () => number): number[] {
  const dist = DISTANCES[s.end];
  const { mean, sd } = s.tuning.ai;
  return Array.from({ length: ARROWS }, () =>
    clamp(Math.round(mean - (dist - 30) / 40 + gaussian(random) * sd), 0, 10),
  );
}

const total = (ends: number[][]) => ends.flat().reduce((a, b) => a + b, 0);

export function update(s: State, dt: number, input: Input, random: () => number) {
  s.phaseT += dt;
  const dist = DISTANCES[s.end];
  const k = scale(dist);
  if (s.phase === 'aim') {
    const p = input.pointer;
    const h = input.held;
    const fine = s.drawing ? 0.35 : 1;
    s.aimX += ((h.has('right') ? 1 : 0) - (h.has('left') ? 1 : 0)) * 60 * fine * dt * (dist / 30);
    s.aimY += ((h.has('down') ? 1 : 0) - (h.has('up') ? 1 : 0)) * 60 * fine * dt * (dist / 30);
    const moved = p.x !== s.lastPointer.x || p.y !== s.lastPointer.y;
    s.lastPointer = { x: p.x, y: p.y };
    if (p.active && (moved || p.down)) {
      // The pointer is the aim point; while drawing it moves the aim gently.
      const tx = (p.x - CX) / k;
      const ty = (p.y - CY) / k;
      const follow = s.drawing ? 4 : 14;
      s.aimX += (tx - s.aimX) * Math.min(1, follow * dt);
      s.aimY += (ty - s.aimY) * Math.min(1, follow * dt);
    }
    s.aimX = clamp(s.aimX, -250, 250);
    s.aimY = clamp(s.aimY, -300, 250);
    const want = h.has('action') || p.down;
    if (want && !s.drawing) {
      s.drawing = true;
      s.drawT = 0;
    }
    if (s.drawing) s.drawT += dt;
    if (s.drawing && !want) {
      if (s.drawT > 0.25) loose(s, random);
      else s.drawing = false;
    }
    return;
  }
  if (s.phase === 'flight' && s.phaseT > 0.35 + dist / 160 && s.last) {
    s.arrows.push(s.last);
    s.events.push(s.last.ring >= 9 ? 'success' : s.last.ring > 0 ? 'hit' : 'failure');
    s.score = total([...s.ends, s.arrows.map((a) => a.ring)]) * 10;
    if (s.arrows.length >= ARROWS) {
      s.ends.push(s.arrows.map((a) => a.ring));
      s.aiEnds.push(aiEnd(s, random));
      s.phase = 'endResult';
      s.phaseT = 0;
    } else {
      s.phase = 'aim';
      s.phaseT = 0;
    }
    return;
  }
  if (s.phase === 'endResult' && s.phaseT > 2.6) {
    s.end += 1;
    if (s.end >= DISTANCES.length) {
      if (total(s.ends) > total(s.aiEnds)) s.score += 300;
      s.over = true;
      s.events.push(total(s.ends) > total(s.aiEnds) ? 'levelComplete' : 'gameOver');
      return;
    }
    startEnd(s, random);
  }
}

const RING_COLORS = [
  '#f8fafc',
  '#f8fafc',
  '#111827',
  '#111827',
  '#2563eb',
  '#2563eb',
  '#dc2626',
  '#dc2626',
  '#facc15',
  '#facc15',
];

function drawTarget(ctx: CanvasRenderingContext2D, k: number) {
  // Stand and boss.
  ctx.fillStyle = '#7c2d12';
  ctx.fillRect(CX - 8, CY + FACE_R * k, 6, 200);
  ctx.fillRect(CX + 4, CY + FACE_R * k, 6, 200);
  circle(ctx, CX, CY, FACE_R * k * 1.12, '#d6b77a');
  for (let i = 0; i < 10; i++) {
    circle(ctx, CX, CY, (FACE_R - i * 6.1) * k, RING_COLORS[i]);
    ctx.strokeStyle = i === 2 || i === 3 ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(CX, CY, (FACE_R - i * 6.1) * k, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.arc(CX, CY, 3.05 * k, 0, Math.PI * 2);
  ctx.stroke();
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  const dist = DISTANCES[Math.min(s.end, DISTANCES.length - 1)];
  const k = scale(dist);
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#93c5fd');
  sky.addColorStop(0.45, '#dbeafe');
  sky.addColorStop(0.46, '#65a30d');
  sky.addColorStop(1, '#3f6212');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  // Treeline gives a sense of distance.
  for (let i = 0; i < 14; i++) circle(ctx, i * 34 + 10, H * 0.45, 26 - (dist / 90) * 10, '#166534');
  drawTarget(ctx, k);
  for (const a of s.arrows) {
    circle(ctx, CX + a.x * k, CY + a.y * k, 3.2, '#0f172a');
    circle(ctx, CX + a.x * k, CY + a.y * k, 1.5, '#f97316');
  }
  // Wind flag.
  const fx = 46;
  const fy = 120;
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(fx, fy + 70);
  ctx.lineTo(fx, fy);
  ctx.stroke();
  const flap = Math.sin(s.time * 6) * 3;
  const len = 8 + Math.abs(s.wind) * 7;
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.moveTo(fx, fy);
  ctx.lineTo(fx + Math.sign(s.wind || 1) * len, fy + 6 + flap);
  ctx.lineTo(fx, fy + 14);
  ctx.fill();
  text(
    ctx,
    s.wind ? `${Math.abs(s.wind).toFixed(1)} m/s ${s.wind > 0 ? '→' : '←'}` : 'calm',
    fx,
    fy + 86,
    { size: 12, color: '#0f172a' },
  );

  if (s.phase === 'aim' || s.phase === 'flight') {
    // Aim marks: where to hold to land in the middle.
    if (s.tuning.aid > 0) {
      const ox = s.tuning.aid >= 2 ? -driftAt(dist, s.wind) : 0;
      const oy = -dropAt(dist);
      ctx.strokeStyle = 'rgba(15,23,42,0.6)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(CX + ox * k, CY + oy * k, 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  if (s.phase === 'aim') {
    const sw = sway(s);
    const x = CX + (s.aimX + sw.x) * k;
    const y = CY + (s.aimY + sw.y) * k;
    ctx.strokeStyle = s.drawing ? '#22c55e' : '#0f172a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 14, 0, Math.PI * 2);
    ctx.moveTo(x - 22, y);
    ctx.lineTo(x - 6, y);
    ctx.moveTo(x + 6, y);
    ctx.lineTo(x + 22, y);
    ctx.moveTo(x, y - 22);
    ctx.lineTo(x, y - 6);
    ctx.moveTo(x, y + 6);
    ctx.lineTo(x, y + 22);
    ctx.stroke();
    circle(ctx, x, y, 2, ctx.strokeStyle as string);
    // Draw-strength bar (steady window in green).
    fillRound(ctx, 40, H - 40, W - 80, 12, 6, '#334155');
    if (s.drawing) {
      const t = clamp(s.drawT / 6, 0, 1);
      fillRound(
        ctx,
        40 + (W - 80) * (1.1 / 6),
        H - 40,
        (W - 80) * (2.9 / 6),
        12,
        0,
        'rgba(34,197,94,0.35)',
      );
      fillRound(
        ctx,
        40,
        H - 40,
        (W - 80) * t,
        12,
        6,
        s.drawT > 4 ? '#ef4444' : s.drawT > 1.1 ? '#22c55e' : '#f59e0b',
      );
    }
    text(
      ctx,
      s.drawing ? 'Release when steady' : 'Hold Space / press to draw, release to shoot',
      W / 2,
      H - 56,
      { size: 12, color: '#f8fafc' },
    );
  }
  if (s.phase === 'flight' && s.last) {
    const t = clamp(s.phaseT / (0.35 + dist / 160), 0, 1);
    const x = CX + s.last.x * k * t;
    const y = H - 40 + (CY + s.last.y * k - (H - 40)) * t;
    circle(ctx, x, y, 5 * (1 - t) + 2, '#0f172a');
  }
  // Scores.
  fillRound(ctx, 8, 8, W - 16, 50, 10, 'rgba(15,23,42,0.85)');
  text(
    ctx,
    `End ${Math.min(s.end + 1, DISTANCES.length)}/${DISTANCES.length} · ${dist} m · arrow ${Math.min(ARROWS, s.arrows.length + 1)}/${ARROWS}`,
    20,
    24,
    { size: 12, align: 'left', color: '#cbd5e1' },
  );
  text(
    ctx,
    `You ${total(s.ends) + (s.phase === 'endResult' ? 0 : s.arrows.reduce((a, b) => a + b.ring, 0))}`,
    20,
    44,
    { size: 16, align: 'left', color: '#7dd3fc' },
  );
  text(ctx, `Computer ${total(s.aiEnds)}`, W - 20, 44, {
    size: 16,
    align: 'right',
    color: '#fdba74',
  });
  if (s.phase === 'endResult') {
    const mine = s.ends[s.ends.length - 1];
    const ai = s.aiEnds[s.aiEnds.length - 1];
    fillRound(ctx, 40, H - 150, W - 80, 96, 14, 'rgba(15,23,42,0.9)');
    text(ctx, `End ${s.end + 1} at ${dist} m`, W / 2, H - 128, { size: 14, color: '#cbd5e1' });
    text(
      ctx,
      `You: ${mine.map((r) => (r === 0 ? 'M' : r)).join(' · ')} = ${mine.reduce((a, b) => a + b, 0)}`,
      W / 2,
      H - 102,
      { size: 17, color: '#7dd3fc' },
    );
    text(
      ctx,
      `Computer: ${ai.map((r) => (r === 0 ? 'M' : r)).join(' · ')} = ${ai.reduce((a, b) => a + b, 0)}`,
      W / 2,
      H - 76,
      { size: 17, color: '#fdba74' },
    );
  }
}

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create,
  update,
  render,
  hud: (s) => [
    { label: 'Distance', value: `${DISTANCES[Math.min(s.end, 3)]} m` },
    {
      label: 'You',
      value:
        total(s.ends) + (s.phase === 'endResult' ? 0 : s.arrows.reduce((a, b) => a + b.ring, 0)),
    },
    { label: 'Computer', value: total(s.aiEnds) },
  ],
  result: (s) => {
    const me = total(s.ends);
    const ai = total(s.aiEnds);
    return {
      score: s.score,
      won: me > ai,
      lost: me < ai,
      title:
        me > ai
          ? `You win ${me}–${ai}`
          : me === ai
            ? `A tie at ${me}`
            : `Computer wins ${ai}–${me}`,
      details: DISTANCES.map((d, i) => ({
        label: `${d} m`,
        value: `${(s.ends[i] ?? []).reduce((a, b) => a + b, 0)} – ${(s.aiEnds[i] ?? []).reduce((a, b) => a + b, 0)}`,
      })),
    };
  },
  onEnd: (s, difficulty) => {
    const me = total(s.ends);
    if (s.ends.flat().includes(10)) void reportProgress('archery.ten', 1);
    if (s.ends.some((e) => e.every((r) => r === 10))) void reportProgress('archery.perfect', 1);
    void reportProgress('archery.total', me);
    void incrementProgress('archery.rounds', 1);
    if (me > total(s.aiEnds)) {
      void reportProgress('archery.win', 1);
      if (difficulty === 'hard') void reportProgress('archery.hard', 1);
    }
  },
  touch: { pad: 'dpad', buttons: [{ action: 'action', label: 'Hold to draw' }] },
  pointerStarts: false,
  startHint:
    'Hold to draw the bow, aim, and release while your arm is steady. Aim high at long range and into the wind.',
};
