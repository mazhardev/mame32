import { alphaBeta, WIN_SCORE } from '../_shared/board/minimax';

export type Mark = 'X' | 'O';
export type Cell = Mark | null;
export type Board = Cell[];

export const LINES: number[][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export function emptyBoard(): Board {
  return Array<Cell>(9).fill(null);
}

export function availableMoves(board: Board): number[] {
  const moves: number[] = [];
  for (let i = 0; i < 9; i++) if (board[i] === null) moves.push(i);
  return moves;
}

export function winningLine(board: Board): number[] | null {
  for (const line of LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return line;
  }
  return null;
}

export function winner(board: Board): Mark | null {
  const line = winningLine(board);
  return line ? (board[line[0]] as Mark) : null;
}

export function isDraw(board: Board): boolean {
  return !winner(board) && board.every((c) => c !== null);
}

export function isGameOver(board: Board): boolean {
  return !!winner(board) || isDraw(board);
}

export function other(mark: Mark): Mark {
  return mark === 'X' ? 'O' : 'X';
}

/**
 * Perfect play via alpha-beta. Easy and Normal deliberately weaken it:
 * Easy plays randomly most of the time, Normal blunders occasionally.
 */
export function bestMove(board: Board, mark: Mark): number | null {
  const moves = availableMoves(board);
  if (!moves.length) return null;

  const adapter = {
    getMoves: () => availableMoves(board),
    apply: (m: number) => {
      board[m] = current;
      current = other(current);
    },
    undo: (m: number) => {
      board[m] = null;
      current = other(current);
    },
    evaluate: () => {
      const w = winner(board);
      if (w === mark) return WIN_SCORE;
      if (w) return -WIN_SCORE;
      return 0;
    },
    isTerminal: () => isGameOver(board),
  };
  let current: Mark = mark;
  const result = alphaBeta(adapter, 9, true);
  return result.move ?? moves[0];
}

export type Level = 'easy' | 'normal' | 'hard';

export function chooseMove(
  board: Board,
  mark: Mark,
  level: Level,
  random = Math.random,
): number | null {
  const moves = availableMoves(board);
  if (!moves.length) return null;
  const blunderChance = level === 'easy' ? 0.75 : level === 'normal' ? 0.2 : 0;
  if (random() < blunderChance) return moves[Math.floor(random() * moves.length)];
  return bestMove(board.slice(), mark);
}
