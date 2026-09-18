import type { GameDefinition } from '@/types';
import { snakeGame } from './snake/definition';
import { ticTacToeGame } from './tic-tac-toe/definition';
import { connectFourGame } from './connect-four/definition';
import { numberMergeGame } from './number-merge-2048/definition';
import { minesweeperGame } from './minesweeper/definition';
import { sudokuGame } from './sudoku/definition';
import { reactionTimerGame } from './reaction-timer/definition';
import { game as aimTrainerGame } from './aim-trainer/definition';
import { game as memoryMatchGame } from './memory-match/definition';
import { game as hangmanGame } from './hangman/definition';
import { game as simonMemoryGame } from './simon-memory/definition';
import { game as waterSortGame } from './water-sort/definition';
import { pongGame } from './pong/definition';
import { brickBreakerGame } from './brick-breaker/definition';
import { blockDropGame } from './block-drop/definition';
import { wordSearchGame } from './word-search/definition';
import { blackjackGame } from './blackjack/definition';
import { klondikeGame } from './klondike-solitaire/definition';

/**
 * Every implemented game registers its definition here.
 * Adding a game means: create src/games/<id>/, export a definition, add one
 * import + one array entry below. Nothing else in the app needs editing.
 */
export const GAME_REGISTRY: GameDefinition[] = [
  snakeGame,
  ticTacToeGame,
  connectFourGame,
  numberMergeGame,
  minesweeperGame,
  sudokuGame,
  reactionTimerGame,
  aimTrainerGame,
  memoryMatchGame,
  hangmanGame,
  simonMemoryGame,
  waterSortGame,
  pongGame,
  brickBreakerGame,
  blockDropGame,
  wordSearchGame,
  blackjackGame,
  klondikeGame,
];
