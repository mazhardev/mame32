import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'connect-the-dots',
  title: 'Connect the Dots',
  category: 'puzzle',
  difficulty: 'easy',
  icon: '📍',
  tags: ['path drawing', 'casual', 'one line', 'logic', 'numbers'],
  short: 'Draw one line through every square, passing the numbered dots in order.',
  full: 'A one-line path puzzle. Starting at dot 1, draw a single continuous line that passes through every square of the grid exactly once, reaching the numbered dots in order and finishing on the last one. Harder grids add walls you cannot cross. Every puzzle is generated from a real solution, so there is always a way through.',
  minutes: 3,
  controls: {
    keyboard: ['Arrow keys extend the line from its end', 'Backspace takes the line back one square'],
    mouse: ['Drag from dot 1 through the squares', 'Press on your line to cut it back there'],
    touch: ['Drag your finger from dot 1 through the squares', 'Touch your line to cut it back there'],
  },
  instructions: {
    objective: 'Cover every square with one line that visits dots 1, 2, 3… in order and ends on the last dot.',
    howToPlay: [
      'Start on dot 1 and drag to neighbouring squares — up, down, left or right, never diagonally.',
      'The line may not cross itself or pass through a wall (thick bar between squares).',
      'You can only enter a numbered dot when it is the next number in order.',
      'Drag back along your line, or press on it, to undo part of it.',
    ],
    scoring: '20 points per square, minus 3 per second beyond a par of 1.2 seconds per square. Minimum 100.',
    difficultyNotes: 'Easy: 5×5, no walls. Normal: 6×6 with 4 walls. Hard: 7×7 with 8 walls.',
    tips: [
      'Corners and dead-end squares next to walls must be entered and left through their only openings — plan those first.',
      'Look at where the last dot is: the line has to finish there, so leave a path to it.',
    ],
    touchNotes: ['Drag with one finger; lift and press on your line to continue from any point.'],
  },
  achievements: [
    ['first', 'Join Up', 'Solve your first Connect the Dots puzzle.', 1, '📍', 10],
    ['quick', 'Quick Line', 'Solve a 6×6 puzzle in under a minute.', 1, '⚡', 20],
    ['seven', 'Long Line', 'Solve a 7×7 puzzle with walls.', 1, '🧵', 25],
    ['ten', 'Line Artist', 'Solve 10 Connect the Dots puzzles.', 10, '✏️', 30],
  ],
  load: () => import('./ConnectDotsGame'),
});
