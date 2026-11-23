import { reportProgress } from '@/achievements/AchievementService';
import type { ArcadeSpec } from '../_shared/arcade/kit';
import { H, W, render } from './draw';
import { GOAL, create, update } from './engine';
import type { State } from './engine';

export const ID = 'block-drop';

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create: (difficulty, random) => create(difficulty, random),
  update,
  render,
  hud: (s) => [
    { label: 'Score', value: s.score.toLocaleString() },
    { label: 'Lines', value: `${s.lines} / ${GOAL}` },
    { label: 'Level', value: String(s.level) },
  ],
  result: (s) => ({
    won: s.won,
    lost: !s.won,
    score: s.score,
    title: s.won ? 'Twenty lines cleared! 🏆' : 'The stack reached the top',
    message: s.won ? `Level ${s.level} reached.` : `${GOAL - s.lines} more line${GOAL - s.lines === 1 ? '' : 's'} to go. Keep the stack flat and low.`,
    details: [
      { label: 'Lines', value: `${s.lines} / ${GOAL}` },
      { label: 'Level', value: String(s.level) },
      { label: 'Four-line clears', value: String(s.stats.tetrises) },
    ],
  }),
  onEnd: (s) => {
    void reportProgress(`${ID}.score`, s.score);
    if (s.won) void reportProgress(`${ID}.win`, 1);
  },
  keys: {
    ArrowLeft: 'left',
    ArrowRight: 'right',
    ArrowUp: 'up',
    ArrowDown: 'down',
    a: 'left',
    A: 'left',
    d: 'right',
    D: 'right',
    w: 'up',
    W: 'up',
    s: 'down',
    S: 'down',
    x: 'action2',
    X: 'action2',
    z: 'action2',
    Z: 'action2',
    ' ': 'action',
    Enter: 'action',
  },
  touch: {
    pad: 'dpad',
    buttons: [
      { action: 'action2', label: '⟳' },
      { action: 'action', label: 'Drop' },
    ],
  },
  pointerStarts: true,
  startHint: 'Drag a piece sideways, tap to turn it and flick down to drop. Keyboard: ← → move, ↑ or X turns, ↓ soft drop, Space drops.',
};
