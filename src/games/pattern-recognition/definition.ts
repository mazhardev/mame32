import { defineGame } from '../_shared/defineGame';
import { QUIZ_CONTROLS, quizAchievements, quizInstructions } from '../_shared/quiz/meta';

export const game = defineGame({
  id: 'pattern-recognition',
  title: 'Pattern Recognition',
  category: 'brain',
  difficulty: 'medium',
  icon: '🔷',
  tags: ['logic', 'visual'],
  short: 'Spot the pattern: what comes next, which one doesn’t belong, what’s missing.',
  full: 'Visual pattern puzzles with coloured symbols. Continue repeating sequences, find the odd one out, and fill the gap in a symbol grid.',
  minutes: 3,
  controls: QUIZ_CONTROLS,
  instructions: quizInstructions({
    objective: 'Solve ten visual pattern puzzles.',
    question: 'Continue a symbol sequence, find the odd one out, or complete a grid.',
    timed: 'Each puzzle is timed; faster answers score more.',
    difficulty:
      'Easy: two-symbol patterns and odd-one-out, 30 seconds. Normal: three-symbol cycles and grids, 20 seconds. Hard: four-symbol cycles, 12 seconds.',
    tips: [
      'Find where the pattern starts repeating.',
      'In grids, each row uses every symbol exactly once.',
    ],
  }),
  achievements: quizAchievements(1200),
  load: () => import('./Game'),
});
