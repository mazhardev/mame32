import { defineGame } from '../_shared/defineGame';
import { QUIZ_CONTROLS, quizAchievements, quizInstructions } from '../_shared/quiz/meta';

export const game = defineGame({
  id: 'math-quiz',
  title: 'Math Quiz',
  category: 'educational',
  difficulty: 'easy',
  icon: '➗',
  tags: ['maths', 'quiz', 'timed', 'featured'],
  short: 'Quick-fire arithmetic: add, subtract, multiply and divide against the clock.',
  full: 'Ten arithmetic questions per round with a timer on each one. Easy sticks to adding and subtracting within 20; Hard mixes all four operations with numbers up to 1,000.',
  minutes: 3,
  controls: QUIZ_CONTROLS,
  instructions: quizInstructions({
    objective: 'Answer ten arithmetic questions correctly before each timer runs out.',
    question:
      'Each question is a sum such as 48 + 27 = ?. Pick the right result from four choices.',
    timed: 'Each question has a countdown. Faster answers earn more points.',
    difficulty:
      'Easy: + and − within 20, 25 seconds each. Normal: +, − and × within 100, 15 seconds. Hard: all four operations up to 1,000, 12 seconds.',
    tips: [
      'Round numbers first, then adjust: 48 + 27 = 50 + 25.',
      'Rule out answers with the wrong last digit.',
    ],
  }),
  achievements: quizAchievements(1200),
  load: () => import('./Game'),
});
