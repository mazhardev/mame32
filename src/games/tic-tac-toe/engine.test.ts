import { describe, expect, it } from 'vitest';
import {
  availableMoves,
  bestMove,
  chooseMove,
  emptyBoard,
  isDraw,
  isGameOver,
  winner,
  winningLine,
} from './engine';
import type { Board, Mark } from './engine';

const b = (s: string): Board =>
  s
    .replace(/\s/g, '')
    .split('')
    .map((c) => (c === '.' ? null : (c as Mark)));

describe('win detection', () => {
  it('finds every row, column and diagonal', () => {
    expect(winner(b('XXX......'))).toBe('X');
    expect(winner(b('...OOO...'))).toBe('O');
    expect(winner(b('......XXX'))).toBe('X');
    expect(winner(b('X..X..X..'))).toBe('X');
    expect(winner(b('.O..O..O.'))).toBe('O');
    expect(winner(b('..X..X..X'))).toBe('X');
    expect(winner(b('X...X...X'))).toBe('X');
    expect(winner(b('..X.X.X..'))).toBe('X');
  });

  it('returns the winning line indices', () => {
    expect(winningLine(b('X...X...X'))).toEqual([0, 4, 8]);
  });

  it('reports no winner on an unfinished board', () => {
    expect(winner(b('XO.......'))).toBeNull();
    expect(isGameOver(b('XO.......'))).toBe(false);
  });

  it('detects a draw only on a full board with no line', () => {
    expect(isDraw(b('XOXXOOOXX'))).toBe(true);
    expect(isDraw(b('XXX OOO ..'.replace(' ', '')))).toBe(false);
    expect(isDraw(b('XO.......'))).toBe(false);
  });
});

describe('move generation', () => {
  it('lists only empty squares', () => {
    expect(availableMoves(b('XO.XO.XO.'))).toEqual([2, 5, 8]);
    expect(availableMoves(b('XOXXOOOXX'))).toEqual([]);
  });
});

describe('perfect AI', () => {
  it('takes an immediate win', () => {
    expect(bestMove(b('XX.OO....'), 'X')).toBe(2);
  });

  it('blocks the opponent from winning', () => {
    expect(bestMove(b('OO.X..X..'), 'X')).toBe(2);
  });

  it('never loses from an empty board against itself', () => {
    for (let game = 0; game < 5; game++) {
      const board = emptyBoard();
      let turn: Mark = 'X';
      while (!isGameOver(board)) {
        const move = bestMove(board.slice(), turn);
        expect(move).not.toBeNull();
        board[move as number] = turn;
        turn = turn === 'X' ? 'O' : 'X';
      }
      expect(winner(board)).toBeNull();
    }
  });

  it('always returns a legal move', () => {
    const board = b('XOX.O.X..');
    const move = bestMove(board.slice(), 'O');
    expect(availableMoves(board)).toContain(move);
  });
});

describe('difficulty', () => {
  it('hard never blunders and always plays legally', () => {
    const board = b('XX.OO....');
    expect(chooseMove(board.slice(), 'X', 'hard', () => 0.99)).toBe(2);
  });

  it('easy can play a random legal square', () => {
    const board = b('XX.OO....');
    const move = chooseMove(board.slice(), 'X', 'easy', () => 0);
    expect(availableMoves(board)).toContain(move);
  });

  it('returns null when the board is full', () => {
    expect(chooseMove(b('XOXXOOOXX'), 'X', 'hard')).toBeNull();
  });
});
