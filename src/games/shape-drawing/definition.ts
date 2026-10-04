import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'shape-drawing',
  title: 'Shape Drawing',
  category: 'creative',
  difficulty: 'easy',
  icon: '🔺',
  tags: ['drawing', 'accuracy', 'freehand', 'shapes', 'creative', 'practice'],
  short: 'Draw circles, stars, spirals and more freehand — how close can you get to perfect?',
  full: 'A freehand drawing challenge. You are asked for eight shapes — a circle, a star, a heart, a spiral, an infinity sign — and each one is scored by comparing it with the ideal shape, whatever size you draw it. After each shape the perfect version appears over yours so you can see where you wandered.',
  minutes: 3,
  keyboard: false,
  controls: {
    keyboard: ['Enter: done / next shape', 'C clears the drawing'],
    mouse: ['Hold the button and draw on the canvas'],
    touch: ['Draw with your finger or a stylus'],
  },
  instructions: {
    objective: 'Draw each requested shape as accurately as you can.',
    howToPlay: [
      'Draw the shape anywhere on the canvas — size and position do not matter.',
      'You can use several strokes; press Done when finished.',
      'Your drawing is compared with the ideal shape scaled to fit it.',
      'The ideal shape is then shown in green over your drawing.',
    ],
    scoring: 'Your score is your average accuracy over eight shapes, out of 1,000.',
    difficultyNotes:
      'Easy uses simpler shapes and is generous about wobbles. Normal adds spirals, hexagons and crescents. Hard adds an infinity sign and judges much more strictly.',
    tips: [
      'Draw slowly and steadily — speed adds wobble.',
      'Make shapes large: small wobbles matter less.',
    ],
    touchNotes: ['A stylus gives the smoothest lines on a tablet.'],
  },
  achievements: [
    ['great', 'Steady Hand', 'Score 90% or more on a shape.', 1, '✍️', 15],
    ['circle', 'Perfect Circle', 'Draw a circle with 95% accuracy.', 1, '⭕', 30],
    ['average', 'Draughtsman', 'Average 85% in a game.', 85, '📐', 25],
    ['shapes', 'Sketchbook', 'Draw 100 shapes in total.', 100, '📒', 20],
    ['hard', 'Master Draughtsman', 'Average 80% on Hard.', 1, '🏆', 35],
  ],
  load: () => import('./ShapeDrawingGame'),
});
