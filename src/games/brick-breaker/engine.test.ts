import { expect, it } from 'vitest';
import { BrickEngine } from './engine';
it('loses one life when a ball falls past the paddle', () => {
  const e = new BrickEngine();
  e.ball.y = 420;
  e.update(0.01, new Set());
  expect(e.lives).toBe(2);
  expect(e.over).toBe(false);
});
it('wins when the final brick is removed', () => {
  const e = new BrickEngine();
  e.bricks.forEach((b) => (b.alive = false));
  e.update(0.01, new Set());
  expect(e.won).toBe(true);
});
