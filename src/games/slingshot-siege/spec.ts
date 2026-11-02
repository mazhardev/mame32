import { reportProgress } from '@/achievements/AchievementService';
import type { ArcadeSpec } from '../_shared/arcade/kit';
import { render } from './draw';
import { H, W, create, update } from './game';
import type { State } from './game';
import { LEVEL_COUNT } from './levels';
import { enemiesLeft } from './physics';

export const ID = 'slingshot-siege';

export const starText = (n: number) => '★'.repeat(n) + '☆'.repeat(3 - n);

export function makeSpec(levelIndex: () => number): ArcadeSpec<State> {
  return {
    width: W,
    height: H,
    create: (difficulty) => create(difficulty, levelIndex()),
    update: (s, dt, input) => update(s, dt, input),
    render,
    hud: (s) => [
      { label: 'Score', value: s.score.toLocaleString() },
      { label: 'Level', value: `${s.level + 1}/${LEVEL_COUNT}` },
      { label: 'Stones', value: String(s.queue.length) },
      { label: 'Grumbles', value: String(enemiesLeft(s.phys)) },
    ],
    result: (s) => ({
      won: s.won,
      lost: !s.won,
      score: s.score,
      title: s.won ? `Fort smashed! ${starText(s.stars)}` : 'The Grumbles hold the fort',
      details: [
        { label: 'Level', value: `${s.level + 1}. ${s.def.name}` },
        { label: 'Stars', value: s.won ? starText(s.stars) : '—' },
        { label: 'Stones used', value: `${s.shotsUsed} (par ${s.par})` },
      ],
      message: s.won
        ? s.stars < 3
          ? `Smash it with ${s.par} stone${s.par === 1 ? '' : 's'} for three stars.`
          : 'Perfect — three stars!'
        : 'Try another angle, or aim for whatever holds the fort up.',
    }),
    onEnd: (s) => {
      if (!s.won) return;
      void reportProgress(`${ID}.first`, 1);
      if (s.stars === 3) void reportProgress(`${ID}.three`, 1);
      if (s.stats.tnt > 0) void reportProgress(`${ID}.tnt`, 1);
      void reportProgress(`${ID}.sweep`, s.stats.bestKills);
    },
    touch: { pad: 'none' },
    pointerStarts: true,
    startHint:
      'Drag back from anywhere and let go to fling a stone; tap while it flies for its special move. Keyboard: ↑ ↓ aim, ← → power, Space to fire.',
  };
}
