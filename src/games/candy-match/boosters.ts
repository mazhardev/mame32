import { useCallback, useEffect, useRef, useState } from 'react';
import { getGameSettings, setGameSettings } from '@/storage/StorageService';

/**
 * Booster inventory. Boosters are earned by playing (three-star levels and
 * finished worlds) — there is nothing to buy. Stored with the game's local
 * settings so export/import carries them.
 */
export type BoosterId = 'hammer' | 'swap' | 'shuffle' | 'moves';
export type Boosters = Record<BoosterId, number>;

export const BOOSTERS: { id: BoosterId; name: string; icon: string; help: string }[] = [
  { id: 'hammer', name: 'Candy Hammer', icon: '🔨', help: 'Smash any one candy or crack an obstacle. Costs no move.' },
  { id: 'swap', name: 'Free Swap', icon: '🔄', help: 'Swap any two neighbouring candies, even without a match. Costs no move.' },
  { id: 'shuffle', name: 'Shuffle', icon: '🔀', help: 'Mix up every free candy on the board. Costs no move.' },
  { id: 'moves', name: '+5 Moves', icon: '➕', help: 'Offered when you run out of moves: carry on with five more.' },
];

export const START_BOOSTERS: Boosters = { hammer: 3, swap: 3, shuffle: 3, moves: 3 };
const MAX = 99;
const GAME_ID = 'candy-match';

function sanitize(value: unknown): Boosters {
  const out = { ...START_BOOSTERS };
  if (value && typeof value === 'object') {
    for (const b of BOOSTERS) {
      const n = (value as Record<string, unknown>)[b.id];
      if (typeof n === 'number' && Number.isInteger(n)) out[b.id] = Math.max(0, Math.min(MAX, n));
    }
  }
  return out;
}

export function useBoosters() {
  const [boosters, setBoosters] = useState<Boosters>(START_BOOSTERS);
  const ref = useRef(boosters);

  useEffect(() => {
    let alive = true;
    void getGameSettings(GAME_ID, { boosters: START_BOOSTERS }).then((rec) => {
      if (!alive) return;
      ref.current = sanitize(rec.boosters);
      setBoosters(ref.current);
    });
    return () => {
      alive = false;
    };
  }, []);

  const change = useCallback((patch: Partial<Record<BoosterId, number>>) => {
    const next = { ...ref.current };
    for (const [id, delta] of Object.entries(patch) as [BoosterId, number][]) next[id] = Math.max(0, Math.min(MAX, next[id] + delta));
    ref.current = next;
    setBoosters(next);
    void setGameSettings(GAME_ID, { boosters: next });
  }, []);

  /** Uses one booster; false if there is none left. */
  const use = useCallback(
    (id: BoosterId) => {
      if (ref.current[id] <= 0) return false;
      change({ [id]: -1 });
      return true;
    },
    [change],
  );

  return { boosters, use, give: change };
}
