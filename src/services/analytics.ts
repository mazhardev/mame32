import { site } from '@/config/site';

/**
 * Thin wrapper around the Google tag loaded in index.html. Analytics is on by
 * default on the live site; a visitor can turn it off in Settings -> Privacy,
 * which is remembered in this browser. Every call is a no-op when the tag is
 * missing (offline, blocked, tests, local development).
 */
export type AnalyticsChoice = 'granted' | 'denied';

const CHOICE_KEY = `${site.storagePrefix}.analyticsConsent`;
const CHANGE_EVENT = 'analytics-consent-change';

type Gtag = (...args: unknown[]) => void;
type AnalyticsWindow = Window & { gtag?: Gtag };
const win = () => (typeof window === 'undefined' ? null : (window as unknown as AnalyticsWindow));
const isLiveSite = () => /(^|\.)gamesplayland\.online$/.test(win()?.location.hostname ?? '');

/** 'denied' only when the visitor turned analytics off; otherwise it is on. */
export function getConsent(): AnalyticsChoice {
  try {
    return localStorage.getItem(CHOICE_KEY) === 'denied' ? 'denied' : 'granted';
  } catch {
    return 'granted';
  }
}

export function setConsent(choice: AnalyticsChoice): void {
  try {
    localStorage.setItem(CHOICE_KEY, choice);
  } catch {
    // Private mode: the choice still applies for this visit.
  }
  const w = win();
  if (!w) return;
  if (isLiveSite()) w.gtag?.('consent', 'update', { analytics_storage: choice });
  w.dispatchEvent(new Event(CHANGE_EVENT));
}

export function onConsentChange(fn: () => void): () => void {
  const w = win();
  if (!w) return () => {};
  w.addEventListener(CHANGE_EVENT, fn);
  return () => w.removeEventListener(CHANGE_EVENT, fn);
}

/** Sends a custom event, e.g. track('game_start', { game_id: 'chess' }). */
export function track(event: string, params: Record<string, string | number | boolean | undefined> = {}): void {
  const w = win();
  if (!w?.gtag || !isLiveSite() || getConsent() === 'denied') return;
  try {
    w.gtag('event', event, params);
  } catch {
    // Analytics must never break a game.
  }
}
