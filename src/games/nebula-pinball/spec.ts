import { reportProgress } from '@/achievements/AchievementService';
import type { ArcadeSpec } from '../_shared/arcade/kit';
import { render } from './draw';
import { H, W, create, update } from './game';
import type { State } from './game';

export const ID = 'nebula-pinball';

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create: (difficulty) => create(difficulty),
  update: (s, dt, input) => update(s, dt, input),
  render,
  hud: (s) => [
    { label: 'Score', value: s.score.toLocaleString() },
    { label: 'Ball', value: `${s.ball} (${s.ballsLeft} left)` },
    { label: 'Bonus', value: `×${s.mult}` },
  ],
  result: (s) => ({
    score: s.score,
    title: s.score >= 500000 ? 'Cosmic score! 🌌' : 'Game over',
    details: [
      { label: 'Balls played', value: String(s.ball) },
      { label: 'Jackpots', value: String(s.stats.jackpots) },
      { label: 'Multiballs', value: String(s.stats.multiballs) },
      { label: 'Best bonus multiplier', value: `×${s.stats.maxMult}` },
    ],
  }),
  onEnd: (s) => {
    void reportProgress(`${ID}.score100k`, s.score >= 100000 ? 1 : 0);
    void reportProgress(`${ID}.score1m`, s.score >= 1000000 ? 1 : 0);
    if (s.stats.multiballs > 0) void reportProgress(`${ID}.multiball`, 1);
    void reportProgress(`${ID}.jackpot`, s.stats.jackpots);
    void reportProgress(`${ID}.mult`, s.stats.maxMult);
  },
  customKeys: ['z', '/', 'm'],
  touch: { pad: 'none' },
  pointerStarts: true,
  startHint:
    '← and → (or Z and /) flip. Hold ↓ or Space to pull the plunger and let go to launch. ↑ or X nudges the table — careful of tilt. On touch: tap the left or right half to flip.',
};
