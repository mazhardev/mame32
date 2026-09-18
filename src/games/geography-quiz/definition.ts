import { defineGame } from '../_shared/defineGame';
import { QUIZ_CONTROLS, quizAchievements, quizInstructions } from '../_shared/quiz/meta';

export const game = defineGame({
  id: 'geography-quiz',
  title: 'Geography Quiz',
  category: 'educational',
  difficulty: 'medium',
  icon: '🌍',
  tags: ['quiz', 'world'],
  short: 'Oceans, mountains, rivers, deserts and countries around the world.',
  full: 'A world geography quiz covering oceans, mountain ranges, rivers, deserts, islands and famous landmarks.',
  minutes: 3,
  controls: QUIZ_CONTROLS,
  instructions: quizInstructions({
    objective: 'Answer ten geography questions.',
    question: 'Questions cover physical geography and countries around the world.',
    difficulty:
      'Easy: well-known facts. Normal: rivers, straits and lakes. Hard: trenches, ridges and record-breakers.',
    tips: [
      'Africa has more countries than any other continent.',
      'Remember the difference between the largest and the deepest lake.',
    ],
  }),
  achievements: quizAchievements(1200),
  load: () => import('./Game'),
});
