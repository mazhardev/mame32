import { useCallback, useEffect, useRef, useState } from 'react';
import { loadProgress, saveProgress } from '@/storage/StorageService';
import { isRecord } from './useSavedGame';

/**
 * Level-pack progress for puzzle games with fixed levels (Sokoban, Unblock…).
 *
 * One progress record per game holds the best result for every solved level
 * plus, optionally, the position of the level currently being played. Levels
 * are keyed `<pack>:<index>` so each difficulty can have its own pack.
 */
export interface LevelProgress<S> {
  solved: Record<string, number>;
  current?: { key: string; state: S };
}

export function levelKey(pack: string, index: number): string {
  return `${pack}:${index}`;
}

export function parseLevelKey(key: string): { pack: string; index: number } | null {
  const m = /^([a-z0-9-]+):(\d+)$/.exec(key);
  return m ? { pack: m[1], index: Number(m[2]) } : null;
}

/** Highest playable index in a pack: every level up to one past the furthest solved. */
export function highestUnlocked(solved: Record<string, number>, pack: string, count: number): number {
  let furthest = -1;
  for (const key of Object.keys(solved)) {
    const parsed = parseLevelKey(key);
    if (parsed && parsed.pack === pack) furthest = Math.max(furthest, parsed.index);
  }
  return Math.min(count - 1, furthest + 1);
}

export function solvedInPack(solved: Record<string, number>, pack: string): number {
  return Object.keys(solved).filter((k) => parseLevelKey(k)?.pack === pack).length;
}

export function validLevelProgress<S>(
  value: unknown,
  validateState: (s: unknown) => s is S,
): LevelProgress<S> | null {
  if (!isRecord(value) || !isRecord(value.solved)) return null;
  const solved: Record<string, number> = {};
  for (const [key, best] of Object.entries(value.solved)) {
    if (parseLevelKey(key) && typeof best === 'number' && Number.isFinite(best)) solved[key] = best;
  }
  const out: LevelProgress<S> = { solved };
  const cur = value.current;
  if (isRecord(cur) && typeof cur.key === 'string' && parseLevelKey(cur.key) && validateState(cur.state)) {
    out.current = { key: cur.key, state: cur.state };
  }
  return out;
}

function describe(progress: LevelProgress<unknown>, packNames: Record<string, string>): string {
  const n = Object.keys(progress.solved).length;
  const solvedText = `${n} level${n === 1 ? '' : 's'} solved`;
  const cur = progress.current && parseLevelKey(progress.current.key);
  if (!cur) return solvedText;
  return `${packNames[cur.pack] ?? cur.pack} level ${cur.index + 1} in progress · ${solvedText}`;
}

/**
 * Loads and persists a game's LevelProgress. `better(a, b)` says whether a new
 * result `a` beats the stored best `b` (fewer moves, higher score…).
 */
export function useLevelProgress<S>(
  gameId: string,
  validateState: (s: unknown) => s is S,
  options: { packNames?: Record<string, string>; better?: (a: number, b: number) => boolean } = {},
) {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<LevelProgress<S>>({ solved: {} });
  const ref = useRef(progress);
  const validateRef = useRef(validateState);
  validateRef.current = validateState;
  const optsRef = useRef(options);
  optsRef.current = options;

  useEffect(() => {
    let alive = true;
    void loadProgress(gameId).then((raw) => {
      if (!alive) return;
      const parsed = validLevelProgress(raw, (s): s is S => validateRef.current(s));
      if (parsed) {
        ref.current = parsed;
        setProgress(parsed);
      }
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [gameId]);

  const write = useCallback(
    (next: LevelProgress<S>) => {
      ref.current = next;
      setProgress(next);
      const cur = next.current && parseLevelKey(next.current.key);
      void saveProgress(gameId, next, {
        label: describe(next, optsRef.current.packNames ?? {}),
        level: cur ? cur.index + 1 : undefined,
      });
    },
    [gameId],
  );

  /** Records a solve; returns true when it is a new best for that level. */
  const recordSolve = useCallback(
    (key: string, result: number): boolean => {
      const better = optsRef.current.better ?? ((a: number, b: number) => a < b);
      const prev = ref.current.solved[key];
      const isBest = prev === undefined || better(result, prev);
      write({
        solved: { ...ref.current.solved, [key]: isBest ? result : prev },
        current: undefined,
      });
      return isBest;
    },
    [write],
  );

  const saveCurrent = useCallback(
    (key: string, state: S) => write({ ...ref.current, current: { key, state } }),
    [write],
  );

  const clearCurrent = useCallback(() => {
    if (ref.current.current) write({ ...ref.current, current: undefined });
  }, [write]);

  return { loading, progress, recordSolve, saveCurrent, clearCurrent };
}

/**
 * Level-pack navigation on top of useLevelProgress. Once progress loads it
 * jumps to the level left in progress (or the first unsolved one). Picking
 * another level abandons the current round through the shell's restart, so
 * the game's registered restart routine loads `indexRef.current`.
 */
export function usePackLevels<S>(
  gameId: string,
  pack: string,
  count: number,
  validateState: (s: unknown) => s is S,
  restartShell: () => void,
  options: { packNames?: Record<string, string>; better?: (a: number, b: number) => boolean } = {},
) {
  const lp = useLevelProgress<S>(gameId, validateState, options);
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  const chosen = useRef(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (lp.loading || chosen.current) return;
    chosen.current = true;
    const cur = lp.progress.current && parseLevelKey(lp.progress.current.key);
    const start =
      cur && cur.pack === pack && cur.index < count
        ? cur.index
        : highestUnlocked(lp.progress.solved, pack, count);
    indexRef.current = start;
    setIndex(start);
    setReady(true);
  }, [count, lp.loading, lp.progress, pack]);

  const select = useCallback(
    (i: number) => {
      if (i < 0 || i >= count) return;
      indexRef.current = i;
      setIndex(i);
      restartShell();
    },
    [count, restartShell],
  );

  const savedFor = (i: number): S | null => {
    const cur = lp.progress.current;
    return cur && cur.key === levelKey(pack, i) ? cur.state : null;
  };

  return { ...lp, ready, index, indexRef, select, savedFor, key: levelKey(pack, index) };
}
