import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { formatNumber } from '@/utils/format';
import { DEFAULT_KEYS } from '../_shared/arcade/kit';
import type { ArcadeSpec } from '../_shared/arcade/kit';
import { VIEW_H, VIEW_W, create, update } from './game';
import type { Hooks } from './game';
import { LEVEL_COUNT, LEVELS_PER_WORLD, WORLD_NAMES, levelCode } from './levels';
import { render } from './render';
import type { State } from './types';

export const GAME_ID = 'leap-quest';

/** Reports achievements as soon as they are earned, not just at the end of a run. */
export function reportClear(index: number, s: State) {
  void reportProgress(`${GAME_ID}.first`, 1);
  if (s.stats.hitsThisLevel === 0) void reportProgress(`${GAME_ID}.flawless`, 1);
  if (index % LEVELS_PER_WORLD === LEVELS_PER_WORLD - 1) {
    const world = Math.floor(index / LEVELS_PER_WORLD);
    void reportProgress(`${GAME_ID}.${['boar', 'mole', 'owl', 'golem'][world]}`, 1);
  }
}

export function makeSpec(opts: { startLevel: () => number; hooks?: Hooks }): ArcadeSpec<State> {
  return {
    width: VIEW_W,
    height: VIEW_H,
    create: (difficulty) => {
      const s = create(difficulty, opts.startLevel());
      // Development builds only: lets browser tests inspect and steer a run.
      if (import.meta.env.DEV && typeof window !== 'undefined') (window as unknown as { __leapQuest?: State }).__leapQuest = s;
      return s;
    },
    update: (s, dt, input, random) => update(s, dt, input, random, opts.hooks),
    render,
    hud: (s) => [
      { label: 'Score', value: formatNumber(s.score) },
      { label: 'Gems', value: `💎 ${s.gems}` },
      { label: 'Lives', value: `❤️ ${s.lives}` },
      { label: 'World', value: levelCode(s.levelIndex) },
      { label: 'Time', value: Math.ceil(s.timeLeft) },
    ],
    result: (s) => ({
      won: s.won,
      lost: !s.won,
      score: s.score,
      title: s.won ? 'The valley is saved!' : 'Game over',
      message: s.won
        ? 'Pip beat all four guardians and brought the star keys home.'
        : `Reached ${levelCode(s.levelIndex)} ${WORLD_NAMES[Math.floor(s.levelIndex / LEVELS_PER_WORLD)]}. Pick up from any level you have reached.`,
      details: [
        { label: 'Levels cleared', value: String(s.stats.levelsCleared) },
        { label: 'Gems', value: String(s.stats.gemsCollected) },
        { label: 'Enemies stomped', value: String(s.stats.stomps) },
      ],
    }),
    onEnd: (s) => {
      void incrementProgress(`${GAME_ID}.runs`);
      void reportProgress(`${GAME_ID}.chain`, s.stats.bestChain);
      void reportProgress(`${GAME_ID}.shell`, s.stats.shellChain);
      void reportProgress(`${GAME_ID}.gems`, s.stats.gemsCollected);
      if (s.won) void reportProgress(`${GAME_ID}.golem`, 1);
    },
    touch: {
      pad: 'horizontal',
      buttons: [
        { action: 'action2', label: '✦' },
        { action: 'action', label: '⤒' },
      ],
    },
    keys: {
      ...DEFAULT_KEYS,
      z: 'action',
      Z: 'action',
      k: 'action',
      K: 'action',
      c: 'action2',
      C: 'action2',
      j: 'action2',
      J: 'action2',
    },
    startHint: '← → run · Space or ↑ jump (hold for higher) · X throw sparks · ↓ drop through ledges.',
  };
}

export { LEVEL_COUNT };
