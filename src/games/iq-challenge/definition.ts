import { defineGame } from '../_shared/defineGame';
import { QUIZ_CONTROLS, quizAchievements, quizInstructions } from '../_shared/quiz/meta';

export const game = defineGame({
  id: 'iq-challenge',
  title: 'IQ Challenge',
  category: 'brain',
  difficulty: 'hard',
  icon: '💡',
  tags: ['reasoning', 'mixed'],
  short: 'Analogies, letter series, odd-one-out and number puzzles in one test.',
  full: 'A mixed reasoning challenge: verbal analogies, letter and number sequences, classification puzzles and logic. Fifteen questions with explanations. Just for fun — not a real IQ test.',
  minutes: 6,
  controls: QUIZ_CONTROLS,
  instructions: quizInstructions({
    objective: 'Answer fifteen reasoning questions.',
    question:
      'Questions include analogies (hand is to glove as…), letter series, odd-one-out and number puzzles.',
    timed: 'On Hard each question is timed; Easy and Normal are untimed.',
    questions: 'Each round has 15 questions.',
    difficulty:
      'Easy: simpler analogies and sequences, untimed. Normal: harder mix, untimed. Hard: the toughest questions with 30 seconds each.',
    tips: [
      'State the relationship in the first pair as a sentence, then apply it.',
      'For letters, turn them into numbers (A = 1, B = 2…).',
    ],
  }),
  achievements: quizAchievements(2000),
  load: () => import('./Game'),
});
