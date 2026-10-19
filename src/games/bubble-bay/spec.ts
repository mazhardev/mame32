import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { formatNumber } from '@/utils/format';
import { DEFAULT_KEYS } from '../_shared/arcade/kit';
import type { ArcadeSpec } from '../_shared/arcade/kit';
import { H, W } from '../_shared/arena/stage';
import { BOSS_INFO } from './bosses';
import { BOSSES, create, update } from './game';
import { render } from './render';
import { AREAS, LEVEL_COUNT, areaOf, isBossLevel } from './stages';
import type { State } from './types';

export const GAME_ID = 'bubble-bay';

export const LEVEL_NAMES = Array.from(
  { length: LEVEL_COUNT },
  (_, i) => `Level ${i + 1} · ${isBossLevel(i) ? BOSS_INFO[BOSSES[areaOf(i)]].name : AREAS[areaOf(i)]}`,
);

/** Achievements earned the moment a level is cleared. */
function reportLevel(index: number, s: State) {
  void reportProgress(`${GAME_ID}.first`, 1);
  if (isBossLevel(index)) void reportProgress(`${GAME_ID}.${BOSSES[areaOf(index)]}`, 1);
  void reportProgress(`${GAME_ID}.combo3`, s.stats.bestChain);
  void reportProgress(`${GAME_ID}.combo5`, s.stats.bestChain);
  void reportProgress(`${GAME_ID}.bounce`, s.stats.bestBounces);
}

export function makeSpec(opts: { startLevel: () => number; onClear?: (index: number, s: State) => void }): ArcadeSpec<State> {
  return {
    width: W,
    height: H,
    create: (difficulty) => {
      const s = create(difficulty, opts.startLevel());
      // Development builds only: lets browser tests inspect and steer a run.
      if (import.meta.env.DEV && typeof window !== 'undefined') (window as unknown as { __bubbleBay?: State }).__bubbleBay = s;
      return s;
    },
    update: (s, dt, input, random) =>
      update(s, dt, input, random, {
        onLevelClear: (index, st) => {
          opts.onClear?.(index, st);
          reportLevel(index, st);
        },
      }),
    render,
    hud: (s) => [
      { label: 'Score', value: formatNumber(s.score) },
      { label: 'Lives', value: `❤️ ${s.lives}` },
      { label: 'Level', value: `${s.stageIndex + 1}/${LEVEL_COUNT}` },
    ],
    result: (s) => ({
      won: s.won,
      lost: !s.won,
      score: s.score,
      title: s.won ? 'The bay is saved!' : 'Swept away',
      message: s.won
        ? 'Ollie cleared all thirty levels and sent the Kraken packing.'
        : `You reached level ${s.stageIndex + 1}. Start again from any level you have reached.`,
      details: [
        { label: 'Levels cleared', value: String(s.stats.levelsCleared) },
        { label: 'Treasure collected', value: String(s.stats.treasures) },
        { label: 'Best bubble chain', value: String(s.stats.bestChain) },
      ],
    }),
    onEnd: (s) => {
      void incrementProgress(`${GAME_ID}.runs`);
      void reportProgress(`${GAME_ID}.treasure`, s.stats.treasures);
      void reportProgress(`${GAME_ID}.combo3`, s.stats.bestChain);
      void reportProgress(`${GAME_ID}.combo5`, s.stats.bestChain);
      void reportProgress(`${GAME_ID}.bounce`, s.stats.bestBounces);
    },
    touch: {
      pad: 'horizontal',
      buttons: [
        { action: 'action2', label: '🫧' },
        { action: 'action', label: '⤒' },
      ],
    },
    keys: { ...DEFAULT_KEYS, z: 'action', Z: 'action', c: 'action2', C: 'action2', j: 'action2', J: 'action2', k: 'action', K: 'action' },
    startHint: '← → swim · Space or ↑ jump (hold it to bounce on bubbles) · X blow bubbles · ↓ drop through a ledge.',
  };
}
