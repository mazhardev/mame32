import { circle, fillRound, text } from '../_shared/arcade/draw';
import { BALL_R, CPU_Y, H, PADDLE_H, PADDLE_W, PLAYER_Y, W } from './engine';
import type { State } from './engine';

export function render(ctx: CanvasRenderingContext2D, s: State) {
  ctx.fillStyle = '#0b1220';
  ctx.fillRect(0, 0, W, H);
  // Court: side lines and a dashed half-way line.
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, W - 2, H - 2);
  ctx.setLineDash([10, 10]);
  ctx.strokeStyle = '#334155';
  ctx.beginPath();
  ctx.moveTo(0, H / 2);
  ctx.lineTo(W, H / 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Scores, large and faint, in each half.
  text(ctx, String(s.them), W / 2, H / 2 - 60, { size: 56, color: 'rgba(253,164,175,0.22)', weight: 800 });
  text(ctx, String(s.you), W / 2, H / 2 + 60, { size: 56, color: 'rgba(125,211,252,0.22)', weight: 800 });
  text(ctx, 'COMPUTER', W / 2, 18, { size: 10, color: '#64748b' });
  text(ctx, 'YOU', W / 2, H - 14, { size: 10, color: '#64748b' });

  fillRound(ctx, s.opponent - PADDLE_W / 2, CPU_Y - PADDLE_H / 2, PADDLE_W, PADDLE_H, 6, '#fda4af');
  fillRound(ctx, s.player - PADDLE_W / 2, PLAYER_Y - PADDLE_H / 2, PADDLE_W, PADDLE_H, 6, '#7dd3fc');

  if (s.serveT > 0) {
    const blink = Math.floor(s.serveT * 6) % 2 === 0;
    if (blink) circle(ctx, s.ball.x, s.ball.y, BALL_R, '#f8fafc');
  } else {
    circle(ctx, s.ball.x, s.ball.y, BALL_R, '#f8fafc');
  }
}
