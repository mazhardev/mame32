import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import type { ArcadeSpec } from '../_shared/arcade/kit';
import { render } from './draw';
import { H, W, create, starsGot, update } from './engine';
import type { State } from './engine';
import { LEVELS } from './levels';

export const ID = 'snip-snack';

/** Stars for a stored best score (1000 for the win, 1000 per star). */
export const starsFor = (score: number) => Math.max(0, Math.min(3, Math.round(score / 1000) - 1));
export const starText = (n: number) => '★'.repeat(n) + '☆'.repeat(3 - n);

export function makeSpec(level: () => number): ArcadeSpec<State> {
  return {
    width: W,
    height: H,
    create: (difficulty) => create(difficulty, level()),
    update: (s, dt, input) => update(s, dt, input),
    render,
    hud: (s) => [
      { label: 'Level', value: `${s.level + 1}/${LEVELS.length}` },
      { label: 'Stars', value: starText(starsGot(s)) },
    ],
    result: (s) => {
      const won = s.phase === 'won';
      const stars = starsGot(s);
      return {
        won,
        lost: !won,
        score: s.score,
        title: won ? `${s.def.name}: ${starText(stars)}` : s.lostWhy === 'spikes' ? 'Ouch, the spikes got the sweet' : 'The sweet got away',
        message: won
          ? stars === 3
            ? 'All three stars. The Nibbler is very happy.'
            : 'The Nibbler is fed. Try again for all three stars.'
          : 'Watch where the sweet swings and cut when it is heading the right way.',
        details: [
          { label: 'Level', value: `${s.level + 1}. ${s.def.name}` },
          { label: 'Stars', value: `${stars} of 3` },
          { label: 'Ropes cut', value: String(s.stats.cuts) },
        ],
      };
    },
    onEnd: (s) => {
      if (s.phase !== 'won') return;
      const stars = starsGot(s);
      void reportProgress(`${ID}.first`, 1);
      void incrementProgress(`${ID}.stars`, stars);
      if (stars === 3) void reportProgress(`${ID}.three`, 1);
      if (s.level >= 9) void reportProgress(`${ID}.shed`, 1);
      if (s.level === LEVELS.length - 1) void reportProgress(`${ID}.all`, 1);
    },
    keys: { ' ': 'action', Enter: 'action', b: 'action2', B: 'action2' },
    customKeys: ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
    touch: { pad: 'none' },
    pointerStarts: true,
    startHint: 'Swipe across a rope to cut it. Tap a bubble to pop it and a blower to puff air. Keyboard: 1–9 cut ropes, Space pops or puffs, B puffs the second blower.',
  };
}
