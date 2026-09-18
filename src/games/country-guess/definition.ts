import { defineGame } from '../_shared/defineGame';
import { QUIZ_CONTROLS, quizAchievements, quizInstructions } from '../_shared/quiz/meta';

export const game = defineGame({
  id: 'country-guess',
  title: 'Country Guess',
  category: 'educational',
  difficulty: 'medium',
  icon: '🗺️',
  tags: ['quiz', 'world', 'shapes'],
  short: 'Guess the country from clues about its landmarks, nature and culture.',
  full: 'Each round gives you clues about a mystery country. On Easy you get three clues; on Hard, only the most cryptic one.',
  minutes: 4,
  controls: QUIZ_CONTROLS,
  instructions: quizInstructions({
    objective: 'Identify ten countries from their clues.',
    question: 'Read the clues and pick the country they describe.',
    difficulty:
      'Easy: three clues, the last one very obvious. Normal: two clues. Hard: only the first, hardest clue.',
    tips: [
      'Think about landmarks, languages and wildlife.',
      'Distractors are usually from the same region.',
    ],
  }),
  achievements: quizAchievements(1200),
  load: () => import('./Game'),
});
