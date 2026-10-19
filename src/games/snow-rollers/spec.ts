import { reportProgress } from '@/achievements/AchievementService';
import { DEFAULT_KEYS } from '../_shared/arcade/kit';
import type { ArcadeSpec } from '../_shared/arcade/kit';
import { AH, AW } from '../_shared/platform/arena';
import { render } from './draw';
import { create, update } from './game';
import type { State } from './game';
import { LANDS, PER_LAND, STAGES } from './stages';

const ID = 'snow-rollers';

export function makeSpec(start: () => number): ArcadeSpec<State> {
  return {
    width: AW,
    height: AH,
    create: (difficulty, random) => create(difficulty, random, start()),
    update,
    render,
    hud: (s) => [
      { label: 'Score', value: s.score.toLocaleString() },
      { label: 'Stage', value: `${s.stage + 1}/${STAGES}` },
      { label: 'Lives', value: s.lives },
      { label: 'Power', value: `${s.power.speed ? '🔴' : ''}${s.power.strong ? '🔵' : ''}${s.power.range ? '🟡' : ''}${s.giant > 0 ? '🟢' : ''}` || '—' },
    ],
    result: (s) => ({
      won: s.won,
      lost: !s.won,
      score: s.score,
      title: s.won ? 'The snow kingdom is safe! ☃️' : 'Game over',
      message: s.won ? `All ${STAGES} stages cleared.` : `You reached stage ${s.stage + 1} in ${LANDS[s.plan.land]}.`,
      details: [
        { label: 'Stages cleared', value: String(s.stats.cleared) },
        { label: 'Best snowball combo', value: String(s.stats.bestCombo) },
        { label: 'Bosses beaten', value: String(s.stats.bosses) },
      ],
    }),
    onEnd: (s) => {
      if (s.stats.cleared > 0) void reportProgress(`${ID}.first`, 1);
      void reportProgress(`${ID}.combo`, s.stats.bestCombo);
      if (s.stats.bosses > 0) void reportProgress(`${ID}.boss`, 1);
      if (s.stats.giant) void reportProgress(`${ID}.giant`, 1);
      void reportProgress(`${ID}.stages`, s.stats.cleared);
      if (s.won) void reportProgress(`${ID}.champion`, 1);
      void reportProgress(`${ID}.score`, s.score);
    },
    touch: {
      pad: 'horizontal',
      buttons: [
        { action: 'action2', label: '❄' },
        { action: 'action', label: '⤒' },
      ],
    },
    keys: { ...DEFAULT_KEYS, z: 'action', Z: 'action', k: 'action', K: 'action', j: 'action2', J: 'action2', c: 'action2', C: 'action2' },
    startHint: '← → move · Space / ↑ / Z jump · X or Shift throws snow and kicks snowballs · ↓ + jump drops through a ledge.',
  };
}

export const START_POINTS = LANDS.map((_name, k) => ({ index: k * PER_LAND, label: `Stage ${k * PER_LAND + 1}` }));
export const describe = (reached: number) => `Stage ${reached + 1} reached`;
