import { defineGame } from '../_shared/defineGame';
import { QUIZ_CONTROLS, quizAchievements, quizInstructions } from '../_shared/quiz/meta';

export const game = defineGame({
  id: 'mental-math',
  title: 'Mental Math',
  category: 'educational',
  difficulty: 'medium',
  icon: '🧮',
  tags: ['maths', 'speed', 'drill'],
  short: 'Two-step sums, percentages and squares to solve in your head.',
  full: 'Train your mental arithmetic with multi-step calculations, percentages and squares. No paper allowed — just you and the clock.',
  minutes: 4,
  controls: QUIZ_CONTROLS,
  instructions: quizInstructions({
    objective: 'Work out ten multi-step calculations in your head.',
    question: 'Questions combine operations, like 6 × 7 + 12, 25% of 80 or 14².',
    timed: 'Each question is timed; faster answers score more.',
    difficulty:
      'Easy: two-step sums, 30 seconds. Normal: adds percentages and squares, 20 seconds. Hard: adds brackets and division, 12 seconds.',
    tips: [
      '25% is a quarter; 10% moves the decimal point.',
      'Do multiplication before addition unless there are brackets.',
    ],
  }),
  achievements: quizAchievements(1200),
  load: () => import('./Game'),
});
