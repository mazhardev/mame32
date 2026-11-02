import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import type { ArcadeSpec } from '../_shared/arcade/kit';
import type { StartPoint } from '../_shared/platform/CampaignGame';
import { render } from './draw';
import { create, update } from './engine';
import type { State } from './engine';
import { H, LEVELS, PER_TEMPLE, TEMPLES, W } from './paths';

export const ID = 'marble-chain';

export const START_POINTS: StartPoint[] = TEMPLES.map((name, i) => ({ index: i * PER_TEMPLE, label: name }));

export const describe = (reached: number) => `Level ${reached + 1} of ${LEVELS.length}`;

export function makeSpec(start: () => number): ArcadeSpec<State> {
  return {
    width: W,
    height: H,
    create: (difficulty) => create(difficulty, start()),
    update: (s, dt, input) => update(s, dt, input),
    render,
    hud: (s) => [
      { label: 'Score', value: s.score.toLocaleString() },
      { label: 'Level', value: `${s.level + 1}/${LEVELS.length}` },
      { label: 'Lives', value: '●'.repeat(Math.max(0, s.lives)) || '–' },
    ],
    result: (s) => ({
      won: s.phase === 'won',
      lost: s.phase !== 'won',
      score: s.score,
      title: s.phase === 'won' ? 'All three temples cleared! 🏆' : 'The marbles reached the pit',
      details: [
        { label: 'Level reached', value: `${s.level + 1}. ${s.def.name}` },
        { label: 'Marbles cleared', value: s.stats.cleared.toLocaleString() },
        { label: 'Best combo', value: `×${s.stats.bestCombo}` },
      ],
    }),
    onEnd: (s) => {
      if (s.stats.levelsWon > 0) void reportProgress(`${ID}.first`, 1);
      void reportProgress(`${ID}.combo`, s.stats.bestCombo);
      void incrementProgress(`${ID}.marbles`, s.stats.cleared);
      if (s.stats.powers > 0) void reportProgress(`${ID}.power`, 1);
      if (s.phase === 'won') void reportProgress(`${ID}.all`, 1);
    },
    touch: { pad: 'none' },
    pointerStarts: true,
    startHint: 'Aim with the mouse or your finger and click or tap to shoot. Tap the stone idol (or press ↓) to swap marbles. Keyboard: ← → aim, Space shoots.',
  };
}
