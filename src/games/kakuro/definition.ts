import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'kakuro',
  title: 'Kakuro',
  category: 'puzzle',
  difficulty: 'hard',
  icon: '➕',
  tags: ['numbers', 'crossword', 'logic', 'sums', 'maths'],
  short: 'A number crossword: fill each run so it adds up to its clue, without repeating a digit.',
  full: 'Kakuro is a crossword made of sums. Each clue gives the total of the run of white cells to its right or below it. Fill in digits 1 to 9 so every run adds up to its clue and no digit appears twice in a run. Every puzzle is generated fresh and has exactly one solution; a few digits are given to start you off. A built-in helper lists the combinations that still fit.',
  minutes: 10,
  hasSaveState: true,
  controls: {
    keyboard: ['Arrow keys move between white cells', '1–9 enter a digit, 0 or Backspace erase'],
    mouse: ['Click a white cell, then click a digit on the pad'],
    touch: ['Tap a white cell, then tap a digit on the pad'],
  },
  instructions: {
    objective: 'Fill every white cell so each run adds up to its clue with no repeated digits.',
    howToPlay: [
      'A clue in the top-right of a dark cell is the sum of the run to its right; a clue in the bottom-left is the sum of the run below it.',
      'Use digits 1 to 9 only, and never repeat a digit within the same run.',
      'Digits in dark print are given and cannot be changed.',
      'Select a cell to see which digit combinations can still make each of its runs.',
      'Repeated digits turn red, and a clue turns green when its run is correct.',
    ],
    scoring:
      '21 points per white cell (roughly), minus a point per second beyond par and 80 per Check.',
    difficultyNotes:
      'Easy: 6×6 with runs up to 4. Normal: 8×8 with runs up to 5. Hard: 10×10 with runs up to 6.',
    tips: [
      'Look for sums with only one combination: 3 in two cells is always 1+2; 17 in two is 8+9.',
      'Where an across and a down run cross, the digit must be in both runs’ combinations.',
    ],
    touchNotes: ['Tap a cell to select it, then use the digit pad below the grid.'],
  },
  achievements: [
    ['first', 'Adding Up', 'Solve your first Kakuro.', 1, '➕', 10],
    ['eight', 'Cross Sums', 'Solve an 8×8 Kakuro.', 1, '🧮', 20],
    ['clean', 'Mental Arithmetic', 'Solve an 8×8 or larger Kakuro without Check.', 1, '🧠', 30],
    ['ten-grid', 'Sum Master', 'Solve a 10×10 Kakuro.', 1, '🏆', 35],
    ['ten', 'Number Cruncher', 'Solve 10 Kakuro puzzles.', 10, '🔢', 30],
  ],
  load: () => import('./KakuroGame'),
});
