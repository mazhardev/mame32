import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'nonogram',
  title: 'Nonogram',
  category: 'puzzle',
  difficulty: 'hard',
  icon: '🖼️',
  tags: ['picross', 'griddlers', 'logic', 'grid', 'picture', 'paint by numbers'],
  short: 'Use the number clues to fill in the grid and reveal a hidden picture.',
  full: 'A picture logic puzzle, also known as Picross or Griddlers. The numbers beside each row and above each column give the lengths of the filled runs in that line. Work out which cells are filled to reveal a hidden pixel picture. Every puzzle can be solved by logic alone — no guessing needed. Drag to fill several cells, cross out cells you know are empty, and your progress is saved automatically.',
  minutes: 8,
  hasSaveState: true,
  controls: {
    keyboard: ['Arrow keys move between cells', 'Space or Enter fills a cell', 'X crosses a cell out, Backspace clears it'],
    mouse: ['Click or drag to fill cells in a row or column', 'Right-click or switch to Cross to mark empty cells'],
    touch: ['Tap or drag along a row or column to fill', 'Switch to the Cross tool to mark empty cells'],
  },
  instructions: {
    objective: 'Fill in the cells so that every row and column matches its clue numbers.',
    howToPlay: [
      'Each number is a run of consecutive filled cells, in order. "3 1" means a run of three, at least one gap, then a single cell.',
      'A 0 means the line is completely empty.',
      'Fill cells you are sure of, and cross out cells you know are empty — crosses are notes and never count against you.',
      'A clue greys out when its line matches it. When every line matches, the picture is revealed.',
      'Check outlines any wrong cells for a moment, at a cost of 100 points.',
    ],
    scoring:
      '8 points per cell, minus 2 per second beyond a par of 1.2 seconds per cell and 100 per check.',
    difficultyNotes: 'Easy: 5×5. Normal: 10×10. Hard: 15×15 generated patterns.',
    tips: [
      'Start with big numbers: a run longer than half the line always covers the middle cells.',
      'When a line’s clue is complete, cross out the rest of it.',
      'Look for lines where the clue numbers plus gaps add up to the full width.',
    ],
    touchNotes: [
      'Drag along a row or column to paint several cells at once.',
      'Use the Fill / Cross switch below the grid to change what a tap does.',
    ],
  },
  achievements: [
    ['first', 'Picture This', 'Solve your first nonogram.', 1, '🖼️', 10],
    ['quick', 'Quick Sketch', 'Solve a 5×5 puzzle in under a minute.', 1, '⚡', 15],
    ['ten-by-ten', 'Pixel Artist', 'Solve a 10×10 puzzle.', 1, '🎨', 20],
    ['clean', 'Pure Logic', 'Solve a 10×10 or bigger puzzle without using Check.', 1, '🧠', 30],
    ['fifteen', 'Grand Canvas', 'Solve a 15×15 puzzle.', 1, '🏆', 35],
    ['ten', 'Gallery', 'Solve 10 nonograms.', 10, '🖌️', 30],
  ],
  load: () => import('./NonogramGame'),
});
