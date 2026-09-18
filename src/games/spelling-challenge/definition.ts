import { defineGame } from '../_shared/defineGame';
import { QUIZ_CONTROLS, quizAchievements, quizInstructions } from '../_shared/quiz/meta';

export const game = defineGame({
  id: 'spelling-challenge',
  title: 'Spelling Challenge',
  category: 'word',
  difficulty: 'easy',
  icon: '✏️',
  tags: ['spelling', 'quiz'],
  short: 'Pick the correctly spelled word from four look-alikes.',
  full: 'Tackle the most commonly misspelled English words. Each question shows four versions — only one is right. A short meaning is given as a hint.',
  minutes: 3,
  controls: QUIZ_CONTROLS,
  instructions: quizInstructions({
    objective: 'Choose the correct spelling ten times.',
    question: 'Pick the correctly spelled word from four versions.',
    difficulty:
      'Easy: everyday words like “because” and “friend”. Normal: words like “necessary” and “definitely”. Hard: notorious words like “accommodate” and “millennium”.',
    tips: [
      '“I before E except after C” works for receive but not for weird.',
      'Double letters are the most common trap.',
    ],
  }),
  achievements: quizAchievements(1200),
  load: () => import('./Game'),
});
