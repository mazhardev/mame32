import { reportProgress } from '@/achievements/AchievementService';
import type { ArcadeSpec } from '../_shared/arcade/kit';
import { render } from './draw';
import { H, TARGET, W, create, update } from './engine';
import type { State } from './engine';

export const ID = 'pong';

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create: (difficulty, random) => create(difficulty, random),
  update,
  render,
  hud: (s) => [
    { label: 'You', value: String(s.you) },
    { label: 'Computer', value: String(s.them) },
    { label: 'First to', value: String(TARGET) },
  ],
  result: (s) => ({
    won: s.won,
    lost: !s.won,
    score: s.score,
    title: s.won ? 'You win the match! 🏓' : 'The computer wins',
    message: `${s.you} – ${s.them}. Longest rally: ${s.longestRally} hits.`,
    details: [
      { label: 'Score', value: `${s.you} – ${s.them}` },
      { label: 'Longest rally', value: String(s.longestRally) },
    ],
  }),
  onEnd: (s) => {
    void reportProgress(`${ID}.score`, s.score);
    if (s.won) void reportProgress(`${ID}.win`, 1);
  },
  touch: { pad: 'horizontal' },
  pointerStarts: true,
  startHint: 'Drag your paddle (bottom) with a finger or the mouse, or use ← → (A, D). First to seven wins.',
};
