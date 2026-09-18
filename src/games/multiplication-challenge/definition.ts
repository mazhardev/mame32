import { defineGame } from '../_shared/defineGame';
import { QUIZ_CONTROLS, quizAchievements, quizInstructions } from '../_shared/quiz/meta';

export const game = defineGame({
  id: 'multiplication-challenge',
  title: 'Multiplication Challenge',
  category: 'educational',
  difficulty: 'easy',
  icon: '✖️',
  tags: ['maths', 'tables', 'drill'],
  short: 'Master your times tables with fifteen fast multiplication questions.',
  full: 'A timed times-tables drill. Wrong answers come from neighbouring rows of the table, so you have to really know it. Hard goes up to 15 × 15.',
  minutes: 3,
  controls: QUIZ_CONTROLS,
  instructions: quizInstructions({
    objective: 'Answer fifteen multiplication questions as quickly and accurately as you can.',
    question: 'Each question is a multiplication such as 7 × 8 = ?.',
    timed: 'Each question has a short countdown; quicker answers score more.',
    questions: 'Each round has 15 questions.',
    difficulty:
      'Easy: tables 1–5, 20 seconds. Normal: tables 2–10, 10 seconds. Hard: 6–15 × 6–15, 6 seconds.',
    tips: [
      'Know your squares (7 × 7 = 49) and work from them.',
      'For × 9, multiply by 10 and subtract once.',
    ],
  }),
  achievements: quizAchievements(1800),
  load: () => import('./Game'),
});
