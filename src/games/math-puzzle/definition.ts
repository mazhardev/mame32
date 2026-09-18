import { defineGame } from '../_shared/defineGame';
import { QUIZ_CONTROLS, quizAchievements, quizInstructions } from '../_shared/quiz/meta';

export const game = defineGame({
  id: 'math-puzzle',
  title: 'Math Puzzle',
  category: 'brain',
  difficulty: 'hard',
  icon: '➗',
  tags: ['maths', 'logic'],
  short: 'Missing numbers and missing operators: complete each equation.',
  full: 'Each puzzle is an equation with a gap. Find the missing number, or work out which operator (+, −, ×, ÷) makes it true.',
  minutes: 4,
  controls: QUIZ_CONTROLS,
  instructions: quizInstructions({
    objective: 'Complete ten equations by finding the missing piece.',
    question: 'Questions look like ? + 7 = 15 or 12 ? 3 = 36. Pick what fills the gap.',
    timed: 'Each puzzle is timed; faster answers score more.',
    difficulty:
      'Easy: missing numbers with + and ×, 40 seconds. Normal: adds missing operators, 25 seconds. Hard: bigger numbers, 15 seconds.',
    tips: [
      'Work backwards: undo the operation on the other side.',
      'For missing operators, compare the size of the answer with the numbers.',
    ],
  }),
  achievements: quizAchievements(1200),
  load: () => import('./Game'),
});
