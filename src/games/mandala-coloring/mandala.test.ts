import { describe, expect, it } from 'vitest';
import { FOLDS, makeMandala, validSave } from './mandala';

describe('mandala generator', () => {
  it('is deterministic per seed and has symmetric groups', () => {
    const a = makeMandala(5, 'normal');
    const b = makeMandala(5, 'normal');
    expect(a).toEqual(b);
    const groups = new Map<string, number>();
    for (const r of a) groups.set(r.group ?? r.id, (groups.get(r.group ?? r.id) ?? 0) + 1);
    for (const [g, count] of groups)
      if (g !== 'c' && !g.startsWith('bg')) expect(count % FOLDS.normal).toBe(0);
    expect(new Set(a.map((r) => r.id)).size).toBe(a.length);
  });

  it('harder mandalas have more regions', () => {
    expect(makeMandala(1, 'hard').length).toBeGreaterThan(makeMandala(1, 'easy').length);
  });

  it('validates saves', () => {
    expect(validSave({ seed: 1, difficulty: 'easy', fills: { c: '#ff0000' }, finished: 0 })).toBe(
      true,
    );
    expect(
      validSave({ seed: 1, difficulty: 'easy', fills: { c: 'url(javascript:1)' }, finished: 0 }),
    ).toBe(false);
  });
});
