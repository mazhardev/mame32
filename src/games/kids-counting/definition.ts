import { defineGame } from '../_shared/defineGame';
import { QUIZ_CONTROLS, quizAchievements, quizInstructions } from '../_shared/quiz/meta';

export const game = defineGame({
  id: 'kids-counting',
  title: 'Kids Counting',
  category: 'educational',
  difficulty: 'easy',
  icon: '🔢',
  tags: ['kids', 'numbers'],
  short: 'Count fruit, stars and animals — a gentle first maths game for kids.',
  full: 'A friendly counting game for young children. Count the pictures, compare which group has more, and add two groups together. No timers and big tap-friendly answers.',
  minutes: 3,
  controls: QUIZ_CONTROLS,
  instructions: quizInstructions({
    objective: 'Count the pictures and choose the right number.',
    question: 'Each question shows pictures: count them, compare two groups or add them together.',
    difficulty:
      'Easy: up to 6 pictures, counting and comparing. Normal: up to 10 and simple adding. Hard: up to 15.',
    tips: ['Point at each picture as you count it.', 'Count in twos to go faster.'],
  }),
  achievements: quizAchievements(1200),
  load: () => import('./Game'),
});
