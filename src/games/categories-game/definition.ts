import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'categories-game',
  title: 'Categories',
  category: 'word',
  difficulty: 'medium',
  icon: '🗂️',
  tags: ['letters', 'party', 'timed', 'general knowledge'],
  short: 'One letter, six categories: name an animal, a country, a job… fast!',
  full: 'A quick-thinking word game. Each round gives you a letter and six categories such as Animals, Countries or Jobs. Fill in an answer for each one that starts with the letter before time runs out.',
  minutes: 5,
  keyboard: true,
  controls: {
    keyboard: ['Tab between answers, Enter to finish the round'],
    touch: ['Tap each box and type your answer'],
  },
  instructions: {
    objective: 'Give a valid answer for as many categories as you can in three rounds.',
    howToPlay: [
      'Press Start to reveal the letter and six categories.',
      'Type an answer for each category that starts with the letter.',
      'Press Done (or wait for the timer) to check your answers.',
      'Wrong or empty answers show example answers you could have used.',
    ],
    scoring: '10 points per accepted answer, plus 5 for answers of 8 letters or more.',
    difficultyNotes: 'Easy: 2 minutes per round. Normal: 90 seconds. Hard: 60 seconds.',
    tips: ['Fill in the easy categories first.', 'Plurals are accepted (e.g. BEARS for Animals).'],
  },
  achievements: [
    ['full-round', 'Full House', 'Get all six answers right in one round.', 1, '🗂️', 15],
    ['answers', 'Quick Thinker', 'Get 15 answers right in one game.', 15, '⚡', 15],
    ['score', 'Category King', 'Score 200 points in one game.', 200, '👑', 20],
  ],
  load: () => import('./CategoriesGame'),
});
