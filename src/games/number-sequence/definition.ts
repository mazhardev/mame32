import { defineGame } from '../_shared/defineGame';
import { QUIZ_CONTROLS, quizAchievements, quizInstructions } from '../_shared/quiz/meta';

export const game = defineGame({
  id: 'number-sequence',
  title: 'Number Sequence',
  category: 'brain',
  difficulty: 'medium',
  icon: '📊',
  tags: ['logic', 'maths', 'series'],
  short: 'Find the next number in each sequence.',
  full: 'Spot the rule behind each number sequence — adding, multiplying, squares, alternating steps and more — and choose the next number. The rule is explained after every answer.',
  minutes: 4,
  controls: QUIZ_CONTROLS,
  instructions: quizInstructions({
    objective: 'Work out the rule and choose the next number in ten sequences.',
    question: 'Each question shows a sequence like 3, 7, 11, 15, ? — pick what comes next.',
    timed: 'Each question is timed; faster answers score more.',
    difficulty:
      'Easy: adding or subtracting a fixed step, 40 seconds. Normal: adds multiplying and square numbers, 30 seconds. Hard: adds Fibonacci-style and alternating steps, 20 seconds.',
    tips: [
      'Check the differences between neighbours first.',
      'If the differences grow fast, try multiplying.',
    ],
  }),
  achievements: quizAchievements(1200),
  load: () => import('./Game'),
});
