import { fillRound, text } from '../arcade/draw';
import { oversText } from './cricket';
import type { Innings } from './cricket';
import { drawOver } from './view';

/** Scoreboard strip shared by the cricket games. */
export function drawScoreboard(
  ctx: CanvasRenderingContext2D,
  w: number,
  inn: Innings,
  label: string,
) {
  fillRound(ctx, 8, 8, w - 16, 56, 10, 'rgba(15,23,42,0.88)');
  text(ctx, label, 20, 22, { size: 11, align: 'left', color: '#94a3b8', weight: 600 });
  text(ctx, `${inn.runs}/${inn.wickets}`, 20, 44, { size: 22, align: 'left' });
  text(ctx, `${oversText(inn.balls)} ov`, 92, 46, { size: 13, align: 'left', color: '#cbd5e1' });
  if (inn.target !== null) {
    const need = Math.max(0, inn.target - inn.runs);
    const left = inn.maxBalls - inn.balls;
    text(ctx, `Need ${need} off ${left}`, w - 20, 22, {
      size: 12,
      align: 'right',
      color: '#fde68a',
    });
  }
  drawOver(ctx, w - 20 - 5 * 22, 46, inn.log, inn.balls);
}
