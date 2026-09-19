import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'checkers',
  title: 'Checkers',
  category: 'board',
  difficulty: 'medium',
  icon: '⛀',
  tags: ['draughts', 'classic', 'ai', 'two player', 'strategy'],
  short: 'Classic 8×8 checkers against the computer or a friend.',
  full: 'Jump your opponent’s pieces and crown your own. Play classic checkers (English draughts) against a local computer opponent with three strength levels, or pass-and-play with a friend on the same device.',
  minutes: 10,
  multiplayer: 'vs-ai',
  controls: {
    keyboard: ['Tab to a piece and press Enter, then choose a square'],
    mouse: ['Click a piece, then click a highlighted square'],
    touch: ['Tap a piece, then tap a highlighted square'],
  },
  instructions: {
    objective: 'Capture all of your opponent’s pieces or leave them with no legal move.',
    howToPlay: [
      'Pieces move one square diagonally forwards onto dark squares.',
      'Capture by jumping over an opponent’s piece to the empty square beyond it.',
      'Captures are compulsory, and you must keep jumping if you can.',
      'A piece reaching the far row becomes a king (♛) and can move backwards too.',
      'Choose “2 players” to play a friend on the same device.',
    ],
    scoring: 'A win against the computer scores 500 plus 25 for every piece you have left.',
    difficultyNotes: 'Easy: the computer looks one move ahead. Normal: four moves. Hard: seven moves.',
    tips: ['Keep your back row filled to stop the opponent crowning.', 'Trade pieces when you are ahead.'],
  },
  achievements: [
    ['win', 'First Crown', 'Beat the computer.', 1, '⛀', 10],
    ['hard', 'Checkers Champion', 'Beat the computer on Hard.', 1, '🏆', 30],
    ['flawless', 'Untouchable', 'Win without losing a single piece.', 1, '💎', 25],
  ],
  load: () => import('./CheckersGame'),
});
