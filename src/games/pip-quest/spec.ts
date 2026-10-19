import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { DEFAULT_KEYS } from '../_shared/arcade/kit';
import type { ArcadeSpec } from '../_shared/arcade/kit';
import { render } from './draw';
import { create, update } from './game';
import type { State } from './game';
import { LEVEL_COUNT, PER_WORLD, VIEW_H, VIEW_W, WORLD_NAMES } from './levels';

const ID = 'pip-quest';

export const levelLabel = (i: number) => `${Math.floor(i / PER_WORLD) + 1}-${(i % PER_WORLD) + 1}`;

export function makeSpec(start: () => number): ArcadeSpec<State> {
  return {
    width: VIEW_W,
    height: VIEW_H,
    create: (difficulty, random) => create(difficulty, random, start()),
    update,
    render,
    hud: (s) => [
      { label: 'Score', value: s.score.toLocaleString() },
      { label: 'Coins', value: s.coinCount },
      { label: 'World', value: levelLabel(s.levelIndex) },
      { label: 'Time', value: Math.ceil(s.clock) },
      { label: 'Lives', value: s.lives },
    ],
    result: (s) => ({
      won: s.won,
      lost: !s.won,
      score: s.score,
      title: s.won ? 'Pip made it home! 🦊' : 'Game over',
      message: s.won ? `All ${LEVEL_COUNT} levels cleared.` : `You reached World ${levelLabel(s.levelIndex)} — ${s.lv.plan.name}.`,
      details: [
        { label: 'Levels cleared', value: String(s.stats.cleared) },
        { label: 'Coins collected', value: String(s.stats.coins) },
        { label: 'Bosses beaten', value: String(s.stats.bosses) },
      ],
    }),
    onEnd: (s) => {
      if (s.stats.cleared > 0) void reportProgress(`${ID}.first`, 1);
      if (s.stats.bosses > 0) void reportProgress(`${ID}.boss`, 1);
      void reportProgress(`${ID}.coins`, s.stats.coins);
      void reportProgress(`${ID}.combo`, s.stats.bestChain);
      if (s.stats.flagTop) void reportProgress(`${ID}.flag`, 1);
      if (s.stats.fireKills > 0) void incrementProgress(`${ID}.fire`, s.stats.fireKills);
      if (s.won) void reportProgress(`${ID}.champion`, 1);
      if (s.won && s.stats.deaths === 0) void reportProgress(`${ID}.flawless`, 1);
    },
    touch: {
      pad: 'horizontal',
      buttons: [
        { action: 'action2', label: '🔥' },
        { action: 'action', label: '⤒' },
      ],
    },
    keys: { ...DEFAULT_KEYS, z: 'action', Z: 'action', k: 'action', K: 'action', j: 'action2', J: 'action2', c: 'action2', C: 'action2' },
    startHint: '← → move · Space / ↑ / Z jump (hold for higher) · hold X or Shift to run, tap it to throw fire berries.',
  };
}

export const START_POINTS = WORLD_NAMES.map((_name, w) => ({ index: w * PER_WORLD, label: `World ${w + 1}` }));
export const describe = (reached: number) => `World ${levelLabel(reached)} reached`;
