import { reportProgress } from '@/achievements/AchievementService';
import type { ArcadeSpec } from '../_shared/arcade/kit';
import { render } from './draw';
import { H, W, create, update } from './game';
import type { State } from './game';

export const ID = 'lane-rush';

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create: (difficulty) => create(difficulty),
  update: (s, dt, input) => update(s, dt, input),
  render,
  hud: (s) => [
    { label: 'Score', value: Math.floor(s.score).toLocaleString() },
    { label: 'Distance', value: `${Math.floor(s.z)} m` },
    { label: 'Coins', value: String(s.coins) },
  ],
  result: (s) => ({
    lost: true,
    score: Math.floor(s.score),
    title: s.z >= 2000 ? 'What a run! 🏃' : 'Run over',
    message: s.crashWhat === 'train' ? 'Ran into a train.' : s.crashWhat === 'bar' ? 'Hit a bar — swipe down to slide under.' : 'Tripped over a hurdle — swipe up to jump.',
    details: [
      { label: 'Distance', value: `${Math.floor(s.z).toLocaleString()} m` },
      { label: 'Coins', value: String(s.coins) },
      { label: 'Top speed', value: `${Math.round(s.speed * 3.6)} km/h` },
    ],
  }),
  onEnd: (s) => {
    void reportProgress(`${ID}.first`, Math.floor(s.z));
    void reportProgress(`${ID}.marathon`, Math.floor(s.z));
    void reportProgress(`${ID}.coins`, s.coins);
    if (s.stats.shieldSaves > 0) void reportProgress(`${ID}.shield`, 1);
  },
  touch: { pad: 'none' },
  pointerStarts: true,
  startHint: 'Swipe left or right to change lanes, up to jump and down to slide. Keyboard: ← → lanes, ↑ or Space jump, ↓ slide.',
};
