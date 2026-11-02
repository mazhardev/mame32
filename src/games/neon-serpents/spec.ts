import { reportProgress } from '@/achievements/AchievementService';
import type { ArcadeSpec } from '../_shared/arcade/kit';
import { render } from './draw';
import { H, W, create, player, rankOf, update } from './engine';
import type { State } from './engine';

export const ID = 'neon-serpents';

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create: (difficulty) => create(difficulty),
  update: (s, dt, input) => update(s, dt, input),
  render,
  hud: (s) => [
    { label: 'Length', value: String(s.score) },
    { label: 'Rank', value: player(s).alive ? `#${rankOf(s)}` : '–' },
    { label: 'Knocked out', value: String(s.stats.kills) },
  ],
  result: (s) => ({
    lost: true,
    score: Math.floor(s.stats.maxMass),
    scoreLabel: 'Longest length',
    title: s.bestRank === 1 ? 'You were the biggest snake in the arena! 👑' : 'Your serpent burst',
    message: s.killer ? (s.killer === 'the wall' ? 'You hit the arena wall.' : `You ran into ${s.killer}.`) : undefined,
    details: [
      { label: 'Best rank', value: `#${s.bestRank}` },
      { label: 'Snakes knocked out', value: String(s.stats.kills) },
      { label: 'Pellets eaten', value: String(s.stats.eaten) },
    ],
  }),
  onEnd: (s) => {
    void reportProgress(`${ID}.long`, Math.floor(s.stats.maxMass));
    void reportProgress(`${ID}.giant`, Math.floor(s.stats.maxMass));
    void reportProgress(`${ID}.kill`, s.stats.kills);
    if (s.bestRank === 1) void reportProgress(`${ID}.top`, 1);
  },
  touch: { pad: 'none', buttons: [{ action: 'action', label: 'Boost' }] },
  pointerStarts: true,
  startHint: 'Your snake follows the mouse (or your finger). Hold the mouse button or Space to boost. Keyboard: ← → steer.',
};
