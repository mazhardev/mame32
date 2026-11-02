import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import type { ArcadeSpec } from '../_shared/arcade/kit';
import { render } from './draw';
import { LEVELS, PLANTS, UNLOCKS } from './data';
import { H, W, create, update } from './engine';
import type { State } from './engine';

export const ID = 'garden-guard';

/** The defender a level unlocks for the next one, if any. */
export const unlockAfter = (level: number) => UNLOCKS.find(([, at]) => at === level + 1)?.[0];

export function makeSpec(level: () => number): ArcadeSpec<State> {
  return {
    width: W,
    height: H,
    create: (difficulty) => create(difficulty, level()),
    update: (s, dt, input) => update(s, dt, input),
    render,
    hud: (s) => [
      { label: 'Level', value: `${s.level + 1}/${LEVELS.length}` },
      { label: 'Wave', value: `${Math.min(s.wave, s.def.waves)}/${s.def.waves}` },
      { label: 'Score', value: s.score.toLocaleString() },
    ],
    result: (s) => {
      const won = s.phase === 'won';
      const unlock = won ? unlockAfter(s.level) : undefined;
      return {
        won,
        lost: !won,
        score: s.score,
        title: won ? `${s.def.name}: garden saved! 🌻` : 'The pests got into the house',
        message: unlock ? `New defender unlocked: ${PLANTS[unlock].name}. ${PLANTS[unlock].blurb}` : won ? undefined : 'Plant Sunblooms early, then give every row at least one shooter.',
        details: [
          { label: 'Level', value: `${s.level + 1}. ${s.def.name}` },
          { label: 'Pests stopped', value: String(s.stats.killed) },
          { label: 'Sunlight collected', value: s.stats.sun.toLocaleString() },
          { label: 'Garden rollers used', value: String(s.stats.rollers) },
        ],
      };
    },
    onEnd: (s) => {
      void incrementProgress(`${ID}.sun`, s.stats.sun);
      void reportProgress(`${ID}.pop`, s.stats.popBest);
      if (s.phase !== 'won') return;
      void reportProgress(`${ID}.first`, 1);
      if (s.stats.rollers === 0) void reportProgress(`${ID}.clean`, 1);
      if (s.def.garden === 2) void reportProgress(`${ID}.night`, 1);
      if (s.level === LEVELS.length - 1) void reportProgress(`${ID}.all`, 1);
    },
    keys: {
      ArrowLeft: 'left',
      ArrowRight: 'right',
      ArrowUp: 'up',
      ArrowDown: 'down',
      ' ': 'action',
      Enter: 'action',
    },
    customKeys: ['1', '2', '3', '4', '5', '6', '7', '8', 'q', 'c'],
    touch: { pad: 'none' },
    pointerStarts: true,
    startHint: 'Tap a seed card, then a square of lawn to plant it. Tap sunlight to collect it. Keyboard: 1–7 pick a card, arrows move, Space plants, C collects sunlight.',
  };
}
