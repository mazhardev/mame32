import { reportProgress } from '@/achievements/AchievementService';
import { DEFAULT_KEYS } from '../_shared/arcade/kit';
import type { ArcadeSpec } from '../_shared/arcade/kit';
import { AH, AW } from '../_shared/platform/arena';
import { render } from './draw';
import { create, update } from './game';
import type { State } from './game';
import { STAGES } from './stages';

const ID = 'bubble-buddies';

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
      { label: 'Power', value: `${s.power.range ? '🍬' : ''}${s.power.speed ? '👟' : ''}${s.power.rapid ? '⚡' : ''}` || '—' },
    ],
    result: (s) => ({
      won: s.won,
      lost: !s.won,
      score: s.score,
      title: s.won ? 'The lagoon is bubbly again! 🫧' : 'Game over',
      message: s.won ? `All ${STAGES} stages cleared.` : `You reached stage ${s.stage + 1}.`,
      details: [
        { label: 'Stages cleared', value: String(s.stats.cleared) },
        { label: 'Best chain pop', value: String(s.stats.bestChain) },
        { label: 'Fruit collected', value: String(s.stats.fruit) },
      ],
    }),
    onEnd: (s) => {
      if (s.stats.cleared > 0) void reportProgress(`${ID}.first`, 1);
      void reportProgress(`${ID}.chain`, s.stats.bestChain);
      if (s.stats.splash > 0) void reportProgress(`${ID}.splash`, 1);
      if (s.stats.bosses > 0) void reportProgress(`${ID}.boss`, 1);
      void reportProgress(`${ID}.fruit`, s.stats.fruit);
      void reportProgress(`${ID}.stages`, s.stats.cleared);
      if (s.won) void reportProgress(`${ID}.champion`, 1);
    },
    touch: {
      pad: 'horizontal',
      buttons: [
        { action: 'action2', label: '🫧' },
        { action: 'action', label: '⤒' },
      ],
    },
    keys: { ...DEFAULT_KEYS, z: 'action', Z: 'action', k: 'action', K: 'action', j: 'action2', J: 'action2', c: 'action2', C: 'action2' },
    startHint: '← → move · Space / ↑ / Z jump · X or Shift blows a bubble · hold jump to bounce on bubbles.',
  };
}

export const START_POINTS = [0, 10, 20, 30].map((index) => ({ index, label: `Stage ${index + 1}` }));
export const describe = (reached: number) => `Stage ${reached + 1} reached`;
