import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'lights-out',
  title: 'Lights Out',
  category: 'puzzle',
  difficulty: 'medium',
  icon: '💡',
  tags: ['grid', 'toggle', 'logic', 'classic', 'brain'],
  short: 'Every press flips a light and its neighbours. Can you switch the whole grid off?',
  full: 'A classic toggle puzzle. Pressing a light switches it and the lights above, below, left and right of it. Turn every light off in as few presses as possible — each puzzle shows its par, the fewest presses that can solve it. Stuck? The hint solver works out the best next press.',
  minutes: 4,
  hasSaveState: true,
  controls: {
    keyboard: ['Arrow keys move between lights', 'Enter or Space presses a light'],
    mouse: ['Click a light to press it'],
    touch: ['Tap a light to press it'],
  },
  instructions: {
    objective: 'Switch every light off.',
    howToPlay: [
      'Pressing a light flips it on or off, together with its four direct neighbours.',
      'Corner and edge lights have fewer neighbours, so they flip fewer lights.',
      'Pressing the same light twice cancels out, so order never matters — only which lights you press.',
      'Par is the smallest number of presses that solves the puzzle.',
    ],
    scoring:
      '20 points per square on the board, minus 15 for every press over par and 60 per hint used.',
    difficultyNotes:
      'Easy: 5×5 with a short solution. Normal: 5×5 with a longer solution. Hard: 7×7 with a long solution.',
    tips: [
      '"Chase the lights": clear each row by pressing the light directly below every lit light, working downwards.',
      'When only the bottom row is left lit, a few specific presses in the top row fix it — experiment!',
    ],
    touchNotes: ['Tap lights to press them. Use Hint if you get stuck.'],
  },
  achievements: [
    ['first', 'Lights Out', 'Solve your first puzzle.', 1, '💡', 10],
    ['par', 'Right on Par', 'Solve a puzzle in par or better.', 1, '🎯', 20],
    ['big', 'Big Board', 'Solve a 7×7 puzzle.', 1, '🌃', 25],
    ['big-clean', 'In the Dark', 'Solve a 7×7 puzzle without hints.', 1, '🌑', 40],
    ['ten', 'Night Shift', 'Solve 10 Lights Out puzzles.', 10, '🔦', 30],
  ],
  load: () => import('./LightsOutGame'),
});
