import { circle, fillRound, text } from '../_shared/arcade/draw';
import { COLORS, shooterPos } from './engine';
import type { State } from './engine';
import { H, PER_TEMPLE, R, TEMPLES, W, at } from './paths';
import type { Track } from './paths';

/** Marble Chain drawing: a carved temple floor, the track, marbles and the stone idol. */
const THEMES = [
  { floor: '#2f5d3a', tile: '#3a6b45', groove: '#1d3a24', rim: '#7fb07a' },
  { floor: '#7a4f24', tile: '#8a5c2c', groove: '#4a2e12', rim: '#e0b060' },
  { floor: '#2c3566', tile: '#353f78', groove: '#181d3d', rim: '#9fb0f0' },
];

function floor(ctx: CanvasRenderingContext2D, s: State) {
  const th = THEMES[Math.floor(s.level / PER_TEMPLE) % THEMES.length];
  ctx.fillStyle = th.floor;
  ctx.fillRect(0, 0, W, H);
  // Worn stone tiles.
  for (let y = 0; y < H; y += 40)
    for (let x = (y / 40) % 2 ? -20 : 0; x < W; x += 40) {
      ctx.fillStyle = (x * 7 + y * 3) % 3 ? th.tile : th.floor;
      ctx.fillRect(x + 1, y + 1, 38, 38);
    }
  // Vignette.
  const g = ctx.createRadialGradient(W / 2, H / 2, 120, W / 2, H / 2, 330);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  return th;
}

function trackPath(ctx: CanvasRenderingContext2D, t: Track) {
  ctx.beginPath();
  ctx.moveTo(t.xs[0], t.ys[0]);
  for (let i = 4; i <= t.length; i += 4) ctx.lineTo(t.xs[i], t.ys[i]);
  ctx.lineTo(t.xs[t.length], t.ys[t.length]);
}

function groove(ctx: CanvasRenderingContext2D, s: State, th: (typeof THEMES)[number]) {
  const t = s.track;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  trackPath(ctx, t);
  ctx.strokeStyle = th.rim;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = R * 2 + 8;
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = th.groove;
  ctx.lineWidth = R * 2 + 4;
  ctx.stroke();
  // Danger: the last stretch glows red as the chain nears the pit.
  const front = s.chain[0]?.s ?? 0;
  const near = front > t.length - 260;
  if (near) {
    const pulse = 0.35 + 0.25 * Math.sin(s.time * 8);
    ctx.beginPath();
    const from = Math.floor(t.length - 200);
    ctx.moveTo(t.xs[from], t.ys[from]);
    for (let i = from; i <= t.length; i += 4) ctx.lineTo(t.xs[i], t.ys[i]);
    ctx.strokeStyle = `rgba(255,60,40,${pulse})`;
    ctx.lineWidth = R * 2 + 6;
    ctx.stroke();
  }
  // The pit.
  const ex = t.xs[t.length];
  const ey = t.ys[t.length];
  circle(ctx, ex, ey, 17, th.rim);
  circle(ctx, ex, ey, 14, '#0b0705');
  ctx.strokeStyle = 'rgba(255,200,90,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(ex, ey, 10, s.time * 3, s.time * 3 + 4);
  ctx.stroke();
}

export function marble(ctx: CanvasRenderingContext2D, x: number, y: number, c: number, r = R, power = 'none', time = 0) {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.15, x, y, r);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.25, COLORS[c]);
  g.addColorStop(1, shade(COLORS[c]));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  if (power !== 'none') {
    const glyph = power === 'bomb' ? '✹' : power === 'slow' ? '◷' : '↺';
    circle(ctx, x, y, r * 0.62, 'rgba(255,255,255,0.85)');
    text(ctx, glyph, x, y + 0.5, { size: r * 1.05, color: '#222', weight: 900 });
    ctx.strokeStyle = `rgba(255,255,255,${0.5 + 0.5 * Math.sin(time * 8)})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, r + 1.5, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function shade(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.round(v * 0.55);
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

function idol(ctx: CanvasRenderingContext2D, s: State) {
  const [x, y] = shooterPos(s);
  // Aim guide.
  ctx.setLineDash([3, 6]);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x + Math.cos(s.aim) * 26, y + Math.sin(s.aim) * 26);
  ctx.lineTo(x + Math.cos(s.aim) * 90, y + Math.sin(s.aim) * 90);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(s.aim + Math.PI / 2);
  // Stone body.
  circle(ctx, 0, 3, 23, 'rgba(0,0,0,0.35)');
  circle(ctx, 0, 0, 21, '#9c9583');
  circle(ctx, -3, -3, 17, '#b8b09b');
  // Carved eyes and brow, facing the aim.
  fillRound(ctx, -12, -11, 9, 5, 2, '#3b352b');
  fillRound(ctx, 3, -11, 9, 5, 2, '#3b352b');
  circle(ctx, -7.5, -8.5, 1.6, '#ffd75a');
  circle(ctx, 7.5, -8.5, 1.6, '#ffd75a');
  ctx.fillStyle = '#6f6857';
  ctx.fillRect(-13, -15, 26, 2.5);
  // The marble ready to fire sits in its mouth; the spare one on its back.
  marble(ctx, 0, -18, s.load, R);
  marble(ctx, 0, 12, s.next, R * 0.62);
  ctx.restore();
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  const th = floor(ctx, s);
  groove(ctx, s, th);
  const t = s.track;
  for (let i = s.chain.length - 1; i >= 0; i--) {
    const m = s.chain[i];
    if (m.vs < -R) continue;
    const [x, y] = at(t, m.vs);
    marble(ctx, x, y, m.c, R, m.power, s.time);
  }
  for (const sh of s.shots) marble(ctx, sh.x, sh.y, sh.c);
  idol(ctx, s);
  for (const f of s.fx) {
    const k = f.t / 0.5;
    if (f.kind === 'pop') {
      ctx.strokeStyle = COLORS[f.c];
      ctx.globalAlpha = Math.max(0, 1 - k);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(f.x, f.y, R + k * 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (f.kind === 'boom') {
      circle(ctx, f.x, f.y, 20 + k * 50, `rgba(255,200,80,${Math.max(0, 0.6 * (1 - k))})`);
    } else if (f.text) {
      ctx.globalAlpha = Math.max(0, Math.min(1, (1.1 - f.t) * 3));
      text(ctx, f.text, f.x, f.y - f.t * 18, { size: 11, color: '#fff3c4', weight: 900 });
      ctx.globalAlpha = 1;
    }
  }
  // Banners.
  if (s.phase === 'roll' && s.phaseT < 2.5) {
    ctx.globalAlpha = Math.min(1, (2.5 - s.phaseT) * 2);
    fillRound(ctx, W / 2 - 120, 14, 240, 40, 12, 'rgba(0,0,0,0.5)');
    text(ctx, `Level ${s.level + 1}: ${s.def.name}`, W / 2, 28, { size: 13, weight: 900 });
    text(ctx, TEMPLES[Math.floor(s.level / PER_TEMPLE)], W / 2, 44, { size: 9, color: 'rgba(255,255,255,0.8)', weight: 700 });
    ctx.globalAlpha = 1;
  }
  if (s.phase === 'lost') {
    fillRound(ctx, W / 2 - 110, H / 2 - 22, 220, 44, 12, 'rgba(0,0,0,0.6)');
    text(ctx, s.lives > 0 ? `Into the pit! ${s.lives} ${s.lives === 1 ? 'life' : 'lives'} left` : 'Into the pit!', W / 2, H / 2, { size: 14, weight: 900 });
  }
  if (s.slowT > 0 || s.backT > 0) {
    fillRound(ctx, 8, H - 26, 96, 18, 9, 'rgba(0,0,0,0.5)');
    text(ctx, s.backT > 0 ? 'ROLLING BACK' : `SLOW ${Math.ceil(s.slowT)}s`, 56, H - 17, { size: 9, weight: 800 });
  }
  const left = s.toCome;
  fillRound(ctx, W - 108, H - 26, 100, 18, 9, 'rgba(0,0,0,0.5)');
  text(ctx, left > 0 ? `${left} still to come` : 'Last marbles!', W - 58, H - 17, { size: 9, weight: 800 });
}
