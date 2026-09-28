import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'block-puzzle',
  title: 'Block Puzzle',
  category: 'puzzle',
  difficulty: 'medium',
  icon: '🟦',
  tags: ['shapes', 'grid', 'placement', 'lines', 'endless', 'relaxing'],
  short: 'Drop block shapes onto the grid and clear full rows and columns. How long can you last?',
  full: 'A calm, endless block-placing puzzle. Drag the three pieces from the tray onto the board; fill a whole row or column to clear it. Clear several lines at once for big combo points, and keep clearing turn after turn for a streak bonus. Pieces never rotate, and the game ends when nothing in the tray fits. Your game is saved between visits.',
  minutes: 6,
  hasSaveState: true,
  controls: {
    keyboard: ['1, 2, 3 pick a piece', 'Arrow keys move it over the board, Enter places it, Escape cancels'],
    mouse: ['Drag a piece from the tray onto the board', 'Or click a piece, then click where its top-left corner should go'],
    touch: ['Drag a piece onto the board — it floats above your finger so you can see where it lands'],
  },
  instructions: {
    objective: 'Score as many points as possible before the board fills up.',
    howToPlay: [
      'Place all three pieces from the tray to get three new ones.',
      'A completely filled row or column disappears. Rows and columns can clear at the same time.',
      'Pieces cannot be rotated.',
      'The game ends when none of the pieces left in the tray fits anywhere.',
    ],
    scoring:
      '1 point per square placed. Cleared squares score 10 each, multiplied by the number of lines cleared at once, plus 20 × your clearing streak.',
    difficultyNotes:
      'Easy: 9×9 board with mostly small pieces. Normal: 10×10 with a balanced mix. Hard: 10×10 with many large pieces.',
    tips: [
      'Keep a space free for the big 3×3 square and the long 5-block lines.',
      'Fill the board edges first so the middle stays open.',
      'Setting up two lines to clear with one piece doubles the points.',
    ],
    touchNotes: ['Drag pieces with your finger; the shadow on the board shows exactly where they will land.'],
  },
  achievements: [
    ['first-line', 'Clean Line', 'Clear your first line.', 1, '🟦', 10],
    ['combo', 'Triple Clear', 'Clear three or more lines with one piece.', 1, '💥', 25],
    ['score-1000', 'Stacker', 'Score 1,000 points in one game.', 1000, '📈', 20],
    ['score-5000', 'Master Builder', 'Score 5,000 points in one game.', 5000, '🏗️', 40],
    ['lines', 'Line Collector', 'Clear 100 lines in total.', 100, '📏', 30],
  ],
  load: () => import('./BlockPuzzleGame'),
});
