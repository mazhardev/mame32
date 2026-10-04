import { circle, fillRound, text } from '../arcade/draw';
import { BOUNDARY, FIELD, PITCH, STUMP_HEIGHT, ballAt, fielderXY } from './cricket';
import type { Delivery, Outcome } from './cricket';

/**
 * Drawing for cricket games: the pitch seen from behind the batter's stumps
 * with simple perspective, and a top-down field map for where shots go.
 */
export interface PitchView {
  w: number;
  h: number;
  horizon: number;
  crease: number;
  px: number;
  focal: number;
}

export function pitchView(w: number, h: number): PitchView {
  return { w, h, horizon: h * 0.2, crease: h * 0.8, px: 95, focal: 7 };
}

export function project(
  v: PitchView,
  d: number,
  x: number,
  z = 0,
): { x: number; y: number; s: number } {
  const s = v.focal / (v.focal + d);
  return { x: v.w / 2 + x * v.px * s, y: v.horizon + (v.crease - v.horizon) * s - z * v.px * s, s };
}

/** Inverse of `project` on the ground: screen point to pitch (d, x). */
export function unproject(v: PitchView, sx: number, sy: number): { d: number; x: number } {
  const s = (sy - v.horizon) / (v.crease - v.horizon);
  const d = s > 0 ? v.focal / s - v.focal : PITCH * 2;
  return { d, x: (sx - v.w / 2) / (v.px * Math.max(0.05, s)) };
}

function stumps(ctx: CanvasRenderingContext2D, v: PitchView, d: number, broken = 0) {
  for (const sx of [-0.11, 0, 0.11]) {
    const base = project(v, d, sx, 0);
    const top = project(v, d, sx + broken * sx * 2, STUMP_HEIGHT - broken * 0.2);
    ctx.strokeStyle = '#fef3c7';
    ctx.lineWidth = Math.max(1.5, 5 * base.s);
    ctx.beginPath();
    ctx.moveTo(base.x, base.y);
    ctx.lineTo(top.x, top.y);
    ctx.stroke();
  }
  if (!broken) {
    const l = project(v, d, -0.12, STUMP_HEIGHT);
    const r = project(v, d, 0.12, STUMP_HEIGHT);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = Math.max(1, 3 * l.s);
    ctx.beginPath();
    ctx.moveTo(l.x, l.y);
    ctx.lineTo(r.x, r.y);
    ctx.stroke();
  }
}

export interface Scene {
  delivery: Delivery | null;
  /** Seconds since release (negative during the run-up). */
  t: number;
  /** Seconds since the swing started, or null. */
  swing: number | null;
  /** The batter hit it: the ball leaves the pitch view. */
  struck: boolean;
  bowled: boolean;
  /** Target marker for the bowler (d, x). */
  marker: { d: number; x: number } | null;
}

export function drawPitch(ctx: CanvasRenderingContext2D, v: PitchView, scene: Scene) {
  const g = ctx.createLinearGradient(0, 0, 0, v.h);
  g.addColorStop(0, '#7dd3fc');
  g.addColorStop(0.18, '#bae6fd');
  g.addColorStop(0.2, '#3f8f3a');
  g.addColorStop(1, '#2f7a2c');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, v.w, v.h);
  // Stands on the horizon.
  ctx.fillStyle = '#475569';
  ctx.fillRect(0, v.horizon - 26, v.w, 14);
  for (let i = 0; i < 40; i++)
    circle(
      ctx,
      (i * 37) % v.w,
      v.horizon - 30 + ((i * 13) % 6),
      3,
      ['#f87171', '#fbbf24', '#60a5fa', '#a78bfa'][i % 4],
    );
  ctx.fillStyle = '#e5e7eb';
  ctx.fillRect(0, v.horizon - 12, v.w, 4);
  // Mown stripes.
  for (let i = 0; i < 12; i++) {
    const a = project(v, i * 4, 0);
    const b = project(v, i * 4 + 2, 0);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(0, b.y, v.w, a.y - b.y);
  }
  const corners = [
    project(v, -1.5, -1.52),
    project(v, -1.5, 1.52),
    project(v, PITCH + 1.5, 1.52),
    project(v, PITCH + 1.5, -1.52),
  ];
  ctx.fillStyle = '#d6c08a';
  ctx.beginPath();
  corners.forEach((c, i) => (i ? ctx.lineTo(c.x, c.y) : ctx.moveTo(c.x, c.y)));
  ctx.fill();
  // Creases.
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  for (const d of [1.22, PITCH - 1.22]) {
    const a = project(v, d, -1.3);
    const b = project(v, d, 1.3);
    ctx.lineWidth = Math.max(1, 3 * a.s);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  if (scene.marker) {
    const m = project(v, scene.marker.d, scene.marker.x);
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(m.x, m.y, 16 * m.s + 4, 6 * m.s + 2, 0, 0, Math.PI * 2);
    ctx.stroke();
    circle(ctx, m.x, m.y, 2.5, '#facc15');
  }
  stumps(ctx, v, PITCH);
  drawBowler(ctx, v, scene);
  const ball =
    scene.delivery && scene.t >= 0 && !scene.struck ? ballAt(scene.delivery, scene.t) : null;
  if (ball && ball.d > 0.9) drawBall(ctx, v, ball);
  drawBatter(ctx, v, scene.swing);
  stumps(ctx, v, 0, scene.bowled ? 1 : 0);
  if (ball && ball.d <= 0.9) drawBall(ctx, v, ball);
}

function drawBall(
  ctx: CanvasRenderingContext2D,
  v: PitchView,
  b: { d: number; x: number; z: number },
) {
  const ground = project(v, b.d, b.x, 0);
  const p = project(v, b.d, b.x, b.z);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(
    ground.x,
    ground.y,
    Math.max(2, 5 * ground.s),
    Math.max(1, 2 * ground.s),
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  circle(ctx, p.x, p.y, Math.max(2.2, 6 * p.s), '#b91c1c');
  circle(ctx, p.x - p.s, p.y - p.s, Math.max(0.8, 2 * p.s), 'rgba(255,255,255,0.5)');
}

function drawBowler(ctx: CanvasRenderingContext2D, v: PitchView, scene: Scene) {
  const t = scene.t;
  const d = t < 0 ? PITCH + 1 - t * 5 : PITCH + 1 + Math.min(1.5, t * 3);
  const p = project(v, d, 0.35);
  const s = p.s;
  ctx.fillStyle = '#f8fafc';
  fillRound(ctx, p.x - 9 * s * 3, p.y - 60 * s * 3, 18 * s * 3, 34 * s * 3, 4, '#f8fafc');
  ctx.fillRect(p.x - 7 * s * 3, p.y - 28 * s * 3, 5 * s * 3, 28 * s * 3);
  ctx.fillRect(p.x + 2 * s * 3, p.y - 28 * s * 3, 5 * s * 3, 28 * s * 3);
  circle(ctx, p.x, p.y - 68 * s * 3, 8 * s * 3, '#8d5524');
  const arm = t < 0 ? -1.2 + Math.sin(t * 10) * 0.4 : Math.min(3.4, -1.2 + t * 18);
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 4 * s * 3;
  ctx.beginPath();
  ctx.moveTo(p.x + 6 * s * 3, p.y - 55 * s * 3);
  ctx.lineTo(
    p.x + 6 * s * 3 + Math.sin(arm) * 22 * s * 3,
    p.y - 55 * s * 3 - Math.cos(arm) * 22 * s * 3,
  );
  ctx.stroke();
}

function drawBatter(ctx: CanvasRenderingContext2D, v: PitchView, swing: number | null) {
  const p = project(v, 0.35, -0.42);
  const s = p.s * 1.15;
  // Pads, body, helmet.
  fillRound(ctx, p.x - 14 * s, p.y - 50 * s, 12 * s, 50 * s, 4, '#f8fafc');
  fillRound(ctx, p.x + 2 * s, p.y - 50 * s, 12 * s, 50 * s, 4, '#f8fafc');
  fillRound(ctx, p.x - 18 * s, p.y - 112 * s, 36 * s, 64 * s, 8, '#1d4ed8');
  circle(ctx, p.x, p.y - 124 * s, 14 * s, '#1e3a8a');
  // Bat: back-lift, then a downswing through the line.
  const k = swing === null ? 0 : Math.min(1, swing / 0.32);
  const angle = swing === null ? -0.6 : -0.6 + Math.sin(k * Math.PI * 0.9) * 2.6;
  const hx = p.x + 16 * s;
  const hy = p.y - 70 * s;
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(angle);
  fillRound(ctx, -4 * s, 0, 8 * s, 22 * s, 3, '#1f2937');
  fillRound(ctx, -8 * s, 20 * s, 16 * s, 58 * s, 5, '#e9c46a');
  ctx.restore();
}

/** Top-down map of the ground with the shot's path. */
export function drawFieldMap(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  o: Outcome | null,
  progress: number,
) {
  const k = radius / (BOUNDARY + 8);
  circle(ctx, cx, cy, radius, '#2f7a2c');
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, BOUNDARY * k, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.setLineDash([3, 4]);
  ctx.beginPath();
  ctx.arc(cx, cy, 30 * k, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#d6c08a';
  ctx.fillRect(cx - 3, cy - PITCH * k, 6, PITCH * k);
  for (const f of FIELD) {
    const p = fielderXY(f);
    circle(ctx, cx + p.x * k, cy - p.y * k, 4, f.r < 15 ? '#94a3b8' : '#f8fafc');
  }
  circle(ctx, cx, cy, 4, '#1d4ed8');
  if (o && o.quality >= 0) {
    const t = Math.min(1, progress);
    const ex = Math.sin(o.angle) * o.dist * t;
    const ey = Math.cos(o.angle) * o.dist * t;
    ctx.strokeStyle = o.aerial ? '#fde047' : '#fca5a5';
    ctx.lineWidth = 2;
    ctx.setLineDash(o.aerial ? [5, 4] : []);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + ex * k, cy - ey * k);
    ctx.stroke();
    ctx.setLineDash([]);
    circle(ctx, cx + ex * k, cy - ey * k, 4, '#b91c1c');
  }
}

/** Banner for a ball's result. */
export function drawResult(ctx: CanvasRenderingContext2D, w: number, y: number, o: Outcome) {
  const big = o.runs >= 4 || !!o.out;
  fillRound(
    ctx,
    30,
    y - 26,
    w - 60,
    52,
    14,
    o.out ? 'rgba(127,29,29,0.9)' : big ? 'rgba(22,101,52,0.9)' : 'rgba(15,23,42,0.85)',
  );
  text(ctx, o.text, w / 2, y, { size: big ? 26 : 18, color: o.runs === 6 ? '#fde047' : '#fff' });
}

/** The over so far as small coloured dots. */
export function drawOver(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  log: string[],
  balls: number,
) {
  const start =
    log.length -
    (balls % 6 === 0 && balls > 0 ? 6 : balls % 6) -
    log.slice(-6).filter((l) => l === 'wd').length;
  const over = log.slice(Math.max(0, start));
  over.forEach((sym, i) => {
    const color =
      sym === 'W'
        ? '#dc2626'
        : sym === '4'
          ? '#2563eb'
          : sym === '6'
            ? '#7c3aed'
            : sym === 'wd'
              ? '#f59e0b'
              : '#475569';
    circle(ctx, x + i * 22, y, 9, color);
    text(ctx, sym === 'wd' ? 'wd' : sym, x + i * 22, y + 0.5, { size: sym === 'wd' ? 8 : 11 });
  });
}
