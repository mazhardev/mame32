import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'crossword',
  title: 'Crossword',
  category: 'word',
  difficulty: 'medium',
  icon: '📰',
  tags: ['clues', 'puzzle', 'grid', 'saves progress'],
  short: 'Fresh mini crosswords every game, with friendly clues.',
  full: 'Solve a newly generated crossword each game. Tap a square to pick a clue, type the answers, and use Check or Reveal when you’re stuck. Your puzzle saves automatically so you can finish it later.',
  minutes: 10,
  hasSaveState: true,
  controls: {
    keyboard: ['Type letters', 'Arrow keys to move, Enter for the next clue, Backspace to delete'],
    mouse: [
      'Click a square to select it; click again to switch Across/Down',
      'Click a clue to jump to it',
    ],
    touch: ['Tap a square, then use the on-screen keyboard'],
  },
  instructions: {
    objective: 'Fill in every answer to complete the crossword.',
    howToPlay: [
      'Tap a square to select it. The highlighted clue shows above the grid.',
      'Tap the same square again to switch between Across and Down.',
      'Type letters to fill the answer; the cursor moves along the word.',
      'Check marks wrong letters. Reveal letter or Reveal word fills them in.',
      'Your progress is saved automatically — come back any time.',
    ],
    scoring: '100 points per answer, minus 30 for each revealed letter and 10 for each check.',
    difficultyNotes:
      'Easy: about 7 words on a 9×9 grid. Normal: about 10 words on 11×11. Hard: about 14 words on 13×13.',
    tips: [
      'Start with the short answers.',
      'Crossing letters give you free hints for other clues.',
    ],
  },
  achievements: [
    ['first', 'Grid Filled', 'Complete a crossword.', 1, '📰', 10],
    ['no-reveal', 'Unaided', 'Complete a crossword without revealing any letters.', 1, '🧠', 20],
    ['hard', 'Big Grid', 'Complete a Hard crossword.', 1, '💎', 20],
  ],
  load: () => import('./CrosswordGame'),
});
