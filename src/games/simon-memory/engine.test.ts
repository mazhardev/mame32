import { expect, it } from 'vitest';
import { extend, checkInput } from './engine';
it('extends without changing earlier steps', () => {
  const s = [1, 2];
  expect(extend(s, () => 0.75)).toEqual([1, 2, 3]);
  expect(s).toEqual([1, 2]);
});
it('requires the correct order and entire sequence', () => {
  expect(checkInput([1, 2], [], 2)).toBe('wrong');
  expect(checkInput([1, 2], [], 1)).toBe('correct');
  expect(checkInput([1, 2], [1], 2)).toBe('complete');
});
