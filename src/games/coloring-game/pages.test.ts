import { describe, expect, it } from 'vitest';
import { PAGES } from './pages';

describe('colouring pages', () => {
  it.each(PAGES.map((p) => [p.id, p] as const))(
    '%s has unique region ids and enough to colour',
    (_id, p) => {
      expect(new Set(p.regions.map((r) => r.id)).size).toBe(p.regions.length);
      expect(p.regions.length).toBeGreaterThanOrEqual(15);
    },
  );
});
