import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { burst, circle, drawSparks, gradientBg, text, updateSparks } from '../_shared/arcade/draw';
import type { Spark } from '../_shared/arcade/draw';

/**
 * Circle Jump: a ball orbits a ring. Tap to launch it along the tangent of
 * its orbit. If its straight-line path reaches the next ring, it is caught
 * and starts orbiting that one. Miss and it flies off into space.
 */
export const W = 380;
export const H = 600;
const BALL = 8;

export interface Ring {
  x: number;
  /** World y (grows upward as you climb). */
  y: number;
  r: number;
  /** Angular speed; the sign is the orbit direction. */
  spin: number;
}

export interface State extends BaseState {
  rings: Ring[];
  /** Index of the ring the ball orbits, or -1 while flying. */
  on: number;
  angle: number;
  bx: number;
  by: number;
  vx: number;
  vy: number;
  flight: number;
  camera: number;
  jumps: number;
  perfect: number;
  baseSpin: number;
  /** Ring most recently orbited; only rings above it can catch the ball. */
  lastRing: number;
  sparks: Spark[];
}

const SPIN: Record<DifficultySetting, number> = { easy: 2.2, normal: 2.8, hard: 3.4 };
const LAUNCH = 560;

function nextRing(prev: Ring, random: () => number, baseSpin: number, level: number): Ring {
  const r = Math.max(26, 46 - level * 0.6 - random() * 10);
  const x = 70 + random() * (W - 140);
  const y = prev.y + 170 + random() * 60;
  const dir = random() < 0.5 ? -1 : 1;
  return { x, y, r, spin: dir * (baseSpin + Math.min(2, level * 0.05)) * (0.85 + random() * 0.3) };
}

export function create(difficulty: DifficultySetting, random: () => number = Math.random): State {
  const first: Ring = { x: W / 2, y: 80, r: 46, spin: SPIN[difficulty] };
  const s: State = {
    ...baseState(),
    rings: [first],
    on: 0,
    angle: Math.PI / 2,
    bx: 0,
    by: 0,
    vx: 0,
    vy: 0,
    flight: 0,
    camera: 0,
    jumps: 0,
    perfect: 0,
    baseSpin: SPIN[difficulty],
    lastRing: 0,
    sparks: [],
  };
  for (let i = 0; i < 4; i++) s.rings.push(nextRing(s.rings[s.rings.length - 1], random, s.baseSpin, 0));
  placeOnRing(s);
  return s;
}

function placeOnRing(s: State) {
  const ring = s.rings[s.on];
  s.bx = ring.x + Math.cos(s.angle) * ring.r;
  s.by = ring.y + Math.sin(s.angle) * ring.r;
}

export function launch(s: State) {
  if (s.on < 0) return;
  const ring = s.rings[s.on];
  // Tangent direction of the orbit.
  const dir = Math.sign(ring.spin);
  s.vx = -Math.sin(s.angle) * dir * LAUNCH;
  s.vy = Math.cos(s.angle) * dir * LAUNCH;
  s.on = -1;
  s.flight = 0;
  s.events.push('whoosh');
}

export function update(s: State, dt: number, input: Input, random: () => number) {
  if ((input.pressed.has('action') || input.pointer.pressed) && s.on >= 0) launch(s);
  if (s.on >= 0) {
    const ring = s.rings[s.on];
    s.angle += ring.spin * dt;
    placeOnRing(s);
  } else {
    s.bx += s.vx * dt;
    s.by += s.vy * dt;
    s.flight += dt;
    for (let i = 0; i < s.rings.length; i++) {
      const ring = s.rings[i];
      const d = Math.hypot(s.bx - ring.x, s.by - ring.y);
      // Caught by any ring other than the one just left (once clear of it).
      if (i > s.lastRing && d <= ring.r + BALL) {
        s.on = i;
        s.angle = Math.atan2(s.by - ring.y, s.bx - ring.x);
        placeOnRing(s);
        const skipped = i - s.lastRing;
        s.jumps += 1;
        // Perfect: the flight line passed close to the ring's centre.
        const miss = Math.abs((ring.x - s.bx) * s.vy - (ring.y - s.by) * s.vx) / Math.hypot(s.vx, s.vy);
        const isPerfect = miss < ring.r * 0.35;
        if (isPerfect) s.perfect += 1;
        s.score += skipped * (isPerfect ? 2 : 1);
        s.lastRing = i;
        s.events.push(isPerfect ? 'coin' : 'pop');
        burst(s.sparks, s.bx, s.by, '#a78bfa', 10, 120, random);
        while (s.rings.length < i + 5) {
          s.rings.push(nextRing(s.rings[s.rings.length - 1], random, s.baseSpin, s.jumps));
        }
        break;
      }
    }
    if (s.on < 0 && (s.flight > 1.6 || s.bx < -40 || s.bx > W + 40 || s.by < s.camera - 60)) {
      s.over = true;
      s.events.push('gameOver');
    }
  }
  // Camera follows the current ring smoothly.
  const target = (s.on >= 0 ? s.rings[s.on].y : s.by) - 160;
  s.camera += (target - s.camera) * Math.min(1, dt * 4);
  updateSparks(s.sparks, dt);
}

/** World → screen: world y grows upward, screen y grows downward. */
const sy = (s: State, y: number) => H - (y - s.camera);

export function render(ctx: CanvasRenderingContext2D, s: State) {
  gradientBg(ctx, W, H, '#1e1b4b', '#4c1d95');
  for (let i = 0; i < s.rings.length; i++) {
    const ring = s.rings[i];
    const y = sy(s, ring.y);
    if (y < -80 || y > H + 80) continue;
    ctx.strokeStyle = i === s.on ? '#c4b5fd' : 'rgba(196,181,253,0.55)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(ring.x, y, ring.r, 0, Math.PI * 2);
    ctx.stroke();
    circle(ctx, ring.x, y, 4, 'rgba(196,181,253,0.6)');
  }
  if (!s.over || s.on >= 0) circle(ctx, s.bx, sy(s, s.by), BALL, '#fde047');
  drawSparks(ctx, s.sparks.map((p) => ({ ...p, y: sy(s, p.y) })));
  text(ctx, String(s.score), W / 2, 44, { size: 34 });
}

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create,
  update,
  render,
  hud: (s) => [
    { label: 'Score', value: s.score },
    { label: 'Jumps', value: s.jumps },
    { label: 'Perfect', value: s.perfect },
  ],
  result: (s) => ({
    score: s.score,
    title: 'Lost in space!',
    details: [
      { label: 'Jumps', value: String(s.jumps) },
      { label: 'Perfect landings', value: String(s.perfect) },
    ],
  }),
  onEnd: (s) => {
    void reportProgress('circle-jump.jumps-10', s.jumps);
    void reportProgress('circle-jump.jumps-40', s.jumps);
    void reportProgress('circle-jump.perfect-10', s.perfect);
    void incrementProgress('circle-jump.total', s.jumps);
  },
  touch: { pad: 'none' },
  startHint: 'Tap (or Space) to fly off along the orbit. Time it so you land on the next ring.',
};
