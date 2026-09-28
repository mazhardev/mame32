import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'unblock-puzzle',
  title: 'Unblock Puzzle',
  category: 'puzzle',
  difficulty: 'medium',
  icon: '🚗',
  tags: ['sliding blocks', 'logic', 'levels', 'wooden', 'brain'],
  short: 'Slide the wooden blocks out of the way to free the red block through the exit.',
  full: 'A sliding-block puzzle on a 6×6 wooden board. Blocks can only slide along their length — horizontal blocks left and right, vertical blocks up and down. Clear a path so the red block can slide out through the gap on the right. Sixty original levels, each with a known minimum number of moves to aim for.',
  minutes: 4,
  hasLevels: true,
  hasSaveState: true,
  controls: {
    keyboard: ['Tab to a block, then use the arrow keys to slide it'],
    mouse: ['Drag a block along its length'],
    touch: ['Drag a block along its length with your finger'],
  },
  instructions: {
    objective: 'Slide the red block out through the gap in the right-hand side of the frame.',
    howToPlay: [
      'Blocks only move in the direction of their length, and cannot pass through each other.',
      'Drag a block as far as it will go in one move; sliding the same block again straight away still counts as one move.',
      'Every level shows the fewest moves it can be solved in. Match it for three stars.',
      'Undo takes back a slide. Hint shows the first move of a shortest solution.',
    ],
    scoring: '60 points per move in the best solution, minus 25 per extra move and 80 per hint.',
    difficultyNotes: 'Easy: 4–9 move levels. Normal: 10–16 moves. Hard: 17 moves or more.',
    tips: [
      'Work backwards: which blocks stand between the red block and the exit, and what stops them moving?',
      'Long blocks crossing the red block’s row can only clear it by moving all the way up or down.',
    ],
    touchNotes: ['Drag blocks with your finger. Use the level picker to jump to any unlocked level.'],
  },
  achievements: [
    ['first', 'Unblocked', 'Solve your first level.', 1, '🚗', 10],
    ['perfect', 'Shortest Route', 'Solve a level in the minimum number of moves.', 1, '⭐', 20],
    ['hard', 'Wood Whisperer', 'Solve a Hard level without a hint.', 1, '🪵', 30],
    ['twenty', 'Block Buster', 'Solve 20 levels.', 20, '🧱', 30],
    ['pack', 'Clean Sweep', 'Solve every level in one pack.', 1, '🏆', 50],
  ],
  load: () => import('./UnblockGame'),
});
