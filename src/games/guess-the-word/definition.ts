import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'guess-the-word',
  title: 'Guess the Word',
  category: 'word',
  difficulty: 'medium',
  icon: '❓',
  tags: ['guess', 'deduction', 'letters', 'jotto'],
  short: 'Deduce a secret word from how many letters each guess shares with it.',
  full: 'A classic word-deduction game. The secret word has no repeated letters. Every guess tells you only how many of its letters appear in the secret word — not which ones. Use the notes board to track what you have learned.',
  minutes: 6,
  controls: {
    keyboard: ['Type letters', 'Enter to guess, Backspace to delete'],
    mouse: ['Click the on-screen keyboard', 'Click note letters to mark them'],
    touch: ['Tap the on-screen keyboard', 'Tap note letters to mark them'],
  },
  instructions: {
    objective: 'Find the secret word before you run out of guesses.',
    howToPlay: [
      'Type a real word with the right number of letters and no repeated letters.',
      'The number next to your guess is how many of its letters are in the secret word.',
      'Compare guesses that differ by one letter to learn about that letter.',
      'Mark letters in the notes board: grey for “not in the word”, green for “in the word”.',
      'Guess the secret word itself to win.',
    ],
    scoring: '60 points for each unused guess, plus 20 per letter in the word.',
    difficultyNotes:
      'Easy: 4-letter words, 15 guesses. Normal: 5-letter words, 12 guesses. Hard: 5-letter words, 9 guesses.',
    tips: [
      'A guess that scores 0 rules out all of its letters at once.',
      '“Words left” shows how many words still fit every clue.',
    ],
  },
  achievements: [
    ['first-win', 'Code Cracked', 'Find the secret word.', 1, '❓', 5],
    ['six', 'Master Detective', 'Find the word in six guesses or fewer.', 1, '🕵️', 15],
    ['hard-win', 'Hard Deduction', 'Win on Hard.', 1, '💎', 20],
  ],
  load: () => import('./GuessTheWordGame'),
});
