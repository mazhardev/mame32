import { circle, fillRound, text } from '../_shared/arcade/draw';
import { CELL, COLORS, COLS, H, ROWS, W } from './engine';
import type { State } from './engine';

const LAND = ['', '#93c5fd', '#fca5a5', '#fcd34d', '#d8b4fe', '#6ee7b7'];

export function render(ctx: CanvasRenderingContext2D, s: State) {
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, W, H);
  // Faint grid.
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  for (let x = 1; x < COLS; x++) {
    ctx.beginPath();
    ctx.moveTo(x * CELL + 0.5, 0);
    ctx.lineTo(x * CELL + 0.5, H);
    ctx.stroke();
  }
  for (let y = 1; y < ROWS; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * CELL + 0.5);
    ctx.lineTo(W, y * CELL + 0.5);
    ctx.stroke();
  }
  // Land, then trails.
  for (let i = 0; i < s.owner.length; i++) {
    const o = s.owner[i];
    if (!o) continue;
    ctx.fillStyle = LAND[o];
    ctx.fillRect((i % COLS) * CELL, Math.floor(i / COLS) * CELL, CELL, CELL);
  }
  for (let i = 0; i < s.trailOf.length; i++) {
    const t = s.trailOf[i];
    if (!t) continue;
    ctx.fillStyle = COLORS[t];
    ctx.globalAlpha = 0.55;
    ctx.fillRect((i % COLS) * CELL + 2, Math.floor(i / COLS) * CELL + 2, CELL - 4, CELL - 4);
    ctx.globalAlpha = 1;
  }
  // Players, drawn part-way to their next square so movement looks smooth.
  for (const p of s.players) {
    if (!p.alive) continue;
    const x = p.x * CELL + CELL / 2;
    const y = p.y * CELL + CELL / 2;
    circle(ctx, x, y + 1, CELL * 0.62, 'rgba(0,0,0,0.25)');
    circle(ctx, x, y, CELL * 0.62, COLORS[p.id]);
    circle(ctx, x, y, CELL * 0.3, '#fff');
    if (p.id === 1) {
      ctx.strokeStyle = '#1e3a8a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, CELL * 0.62, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  // Knockout messages.
  s.feed.forEach((f, n) => {
    ctx.globalAlpha = Math.min(1, f.t);
    fillRound(ctx, W / 2 - 110, 10 + n * 30, 220, 24, 12, 'rgba(15,23,42,0.8)');
    text(ctx, f.text, W / 2, 22 + n * 30, { size: 12, color: '#fff', weight: 700 });
    ctx.globalAlpha = 1;
  });
  // The map edge is out of bounds.
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, W - 3, H - 3);
  if (s.waiting) {
    fillRound(ctx, W / 2 - 120, H / 2 + 26, 240, 30, 15, 'rgba(15,23,42,0.82)');
    text(ctx, 'Swipe or press an arrow to set off', W / 2, H / 2 + 41, { size: 13, color: '#fff', weight: 700 });
  }
  // Share bar along the bottom.
  const goal = s.cfg.goal;
  fillRound(ctx, 8, H - 14, W - 16, 8, 4, 'rgba(15,23,42,0.15)');
  fillRound(ctx, 8, H - 14, Math.max(8, (W - 16) * Math.min(1, s.share / goal)), 8, 4, COLORS[1]);
}
