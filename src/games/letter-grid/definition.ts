import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'letter-grid',
  title: 'Letter Grid',
  category: 'word',
  difficulty: 'medium',
  icon: '🔠',
  tags: ['word grid', 'word hunt', 'timed', 'find words'],
  short: 'Trace words through a grid of letters before the timer runs out.',
  full: 'A word-hunt in a grid of random letters. Join neighbouring tiles — including diagonals — to spell words, without reusing a tile in the same word. When time is up, see how many words were hiding in the grid.',
  minutes: 4,
  controls: {
    keyboard: ['Type a word and press Enter'],
    mouse: ['Drag across neighbouring tiles, release to submit'],
    touch: ['Slide your finger across neighbouring tiles'],
  },
  instructions: {
    objective: 'Find as many words in the grid as you can before time runs out.',
    howToPlay: [
      'Press Start to reveal the grid.',
      'Drag across neighbouring letters (including diagonals) to spell a word, then let go.',
      'You can also type a word — it counts if it can be traced in the grid.',
      'Each tile can only be used once per word.',
    ],
    scoring: '3 letters: 10, 4: 20, 5: 35, 6: 50, 7: 70, 8 or more: 100 points.',
    difficultyNotes:
      'Easy: 4×4 grid, 4 minutes. Normal: 4×4 grid, 3 minutes. Hard: 5×5 grid, 3 minutes, 4-letter minimum.',
    tips: [
      'Look for common endings like -ING, -ER and -ED.',
      'Plurals count: if you find CAT, look for CATS.',
    ],
  },
  achievements: [
    ['words', 'Word Hunter', 'Find 20 words in one game.', 20, '🔠', 15],
    ['score', 'Grid Master', 'Score 500 points in one game.', 500, '🏆', 15],
    ['long', 'Long Trail', 'Find a word of 7 letters or more.', 7, '🐍', 20],
  ],
  load: () => import('./LetterGridGame'),
});
