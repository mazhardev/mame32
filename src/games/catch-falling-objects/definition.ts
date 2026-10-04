import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'catch-falling-objects',
  title: 'Catch Falling Objects',
  category: 'casual',
  difficulty: 'easy',
  icon: '🧺',
  tags: ['catching', 'endless', 'reflex', 'kids', 'casual'],
  short: 'Slide the basket to catch falling fruit and stars — but stay clear of the bombs.',
  full: 'Fruit tumbles from the sky. Slide your basket left and right to catch it before it hits the ground. Golden stars are worth five times as much, bombs blow a life away, and every fruit you drop costs a life too. The more you catch, the faster things fall.',
  minutes: 2,
  controls: {
    keyboard: ['← → or A / D move the basket'],
    mouse: ['Hold the mouse button and move to drag the basket'],
    touch: ['Drag your finger, or use the arrow buttons'],
  },
  instructions: {
    objective: 'Catch as much fruit as possible before you run out of lives.',
    howToPlay: [
      'Move the basket under falling fruit to catch it.',
      'Stars are worth 50 points.',
      'Catching a bomb costs one life. Letting fruit hit the ground also costs a life.',
      'You start with three lives.',
    ],
    scoring: '10 points per fruit, 50 per star.',
    difficultyNotes: 'Higher difficulty drops things faster, more often and with more bombs.',
    tips: ['Let bombs fall past; only fruit counts against you when dropped.', 'Stay near the middle so you can reach both sides.'],
    touchNotes: ['Drag anywhere on the play area and the basket follows your finger.'],
  },
  achievements: [
    ['caught-30', 'Fruit Picker', 'Catch 30 items in one game.', 30, '🍎', 15],
    ['streak-25', 'Safe Hands', 'Catch 25 in a row without losing a life.', 25, '🧺', 20],
    ['score-1000', 'Harvest Festival', 'Score 1,000 points in one game.', 1000, '🏆', 30],
    ['total', 'Orchard Keeper', 'Catch 1,000 items in total.', 1000, '🎖️', 30],
  ],
  load: () => import('./CatchFallingObjectsGame'),
});
