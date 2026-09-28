import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'flow-connect',
  title: 'Flow Connect',
  category: 'puzzle',
  difficulty: 'medium',
  icon: '🌈',
  tags: ['path drawing', 'logic', 'pipes', 'colours', 'relaxing'],
  short: 'Join every pair of matching dots with pipes that never cross — and fill the whole board.',
  full: 'Draw a pipe between each pair of same-coloured dots. Pipes cannot cross or share a square, and the puzzle is only complete when every square on the board is filled. Each dot is also marked with a letter. Every puzzle is built from a real full-board solution. Your progress is saved, so you can come back to a tough grid.',
  minutes: 4,
  hasSaveState: true,
  controls: {
    keyboard: [
      'Arrow keys move the cursor',
      'Enter picks up the colour under the cursor; arrows then draw its pipe',
      'Enter or Escape puts the pipe down',
    ],
    mouse: ['Drag from a dot to its partner', 'Drag from the middle of a pipe to redraw from there'],
    touch: ['Drag from a dot to its partner', 'Crossing another pipe cuts it'],
  },
  instructions: {
    objective: 'Connect every matching pair and leave no empty squares.',
    howToPlay: [
      'Drag from a dot to draw a pipe through neighbouring squares (no diagonals).',
      'Reach the dot with the same colour and letter to join the pair.',
      'Drawing over another pipe cuts it back; drawing back over your own pipe shortens it.',
      'When every pair is joined and every square is covered, the puzzle is solved.',
    ],
    scoring:
      '12 points per square, minus 15 for every move beyond one per colour and 2 per second beyond par.',
    difficultyNotes: 'Easy: 5×5 with 5 colours. Normal: 7×7 with 7 colours. Hard: 9×9 with 10 colours.',
    tips: [
      'Dots on the edge or in corners are usually easiest: their pipes hug the wall.',
      'If two pairs would need to cross, one of them has to go the long way round.',
      'A "move" counts each time you switch to drawing a different colour — plan to finish one pipe at a time.',
    ],
    touchNotes: ['Drag with your finger from any dot. Lift and drag again from a pipe to fix it.'],
  },
  achievements: [
    ['first', 'Connected', 'Solve your first Flow Connect puzzle.', 1, '🌈', 10],
    ['perfect', 'Perfect Flow', 'Solve a puzzle with one move per colour.', 1, '✨', 25],
    ['nine', 'Master Plumber', 'Solve a 9×9 puzzle.', 1, '🏆', 30],
    ['ten', 'Full Spectrum', 'Solve 10 Flow Connect puzzles.', 10, '🎨', 30],
  ],
  load: () => import('./FlowGame'),
});
