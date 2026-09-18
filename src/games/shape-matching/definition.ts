import { defineGame } from '../_shared/defineGame';
import { QUIZ_CONTROLS, quizAchievements, quizInstructions } from '../_shared/quiz/meta';

export const game = defineGame({
  id: 'shape-matching',
  title: 'Shape Matching',
  category: 'educational',
  difficulty: 'easy',
  icon: '🔷',
  tags: ['kids', 'shapes'],
  short: 'Recognise shapes, count their sides and pick the right one.',
  full: 'A shapes game: name each shape, find a named shape among four, and count the sides of polygons from triangles to octagons.',
  minutes: 3,
  controls: QUIZ_CONTROLS,
  instructions: quizInstructions({
    objective: 'Answer ten questions about shapes.',
    question: 'Name the shape, pick it from a group of four, or count its sides.',
    difficulty:
      'Easy: circle, square, triangle, rectangle, star and heart. Normal: adds oval, pentagon, hexagon and diamond. Hard: adds octagon, trapezoid, parallelogram and crescent.',
    tips: [
      'Count the corners: a shape has as many corners as straight sides.',
      '“Penta” means five, “hexa” six and “octa” eight.',
    ],
  }),
  achievements: quizAchievements(1200),
  load: () => import('./Game'),
});
