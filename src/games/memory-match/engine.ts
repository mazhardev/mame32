import { shuffleWith } from '@/utils/random';

export const SYMBOLS = ['🍋', '🌙', '🚀', '🌻', '🐸', '🎈', '🦋', '⭐', '🍉', '🐳', '🌈', '🍒'];
export function createBoard(pairs: number, random = Math.random): number[] {
  return shuffleWith(
    [...Array.from({ length: pairs }, (_, i) => i), ...Array.from({ length: pairs }, (_, i) => i)],
    random,
  );
}
export function scoreBoard(pairs: number, moves: number) {
  return Math.max(10, pairs * 100 - Math.max(0, moves - pairs) * 25);
}
export function isPair(board: number[], first: number, second: number) {
  return (
    first !== second &&
    first >= 0 &&
    second >= 0 &&
    first < board.length &&
    second < board.length &&
    board[first] === board[second]
  );
}
