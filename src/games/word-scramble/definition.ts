import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'word-scramble',
  title: 'Word Scramble',
  category: 'word',
  difficulty: 'easy',
  icon: '🔀',
  tags: ['unscramble', 'letters', 'timed', 'jumble'],
  short: 'Unscramble the jumbled letters to find the hidden word.',
  full: 'Ten scrambled words, each against the clock. Type the word the letters spell. Any real word that uses all the letters counts. Use hints if you get stuck.',
  minutes: 4,
  controls: {
    keyboard: ['Type your answer and press Enter'],
    mouse: ['Click Hint or Skip'],
    touch: ['Type with your phone keyboard, tap Enter'],
  },
  instructions: {
    objective: 'Unscramble as many of the ten words as you can.',
    howToPlay: [
      'Press Start. A set of jumbled letter tiles appears.',
      'Type the word they spell and press Enter.',
      'Any real word that uses every letter is accepted.',
      'Use Hint to reveal the first letters, or Skip to move on.',
    ],
    scoring: '20 points per letter, plus 2 points per second left. Each hint costs 30 points.',
    difficultyNotes:
      'Easy: 4–5 letter words, 45 seconds each. Normal: 5–6 letters, 30 seconds. Hard: 7–8 letters, 25 seconds.',
    tips: [
      'Look for common endings like -ING, -ER and -TION.',
      'Try putting vowels between the consonants.',
    ],
  },
  achievements: [
    ['first', 'Unscrambler', 'Solve your first word.', 1, '🔀', 5],
    ['score', 'Word Wizard', 'Score 1,000 points in one game.', 1000, '🧙', 15],
    ['perfect', 'Clean Sweep', 'Solve all ten words in a game.', 1, '🏆', 20],
  ],
  load: () => import('./WordScrambleGame'),
});
