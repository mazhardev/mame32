import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { clearProgress, loadProgress, saveProgress } from '@/storage/StorageService';

export interface SaveMeta {
  level?: number;
  percent?: number;
  label?: string;
}

/**
 * Save / resume for a game with one in-progress position.
 *
 * On mount it loads the stored state and, if `validate` accepts it, exposes it
 * as `saved` so the game can offer Continue or New. Saved data is untrusted
 * (it may come from an imported file or an older version), which is why every
 * game supplies a structural validator rather than casting.
 */
export function useSavedGame<T>(gameId: string, validate: (value: unknown) => value is T) {
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState<T | null>(null);
  const validateRef = useRef(validate);
  validateRef.current = validate;

  useEffect(() => {
    let alive = true;
    void loadProgress(gameId).then((value) => {
      if (!alive) return;
      if (value !== null && validateRef.current(value)) setSaved(value);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [gameId]);

  const persist = useCallback(
    (state: T, meta: SaveMeta = {}) => void saveProgress(gameId, state, meta),
    [gameId],
  );

  /** Forgets the stored game, e.g. after a win or when starting afresh. */
  const clear = useCallback(() => {
    setSaved(null);
    void clearProgress(gameId);
  }, [gameId]);

  /** Hides the resume prompt without touching storage (used after Continue). */
  const dismiss = useCallback(() => setSaved(null), []);

  return useMemo(
    () => ({ loading, saved, persist, clear, dismiss }),
    [loading, saved, persist, clear, dismiss],
  );
}

export function isIntArray(value: unknown, length?: number, min = -Infinity, max = Infinity) {
  return (
    Array.isArray(value) &&
    (length === undefined || value.length === length) &&
    value.every((v) => Number.isInteger(v) && v >= min && v <= max)
  );
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
