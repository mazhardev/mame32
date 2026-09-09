import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { getPreferences, setPreferences, subscribe } from '@/storage/StorageService';
import type { Preferences } from '@/types';

/** Subscribes a component to the shared preferences store. */
export function usePreferences(): [Preferences, (patch: Partial<Preferences>) => void] {
  const prefs = useSyncExternalStore(
    (cb) => subscribe('preferences', cb),
    getPreferences,
    getPreferences,
  );
  const update = useCallback((patch: Partial<Preferences>) => {
    setPreferences(patch);
  }, []);
  return [prefs, update];
}

export function useStoreValue<T>(topic: string, read: () => T): T {
  const [value, setValue] = useState<T>(read);
  const readRef = useRef(read);
  readRef.current = read;
  useEffect(() => {
    const update = () => setValue(readRef.current());
    update();
    return subscribe(topic, update);
  }, [topic]);
  return value;
}

/** True while the tab is hidden — every game loop pauses on this. */
export function useDocumentHidden(): boolean {
  const [hidden, setHidden] = useState(
    () => typeof document !== 'undefined' && document.visibilityState === 'hidden',
  );
  useEffect(() => {
    const onChange = () => setHidden(document.visibilityState === 'hidden');
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);
  return hidden;
}

export function useFullscreen(targetRef: React.RefObject<HTMLElement>) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggle = useCallback(async () => {
    const el = targetRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (el.requestFullscreen) await el.requestFullscreen();
    } catch {
      // Fullscreen can be refused (iOS Safari); the layout works without it.
    }
  }, [targetRef]);

  const supported =
    typeof document !== 'undefined' &&
    (document.fullscreenEnabled ?? false) &&
    typeof Element !== 'undefined' &&
    'requestFullscreen' in Element.prototype;

  return { isFullscreen, toggle, supported };
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 760px)');
}

export function useIsCoarsePointer(): boolean {
  return useMediaQuery('(pointer: coarse)');
}

/** Keeps a mutable ref in sync with the latest render value. */
export function useLatest<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

export function useInterval(callback: () => void, delayMs: number | null) {
  const saved = useLatest(callback);
  useEffect(() => {
    if (delayMs === null) return;
    const id = window.setInterval(() => saved.current(), delayMs);
    return () => window.clearInterval(id);
  }, [delayMs, saved]);
}
