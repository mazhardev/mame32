import { reportProgress } from '@/achievements/AchievementService';
import type { ArcadeSpec } from '../_shared/arcade/kit';
import { render } from './draw';
import { H, LIVES, W, bricksLeft, create, update } from './engine';
import type { State } from './engine';

export const ID = 'brick-breaker';

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create: (difficulty) => create(difficulty),
  update,
  render,
  hud: (s) => [
    { label: 'Score', value: s.score.toLocaleString() },
    { label: 'Balls', value: `${s.lives} / ${LIVES}` },
    { label: 'Bricks', value: String(bricksLeft(s)) },
  ],
  result: (s) => ({
    won: s.won,
    lost: !s.won,
    score: s.score,
    title: s.won ? 'Wall cleared! 🧱' : 'Out of balls',
    message: s.won ? `Cleared with ${s.lives} ball${s.lives === 1 ? '' : 's'} to spare.` : `${bricksLeft(s)} brick${bricksLeft(s) === 1 ? '' : 's'} left.`,
    details: [
      { label: 'Bricks left', value: String(bricksLeft(s)) },
      { label: 'Best combo', value: String(s.bestCombo) },
    ],
  }),
  onEnd: (s) => {
    void reportProgress(`${ID}.score`, s.score);
    if (s.won) void reportProgress(`${ID}.win`, 1);
  },
  touch: { pad: 'horizontal', buttons: [{ action: 'action', label: 'Launch' }] },
  pointerStarts: true,
  startHint: 'Drag the paddle with a finger or the mouse (or ← →), and tap or press Space to launch the ball.',
};
