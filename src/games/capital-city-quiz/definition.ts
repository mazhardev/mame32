import { defineGame } from '../_shared/defineGame';
import { QUIZ_CONTROLS, quizAchievements, quizInstructions } from '../_shared/quiz/meta';

export const game = defineGame({
  id: 'capital-city-quiz',
  title: 'Capital City Quiz',
  category: 'educational',
  difficulty: 'medium',
  icon: '🏛️',
  tags: ['quiz', 'world', 'capitals'],
  short: 'Name the capital cities of countries around the world.',
  full: 'How well do you know the world’s capitals? Nearly 100 countries, with tricky distractors like Sydney and Toronto that catch out even seasoned travellers.',
  minutes: 3,
  controls: QUIZ_CONTROLS,
  instructions: quizInstructions({
    objective: 'Name the capital city of ten countries.',
    question: 'Each question names a country. Pick its capital city.',
    difficulty:
      'Easy: well-known capitals. Normal: adds more of Europe, Asia and the Americas. Hard: focuses on less familiar capitals.',
    tips: [
      'The biggest city is often not the capital.',
      'Several countries moved their capital in the 20th century.',
    ],
  }),
  achievements: quizAchievements(1200),
  load: () => import('./Game'),
});
