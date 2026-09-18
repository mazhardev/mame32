import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'finish-the-word',
  title: 'Finish the Word',
  category: 'word',
  difficulty: 'easy',
  icon: '✍️',
  tags: ['prefix', 'vocabulary', 'timed', 'word sprint'],
  short: 'How many words can you make from a starting prefix in 45 seconds?',
  full: 'A fast vocabulary sprint. Each round gives you the beginning of a word — type as many different real words that start with it as you can before time runs out. Three rounds per game.',
  minutes: 3,
  controls: {
    keyboard: ['Type a word (or just its ending) and press Enter'],
    touch: ['Type with your phone keyboard and tap Enter'],
  },
  instructions: {
    objective: 'Find as many words as possible that start with each prefix.',
    howToPlay: [
      'Press Start to see the first prefix, for example “ST”.',
      'Type any real word that starts with it — STAR, STONE, STRETCH… — and press Enter.',
      'You can type the whole word or just the rest of it.',
      'Each round lasts 45 seconds; there are three rounds.',
    ],
    scoring:
      '10 points for every letter you add after the prefix, plus 20 for words of 7 letters or more.',
    difficultyNotes:
      'Easy: two-letter prefixes with lots of words. Normal: trickier two-letter prefixes. Hard: three-letter prefixes.',
    tips: ['Add common endings: -ING, -ER, -ED.', 'Longer words score more than quick short ones.'],
  },
  achievements: [
    ['words', 'Word Stream', 'Find 30 words in one game.', 30, '✍️', 15],
    ['score', 'Prolific', 'Score 800 points in one game.', 800, '📜', 15],
    ['round', 'On a Roll', 'Find 15 words in a single round.', 15, '🔥', 20],
  ],
  load: () => import('./FinishTheWordGame'),
});
