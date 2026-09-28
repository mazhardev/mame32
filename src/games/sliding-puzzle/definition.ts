import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'sliding-puzzle',
  title: 'Sliding Puzzle',
  category: 'puzzle',
  difficulty: 'easy',
  icon: '🔀',
  tags: ['tiles', 'classic', 'logic', '15 puzzle', 'numbers'],
  short: 'Slide the numbered tiles back into order — the classic 8, 15 and 24 puzzles.',
  full: 'The classic sliding-tile puzzle. One square is empty; slide tiles into the gap until the numbers run in order from the top-left corner. Every shuffle is guaranteed solvable. Choose a 3×3, 4×4 or 5×5 board, and your puzzle is saved if you leave part-way through.',
  minutes: 4,
  hasSaveState: true,
  controls: {
    keyboard: ['Arrow keys or WASD slide a tile into the gap'],
    mouse: ['Click a tile in the same row or column as the gap'],
    touch: ['Tap a tile in the same row or column as the gap'],
  },
  instructions: {
    objective: 'Arrange the tiles in order, 1 in the top-left, with the gap in the bottom-right corner.',
    howToPlay: [
      'Tap a tile in the same row or column as the gap to slide it (and any tiles between) into the gap.',
      'With a keyboard, the arrow keys slide the tile next to the gap in that direction.',
      'Tiles are coloured by the row they belong in, and get a white ring when they are home.',
      'The clock starts with your first move and stops while the game is paused.',
    ],
    scoring:
      'Start from 1,000 (3×3), 2,500 (4×4) or 5,000 (5×5), minus 3 points per move and 1 point per second. Minimum 100.',
    difficultyNotes: 'Easy: 3×3 (8 tiles). Normal: 4×4 (15 tiles). Hard: 5×5 (24 tiles).',
    tips: [
      'Solve the top row first, then the left column, and repeat on the smaller puzzle that remains.',
      'Place the last two tiles of a row together: park one, then rotate both in.',
    ],
    touchNotes: ['Tap tiles to slide them; you can move several tiles in a line with one tap.'],
  },
  achievements: [
    ['first', 'Slide Rule', 'Solve any sliding puzzle.', 1, '🔀', 10],
    ['efficient', 'Efficient Eight', 'Solve the 3×3 puzzle in 40 moves or fewer.', 1, '🎯', 20],
    ['fifteen', 'Fifteen', 'Solve the 4×4 puzzle.', 1, '🧩', 20],
    ['quick', 'Quick Fingers', 'Solve the 4×4 puzzle in under 2 minutes.', 1, '⚡', 30],
    ['master', 'Grand Slider', 'Solve the 5×5 puzzle.', 1, '🏆', 40],
    ['ten', 'Tile Veteran', 'Solve 10 sliding puzzles.', 10, '🎖️', 30],
  ],
  load: () => import('./SlidingPuzzleGame'),
});
