import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'guess-the-number',
  title: 'Guess the Number',
  category: 'brain',
  difficulty: 'easy',
  icon: '🔢',
  tags: ['higher lower', 'numbers', 'logic', 'binary search'],
  short: 'Find the secret number using “higher” and “lower” clues.',
  full: 'The computer picks a secret number. Each guess tells you whether the answer is higher or lower. Narrow it down before you run out of guesses — the smartest strategy always halves the range.',
  minutes: 2,
  controls: {
    keyboard: ['Type digits, Enter to guess, Backspace to delete'],
    mouse: ['Use the keypad'],
    touch: ['Tap the keypad'],
  },
  instructions: {
    objective: 'Guess the secret number within the allowed number of tries.',
    howToPlay: [
      'Enter a number in the range and press Enter.',
      'You’ll be told if the secret is higher or lower.',
      'The bar shows the range where the number can still be.',
      'Find it before your guesses run out.',
    ],
    scoring:
      '100 points for every guess you have left when you find it (including the winning guess).',
    difficultyNotes:
      'Easy: 1–50 with 8 guesses. Normal: 1–100 with 7 guesses. Hard: 1–1000 with 10 guesses.',
    tips: [
      'Always guess the middle of the remaining range.',
      'With 7 guesses you can always find a number from 1 to 100.',
    ],
  },
  achievements: [
    ['first', 'Number Finder', 'Find the secret number.', 1, '🔢', 5],
    ['efficient', 'Binary Brain', 'Find it with two or more guesses to spare.', 1, '🧠', 15],
    ['hard', 'Needle in a Haystack', 'Find a number from 1 to 1000.', 1, '💎', 15],
  ],
  load: () => import('./GuessTheNumberGame'),
});
