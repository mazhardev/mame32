import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'missing-letters',
  title: 'Missing Letters',
  category: 'word',
  difficulty: 'easy',
  icon: '🔡',
  tags: ['fill in the blanks', 'spelling', 'timed'],
  short: 'Some letters have gone missing — complete each word.',
  full: 'Each word is shown with gaps. Type the complete word before the timer runs out. If more than one real word fits, any of them counts.',
  minutes: 4,
  controls: {
    keyboard: ['Type the full word and press Enter'],
    mouse: ['Click Skip to move on'],
    touch: ['Type with your phone keyboard'],
  },
  instructions: {
    objective: 'Complete as many of the twelve words as you can.',
    howToPlay: [
      'Press Start. A word appears with some tiles left blank.',
      'Type the whole word, including the letters already shown.',
      'Any real word that fits the pattern is accepted.',
      'Skip moves on and shows an answer.',
    ],
    scoring: '40 points per missing letter, 5 per letter in the word, plus 2 per second left.',
    difficultyNotes:
      'Easy: 4–6 letter words with 1 gap. Normal: 5–7 letters with 2 gaps. Hard: 6–8 letters with 3 gaps.',
    tips: [
      'Say the word aloud with a “hum” for each gap.',
      'Most English words need a vowel in every syllable.',
    ],
  },
  achievements: [
    ['first', 'Gap Filler', 'Complete your first word.', 1, '🔡', 5],
    ['score', 'Letter Detective', 'Score 1,500 points in one game.', 1500, '🔍', 15],
    ['perfect', 'Nothing Missing', 'Complete all twelve words.', 1, '🏆', 20],
  ],
  load: () => import('./MissingLettersGame'),
});
