import { useCallback, useEffect, useRef } from 'react';
import { useSavedGame } from '../puzzle/useSavedGame';
import type { SaveMeta } from '../puzzle/useSavedGame';

/**
 * Autosave for idle games: every `every` seconds of play, when the tab is
 * hidden and when the game unmounts. `snapshot` returns the state to store
 * (or null to skip, e.g. before the first action).
 */
export function useIdleSave<T>(
  gameId: string,
  validate: (value: unknown) => value is T,
  snapshot: () => { state: T; meta: SaveMeta } | null,
  every = 10,
) {
  const save = useSavedGame<T>(gameId, validate);
  const snapRef = useRef(snapshot);
  snapRef.current = snapshot;
  const persistRef = useRef(save.persist);
  persistRef.current = save.persist;

  const flush = useCallback(() => {
    const snap = snapRef.current();
    if (snap) persistRef.current(snap.state, snap.meta);
  }, []);

  useEffect(() => {
    const id = window.setInterval(flush, every * 1000);
    const onHide = () => {
      if (document.hidden) flush();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', flush);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [every, flush]);

  return { ...save, flush };
}

/** Seconds of offline progress to credit, capped. */
export function offlineSeconds(savedAt: number, now: number, capSeconds: number): number {
  if (!Number.isFinite(savedAt) || savedAt <= 0) return 0;
  return Math.max(0, Math.min(capSeconds, (now - savedAt) / 1000));
}
