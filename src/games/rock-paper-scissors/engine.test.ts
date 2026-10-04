import { describe, expect, it } from 'vitest';
import { computerMove, counter, judge, predict } from './engine';
import type { Move } from './engine';

describe('rock paper scissors', () => {
  it('judges every pairing', () => {
    expect(judge('rock', 'scissors')).toBe('win');
    expect(judge('scissors', 'paper')).toBe('win');
    expect(judge('paper', 'rock')).toBe('win');
    expect(judge('rock', 'paper')).toBe('loss');
    expect(judge('paper', 'paper')).toBe('draw');
    expect(counter('rock')).toBe('paper');
  });

  it('predicts a player stuck in a cycle', () => {
    const cycle: Move[] = ['rock', 'paper', 'scissors', 'rock', 'paper', 'scissors', 'rock'];
    expect(predict(cycle, 1)).toBe('paper');
    expect(computerMove(cycle, 'normal', () => 0.5)).toBe('scissors');
  });

  it('easy is random and hard beats a repetitive player most of the time', () => {
    const history: Move[] = Array(10).fill('rock');
    expect(computerMove(history, 'easy', () => 0)).toBe('rock');
    let wins = 0;
    let seed = 7;
    const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 100; i++) if (judge('rock', computerMove(history, 'hard', random)) === 'loss') wins++;
    expect(wins).toBeGreaterThan(70);
  });
});
