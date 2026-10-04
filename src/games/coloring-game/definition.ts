import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'coloring-game',
  title: 'Coloring Game',
  category: 'creative',
  difficulty: 'easy',
  icon: '🖍️',
  tags: ['colouring', 'kids', 'relaxing', 'drawing', 'creative', 'save'],
  short: 'Tap to colour six original pictures: a cottage, a rocket, an underwater scene and more.',
  full: 'A tap-to-fill colouring book with six original pages — a cottage on the hills, life under the sea, a rocket trip, an ice-cream treat, a butterfly and a castle. Pick a colour and tap any part of the picture to fill it. Every page saves as you go, and you can download your finished pictures.',
  minutes: 6,
  hasSaveState: true,
  controls: {
    keyboard: ['← → choose a shape, Space colours it'],
    mouse: ['Pick a colour, then click a part of the picture'],
    touch: ['Pick a colour, then tap a part of the picture'],
  },
  instructions: {
    objective: 'Colour every part of a picture.',
    howToPlay: [
      'Choose a colour from the palette.',
      'Tap any shape in the picture to fill it with that colour.',
      'Tap again with another colour to change it; Undo steps back.',
      'Switch pages at any time — each one remembers its colours.',
    ],
    scoring: '10 points per shape plus 15 per colour used when a page is finished.',
    difficultyNotes:
      'Easy pages start with the background already coloured and bold outlines. Normal starts blank. Hard uses fine outlines, so small parts are trickier to spot.',
    tips: [
      'Colour the big background first.',
      'Use light colours for the sky and stronger ones for objects.',
    ],
    touchNotes: ['Pinch-zoom the page to reach tiny shapes such as sprinkles and stars.'],
  },
  achievements: [
    ['first', 'Little Artist', 'Finish a page.', 1, '🖍️', 10],
    ['rainbow', 'Rainbow Page', 'Use 10 colours on one page.', 1, '🌈', 15],
    ['all', 'Colouring Book', 'Finish all 6 pages.', 6, '📚', 30],
    ['shapes', 'Busy Crayon', 'Colour 500 shapes in total.', 500, '🎨', 20],
  ],
  load: () => import('./ColoringGame'),
});
