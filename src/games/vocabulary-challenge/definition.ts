import { defineGame } from '../_shared/defineGame';
import { QUIZ_CONTROLS, quizAchievements, quizInstructions } from '../_shared/quiz/meta';

export const game = defineGame({
  id: 'vocabulary-challenge',
  title: 'Vocabulary Challenge',
  category: 'educational',
  difficulty: 'hard',
  icon: '📖',
  tags: ['vocabulary', 'timed'],
  short: 'Timed synonyms and antonyms: find the same or opposite meaning fast.',
  full: 'A fast-paced word challenge. For each word, pick a synonym or an antonym before time runs out — and don’t fall for the opposite!',
  minutes: 3,
  controls: QUIZ_CONTROLS,
  instructions: quizInstructions({
    objective: 'Find twelve synonyms and antonyms against the clock.',
    question: 'Each question asks for a SYNONYM (same meaning) or an ANTONYM (opposite).',
    timed: 'Each question is timed; faster answers score more.',
    questions: 'Each round has 12 questions.',
    difficulty:
      'Easy: everyday words, 20 seconds. Normal: harder words, 14 seconds. Hard: advanced vocabulary, 9 seconds.',
    tips: [
      'Read whether the question wants a synonym or an antonym — the other one is always a choice.',
    ],
  }),
  achievements: quizAchievements(1500),
  load: () => import('./Game'),
});
