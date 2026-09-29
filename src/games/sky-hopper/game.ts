import type { DifficultySetting } from '@/types';
import { baseState, circleRectHit } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState } from '../_shared/arcade/kit';
import { circle, gradientBg, text } from '../_shared/arcade/draw';
import { reportProgress, incrementProgress } from '@/achievements/AchievementService';

/** Sky Hopper: flap through the gaps between towers. One tap = one flap. */
export const W = 360;
export const H = 640;
const GROUND = H - 70;
const BIRD_X = 100;
const R = 15;

const SETTINGS: Record<DifficultySetting, { gap: number; speed: number; spacing: number }> = {
  easy: { gap: 190, speed: 145, spacing: 230 },
  normal: { gap: 160, speed: 170, spacing: 215 },
  hard: { gap: 135, speed: 195, spacing: 200 },
};

export interface Tower {
  x: number;
  gapY: number;
  passed: boolean;
}

export interface State extends BaseState {
  y: number;
  vy: number;
  towers: Tower[];
  gap: number;
  speed: number;
  spacing: number;
  scroll: number;
  flapT: number;
}

export const GRAVITY = 1500;
export const FLAP = -430;
export const TOWER_W = 64;

export function create(difficulty: DifficultySetting): State {
  const s = SETTINGS[difficulty];
  return { ...baseState(), y: H * 0.42, vy: 0, towers: [], gap: s.gap, speed: s.speed, spacing: s.spacing, scroll: 0, flapT: 0 };
}

export function towerRects(t: Tower, gap: number) {
  return [
    { x: t.x, y: -20, w: TOWER_W, h: t.gapY - gap / 2 + 20 },
    { x: t.x, y: t.gapY + gap / 2, w: TOWER_W, h: GROUND - (t.gapY + gap / 2) },
  ];
}

export function update(s: State, dt: number, input: { pressed: Set<string>; pointer: { pressed: boolean } }, random: () => number) {
  if (input.pressed.has('action') || input.pressed.has('up') || input.pointer.pressed) {
    s.vy = FLAP;
    s.flapT = 0.25;
    s.events.push('jump');
  }
  s.flapT = Math.max(0, s.flapT - dt);
  s.vy += GRAVITY * dt;
  s.y += s.vy * dt;
  // Speed creeps up with the score.
  const speed = s.speed + Math.min(80, s.score * 2);
  s.scroll += speed * dt;
  for (const t of s.towers) t.x -= speed * dt;
  s.towers = s.towers.filter((t) => t.x > -TOWER_W - 10);
  const last = s.towers[s.towers.length - 1];
  if (!last || last.x < W - s.spacing) {
    const margin = 70 + s.gap / 2;
    s.towers.push({ x: W + 20, gapY: margin + random() * (GROUND - margin * 2), passed: false });
  }
  for (const t of s.towers) {
    if (!t.passed && t.x + TOWER_W < BIRD_X - R) {
      t.passed = true;
      s.score += 1;
      s.events.push('coin');
    }
    if (towerRects(t, s.gap).some((r) => circleRectHit(BIRD_X, s.y, R - 2, r))) crash(s);
  }
  if (s.y + R >= GROUND || s.y - R < -40) crash(s);
}

function crash(s: State) {
  if (s.over) return;
  s.over = true;
  s.events.push('hit');
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  gradientBg(ctx, W, H, '#7dd3fc', '#e0f2fe');
  // Parallax hills and clouds.
  ctx.fillStyle = '#bae6fd';
  for (let i = 0; i < 4; i++) {
    const x = ((i * 140 - s.scroll * 0.2) % (W + 140) + W + 140) % (W + 140) - 70;
    circle(ctx, x, 120 + (i % 2) * 60, 26, '#fff');
    circle(ctx, x + 26, 112 + (i % 2) * 60, 20, '#fff');
    circle(ctx, x - 22, 118 + (i % 2) * 60, 18, '#fff');
  }
  ctx.fillStyle = '#86efac';
  for (let i = 0; i < 5; i++) {
    const x = ((i * 110 - s.scroll * 0.4) % (W + 110) + W + 110) % (W + 110) - 55;
    ctx.beginPath();
    ctx.arc(x, GROUND + 10, 70, Math.PI, 0);
    ctx.fill();
  }
  for (const t of s.towers) {
    for (const r of towerRects(t, s.gap)) {
      ctx.fillStyle = '#65a30d';
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.fillStyle = '#84cc16';
      ctx.fillRect(r.x + 6, r.y, 10, r.h);
      const capY = r.y < 0 ? r.y + r.h - 22 : r.y;
      ctx.fillStyle = '#4d7c0f';
      ctx.fillRect(r.x - 5, capY, r.w + 10, 22);
    }
  }
  // Ground.
  ctx.fillStyle = '#a16207';
  ctx.fillRect(0, GROUND, W, H - GROUND);
  ctx.fillStyle = '#65a30d';
  ctx.fillRect(0, GROUND, W, 12);
  for (let x = -((s.scroll) % 24); x < W; x += 24) {
    ctx.fillStyle = '#4d7c0f';
    ctx.fillRect(x, GROUND + 12, 12, 6);
  }
  // The bird tilts with its speed.
  ctx.save();
  ctx.translate(BIRD_X, s.y);
  ctx.rotate(Math.max(-0.5, Math.min(1.2, s.vy / 600)));
  circle(ctx, 0, 0, R, '#facc15');
  circle(ctx, 6, -5, 5, '#fff');
  circle(ctx, 7.5, -5, 2.4, '#111827');
  ctx.fillStyle = '#f97316';
  ctx.beginPath();
  ctx.moveTo(R - 2, 0);
  ctx.lineTo(R + 9, 3);
  ctx.lineTo(R - 2, 7);
  ctx.fill();
  ctx.fillStyle = '#fde68a';
  ctx.beginPath();
  ctx.ellipse(-5, s.flapT > 0 ? -6 : 4, 9, 5, s.flapT > 0 ? -0.6 : 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  text(ctx, String(s.score), W / 2, 60, { size: 44, color: '#fff' });
}

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create,
  update,
  render,
  hud: (s) => [{ label: 'Score', value: s.score }],
  result: (s) => ({
    score: s.score,
    title: s.score >= 25 ? 'What a flight!' : 'Crash landing!',
    details: [{ label: 'Towers passed', value: String(s.score) }],
  }),
  onEnd: (s) => {
    void reportProgress('sky-hopper.first', s.score >= 1 ? 1 : 0);
    void reportProgress('sky-hopper.ten', s.score);
    void reportProgress('sky-hopper.twenty-five', s.score);
    void reportProgress('sky-hopper.fifty', s.score);
    void incrementProgress('sky-hopper.total', s.score);
  },
  touch: { pad: 'none', buttons: [{ action: 'action', label: 'Flap' }] },
  startHint: 'Tap, click or press Space to flap. Fly through the gaps.',
};
