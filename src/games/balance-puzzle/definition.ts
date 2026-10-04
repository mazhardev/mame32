import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'balance-puzzle',
  title: 'Balance Puzzle',
  category: 'brain',
  difficulty: 'medium',
  icon: '⚖️',
  tags: ['logic', 'weights', 'maths', 'deduction', 'brain'],
  short: 'Read the balanced scales, then work out how many shapes balance the last one.',
  full: 'A classic brain teaser with weighing scales. A few balanced scales show how heavy the shapes are compared with one another — for example, one star weighs the same as three triangles. Use that information to work out how many of one shape will balance the question scale. Every puzzle is generated so that the clues lead to exactly one answer.',
  minutes: 4,
  controls: {
    keyboard: ['Keys 1–4 choose an answer, Enter for the next scale'],
    mouse: ['Click an answer'],
    touch: ['Tap an answer'],
  },
  instructions: {
    objective: 'Answer as many of the eight scales correctly as you can.',
    howToPlay: [
      'Each balanced scale tells you that both sides weigh the same.',
      'Combine the scales to find how heavy each shape is compared with the others.',
      'Then pick how many of the asked-for shape would balance the question scale.',
    ],
    scoring: '100 points per correct answer.',
    difficultyNotes: 'Easy: three shapes and light weights. Normal: heavier weights and bigger pans. Hard: four shapes.',
    tips: ['Turn each scale into a sentence: “a star equals three triangles”.', 'Swap shapes for their equivalents until only the asked-for shape is left.'],
  },
  achievements: [
    ['first', 'Equaliser', 'Answer a balance puzzle correctly.', 1, '⚖️', 10],
    ['perfect', 'Perfect Balance', 'Answer all eight correctly in one round.', 1, '🏆', 25],
    ['hard', 'Heavy Thinker', 'Get at least six right on Hard.', 1, '🧠', 25],
    ['solved', 'Scale Master', 'Answer 150 scales correctly in total.', 150, '🎖️', 30],
  ],
  load: () => import('./BalancePuzzleGame'),
});
