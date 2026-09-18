import { defineGame } from '../_shared/defineGame';
import { QUIZ_CONTROLS, quizAchievements, quizInstructions } from '../_shared/quiz/meta';

export const game = defineGame({
  id: 'alphabet-game',
  title: 'Alphabet Game',
  category: 'educational',
  difficulty: 'easy',
  icon: '🔤',
  tags: ['kids', 'letters'],
  short: 'Learn letters with pictures: first sounds, capitals and alphabet order.',
  full: 'A picture alphabet game for early readers. Match pictures to their first letter, pair capital and small letters, and find which letter comes before or after.',
  minutes: 3,
  controls: QUIZ_CONTROLS,
  instructions: quizInstructions({
    objective: 'Answer ten alphabet questions.',
    question: 'Questions show a picture or a letter. Pick the matching letter, word or picture.',
    difficulty:
      'Easy: first letters and capital/small pairs. Normal and Hard: add alphabet order (before and after).',
    tips: [
      'Say the word out loud and listen to the first sound.',
      'Sing the alphabet song to find the next letter.',
    ],
  }),
  achievements: quizAchievements(1200),
  load: () => import('./Game'),
});
