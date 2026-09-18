import { defineGame } from '../_shared/defineGame';
import { QUIZ_CONTROLS, quizAchievements, quizInstructions } from '../_shared/quiz/meta';

export const game = defineGame({
  id: 'flag-quiz',
  title: 'Flag Quiz',
  category: 'educational',
  difficulty: 'medium',
  icon: '🚩',
  tags: ['quiz', 'world', 'flags'],
  short: 'Recognise world flags — name the flag or pick the flag for a country.',
  full: 'Identify national flags, drawn in their official colours. Watch out for look-alikes: several tricolours differ only in order or shade.',
  minutes: 3,
  controls: QUIZ_CONTROLS,
  instructions: quizInstructions({
    objective: 'Answer ten flag questions.',
    question:
      'Name the country for a flag, or (on Normal and Hard) pick the right flag for a country.',
    difficulty:
      'Easy: famous flags. Normal: adds more European and world flags and “pick the flag” questions. Hard: less familiar tricolours and look-alikes.',
    tips: [
      'Ireland is green-white-orange; Ivory Coast is the reverse.',
      'Nordic flags have a cross set to the left.',
    ],
  }),
  achievements: quizAchievements(1200),
  load: () => import('./Game'),
});
