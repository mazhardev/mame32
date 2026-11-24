import { reportProgress } from '@/achievements/AchievementService';
import type { ArcadeSpec } from '../_shared/arcade/kit';
import { render } from './draw';
import { FRUITS, H, W, create, update } from './engine';
import type { State } from './engine';

export const ID = 'fruit-fusion';

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create: (difficulty, random) => create(difficulty, random),
  update,
  render,
  hud: (s) => [
    { label: 'Score', value: s.score.toLocaleString() },
    { label: 'Biggest', value: FRUITS[s.best].name },
    { label: 'Next', value: FRUITS[s.next].name },
  ],
  result: (s) => ({
    won: false,
    score: s.score,
    title: 'The jar is full!',
    message: `Your biggest fruit was a ${FRUITS[s.best].name.toLowerCase()}.`,
    details: [
      { label: 'Biggest fruit', value: FRUITS[s.best].name },
      { label: 'Fusions', value: String(s.merges) },
    ],
  }),
  onEnd: (s) => {
    void reportProgress(`${ID}.score`, s.score);
    if (s.best >= 7) void reportProgress(`${ID}.peach`, 1);
    if (s.best >= 10) void reportProgress(`${ID}.watermelon`, 1);
    void reportProgress(`${ID}.merges`, s.merges);
  },
  touch: { pad: 'horizontal', buttons: [{ action: 'action', label: 'Drop' }] },
  pointerStarts: true,
  startHint: 'Slide your finger (or the mouse) to aim and let go to drop. Keyboard: ← → aim, Space drops. Matching fruit fuse into bigger ones.',
};
