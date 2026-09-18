import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'bulls-and-cows',
  title: 'Bulls and Cows',
  category: 'brain',
  difficulty: 'medium',
  icon: '🐂',
  tags: ['numbers', 'deduction', 'code', 'logic'],
  short: 'Crack a secret number using bulls (right place) and cows (wrong place).',
  full: 'The classic pencil-and-paper code game. The computer picks a secret number with no repeated digits. After each guess you learn how many digits are in the right place (bulls) and how many are in the number but in the wrong place (cows).',
  minutes: 5,
  controls: {
    keyboard: ['Type digits, Enter to guess, Backspace to delete'],
    mouse: ['Use the keypad'],
    touch: ['Tap the keypad'],
  },
  instructions: {
    objective: 'Find the secret number within the allowed guesses.',
    howToPlay: [
      'Enter a number with the right number of digits, all different.',
      '🎯 Bulls: digits that are correct and in the correct position.',
      '🐄 Cows: digits that are in the secret number but in a different position.',
      'Use the clues to narrow down the digits and their order.',
    ],
    scoring: '60 points for every guess left (including the winning one) plus 40 per digit.',
    difficultyNotes:
      'Easy: 3 digits, 10 guesses. Normal: 4 digits, 10 guesses. Hard: 5 digits, 12 guesses.',
    tips: [
      'A guess with 0 bulls and 0 cows rules out all of its digits.',
      'Change one digit at a time to test it.',
    ],
  },
  achievements: [
    ['first', 'Herd Master', 'Crack a secret number.', 1, '🐂', 5],
    ['six', 'Quick Crack', 'Crack a number in six guesses or fewer.', 1, '⚡', 15],
    ['hard', 'Five-Digit Genius', 'Crack a 5-digit number.', 1, '💎', 20],
  ],
  load: () => import('./BullsAndCowsGame'),
});
