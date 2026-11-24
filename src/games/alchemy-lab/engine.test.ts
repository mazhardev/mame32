import { describe, expect, it } from 'vitest';
import { TOTAL, hintFor, isFinal, mix, openUses, startSet, validFound } from './engine';
import { ELEMENTS, RECIPES, START } from './recipes';

describe('alchemy lab', () => {
  it('mixes in either order', () => {
    expect(mix('water', 'fire')).toBe('steam');
    expect(mix('fire', 'water')).toBe('steam');
    expect(mix('water', 'water')).toBe('sea');
    expect(mix('ash', 'astronaut')).toBeNull();
  });

  it('has one result per pair and only known elements', () => {
    const pairs = new Set<string>();
    for (const [a, b, r] of RECIPES) {
      for (const x of [a, b, r]) expect(ELEMENTS[x]).toBeDefined();
      const k = [a, b].sort().join('+');
      expect(pairs.has(k)).toBe(false);
      pairs.add(k);
    }
  });

  it('can reach every element from the four starting ones', () => {
    const known = new Set<string>(START);
    let grew = true;
    while (grew) {
      grew = false;
      for (const [a, b, r] of RECIPES) {
        if (known.has(a) && known.has(b) && !known.has(r)) {
          known.add(r);
          grew = true;
        }
      }
    }
    expect(known.size).toBe(TOTAL);
  });

  it('can always be finished by following hints', () => {
    const found = startSet();
    for (let i = 0; i < TOTAL; i++) {
      const h = hintFor(found, () => 0);
      if (!h) break;
      expect(found).toContain(h[0]);
      expect(found).toContain(h[1]);
      found.push(h[2]);
    }
    expect(found).toHaveLength(TOTAL);
    expect(hintFor(found)).toBeNull();
  });

  it('marks elements that make nothing more', () => {
    expect(isFinal('astronaut')).toBe(true);
    expect(isFinal('water')).toBe(false);
    expect(openUses(startSet(), 'water')).toBeGreaterThan(3);
  });

  it('accepts only saved collections of real elements that include the starters', () => {
    expect(validFound(startSet())).toBe(true);
    expect(validFound(['water', 'fire'])).toBe(false);
    expect(validFound([...startSet(), 'unobtainium'])).toBe(false);
  });
});
