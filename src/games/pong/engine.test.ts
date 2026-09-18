import { expect, it } from 'vitest';
import { PongEngine } from './engine';
it('bounces off the player paddle', () => {
  const e = new PongEngine('normal');
  e.ball = { x: 40, y: 200, vx: -200, vy: 0 };
  e.update(0.02, new Set());
  expect(e.ball.vx).toBeGreaterThan(0);
});
it('counts a goal and ends at seven', () => {
  const e = new PongEngine('easy');
  e.score = 600;
  e.ball.x = 650;
  e.update(0.01, new Set());
  expect(e.won).toBe(true);
  expect(e.score).toBe(700);
});
