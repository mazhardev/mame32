import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'five-letter-word',
  title: 'Five Letter Word',
  category: 'word',
  difficulty: 'medium',
  icon: '🟩',
  tags: ['guess', 'daily', 'classic', 'five letters', 'vocabulary'],
  short: 'Guess the hidden five-letter word. Colours show which letters are right.',
  full: 'A word-guessing puzzle. Type any five-letter word: green tiles are in the right spot, yellow tiles are in the word but elsewhere, and grey tiles are not in it at all. Use the clues to find the word before you run out of guesses.',
  minutes: 4,
  controls: {
    keyboard: ['Type letters', 'Enter to submit, Backspace to delete'],
    mouse: ['Click the on-screen keyboard'],
    touch: ['Tap the on-screen keyboard'],
  },
  instructions: {
    objective: 'Find the hidden five-letter word in as few guesses as possible.',
    howToPlay: [
      'Type a real five-letter word and press Enter.',
      'Green means the letter is in the right position.',
      'Yellow means the letter is in the word, but somewhere else.',
      'Grey means the letter is not in the word (or no more copies of it are).',
      'Keep guessing until you find the word or run out of rows.',
    ],
    scoring:
      '100 points for every unused row when you solve it (Hard mode ×1.5). Each hint costs 50 points.',
    difficultyNotes:
      'Easy: 7 guesses and 2 letter hints. Normal: 6 guesses and 1 hint. Hard: 6 guesses, no hints, and every revealed clue must be used in later guesses.',
    tips: [
      'Start with a word full of common letters, like “slate” or “crane”.',
      'A letter can appear twice — don’t rule out doubles.',
    ],
    touchNotes: [
      'Use the large on-screen keyboard. The keys change colour as you learn about each letter.',
    ],
  },
  achievements: [
    ['first-win', 'Word Found', 'Solve your first puzzle.', 1, '🟩', 5],
    ['three-guesses', 'Sharp Mind', 'Solve a puzzle in three guesses or fewer.', 1, '🧠', 15],
    ['two-guesses', 'Lucky Streak', 'Solve a puzzle in two guesses or fewer.', 1, '🍀', 25],
    ['hard-win', 'Hard Mode Hero', 'Solve a puzzle on Hard mode.', 1, '💎', 20],
  ],
  load: () => import('./FiveLetterWordGame'),
});
