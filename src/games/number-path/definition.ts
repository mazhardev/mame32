import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'number-path',
  title: 'Number Path',
  category: 'puzzle',
  difficulty: 'medium',
  icon: '🔢',
  tags: ['logic', 'path', 'numbers', 'grid', 'levels', 'brain'],
  short: 'Draw one line through every square, passing the numbers in order.',
  full: 'A quick one-line puzzle in the style of the zip-path games people now play every morning. Start on 1 and drag a single line through every square of the grid, reaching 2, 3, 4 and the rest in order and finishing on the last number. The line can only move up, down, left or right, and it may not cross itself. Every level has exactly one solution. Ninety levels from a gentle 5×5 to a twisty 7×7, with your best time kept for each. If you like tracing paths, also try [Flow Connect](game:flow-connect) and [Connect the Dots](game:connect-the-dots), or browse more [number puzzles](hub:number-puzzles).',
  minutes: 3,
  hasLevels: true,
  hasSaveState: true,
  controls: {
    keyboard: ['Arrow keys draw the line from 1', 'Backspace takes back the last square'],
    mouse: ['Drag from 1 through the squares', 'Drag back along the line, or click a square on it, to undo'],
    touch: ['Drag from 1 with your finger', 'Slide back along the line, or tap a square on it, to undo'],
  },
  instructions: {
    objective: 'Draw one line from 1 to the last number that passes through every square and reaches the numbers in order.',
    howToPlay: [
      'Start on the square marked 1 and drag to a neighbouring square: up, down, left or right.',
      'Pass the numbered squares in order. The line will not step onto a number out of turn.',
      'The line may not cross itself, and it must fill every square before it ends on the last number.',
      'Drag back over the line (or tap a square on it) to rub out the part after it.',
      'Every level has a single solution. Hint draws the next correct square.',
    ],
    scoring: 'Twelve points per square, minus 2 per second taken and 120 per hint, with at least 100 for a solve.',
    difficultyNotes: 'Easy levels are 5×5, Normal 6×6 and Hard 7×7, with more turns between the numbers. Thirty levels each.',
    tips: [
      'Corners and edges have few ways in and out: plan how the line will reach them.',
      'A square with only two open neighbours must be passed straight through them.',
      'Look ahead to the next number: the line has to arrive there with everything behind it filled.',
    ],
    touchNotes: ['Drag with your finger to draw; slide back along the line to undo part of it.'],
  },
  achievements: [
    ['first', 'One Line', 'Solve your first level.', 1, '🔢', 10],
    ['fast', 'Quick Trace', 'Solve a level in under 45 seconds without a hint.', 1, '⚡', 20],
    ['ten', 'Pathfinder', 'Solve 10 levels.', 10, '🧭', 30],
    ['hard', 'Long Way Round', 'Solve a Hard 7×7 level without a hint.', 1, '🌀', 30],
    ['pack', 'Full Circuit', 'Solve every level in one pack.', 1, '🏆', 50],
  ],
  load: () => import('./NumberPathGame'),
});
