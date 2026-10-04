import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'binary-puzzle',
  title: 'Binary Puzzle',
  category: 'brain',
  difficulty: 'hard',
  icon: '0️⃣',
  tags: ['logic', 'grid', 'binary', 'takuzu', 'brain'],
  short: 'Fill the grid with 0s and 1s — no three in a row, balanced lines, no repeats.',
  full: 'Also known as Takuzu or Binairo. Fill every empty cell with a 0 or a 1. No row or column may contain three of the same digit next to each other, every row and column needs as many 0s as 1s, and no two rows (or columns) can be identical. Every generated puzzle has exactly one solution that can be found by logic. Your progress is saved automatically.',
  minutes: 8,
  hasSaveState: true,
  controls: {
    keyboard: ['Arrow keys move, 0 or 1 to fill, Backspace to clear, Enter cycles'],
    mouse: ['Click a cell to cycle empty → 0 → 1'],
    touch: ['Tap a cell to cycle empty → 0 → 1'],
  },
  instructions: {
    objective: 'Fill the grid so every rule holds.',
    howToPlay: [
      'Each cell holds a 0 or a 1. Grey-outlined cells are given and cannot change.',
      'No three equal digits may sit next to each other in a row or column.',
      'Each row and column contains the same number of 0s and 1s.',
      'All rows are different, and all columns are different.',
    ],
    scoring: 'Bigger grids score more; time and hints reduce the score.',
    difficultyNotes: 'Easy: 6×6. Normal: 8×8. Hard: 10×10.',
    tips: [
      'Two equal digits side by side must have the other digit on both ends: 0 0 → 1 0 0 1.',
      'A gap between two equal digits takes the opposite digit: 1 _ 1 → 1 0 1.',
      'Once a line has its half of 0s, the rest of it is 1s.',
    ],
  },
  achievements: [
    ['first', 'Bit by Bit', 'Solve a binary puzzle.', 1, '0️⃣', 10],
    ['no-hints', 'Pure Logic', 'Solve an 8×8 or larger without hints.', 1, '🧠', 25],
    ['big', 'Byte Master', 'Solve a 10×10.', 1, '🏆', 25],
    ['solved', 'Binary Brain', 'Solve 25 puzzles.', 25, '🎖️', 30],
  ],
  load: () => import('./BinaryPuzzleGame'),
});
