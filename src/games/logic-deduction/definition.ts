import { defineGame } from '../_shared/defineGame';
import { QUIZ_CONTROLS, quizAchievements, quizInstructions } from '../_shared/quiz/meta';

export const game = defineGame({
  id: 'logic-deduction',
  title: 'Logic Deduction',
  category: 'brain',
  difficulty: 'hard',
  icon: '🕵️',
  tags: ['deduction', 'reasoning'],
  short: 'Syllogisms, orderings and truth-teller puzzles: what must be true?',
  full: 'Test your reasoning with deduction puzzles. Decide what must follow from a set of statements — and learn when the honest answer is “cannot be determined”.',
  minutes: 5,
  controls: QUIZ_CONTROLS,
  instructions: quizInstructions({
    objective: 'Solve ten deduction puzzles.',
    question: 'Read the statements carefully and choose what must be true.',
    difficulty:
      'Easy: simple orderings and syllogisms. Normal: conditionals and day puzzles. Hard: knights and knaves, trick questions and invalid conclusions.',
    tips: [
      '“Must be true” means true in every possible case.',
      'Watch for reversed conditionals: wet grass does not prove it rained.',
    ],
  }),
  achievements: quizAchievements(1200),
  load: () => import('./Game'),
});
