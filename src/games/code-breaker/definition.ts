import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'code-breaker',
  title: 'Code Breaker',
  category: 'brain',
  difficulty: 'medium',
  icon: '🔓',
  tags: ['safe', 'numbers', 'deduction', 'code'],
  short: 'Crack the safe: each digit tells you higher, lower or correct.',
  full: 'Open the safe by finding its secret code. After every attempt, each digit shows whether it is correct, or whether the real digit is higher or lower. Work out every digit before the alarm goes off.',
  minutes: 3,
  controls: {
    keyboard: ['Type digits, Enter to try the code, Backspace to delete'],
    mouse: ['Use the keypad'],
    touch: ['Tap the keypad'],
  },
  instructions: {
    objective: 'Find the whole code within the allowed attempts.',
    howToPlay: [
      'Enter a code with the right number of digits and press Enter.',
      '✓ means that digit is correct.',
      '▲ means the real digit is higher; ▼ means it is lower.',
      'Digits can repeat. Use the clues to close in on each digit.',
    ],
    scoring: '80 points for every attempt left (including the winning one) plus 30 per digit.',
    difficultyNotes:
      'Easy: 3 digits, 8 attempts. Normal: 4 digits, 7 attempts. Hard: 5 digits, 7 attempts.',
    tips: [
      'Start with 5 in every position — it splits each digit’s range in half.',
      'Each digit is its own higher-or-lower game.',
    ],
  },
  achievements: [
    ['first', 'Safecracker', 'Open a safe.', 1, '🔓', 5],
    ['four', 'Master Thief', 'Open a safe in four attempts or fewer.', 1, '🕵️', 15],
    ['hard', 'Vault Buster', 'Open a 5-digit safe.', 1, '💎', 15],
  ],
  load: () => import('./CodeBreakerGame'),
});
