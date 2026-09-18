import { expect, it } from 'vitest';
import { evaluateWord } from './engine';
it('reveals repeated letters without requiring duplicate guesses', () => {
  expect(evaluateWord('llama', ['L', 'A', 'M']).won).toBe(true);
});
it('counts unique incorrect guesses only', () => {
  expect(evaluateWord('cat', ['Z', 'Z', 'Y']).remaining).toBe(4);
});
it('loses after six misses and rewards a clean win', () => {
  expect(evaluateWord('cat', ['B', 'D', 'E', 'F', 'G', 'H']).lost).toBe(true);
  expect(evaluateWord('cat', ['C', 'A', 'T']).score).toBe(400);
});
