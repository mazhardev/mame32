import { circle, fillRound, text } from '../_shared/arcade/draw';
import { BALL_R, BRICK_H, BRICK_W, H, PADDLE_H, PADDLE_Y, W } from './engine';
import type { State } from './engine';

const ROW_COLORS = ['#f472b6', '#a78bfa', '#818cf8', '#38bdf8', '#34d399'];

export function render(ctx: CanvasRenderingContext2D, s: State) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#111827');
  g.addColorStop(1, '#0b1020');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  for (const br of s.bricks) {
    if (!br.alive) continue;
    fillRound(ctx, br.x, br.y, BRICK_W, BRICK_H, 4, ROW_COLORS[br.row]);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(br.x + 3, br.y + 2, BRICK_W - 6, 3);
  }
  for (const p of s.pops) {
    ctx.globalAlpha = Math.max(0, p.t / 0.25);
    circle(ctx, p.x, p.y, 6 + (0.25 - p.t) * 60, ROW_COLORS[p.row]);
    ctx.globalAlpha = 1;
  }

  const half = s.cfg.paddleW / 2;
  fillRound(ctx, s.paddle - half, PADDLE_Y - PADDLE_H / 2, s.cfg.paddleW, PADDLE_H, 6, '#e2e8f0');
  circle(ctx, s.ball.x, s.ball.y, BALL_R, '#fde68a');

  // Lives as small balls in the corner.
  for (let i = 0; i < s.lives; i++) circle(ctx, 16 + i * 18, 22, 6, '#fde68a');
  text(ctx, s.score.toLocaleString(), W - 14, 22, { size: 16, color: '#e2e8f0', align: 'right' });

  if (s.held && !s.over) {
    text(ctx, 'Tap or press Space to launch', W / 2, H / 2 + 60, { size: 15, color: '#cbd5e1' });
  }
}
