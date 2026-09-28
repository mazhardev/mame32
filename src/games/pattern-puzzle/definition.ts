import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'pattern-puzzle',
  title: 'Pattern Puzzle',
  category: 'puzzle',
  difficulty: 'medium',
  icon: '🔷',
  tags: ['pattern', 'logic', 'sliding', 'mosaic', 'rows and columns'],
  short: 'Slide rows and columns of tiles until your grid matches the target mosaic.',
  full: 'Recreate the target mosaic by sliding whole rows left or right and whole columns up or down. Tiles that slide off one edge wrap round to the other, so every move shifts a full line. Each tile also carries a symbol, so colours are never the only clue. Every puzzle is scrambled from the target, so it can always be solved.',
  minutes: 4,
  controls: {
    keyboard: ['Tab to an arrow button beside a row or column and press Enter to slide it'],
    mouse: ['Click the arrows, or drag a row sideways or a column up or down'],
    touch: ['Drag a row sideways or a column up or down, or tap the arrows'],
  },
  instructions: {
    objective: 'Make every tile match the target pattern.',
    howToPlay: [
      'Slide a row left or right, or a column up or down. The tile that drops off one end reappears at the other.',
      'Drag across the grid to slide by several places at once, or use the arrow buttons for one step.',
      'Tiles in the right place get a white ring. Undo takes back a slide.',
    ],
    scoring: '40 points per tile, minus 6 per slide and 1 per second. Minimum 100.',
    difficultyNotes: 'Easy: 3×3 with 3 colours. Normal: 4×4 with 4 colours. Hard: 5×5 with 5 colours.',
    tips: [
      'Fix one row at a time, then use columns carefully: sliding a column disturbs every row.',
      'To swap tiles within a finished row, slide a column away, shift the row, and slide the column back.',
    ],
    touchNotes: ['Drag with a finger along a row or column; it slides as you move.'],
  },
  achievements: [
    ['first', 'Pattern Maker', 'Solve your first pattern.', 1, '🔷', 10],
    ['efficient', 'Neat Hands', 'Solve a 4×4 or 5×5 pattern in no more than six slides per row.', 1, '✨', 25],
    ['five', 'Mosaic Master', 'Solve a 5×5 pattern.', 1, '🏆', 30],
    ['ten', 'Tile Setter', 'Solve 10 patterns.', 10, '🧱', 30],
  ],
  load: () => import('./PatternPuzzleGame'),
});
