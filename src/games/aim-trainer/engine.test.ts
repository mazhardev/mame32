import { expect, it } from 'vitest';
import { AimEngine } from './engine';
it('positions targets away from every edge', () => {
  const e = new AimEngine(() => 0);
  expect(e.target).toEqual({ x: 12, y: 12 });
});
it('stops scoring after time expires', () => {
  const e = new AimEngine();
  e.hit();
  e.tick(31);
  e.hit();
  e.miss();
  expect(e.hits).toBe(1);
  expect(e.remaining).toBe(0);
  expect(e.misses).toBe(0);
});
it('includes accuracy in the score', () => {
  const e = new AimEngine();
  e.hit();
  e.hit();
  e.miss();
  expect(e.accuracy).toBe(67);
  expect(e.score).toBe(334);
});
