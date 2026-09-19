import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'peg-solitaire',
  title: 'Peg Solitaire',
  category: 'board',
  difficulty: 'medium',
  icon: '🔘',
  tags: ['pegs', 'jumping', 'single player', 'classic', 'puzzle', 'brain'],
  short: 'Jump pegs over each other until only one is left.',
  full: 'The classic single-player board puzzle on a cross-shaped board. Jump one peg over a neighbour into an empty hole to remove it, and keep going until only one peg remains — ideally in the centre. Three starting layouts, unlimited undo and a solver-backed hint.',
  minutes: 6,
  multiplayer: 'single',
  hasLevels: true,
  controls: {
    keyboard: ['Tab to a peg and press Enter, then choose a highlighted hole'],
    mouse: ['Click a peg, then click a highlighted hole'],
    touch: ['Tap a peg, then tap a highlighted hole'],
  },
  instructions: {
    objective: 'Remove pegs by jumping until exactly one peg is left.',
    howToPlay: [
      'Select a peg, then pick an empty hole two spaces away across, up or down (never diagonally).',
      'The peg you jump over is removed.',
      'Keep jumping until no more moves are possible.',
      'Use Undo freely, or Hint to see a jump that still leads to a one-peg finish.',
    ],
    scoring: '10 points per peg removed, +200 for finishing with one peg and +300 more if it is in the centre.',
    difficultyNotes: 'Easy: Plus layout (9 pegs). Normal: Pyramid (16 pegs). Hard: the full Classic board (32 pegs).',
    tips: ['Work from the edges inward.', 'Avoid stranding single pegs in the arms of the cross.', 'Plan the last few jumps so they finish in the centre.'],
  },
  achievements: [
    ['solve', 'One Left', 'Finish any layout with a single peg.', 1, '🔘', 10],
    ['clean', 'No Take-Backs', 'Solve a layout without using Undo.', 1, '✋', 15],
    ['classic', 'Classic Solver', 'Solve the full 32-peg board.', 1, '🏆', 30],
    ['centre', 'Dead Centre', 'Solve the 32-peg board with the last peg in the centre.', 1, '🎯', 40],
  ],
  load: () => import('./PegSolitaireGame'),
});
