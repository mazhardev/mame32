import type { GameInstructions } from '@/types';

export const instructions: GameInstructions = {
  objective: 'Clear twenty lines before the stack reaches the top.',
  howToPlay: [
    'Press Start game.',
    'Move and rotate each piece as it falls.',
    'Fill a row completely to clear it.',
    'The game ends if a new piece cannot enter the well.',
  ],
  scoring:
    '100 / 300 / 500 / 800 points for clearing 1 / 2 / 3 / 4 lines at once, plus 2 points per row hard-dropped.',
  difficultyNotes: 'One standard speed.',
  tips: ['Keep the stack flat.', 'Leave one column open to clear several lines at once.'],
  touchNotes: ['Tap Left, Right, Rotate, Soft drop and Drop'],
};
