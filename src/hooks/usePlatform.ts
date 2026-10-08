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

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitFullscreenEnabled?: boolean;
  webkitExitFullscreen?: () => Promise<void> | void;
};
type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

function nativeFullscreenElement(): Element | null {
  if (typeof document === 'undefined') return null;
  const doc = document as FullscreenDocument;
  return document.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

/** True where an element can enter the browser's own fullscreen (not iPhone Safari). */
export function canUseNativeFullscreen(): boolean {
  if (typeof document === 'undefined' || typeof Element === 'undefined') return false;
  const doc = document as FullscreenDocument;
  const enabled = document.fullscreenEnabled ?? doc.webkitFullscreenEnabled ?? false;
  return (
    !!enabled &&
    ('requestFullscreen' in Element.prototype || 'webkitRequestFullscreen' in Element.prototype)
  );
}

async function requestNativeFullscreen(el: HTMLElement | null) {
  if (!el || nativeFullscreenElement() || !canUseNativeFullscreen()) return;
  const target = el as FullscreenElement;
  try {
    if (target.requestFullscreen) await target.requestFullscreen({ navigationUI: 'hide' });
    else await target.webkitRequestFullscreen?.();
  } catch {
    // Refused (no user gesture, or blocked by the browser). The expanded layout
    // still covers the whole viewport, so play carries on without it.
  }
}

function exitNativeFullscreen() {
  if (!nativeFullscreenElement()) return;
  const doc = document as FullscreenDocument;
  try {
    const done = document.exitFullscreen ? document.exitFullscreen() : doc.webkitExitFullscreen?.();
    void Promise.resolve(done).catch(() => undefined);
  } catch {
    // Already left fullscreen.
  }
}

/** History entry marker so the browser Back button closes expanded play first. */
const EXPAND_MARK = '__gplExpanded';

const historyHasMark = () =>
  typeof window !== 'undefined' &&
  !!(window.history.state as Record<string, unknown> | null)?.[EXPAND_MARK];

/**
 * Expanded play: the game shell covers the whole screen on every device.
 *
 * The layout itself is CSS (a fixed overlay that respects notches and safe
 * areas), so it works everywhere, including iPhone Safari, which has no element
 * fullscreen. Where the Fullscreen API exists (desktop, Android, iPad) the
 * browser's own UI is hidden as well. Pressing Escape, the browser or system
 * Back button, or leaving fullscreen with a system gesture all exit expanded
 * play, and the page behind never scrolls while it is open.
 */
export function useExpandMode(targetRef: React.RefObject<HTMLElement>) {
  const [expanded, setExpanded] = useState(false);
  const [native, setNative] = useState(false);
  const activeRef = useRef(false);
  const nativeRef = useRef(false);
  const markedRef = useRef(false);

  const exit = useCallback((opts: { keepHistory?: boolean } = {}) => {
    if (!activeRef.current) return false;
    activeRef.current = false;
    setExpanded(false);
    exitNativeFullscreen();
    const marked = markedRef.current && historyHasMark();
    markedRef.current = false;
    // Drop the history entry we added, unless the caller is about to replace it.
    if (marked && !opts.keepHistory) window.history.back();
    return marked;
  }, []);

  const enter = useCallback(
    (opts: { native?: boolean } = {}) => {
      if (!activeRef.current) {
        activeRef.current = true;
        setExpanded(true);
        if (!historyHasMark()) {
          try {
            const state = (window.history.state as Record<string, unknown> | null) ?? {};
            window.history.pushState({ ...state, [EXPAND_MARK]: true }, '');
            markedRef.current = true;
          } catch {
            markedRef.current = false;
          }
        }
      }
      if (opts.native !== false) void requestNativeFullscreen(targetRef.current);
    },
    [targetRef],
  );

  const toggle = useCallback(() => {
    if (activeRef.current) exit();
    else enter();
  }, [enter, exit]);

  /** Upgrades an already expanded shell to browser fullscreen (needs a user gesture). */
  const upgrade = useCallback(() => {
    if (activeRef.current && !nativeRef.current) void requestNativeFullscreen(targetRef.current);
  }, [targetRef]);

  // Track browser fullscreen. Leaving it by Escape or a system gesture ends expanded play.
  useEffect(() => {
    const onChange = () => {
      const fs = nativeFullscreenElement();
      const ours = !!fs && fs === targetRef.current;
      const wasNative = nativeRef.current;
      nativeRef.current = ours;
      setNative(ours);
      if (wasNative && !ours) exit();
    };
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
    };
  }, [exit, targetRef]);

  // Browser / Android Back closes expanded play instead of leaving the game.
  useEffect(() => {
    const onPop = () => {
      if (activeRef.current && !historyHasMark()) {
        markedRef.current = false;
        exit();
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [exit]);

  // Lock page scroll and pull-to-refresh behind the expanded shell.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('game-expanded', expanded);
    return () => root.classList.remove('game-expanded');
  }, [expanded]);

  // Leaving the game page while expanded: restore the page, keep navigation intact.
  useEffect(
    () => () => {
      if (activeRef.current) {
        activeRef.current = false;
        markedRef.current = false;
        exitNativeFullscreen();
      }
    },
    [],
  );

  return { expanded, native, enter, exit, toggle, upgrade, nativeSupported: canUseNativeFullscreen() };
}

/** Keeps the screen awake while `active` is true, where the Wake Lock API exists. */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof navigator === 'undefined') return;
    const wakeLock = (navigator as Navigator & {
      wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> };
    }).wakeLock;
    if (!wakeLock) return;
    let sentinel: { release: () => Promise<void> } | null = null;
    let cancelled = false;
    wakeLock
      .request('screen')
      .then((s) => {
        if (cancelled) void s.release().catch(() => undefined);
        else sentinel = s;
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      if (sentinel) void sentinel.release().catch(() => undefined);
    };
  }, [active]);
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

/** True when the player asked for less motion, in Settings or in their OS. */
export function useReducedMotion(): boolean {
  const [prefs] = usePreferences();
  const media = useMediaQuery('(prefers-reduced-motion: reduce)');
  return prefs.reducedMotion || media;
}
