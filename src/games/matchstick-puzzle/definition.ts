import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'matchstick-puzzle',
  title: 'Matchstick Puzzle',
  category: 'brain',
  difficulty: 'hard',
  icon: '🔥',
  tags: ['logic', 'visual', 'classic', 'maths', 'brain'],
  short: 'The equation is wrong — move exactly one matchstick to make it true.',
  full: 'The classic matchstick riddle. An equation is laid out in matchsticks, and it is not true. Pick up one stick and put it somewhere else so that the sum works. You can change a digit, turn a plus into a minus, or borrow a stick from one number to complete another. Every puzzle is generated and checked, and any correct move counts — not just the one we had in mind.',
  minutes: 5,
  controls: {
    keyboard: ['Tab to a stick, Enter to pick it up; Tab to an empty slot, Enter to place'],
    mouse: ['Click a stick to pick it up, then click an empty slot'],
    touch: ['Tap a stick to pick it up, then tap an empty slot'],
  },
  instructions: {
    objective: 'Fix five equations by moving one matchstick each time.',
    howToPlay: [
      'Tap a matchstick to pick it up (it turns red).',
      'Dotted outlines show where it can go. Tap one to place the stick.',
      'If the new equation is true, the puzzle is solved. Otherwise try again; Reset puts everything back.',
      'Digits use seven-segment shapes, like a digital clock. The = sign cannot be changed.',
    ],
    scoring: '100 points for a first-try solve, 60 after one wrong try, 30 after more. Revealed answers score nothing.',
    difficultyNotes: 'Easy: single digits. Normal: numbers up to 20. Hard: two-digit numbers.',
    tips: ['Count the sticks: 6 and 9 have six, and moving one stick turns 6 into 0 or 5.', 'A minus sign can become a plus with one extra stick, and vice versa.'],
  },
  achievements: [
    ['first', 'Spark', 'Solve a matchstick puzzle.', 1, '🔥', 10],
    ['perfect', 'Clean Burn', 'Solve all five first try in one round.', 1, '🏆', 30],
    ['hard', 'Arsonist of Arithmetic', 'Solve all five on Hard.', 1, '🧠', 30],
    ['solved', 'Box of Matches', 'Solve 50 puzzles in total.', 50, '🎖️', 25],
  ],
  load: () => import('./MatchstickPuzzleGame'),
});
