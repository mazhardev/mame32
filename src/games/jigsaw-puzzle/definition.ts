import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'jigsaw-puzzle',
  title: 'Jigsaw Puzzle',
  category: 'puzzle',
  difficulty: 'easy',
  icon: '🧩',
  tags: ['pieces', 'relaxing', 'drag', 'pictures', 'landscape'],
  short: 'Piece together a freshly painted landscape — every picture is unique.',
  full: 'A relaxing jigsaw with real interlocking pieces. Each puzzle is a brand-new landscape painted on the spot — sunsets, starry nights, autumn hills and bright days — then cut into pieces and scattered around the table. Drag pieces into the frame and they click into place when they are near their spot. Turn on the guide picture for help, and your progress is saved.',
  minutes: 8,
  hasSaveState: true,
  controls: {
    keyboard: ['N picks the next loose piece', 'Arrow keys move it (hold Shift for bigger steps)', 'Enter drops it'],
    mouse: ['Drag pieces into the frame'],
    touch: ['Drag pieces into the frame with your finger'],
  },
  instructions: {
    objective: 'Place every piece to complete the picture.',
    howToPlay: [
      'Pieces start around the frame. Drag one onto the frame near where it belongs.',
      'When a piece is close to its spot, it clicks into place and stays there.',
      'Edge pieces have straight sides, and corner pieces have two — they are a good place to start.',
      'The guide picture shows a faint copy of the image in the frame. "Place a piece" puts one piece in for you.',
    ],
    scoring: '60 points per piece, minus a point per second beyond par and 90 per placed-for-you piece.',
    difficultyNotes: 'Easy: 12 pieces (guide picture on). Normal: 24 pieces. Hard: 48 pieces.',
    tips: [
      'Build the border first, then fill in by colour: sky, hills, water.',
      'Match the knobs: a piece with a knob sticking out fits next to a piece with a gap.',
    ],
    touchNotes: ['Drag pieces with a finger. Pieces you tap come to the top of the pile.'],
  },
  achievements: [
    ['first', 'Picture Perfect', 'Complete your first jigsaw.', 1, '🧩', 10],
    ['no-help', 'No Peeking', 'Complete a 24+ piece jigsaw without the guide picture or placed pieces.', 1, '🙈', 30],
    ['big', 'Big Picture', 'Complete a 48-piece jigsaw.', 1, '🖼️', 30],
    ['ten', 'Collector', 'Complete 10 jigsaws.', 10, '🏞️', 30],
  ],
  load: () => import('./JigsawGame'),
});
