import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'word-builder',
  title: 'Word Builder',
  category: 'word',
  difficulty: 'medium',
  icon: '🏗️',
  tags: ['letters', 'chain', 'timed', 'anagram'],
  short: 'Grow a word one letter at a time: ART → RATE → CRATE → CARTER.',
  full: 'Start with a three-letter word and keep building. Each new word must use every letter of the last one plus exactly one new letter, in any order. Longer words score much more.',
  minutes: 3,
  controls: {
    keyboard: ['Type the next word and press Enter'],
    mouse: ['Click New chain to start again from a fresh word'],
    touch: ['Type with your phone keyboard'],
  },
  instructions: {
    objective: 'Build the longest words you can before time runs out.',
    howToPlay: [
      'You start with a three-letter word.',
      'Type a word one letter longer that uses all of the previous word’s letters.',
      'You may rearrange the letters: TEA → RATE is fine.',
      'Stuck? Press New chain to start from a new word — your score is kept.',
    ],
    scoring:
      'Each word scores 5 × its length squared: a 4-letter word is 80, an 8-letter word is 320.',
    difficultyNotes:
      'Easy: 3 minutes. Normal: 2½ minutes. Hard: 2 minutes and starting words that need longer chains.',
    tips: [
      'Adding S or E often works, but longer words are worth far more.',
      'Count the letters before you press Enter.',
    ],
  },
  achievements: [
    ['six', 'Six Letters Tall', 'Build a 6-letter word.', 6, '🏗️', 10],
    ['eight', 'Skyscraper', 'Build an 8-letter word.', 8, '🏙️', 25],
    ['score', 'Master Builder', 'Score 1,500 points in one game.', 1500, '🏆', 15],
  ],
  load: () => import('./WordBuilderGame'),
});
