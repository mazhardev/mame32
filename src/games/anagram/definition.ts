import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'anagram',
  title: 'Anagram',
  category: 'word',
  difficulty: 'medium',
  icon: '🔁',
  tags: ['letters', 'rearrange', 'timed'],
  short: 'Rearrange every letter of a word to make a brand-new word.',
  full: 'Turn HEART into EARTH and LISTEN into SILENT. Each round shows a word; rearrange all of its letters into a different real word before time runs out.',
  minutes: 4,
  controls: {
    keyboard: ['Type your answer and press Enter'],
    mouse: ['Click Skip to move on'],
    touch: ['Type with your phone keyboard'],
  },
  instructions: {
    objective: 'Find an anagram for as many of the ten words as you can.',
    howToPlay: [
      'Press Start to see the first word.',
      'Type a different real word that uses exactly the same letters.',
      'Every letter must be used, once each.',
      'If you’re stuck, Skip shows the answers and moves on.',
    ],
    scoring: '50 points plus 10 per letter, plus 3 points for every second left.',
    difficultyNotes:
      'Easy: 4-letter words, 40 seconds. Normal: 5-letter words, 35 seconds. Hard: 6–8 letter words, 45 seconds.',
    tips: ['Try moving the first letter to the end.', 'Swap vowels between positions.'],
  },
  achievements: [
    ['first', 'Rearranger', 'Find your first anagram.', 1, '🔁', 5],
    ['score', 'Letter Juggler', 'Score 1,200 points in one game.', 1200, '🤹', 15],
    ['perfect', 'Anagram Ace', 'Solve all ten rounds.', 1, '🏆', 20],
  ],
  load: () => import('./AnagramGame'),
});
