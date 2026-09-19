import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'draughts-variants',
  title: 'Draughts Variants',
  category: 'board',
  difficulty: 'hard',
  icon: '⛂',
  tags: ['international draughts', 'flying kings', 'checkers', 'ai', 'two player'],
  short: 'International 10×10 and Brazilian draughts with flying kings.',
  full: 'Play the international rules of draughts: men capture backwards, kings fly across the board, and you must take the sequence that captures the most pieces. Choose the full 10×10 International game or the 8×8 Brazilian version.',
  minutes: 15,
  multiplayer: 'vs-ai',
  controls: {
    keyboard: ['Tab to a piece and press Enter, then choose a square'],
    mouse: ['Click a piece, then click a highlighted square'],
    touch: ['Tap a piece, then tap a highlighted square'],
  },
  instructions: {
    objective: 'Capture all of your opponent’s pieces or leave them without a move.',
    howToPlay: [
      'Men move one square diagonally forwards but may capture forwards or backwards.',
      'Kings “fly”: they move any distance along a diagonal and can capture from afar.',
      'Captures are compulsory, and you must choose the sequence that takes the most pieces.',
      'A man only becomes a king if it finishes its move on the far row.',
      'Pick International (10×10) or Brazilian (8×8) before your first move.',
    ],
    scoring: 'A win against the computer scores 500 plus 25 for every piece you have left.',
    difficultyNotes: 'Easy: the computer looks one move ahead. Normal: three to four moves. Hard: four to five moves.',
    tips: ['Flying kings are very strong — protect your back row.', 'Look for forced sequences: the capture rule can make the opponent walk into traps.'],
  },
  achievements: [
    ['win', 'International Debut', 'Beat the computer.', 1, '⛂', 10],
    ['hard', 'Grandmaster of Draughts', 'Beat the computer on Hard.', 1, '🏆', 30],
    ['flawless', 'Perfect Game', 'Win without losing a single piece.', 1, '💎', 25],
  ],
  load: () => import('./DraughtsVariantsGame'),
});
