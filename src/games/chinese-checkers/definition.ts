import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'chinese-checkers',
  title: 'Chinese Checkers',
  category: 'board',
  difficulty: 'medium',
  icon: '⭐',
  tags: ['star', 'jumping', 'marbles', 'race', 'strategy', 'ai', 'two player', 'halma'],
  short: 'Hop your marbles across the star into the opposite point first.',
  full: 'Race your ten marbles across a six-pointed star into the opposite point. Step to a neighbouring hole, or jump over any marble — and keep jumping in a chain for huge leaps. Play a local computer opponent or a friend on the same device.',
  minutes: 12,
  multiplayer: 'vs-ai',
  controls: {
    keyboard: ['Tab to one of your marbles and press Enter, then Tab to a marked hole and press Enter'],
    mouse: ['Click a marble, then click a marked hole'],
    touch: ['Tap a marble, then tap a marked hole'],
  },
  instructions: {
    objective: 'Move all of your marbles into the point of the star opposite your start.',
    howToPlay: [
      'You play red, starting at the bottom point; the top point is your goal.',
      'A move is either one step into an adjacent empty hole, or a series of jumps.',
      'Jump over a single adjacent marble (either colour) into the empty hole directly beyond. You can chain as many jumps as you like in one move.',
      'Marked holes show every place the selected marble can reach, including long jump chains.',
      'You win when every hole of the goal point is filled and at least one holds your marble.',
    ],
    scoring: 'A win scores 2,000 minus 15 per move you took (minimum 200).',
    difficultyNotes: 'Easy: the computer looks one move ahead and sometimes wanders. Normal: two moves. Hard: three moves.',
    tips: ['Build “ladders” of marbles your other pieces can jump along.', 'Don’t leave stragglers behind — the last marble often costs the game.', 'Use the computer’s marbles as stepping stones too.'],
  },
  achievements: [
    ['win', 'Star Crossed', 'Beat the computer.', 1, '⭐', 10],
    ['hard', 'Marble Master', 'Beat the computer on Hard.', 1, '🏆', 30],
    ['chain', 'Hopscotch', 'Make a chain of four or more jumps in one move.', 1, '🐸', 15],
  ],
  load: () => import('./ChineseCheckersGame'),
});
