import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'mastermind',
  title: 'Secret Colors',
  category: 'board',
  difficulty: 'medium',
  icon: '🎨',
  tags: ['code breaking', 'colour pegs', 'deduction', 'logic', 'classic'],
  short: 'Deduce the hidden colour code from black and white feedback pins.',
  full: 'A classic code-breaking board game. The computer hides a row of coloured pegs. After each guess, black pins show colours in the right place and white pins show right colours in the wrong place. Crack the code before your guesses run out.',
  minutes: 6,
  controls: {
    keyboard: ['Tab to a colour and press Enter to place it'],
    mouse: ['Click colours to fill the holes, click a placed peg to remove it'],
    touch: ['Tap colours to fill the holes, tap a placed peg to remove it'],
  },
  instructions: {
    objective: 'Find the secret colour code within the allowed guesses.',
    howToPlay: [
      'Tap colours to fill the holes from left to right.',
      'Press Check code.',
      '⚫ A black pin: one peg is the right colour in the right place.',
      '⚪ A white pin: one peg is the right colour but in the wrong place.',
      'The pins don’t say which peg they refer to — that’s the puzzle!',
    ],
    scoring: '70 points for every guess left (including the winning one) plus 30 per peg.',
    difficultyNotes:
      'Easy: 4 pegs, 5 colours, no repeats. Normal: 4 pegs, 6 colours, repeats allowed. Hard: 5 pegs, 8 colours, repeats allowed.',
    tips: [
      'Try two colours in a pattern like AABB to learn a lot at once.',
      'No pins at all rules out every colour in that guess.',
    ],
  },
  achievements: [
    ['first', 'Colour Detective', 'Crack a colour code.', 1, '🎨', 5],
    ['five', 'Logical Mind', 'Crack a code in five guesses or fewer.', 1, '🧠', 15],
    ['hard', 'Grand Codebreaker', 'Crack a Hard code (5 pegs, 8 colours).', 1, '💎', 20],
  ],
  load: () => import('./SecretColorsGame'),
});
