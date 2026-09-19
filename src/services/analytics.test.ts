import { afterEach, describe, expect, it, vi } from 'vitest';
import { getConsent, setConsent, track } from './analytics';

const w = () => window as unknown as Record<string, unknown>;

describe('analytics', () => {
  afterEach(() => {
    localStorage.clear();
    delete w().gtag;
  });

  it('remembers the visitor’s choice and updates consent mode', () => {
    const gtag = vi.fn();
    w().gtag = gtag;
    expect(getConsent()).toBeNull();
    setConsent('granted');
    expect(getConsent()).toBe('granted');
    expect(gtag).toHaveBeenCalledWith('consent', 'update', { analytics_storage: 'granted' });
  });

  it('never sends events off the live site or after "No thanks"', () => {
    const gtag = vi.fn();
    w().gtag = gtag;
    setConsent('granted'); // jsdom's hostname is not the production domain
    track('game_start', { game_id: 'chess' });
    setConsent('denied');
    track('game_start', { game_id: 'chess' });
    expect(gtag.mock.calls.filter(([kind]) => kind === 'event')).toHaveLength(0);
  });

  it('is a harmless no-op when the Google tag is missing', () => {
    expect(() => track('game_complete')).not.toThrow();
  });
});
