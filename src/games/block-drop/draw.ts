import { fillRound, text } from '../_shared/arcade/draw';
import { COLS, GOAL, ROWS, SHAPES, dropDistance } from './engine';
import type { State } from './engine';

export const W = 316;
export const H = 496;
export const CELL = 24;
const BX = 6;
const BY = 8;
const PANEL_X = BX + COLS * CELL + 10;

const COLORS = ['#0f172a', '#22d3ee', '#facc15', '#a855f7', '#22c55e', '#ef4444', '#3b82f6', '#f97316'];

function block(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string, alpha = 1) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(x + 1, y + 1, size - 2, size - 2);
  // A soft bevel: light top-left, dark bottom-right.
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.fillRect(x + 1, y + 1, size - 2, Math.max(2, size * 0.14));
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(x + 1, y + size - 1 - Math.max(2, size * 0.14), size - 2, Math.max(2, size * 0.14));
  ctx.globalAlpha = 1;
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  ctx.fillStyle = '#0b1020';
  ctx.fillRect(0, 0, W, H);

  // The well.
  fillRound(ctx, BX - 3, BY - 3, COLS * CELL + 6, ROWS * CELL + 6, 8, '#1e293b');
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(BX, BY, COLS * CELL, ROWS * CELL);
  ctx.strokeStyle = 'rgba(148,163,184,0.08)';
  ctx.lineWidth = 1;
  for (let x = 1; x < COLS; x++) {
    ctx.beginPath();
    ctx.moveTo(BX + x * CELL + 0.5, BY);
    ctx.lineTo(BX + x * CELL + 0.5, BY + ROWS * CELL);
    ctx.stroke();
  }
  for (let y = 1; y < ROWS; y++) {
    ctx.beginPath();
    ctx.moveTo(BX, BY + y * CELL + 0.5);
    ctx.lineTo(BX + COLS * CELL, BY + y * CELL + 0.5);
    ctx.stroke();
  }

  const flash = s.clearing.length ? 0.5 + 0.5 * Math.sin(s.time * 40) : 0;
  for (let y = 0; y < ROWS; y++) {
    const clearing = s.clearing.includes(y);
    for (let x = 0; x < COLS; x++) {
      const v = s.board[y][x];
      if (!v) continue;
      block(ctx, BX + x * CELL, BY + y * CELL, CELL, clearing ? '#f8fafc' : COLORS[v], clearing ? 0.5 + flash * 0.5 : 1);
    }
  }

  const p = s.piece;
  if (p.shape.length && !s.over) {
    // Ghost: where the piece will land.
    const g = dropDistance(s);
    p.shape.forEach((row, dy) =>
      row.forEach((v, dx) => {
        if (!v || p.y + dy + g < 0) return;
        ctx.strokeStyle = COLORS[p.kind];
        ctx.globalAlpha = 0.55;
        ctx.lineWidth = 2;
        ctx.strokeRect(BX + (p.x + dx) * CELL + 2, BY + (p.y + dy + g) * CELL + 2, CELL - 4, CELL - 4);
        ctx.globalAlpha = 1;
      }),
    );
    p.shape.forEach((row, dy) =>
      row.forEach((v, dx) => {
        if (v && p.y + dy >= 0) block(ctx, BX + (p.x + dx) * CELL, BY + (p.y + dy) * CELL, CELL, COLORS[p.kind]);
      }),
    );
  }

  // Side panel: next piece, lines and level.
  const pw = W - PANEL_X - 4;
  fillRound(ctx, PANEL_X, BY - 3, pw, 74, 8, '#1e293b');
  text(ctx, 'NEXT', PANEL_X + pw / 2, BY + 10, { size: 10, color: '#94a3b8' });
  const shape = SHAPES[s.next - 1];
  const mini = 11;
  const sw = shape[0].length * mini;
  const sh = shape.length * mini;
  shape.forEach((row, dy) =>
    row.forEach((v, dx) => {
      if (v) block(ctx, PANEL_X + (pw - sw) / 2 + dx * mini, BY + 22 + (40 - sh) / 2 + dy * mini, mini, COLORS[s.next]);
    }),
  );
  fillRound(ctx, PANEL_X, BY + 80, pw, 56, 8, '#1e293b');
  text(ctx, 'LINES', PANEL_X + pw / 2, BY + 94, { size: 10, color: '#94a3b8' });
  text(ctx, `${s.lines}/${GOAL}`, PANEL_X + pw / 2, BY + 116, { size: 15, color: '#f8fafc' });
  fillRound(ctx, PANEL_X, BY + 142, pw, 56, 8, '#1e293b');
  text(ctx, 'LEVEL', PANEL_X + pw / 2, BY + 156, { size: 10, color: '#94a3b8' });
  text(ctx, String(s.level), PANEL_X + pw / 2, BY + 178, { size: 15, color: '#f8fafc' });
  // Progress to the goal, as a vertical bar.
  const barTop = BY + 210;
  const barH = ROWS * CELL - (barTop - BY);
  fillRound(ctx, PANEL_X + pw / 2 - 6, barTop, 12, barH, 6, '#1e293b');
  const k = Math.min(1, s.lines / GOAL);
  if (k > 0) fillRound(ctx, PANEL_X + pw / 2 - 6, barTop + barH * (1 - k), 12, barH * k, 6, '#22c55e');
}
