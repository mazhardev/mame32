import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'tower-of-hanoi',
  title: 'Tower of Hanoi',
  category: 'puzzle',
  difficulty: 'medium',
  icon: '🗼',
  tags: ['classic', 'logic', 'recursion', 'discs', 'brain'],
  short: 'Move the tower of discs to the right peg, one disc at a time, never larger on smaller.',
  full: 'The famous recursive puzzle. Move a stack of discs from the left peg to the right peg, one disc at a time, and never place a larger disc on a smaller one. The counter shows the fewest moves still needed from your position, and the hint always suggests the optimal next move.',
  minutes: 5,
  hasSaveState: true,
  controls: {
    keyboard: ['1, 2, 3 pick a peg (first the source, then the destination)', 'Tab or ← → move between pegs, Enter selects'],
    mouse: ['Click a peg to lift its top disc, then click the destination peg', 'Or drag from one peg to another'],
    touch: ['Tap the source peg, then the destination peg', 'Or drag from one peg to another'],
  },
  instructions: {
    objective: 'Move every disc from the left peg to the right peg (marked ★).',
    howToPlay: [
      'Only the top disc of a peg can move.',
      'A disc may go on an empty peg or on top of a larger disc — never on a smaller one.',
      'Select a peg to lift its top disc, then choose where to put it. Select the same peg again to put it back.',
      '"Still needed" shows the fewest moves left from your current position.',
    ],
    scoring:
      '30 points per move in the perfect solution plus 200, minus 10 for every extra move and 40 per hint.',
    difficultyNotes:
      'Easy: 3 discs (7 moves). Normal: 5 discs (31 moves). Hard: 7 discs (127 moves).',
    tips: [
      'Move the smallest disc every other turn, always cycling in the same direction.',
      'With an odd number of discs the smallest disc starts by moving to the goal peg; with an even number, to the middle.',
    ],
    touchNotes: ['Tap a peg, then tap the peg you want to move its top disc to — or drag between pegs.'],
  },
  achievements: [
    ['first', 'Tower Mover', 'Solve the puzzle once.', 1, '🗼', 10],
    ['perfect', 'No Wasted Moves', 'Solve in the minimum number of moves.', 1, '🎯', 15],
    ['five', 'Perfect Five', 'Solve 5 discs in 31 moves.', 1, '🏯', 25],
    ['seven', 'Tall Order', 'Solve the 7-disc tower.', 1, '🏰', 25],
    ['monk', 'Patience of a Monk', 'Solve 7 discs in exactly 127 moves.', 1, '🧘', 50],
  ],
  load: () => import('./HanoiGame'),
});
