import { expect, it } from 'vitest';
import { BlockEngine, clearLines, rotate } from './engine';
it('removes complete rows and adds empty rows at the top', () => {
  const b = [Array(10).fill(1), Array(10).fill(0)];
  expect(clearLines(b).count).toBe(1);
  expect(clearLines(b).board).toHaveLength(2);
});
it('rotates a piece back to its original orientation', () => {
  const s = [
    [1, 0],
    [1, 1],
  ];
  expect(rotate(rotate(rotate(rotate(s))))).toEqual(s);
});
it('rejects out of bounds movement and locks a dropped piece', () => {
  const e = new BlockEngine();
  expect(e.move(-20, 0)).toBe(false);
  e.action('Space');
  expect(e.board.flat().filter(Boolean)).toHaveLength(4);
});
