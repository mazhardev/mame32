import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'mandala-coloring',
  title: 'Mandala Coloring',
  category: 'creative',
  difficulty: 'easy',
  icon: '🌸',
  tags: ['colouring', 'relaxing', 'mandala', 'symmetry', 'creative', 'save'],
  short: 'Colour endlessly generated mandalas — symmetry fill paints every matching petal at once.',
  full: 'A calm colouring game with a fresh mandala every time: rings of petals, arches, diamonds and dots arranged with perfect rotational symmetry. Tap any shape to colour it; with symmetry fill on, every matching shape around the ring changes together. Undo freely, download your finished mandala as a picture, and pick up an unfinished one later.',
  minutes: 8,
  hasSaveState: true,
  controls: {
    keyboard: ['← → choose a shape, Space colours it'],
    mouse: ['Pick a colour, then click shapes'],
    touch: ['Pick a colour, then tap shapes'],
  },
  instructions: {
    objective: 'Colour every shape in the mandala.',
    howToPlay: [
      'Choose a colour from the palette, then tap a shape to fill it.',
      'Symmetry fill colours every matching shape in the same ring.',
      'Use Undo to step back, and New mandala for a different design.',
      'When every shape is coloured, your mandala is finished.',
    ],
    scoring: '10 points per shape plus 20 per colour you used.',
    difficultyNotes:
      'Easy mandalas have six-fold symmetry and four rings. Normal has eight-fold and five rings. Hard has twelve-fold symmetry, six rings and starts with symmetry fill off.',
    tips: [
      'Pick three or four colours that go together and alternate them by ring.',
      'Light centres with darker outer rings look striking.',
    ],
    touchNotes: ['Small dots are easier to hit if you zoom in with two fingers.'],
  },
  achievements: [
    ['first', 'Inner Calm', 'Finish a mandala.', 1, '🌸', 10],
    ['palette', 'Rainbow', 'Use 8 different colours in one mandala.', 1, '🌈', 15],
    ['five', 'Meditative', 'Finish 5 mandalas.', 5, '🧘', 25],
    ['regions', 'Colour Master', 'Colour 1,000 shapes in total.', 1000, '🎨', 25],
    ['hard', 'Steady Hands', 'Finish a Hard mandala with symmetry fill off.', 1, '🏆', 35],
  ],
  load: () => import('./MandalaGame'),
});
