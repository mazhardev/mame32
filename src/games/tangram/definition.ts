import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'tangram',
  title: 'Tangram',
  category: 'puzzle',
  difficulty: 'medium',
  icon: '🔺',
  tags: ['shapes', 'geometry', 'drag', 'classic', 'levels'],
  short: 'Fit the seven classic tangram pieces together to fill each silhouette.',
  full: 'The ancient seven-piece puzzle. Two large triangles, a medium triangle, two small triangles, a square and a parallelogram — cut from a single square — must be turned, flipped and slid together to fill a dark silhouette exactly. Start with the classic square and work through sixty figures. Pieces click into place when they are close to a spot where they fit.',
  minutes: 5,
  hasLevels: true,
  controls: {
    keyboard: ['N selects the next piece', 'Arrow keys move it (Shift for bigger steps)', 'Q / E turn it, F flips the parallelogram'],
    mouse: ['Drag pieces into the shape', 'Click a selected piece to turn it, or use the ↺ ↻ buttons'],
    touch: ['Drag pieces into the shape', 'Tap a selected piece to turn it 45°; use ⇋ to flip the parallelogram'],
  },
  instructions: {
    objective: 'Cover the dark silhouette using all seven pieces, with no overlaps.',
    howToPlay: [
      'Drag a piece from the tray onto the silhouette.',
      'Pieces turn in 45° steps. Only the parallelogram needs flipping — the other pieces look the same either way.',
      'A piece that is close to a spot where it fits, turned the right way, clicks into place.',
      'The two large triangles are interchangeable, and so are the two small ones.',
    ],
    scoring: '700 points, minus 2 per second and 120 for every piece placed for you. Minimum 100.',
    difficultyNotes:
      'Easy: compact shapes with the piece outlines drawn in. Normal: silhouettes only. Hard: sprawling silhouettes and a tighter snap.',
    tips: [
      'Place the two large triangles first — they fill half the shape.',
      'Sharp 45° corners in the silhouette usually belong to a triangle.',
      'The square and the parallelogram often fill the narrow parts.',
    ],
    touchNotes: ['Drag with a finger. Tap a piece once to select it, then again to turn it.'],
  },
  achievements: [
    ['first', 'Seven Pieces', 'Complete your first tangram.', 1, '🔺', 10],
    ['no-hints', 'Sharp Eye', 'Complete a Normal or Hard figure without placed pieces.', 1, '👁️', 20],
    ['hard', 'Master Shaper', 'Complete a Hard figure.', 1, '🏆', 30],
    ['ten', 'Shape Shifter', 'Complete 10 tangram figures.', 10, '🔷', 30],
    ['pack', 'Complete Collection', 'Complete every figure in one pack.', 1, '📐', 50],
  ],
  load: () => import('./TangramGame'),
});
