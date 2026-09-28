import { describe, expect, it } from 'vitest';
import {
  LEVELS_PER_PACK,
  PIECES,
  SQUARE,
  findSlot,
  levelPuzzle,
  orientationKey,
  overlaps,
  polygonArea,
  transform,
} from './engine';
import type { Puzzle } from './engine';

function assertValid(p: Puzzle) {
  const polys = PIECES.map((def, i) => transform(def, p.solution[i]));
  const total = polys.reduce((s, poly) => s + polygonArea(poly), 0);
  expect(total).toBeCloseTo(16, 6);
  for (let i = 0; i < polys.length; i++)
    for (let j = i + 1; j < polys.length; j++) expect(overlaps(polys[i], polys[j]), `${i} vs ${j}`).toBe(false);
}

describe('tangram pieces', () => {
  it('have the classic areas that add up to the 4×4 square', () => {
    const areas = PIECES.map((d) => polygonArea(d.points));
    expect(areas.map((a) => +a.toFixed(6))).toEqual([4, 4, 2, 1, 1, 2, 2]);
  });

  it('assemble into the classic square without gaps or overlaps', () => {
    assertValid(SQUARE);
    const pts = PIECES.flatMap((def, i) => transform(def, SQUARE.solution[i]));
    for (const [x, y] of pts) {
      expect(x).toBeGreaterThan(-1e-9);
      expect(x).toBeLessThan(4 + 1e-9);
      expect(y).toBeGreaterThan(-1e-9);
      expect(y).toBeLessThan(4 + 1e-9);
    }
  });

  it('treats symmetric orientations as the same outline', () => {
    expect(orientationKey('Q', { x: 0, y: 0, rot: 0, flip: false })).toBe(orientationKey('Q', { x: 0, y: 0, rot: 2, flip: false }));
    expect(orientationKey('P', { x: 0, y: 0, rot: 1, flip: false })).toBe(orientationKey('P', { x: 0, y: 0, rot: 5, flip: false }));
    expect(orientationKey('P', { x: 0, y: 0, rot: 1, flip: false })).not.toBe(orientationKey('P', { x: 0, y: 0, rot: 1, flip: true }));
  });

  it('detects overlap between convex pieces but not touching edges', () => {
    const a = transform(PIECES[3], { x: 0, y: 0, rot: 0, flip: false });
    const touching = transform(PIECES[3], { x: 0, y: 0, rot: 4, flip: false }); // mirrored across the hypotenuse
    const shifted = transform(PIECES[3], { x: 0.3, y: 0.2, rot: 0, flip: false });
    expect(overlaps(a, touching)).toBe(false);
    expect(overlaps(a, shifted)).toBe(true);
  });
});

describe('tangram levels', () => {
  it('generates valid, distinct silhouettes for every level', () => {
    for (const pack of ['easy', 'normal', 'hard'] as const) {
      const seen = new Set<string>();
      for (let i = 0; i < LEVELS_PER_PACK; i++) {
        const p = levelPuzzle(pack, i);
        assertValid(p);
        seen.add(JSON.stringify(p.solution.map((s) => [s.x.toFixed(3), s.y.toFixed(3), s.rot])));
      }
      expect(seen.size).toBeGreaterThan(LEVELS_PER_PACK - 2);
    }
  });

  it('snaps a piece into a matching slot, including its twin', () => {
    const offset: [number, number] = [0, 0];
    const target = SQUARE.solution[1];
    // Large triangle L1 dropped close to L2's slot, in L2's orientation.
    const slot = findSlot(SQUARE, 0, { ...target, x: target.x + 0.2, y: target.y - 0.1 }, new Set(), offset, 0.5);
    expect(slot).toBe(1);
    // Wrong orientation never snaps.
    expect(findSlot(SQUARE, 0, { ...target, rot: target.rot + 1 }, new Set(), offset, 0.5)).toBe(-1);
    // A taken slot is skipped.
    expect(findSlot(SQUARE, 0, target, new Set([1]), offset, 0.5)).toBe(-1);
  });
});
