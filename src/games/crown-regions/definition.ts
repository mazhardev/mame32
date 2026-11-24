import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'crown-regions',
  title: 'Crown Regions',
  category: 'puzzle',
  difficulty: 'medium',
  icon: '👑',
  tags: ['logic', 'queens', 'regions', 'grid', 'levels', 'brain'],
  short: 'Place one crown in every row, column and colour region, with no two crowns touching.',
  full: 'A colourful logic grid in the style of the queens puzzles that took over social feeds. The board is split into coloured regions. Place one crown in each row, each column and each colour, and keep every crown from touching another, even at a corner. Tap a square to cross it out, tap again for a crown, and drag to cross out a row of squares at once. Every level has exactly one solution, so logic alone will get you there. Ninety levels in three sizes, and your best time is kept for each. For another grid of pure deduction try [Binary Puzzle](game:binary-puzzle) or [Nonogram](game:nonogram), or see all [logic puzzles](hub:logic-puzzles).',
  minutes: 4,
  hasLevels: true,
  hasSaveState: true,
  controls: {
    keyboard: ['Arrow keys move the cursor', 'Space cycles a square (✕, crown, empty)', 'C places a crown, X a cross, Backspace clears'],
    mouse: ['Click a square to cross it out, click again for a crown', 'Drag across squares to cross them out'],
    touch: ['Tap a square to cross it out, tap again for a crown', 'Drag across squares to cross them out'],
  },
  instructions: {
    objective: 'Place a crown so that every row, every column and every colour region holds exactly one, with no two crowns touching.',
    howToPlay: [
      'The grid has as many colour regions as rows. Each row, column and region needs exactly one crown.',
      'Crowns may not touch each other, not even diagonally.',
      'Tap once to cross out a square you know is empty, twice for a crown, three times to clear it.',
      'Crowns that break a rule are striped red. Turn on Auto ✕ to cross out every square a new crown rules out.',
      'Every level has a single solution. Hint places a correct crown (or removes a wrong one).',
    ],
    scoring: 'Up to 200 points per row of the grid, minus 2 per second taken and 150 per hint.',
    difficultyNotes: 'Easy levels are 6×6, Normal 7×7 and Hard 8×8. Thirty levels each; solving one unlocks the next.',
    tips: [
      'Start with the smallest region: its crown has only a few places to go.',
      'If a region lies entirely in one row or column, no other region can use that row or column.',
      'A crown rules out the eight squares around it, so cross those out straight away.',
    ],
    touchNotes: ['Tap to cycle a square; drag to cross out several squares in one stroke.'],
  },
  achievements: [
    ['first', 'First Crown', 'Solve your first level.', 1, '👑', 10],
    ['fast', 'Swift Ruler', 'Solve a level in under a minute without a hint.', 1, '⚡', 20],
    ['ten', 'Royal Court', 'Solve 10 levels.', 10, '🏰', 30],
    ['hard', 'Kingmaker', 'Solve a Hard 8×8 level without a hint.', 1, '💎', 30],
    ['pack', 'Every Throne', 'Solve every level in one pack.', 1, '🏆', 50],
  ],
  load: () => import('./CrownRegionsGame'),
});
