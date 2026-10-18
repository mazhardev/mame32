import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { formatNumber } from '@/utils/format';
import { DEFAULT_KEYS } from '../_shared/arcade/kit';
import type { ArcadeSpec } from '../_shared/arcade/kit';
import { H, W } from '../_shared/arena/stage';
import { create, update } from './game';
import { render } from './render';
import { FLOOR_COUNT, ZONES, isBossFloor, zoneOf } from './stages';
import type { State } from './types';

export const GAME_ID = 'snowball-rumble';

export const FLOOR_NAMES = Array.from({ length: FLOOR_COUNT }, (_, i) => `Floor ${i + 1} · ${isBossFloor(i) ? 'Boss' : ZONES[zoneOf(i)].name}`);

/** Achievements earned the moment a floor is cleared. */
function reportFloor(index: number, s: State) {
  void reportProgress(`${GAME_ID}.first`, 1);
  if (isBossFloor(index)) void reportProgress(`${GAME_ID}.${['troll', 'djinn', 'king'][zoneOf(index)]}`, 1);
  void reportProgress(`${GAME_ID}.roll3`, s.stats.bestChain);
  void reportProgress(`${GAME_ID}.roll5`, s.stats.bestChain);
}

export function makeSpec(opts: { startLevel: () => number; onClear?: (index: number, s: State) => void }): ArcadeSpec<State> {
  return {
    width: W,
    height: H,
    create: (difficulty) => {
      const s = create(difficulty, opts.startLevel());
      // Development builds only: lets browser tests inspect and steer a run.
      if (import.meta.env.DEV && typeof window !== 'undefined') (window as unknown as { __snowball?: State }).__snowball = s;
      return s;
    },
    update: (s, dt, input, random) =>
      update(s, dt, input, random, {
        onFloorClear: (index, st) => {
          opts.onClear?.(index, st);
          reportFloor(index, st);
        },
      }),
    render,
    hud: (s) => [
      { label: 'Score', value: formatNumber(s.score) },
      { label: 'Lives', value: `❤️ ${s.lives}` },
      { label: 'Floor', value: `${s.stageIndex + 1}/${FLOOR_COUNT}` },
    ],
    result: (s) => ({
      won: s.won,
      lost: !s.won,
      score: s.score,
      title: s.won ? 'The summit is yours!' : 'Snowed under',
      message: s.won ? 'Pebble cleared all thirty floors and toppled the Storm King.' : `You reached floor ${s.stageIndex + 1}. Start again from any floor you have reached.`,
      details: [
        { label: 'Floors cleared', value: String(s.stats.floorsCleared) },
        { label: 'Enemies frozen', value: String(s.stats.frozen) },
        { label: 'Best snowball sweep', value: String(s.stats.bestChain) },
      ],
    }),
    onEnd: (s) => {
      void incrementProgress(`${GAME_ID}.runs`);
      void reportProgress(`${GAME_ID}.frozen`, s.stats.frozen);
      void reportProgress(`${GAME_ID}.potions`, s.stats.potionKinds.length);
      void reportProgress(`${GAME_ID}.roll3`, s.stats.bestChain);
      void reportProgress(`${GAME_ID}.roll5`, s.stats.bestChain);
    },
    touch: {
      pad: 'horizontal',
      buttons: [
        { action: 'action2', label: '❄' },
        { action: 'action', label: '⤒' },
      ],
    },
    keys: { ...DEFAULT_KEYS, z: 'action', Z: 'action', c: 'action2', C: 'action2', j: 'action2', J: 'action2', k: 'action', K: 'action' },
    startHint: '← → walk · Space or ↑ jump · X throw snow (hold to keep throwing) · ↓ drop through a ledge.',
  };
}
