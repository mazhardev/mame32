import { defineGame } from '../_shared/defineGame';
import { QUIZ_CONTROLS, quizAchievements, quizInstructions } from '../_shared/quiz/meta';

export const game = defineGame({
  id: 'brain-training',
  title: 'Brain Training Collection',
  category: 'brain',
  difficulty: 'medium',
  icon: '🏋️',
  tags: ['mixed', 'daily', 'drills'],
  short: 'A daily mix of drills: arithmetic, sequences, colour-word tests and more.',
  full: 'A varied brain workout mixing quick maths, number sequences, a colour-word (Stroop) test, fraction comparisons and visual counting — fifteen questions against the clock.',
  minutes: 5,
  controls: QUIZ_CONTROLS,
  instructions: quizInstructions({
    objective: 'Complete a mixed set of fifteen quick brain drills.',
    question:
      'Drills change every question: maths, sequences, “what colour is the ink?”, fractions and counting.',
    timed: 'Each drill is timed; faster answers score more.',
    questions: 'Each round has 15 mixed questions.',
    difficulty:
      'Easy: gentle numbers, 20 seconds each. Normal: harder maths, 12 seconds. Hard: tough maths, 8 seconds.',
    tips: [
      'In the ink test, name the colour you see, not the word you read.',
      'For fractions, compare each to one half first.',
    ],
  }),
  achievements: quizAchievements(2000),
  load: () => import('./Game'),
});
