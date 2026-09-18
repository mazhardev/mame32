import { describe, it, expect } from 'vitest';
import { createBoard, isPair, scoreBoard } from './engine';
describe('Memory Match', () => {
  it('creates exactly two copies of each symbol', () => {
    const board = createBoard(12);
    for (let i = 0; i < 12; i++) expect(board.filter((v) => v === i)).toHaveLength(2);
  });
  it('cannot match a card with itself or an out-of-bounds card', () => {
    expect(isPair([1, 1], 0, 0)).toBe(false);
    expect(isPair([1, 1], 0, 1)).toBe(true);
    expect(isPair([1, 1], 2, 3)).toBe(false);
  });
  it('rewards fewer moves with a nonnegative score', () => {
    expect(scoreBoard(6, 6)).toBe(600);
    expect(scoreBoard(6, 8)).toBe(550);
    expect(scoreBoard(6, 100)).toBe(10);
  });
});
