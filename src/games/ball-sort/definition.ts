import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'ball-sort',
  title: 'Ball Sort',
  category: 'puzzle',
  difficulty: 'medium',
  icon: '🔵',
  tags: ['sorting', 'logic', 'relaxing', 'colours', 'tubes'],
  short: 'Move balls between tubes until every tube holds a single colour.',
  full: 'A calm sorting puzzle. Move the top ball of one tube onto a ball of the same colour or into an empty tube, and keep going until each tube holds four balls of one colour. Every deal is checked by a solver so it can always be finished. Unlimited undo, a solver-backed hint and one spare tube if you get stuck.',
  minutes: 5,
  hasSaveState: true,
  controls: {
    keyboard: ['Tab to a tube and press Enter to pick it up, then choose the destination tube'],
    mouse: ['Click a tube to lift its top ball, then click where it should go'],
    touch: ['Tap a tube to lift its top ball, then tap the destination tube'],
  },
  instructions: {
    objective: 'Sort the balls so that every tube contains four balls of one colour.',
    howToPlay: [
      'Only the top ball of a tube can move.',
      'A ball can go into an empty tube, or onto a ball of the same colour if the tube has room (four balls maximum).',
      'Tap the source tube, then the destination. Tap the same tube again to put the ball back.',
      'Each ball also carries a symbol, so colours can be told apart without relying on colour.',
      'Undo is unlimited. Hint asks the solver for a move that still leads to a solution.',
    ],
    scoring:
      '150 points per colour, minus 4 per move, 50 per hint, and 200 if you used the extra tube.',
    difficultyNotes: 'Easy: 4 colours. Normal: 7 colours. Hard: 10 colours. All have two empty tubes.',
    tips: [
      'Keep one tube empty for as long as you can — it is your most valuable space.',
      'Fill a tube that already has the right colour at the bottom before starting a new one.',
    ],
    touchNotes: ['Tap a tube, then tap where the ball should go.'],
  },
  achievements: [
    ['first', 'Sorted', 'Solve your first ball sort puzzle.', 1, '🔵', 10],
    ['clean', 'Clean Sort', 'Solve a puzzle without undo, hints or the extra tube.', 1, '✨', 20],
    ['swift', 'Swift Sorter', 'Solve Normal or Hard in six moves per colour or fewer.', 1, '⚡', 30],
    ['hard', 'Rainbow Master', 'Solve a 10-colour puzzle.', 1, '🌈', 30],
    ['ten', 'Tube Tender', 'Solve 10 ball sort puzzles.', 10, '🧪', 30],
  ],
  load: () => import('./BallSortGame'),
});
