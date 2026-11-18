import { afterEach, describe, expect, it, vi } from 'vitest';
import { getConsent, setConsent, track } from './analytics';

const w = () => window as unknown as Record<string, unknown>;

describe('analytics', () => {
  afterEach(() => {
    localStorage.clear();
    delete w().gtag;
  });

  it('is on by default and remembers when the visitor turns it off', () => {
    expect(getConsent()).toBe('granted');
    setConsent('denied');
    expect(getConsent()).toBe('denied');
    setConsent('granted');
    expect(getConsent()).toBe('granted');
  });

  it('never sends events off the live site', () => {
    const gtag = vi.fn();
    w().gtag = gtag;
    track('game_start', { game_id: 'chess' }); // jsdom's hostname is not the production domain
    expect(gtag).not.toHaveBeenCalled();
  });

  it('is a harmless no-op when the Google tag is missing', () => {
    expect(() => track('game_complete')).not.toThrow();
  });
});
