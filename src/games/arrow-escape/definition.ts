import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'arrow-escape',
  title: 'Arrow Escape',
  category: 'puzzle',
  difficulty: 'easy',
  icon: '➡️',
  tags: ['arrows', 'order', 'logic', 'levels', 'tap', 'brain'],
  short: 'Tap the arrows to fly them off the board, but only when nothing is in their way.',
  full: 'A tidy tap-away puzzle like the arrow games filling phone screens. The board is crammed with arrows pointing up, down, left and right. Tap one and it shoots off the board the way it points, but if another arrow blocks its path it bumps back and you lose one of three hearts. Work out the right order and clear the whole board. Every level can be cleared, and ninety levels grow from a roomy 5×5 to a packed 7×7. For more puzzles about the right order, try [Unblock Puzzle](game:unblock-puzzle) and [Parking Puzzle](game:parking-puzzle), or see all [logic puzzles](hub:logic-puzzles).',
  minutes: 3,
  hasLevels: true,
  hasSaveState: true,
  controls: {
    keyboard: ['Tab to an arrow and press Enter or Space to send it'],
    mouse: ['Click an arrow to send it off the board'],
    touch: ['Tap an arrow to send it off the board'],
  },
  instructions: {
    objective: 'Clear every arrow off the board without losing all three hearts.',
    howToPlay: [
      'Each arrow can only travel the way it points.',
      'Tap an arrow with a clear path to the edge and it flies away.',
      'If another arrow is in the way, it bumps back and you lose a heart.',
      'Clear the board to finish the level. Your best result (hearts kept) is saved for every level.',
      'Hint flashes an arrow that can leave right now.',
    ],
    scoring: '20 points per arrow, plus 100 for each heart left, minus 40 per hint.',
    difficultyNotes: 'Easy boards are 5×5, Normal 6×6 and Hard 7×7, more tightly packed with longer arrows.',
    tips: [
      'Arrows at the edge pointing outwards can always go first.',
      'Follow an arrow’s path with your eye before you tap: anything in that line must leave first.',
      'Clearing one arrow often frees several others.',
    ],
    touchNotes: ['Tap an arrow to send it. There is no time limit, so look before you tap.'],
  },
  achievements: [
    ['first', 'Clear Skies', 'Clear your first board.', 1, '➡️', 10],
    ['flawless', 'Flawless', 'Clear a board without losing a heart.', 1, '❤️', 20],
    ['ten', 'Arrow Wrangler', 'Clear 10 boards.', 10, '🎯', 30],
    ['hard', 'Sharpshooter', 'Clear a Hard board without losing a heart.', 1, '🏹', 30],
    ['pack', 'Empty Quiver', 'Clear every board in one pack.', 1, '🏆', 50],
  ],
  load: () => import('./ArrowEscapeGame'),
});
