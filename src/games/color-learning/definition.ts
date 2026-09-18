import { defineGame } from '../_shared/defineGame';
import { QUIZ_CONTROLS, quizAchievements, quizInstructions } from '../_shared/quiz/meta';

export const game = defineGame({
  id: 'color-learning',
  title: 'Color Learning',
  category: 'educational',
  difficulty: 'easy',
  icon: '🎨',
  tags: ['kids', 'colors'],
  short: 'Name colours, find swatches and learn what paint colours mix to make.',
  full: 'Learn colours by name, pick the right swatch from a row, and discover what you get when you mix paints. Harder levels add shades like teal, navy and coral.',
  minutes: 3,
  controls: QUIZ_CONTROLS,
  instructions: quizInstructions({
    objective: 'Answer ten colour questions.',
    question: 'Name a colour swatch, find a named colour among four, or predict a paint mix.',
    difficulty:
      'Easy: eight basic colours. Normal: adds pink, brown, grey and light/dark shades. Hard: adds navy, teal, maroon, turquoise, coral and more.',
    tips: [
      'Red, yellow and blue paints mix to make orange, green and purple.',
      'Adding white makes a colour lighter.',
    ],
  }),
  achievements: quizAchievements(1200),
  load: () => import('./Game'),
});
