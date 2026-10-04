import { describe, expect, it } from 'vitest';
import { SIZE, SPRITES, cellColor } from './sprites';

describe('sprite library', () => {
  it.each(SPRITES.map((s) => [s.id, s] as const))(
    '%s is 16×16 and uses only its palette',
    (_id, s) => {
      expect(s.rows).toHaveLength(SIZE);
      for (const row of s.rows) {
        expect(row.length).toBe(SIZE);
        for (const ch of row) expect(ch === '.' || ch in s.palette).toBe(true);
      }
      expect(cellColor(s, 0, 0) === null || typeof cellColor(s, 0, 0) === 'string').toBe(true);
    },
  );
});
