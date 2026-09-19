import { site } from '@/config/site';

/**
 * Thin wrapper around the Google tag loaded in index.html. Consent Mode keeps
 * analytics cookies off until the visitor agrees; choosing "No thanks" turns
 * reporting off completely. Every call is a no-op when the tag is missing
 * (offline, blocked, tests, local development).
 */
export type AnalyticsConsent = 'granted' | 'denied' | null;

const CONSENT_KEY = `${site.storagePrefix}.analyticsConsent`;
const DISABLE_FLAG = `ga-disable-${site.gaMeasurementId}`;
const CHANGE_EVENT = 'analytics-consent-change';

type Gtag = (...args: unknown[]) => void;
type AnalyticsWindow = Window & { gtag?: Gtag } & Record<string, unknown>;
const win = () => (typeof window === 'undefined' ? null : (window as unknown as AnalyticsWindow));

export function getConsent(): AnalyticsConsent {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === 'granted' || v === 'denied' ? v : null;
  } catch {
    return null;
  }
}

export function setConsent(choice: 'granted' | 'denied'): void {
  try {
    localStorage.setItem(CONSENT_KEY, choice);
  } catch {
    // Private mode: the choice still applies for this visit.
  }
  const w = win();
  if (!w) return;
  const liveSite = /(^|\.)gamesplayland\.online$/.test(w.location.hostname);
  w[DISABLE_FLAG] = choice === 'denied' || !liveSite;
  w.gtag?.('consent', 'update', { analytics_storage: choice });
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
  if (!w?.gtag || w[DISABLE_FLAG]) return;
  try {
    w.gtag('event', event, params);
  } catch {
    // Analytics must never break a game.
  }
}
